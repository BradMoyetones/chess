// src/Managers/PuzzleValidator.ts
// El cerebro de los puzzles.
// Valida movimientos contra una solución conocida, ejecuta respuestas
// automáticas del "oponente fantasma", y emite eventos de progreso.

import { ChessEngine } from '../Core/ChessEngine';
import { EventBus } from '../Core/EventBus';
import type { PuzzleConfig, PuzzleState } from '../Types/puzzle.types';
import type { Color } from 'chess.js';

export class PuzzleValidator {
    private config: PuzzleConfig | null = null;
    private state: PuzzleState;
    private engine: ChessEngine;
    private eventBus: EventBus;
    private originalFen: string = '';

    constructor(engine: ChessEngine, eventBus: EventBus) {
        this.engine = engine;
        this.eventBus = eventBus;
        this.state = this.createEmptyState();
    }

    // ═══════════════════════════════════════════════
    //  CARGAR PUZZLE
    // ═══════════════════════════════════════════════

    /**
     * Carga un puzzle y prepara el tablero.
     * 
     * Flujo:
     * 1. Carga el FEN en el engine
     * 2. Si el jugador es negro, el "oponente" (blancas) juega el primer movimiento
     *    automáticamente desde solution[0]
     * 3. Emite PUZZLE_STARTED
     */
    public loadPuzzle(config: PuzzleConfig): void {
        this.config = config;
        this.originalFen = config.fen;
        this.state = this.createEmptyState();

        // Cargar la posición del puzzle
        this.engine.loadFen(config.fen);

        // Emitir evento de inicio
        this.eventBus.emit('PUZZLE_STARTED', {
            fen: config.fen,
            movesRequired: this.getPlayerMoveCount()
        });

        // Si el jugador NO es el que tiene el turno, el oponente mueve primero
        // En puzzles de Lichess/chess.com, solution[0] es el movimiento del oponente
        // que "establece" el puzzle
        if (this.engine.getTurn() !== config.playerColor) {
            this.executeOpponentMove();
        }
    }

    // ═══════════════════════════════════════════════
    //  VALIDAR MOVIMIENTO DEL JUGADOR
    // ═══════════════════════════════════════════════

    /**
     * Valida el movimiento del jugador contra la solución.
     * 
     * @param moveSan - Movimiento en notación algebraica estándar (ej: 'Qh7+')
     * @returns 'correct' si coincide con la solución, 'incorrect' si no
     */
    public validatePlayerMove(moveSan: string): 'correct' | 'incorrect' {
        if (!this.config || this.state.status !== 'ACTIVE') {
            return 'incorrect';
        }

        const expectedMove = this.config.solution[this.state.currentStepIndex];

        if (!expectedMove) {
            return 'incorrect';
        }

        // Comparar el movimiento del jugador con la solución
        // Normalizamos quitando caracteres de check/mate (+, #) para comparar
        const normalizedPlayer = this.normalizeSan(moveSan);
        const normalizedExpected = this.normalizeSan(expectedMove);

        if (normalizedPlayer === normalizedExpected) {
            // ¡Correcto!
            this.state.playerMoves.push(moveSan);
            this.state.currentStepIndex++;

            const remaining = this.getRemainingPlayerMoves();

            this.eventBus.emit('PUZZLE_CORRECT_MOVE', {
                move: moveSan,
                remaining
            });

            // ¿Se completó el puzzle?
            if (this.state.currentStepIndex >= this.config.solution.length) {
                this.state.status = 'COMPLETED';
                this.eventBus.emit('PUZZLE_COMPLETED', {
                    totalMoves: this.state.playerMoves.length
                });
                return 'correct';
            }

            // Si hay más movimientos, el oponente responde automáticamente
            if (this.state.currentStepIndex < this.config.solution.length) {
                this.executeOpponentMove();
            }

            return 'correct';
        } else {
            // ¡Incorrecto!
            this.state.status = 'FAILED';
            this.eventBus.emit('PUZZLE_FAILED', {
                expected: expectedMove,
                actual: moveSan
            });
            return 'incorrect';
        }
    }

    // ═══════════════════════════════════════════════
    //  OPONENTE FANTASMA
    // ═══════════════════════════════════════════════

    /**
     * Ejecuta el próximo movimiento del oponente desde la solución.
     * Se llama automáticamente tras un movimiento correcto del jugador.
     */
    private executeOpponentMove(): void {
        if (!this.config || this.state.currentStepIndex >= this.config.solution.length) {
            return;
        }

        const opponentMoveSan = this.config.solution[this.state.currentStepIndex];

        if (!opponentMoveSan) return;

        // Buscar el movimiento legal que coincida con el SAN esperado
        const legalMoves = this.engine.getAllLegalMoves();
        const matchingMove = legalMoves.find(m => m.san === opponentMoveSan);

        if (matchingMove) {
            this.engine.attemptMove(matchingMove.from, matchingMove.to, matchingMove.promotion);
            this.state.opponentAutoMoves.push(opponentMoveSan);
            this.state.currentStepIndex++;
        }
    }

    /**
     * Retorna el próximo movimiento del oponente sin ejecutarlo.
     * Útil para previews o hints.
     */
    public getOpponentResponse(): string | null {
        if (!this.config || this.state.status !== 'ACTIVE') return null;
        if (this.state.currentStepIndex >= this.config.solution.length) return null;

        // Es turno del oponente si el turno actual NO es del jugador
        if (this.engine.getTurn() === this.config.playerColor) return null;

        return this.config.solution[this.state.currentStepIndex] || null;
    }

    // ═══════════════════════════════════════════════
    //  CONSULTAS DE ESTADO
    // ═══════════════════════════════════════════════

    /** ¿Hay un puzzle activo? */
    public isActive(): boolean {
        return this.config !== null && this.state.status === 'ACTIVE';
    }

    /** ¿Se completó el puzzle? */
    public isComplete(): boolean {
        return this.state.status === 'COMPLETED';
    }

    /** ¿Falló el puzzle? */
    public isFailed(): boolean {
        return this.state.status === 'FAILED';
    }

    /** Retorna el progreso actual del puzzle */
    public getProgress(): { current: number; total: number } {
        return {
            current: this.state.playerMoves.length,
            total: this.getPlayerMoveCount()
        };
    }

    /** Retorna el estado interno completo del puzzle */
    public getState(): PuzzleState {
        return { ...this.state };
    }

    /** Retorna la configuración del puzzle cargado */
    public getConfig(): PuzzleConfig | null {
        return this.config;
    }

    // ═══════════════════════════════════════════════
    //  RESET
    // ═══════════════════════════════════════════════

    /**
     * Reinicia el puzzle actual al estado inicial.
     * Permite al jugador reintentar sin recargar el puzzle.
     */
    public reset(): void {
        if (!this.config) return;
        this.loadPuzzle(this.config);
    }

    /**
     * Descarga el puzzle actual y limpia el estado.
     */
    public unload(): void {
        this.config = null;
        this.state = this.createEmptyState();
    }

    // ═══════════════════════════════════════════════
    //  HELPERS PRIVADOS
    // ═══════════════════════════════════════════════

    /** Crea un estado vacío para un puzzle nuevo */
    private createEmptyState(): PuzzleState {
        return {
            status: 'ACTIVE',
            currentStepIndex: 0,
            playerMoves: [],
            opponentAutoMoves: [],
        };
    }

    /**
     * Calcula cuántos movimientos debe hacer el jugador.
     * En un puzzle, los movimientos se alternan: jugador, oponente, jugador, ...
     * El total de movimientos del jugador depende de quién mueve primero.
     */
    private getPlayerMoveCount(): number {
        if (!this.config) return 0;
        const totalMoves = this.config.solution.length;

        // Determinar si el primer movimiento de la solución es del oponente o del jugador
        // basándonos en el FEN original (quién tiene el turno)
        const tempEngine = new ChessEngine(new EventBus(), this.originalFen);
        const firstMoveIsOpponent = tempEngine.getTurn() !== this.config.playerColor;

        if (firstMoveIsOpponent) {
            // solution = [oponente, jugador, oponente, jugador, ...]
            return Math.ceil((totalMoves - 1) / 2) + (totalMoves % 2 === 0 ? 1 : 0);
        } else {
            // solution = [jugador, oponente, jugador, ...]
            return Math.ceil(totalMoves / 2);
        }
    }

    /** Calcula cuántos movimientos le quedan al jugador */
    private getRemainingPlayerMoves(): number {
        if (!this.config) return 0;
        const remaining = this.config.solution.length - this.state.currentStepIndex;
        return Math.ceil(remaining / 2);
    }

    /**
     * Normaliza un movimiento SAN para comparación.
     * Quita caracteres de check (+) y mate (#) que pueden variar
     * según el estado exacto del tablero al momento de la comparación.
     */
    private normalizeSan(san: string): string {
        return san.replace(/[+#]/g, '');
    }
}
