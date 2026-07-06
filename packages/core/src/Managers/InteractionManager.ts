// Puente entre el input del usuario y la lógica del motor.
// Gestiona: selección de casillas, destinos legales, click-to-move y pre-moves.

import { ChessEngine, EventBus } from '../Core';
import { Service, Inject } from '../Decorators';

export interface Premove {
    from: string;
    to: string;
}

/**
 * @class InteractionManager
 * @description Maneja el estado de interacción del usuario con el tablero (click, drag, etc).
 */
@Service()
export class InteractionManager {
    @Inject(ChessEngine)
    private engine!: ChessEngine;

    @Inject(EventBus)
    private eventBus!: EventBus;

    private selectedSquare: string | null = null;
    private validDestinations: string[] = [];
    private premoveQueue: Premove[] = [];

    constructor() {
        // La inicialización se maneja mediante DI, pero necesitamos registrar los eventos
        // Nota: En un sistema real de DI con contenedores, esto se haría en un método init() o en el constructor
        // siempre que las dependencias estén resueltas.
    }

    public init(): void {
        // Limpiar selección cuando el tablero cambia por navegación
        this.eventBus.on('NAVIGATE_TO_MOVE', () => this.clearSelection());
        this.eventBus.on('POSITION_LOADED', () => this.clearSelection());
        this.eventBus.on('GAME_RESET', () => this.clearSelection());

        // Intentar ejecutar pre-moves cuando el tablero se actualiza
        this.eventBus.on('BOARD_UPDATED', () => this.tryExecutePremove());
    }

    /**
     * Maneja el click/tap en una casilla.
     * 
     * Lógica:
     * 1. Si hay selección y la casilla es destino legal -> ejecutar movimiento o encolar pre-move
     * 2. Si es pieza -> seleccionar y calcular legales (o pre-legales)
     * 3. Si no -> deseleccionar
     */
    public selectSquare(square: string): void {
        // Caso 1: Ya hay selección y este square es un destino válido -> mover o pre-mover
        if (this.selectedSquare && this.validDestinations.includes(square)) {
            const piece = this.engine.getPieceAt(this.selectedSquare);
            const isPremove = this.engine.getMode() === 'PLAY' && piece && piece.color !== this.engine.getTurn();

            if (isPremove) {
                this.premoveQueue.push({ from: this.selectedSquare, to: square });
                this.eventBus.emit('PREMOVE_QUEUED', { from: this.selectedSquare, to: square });
            } else {
                // Si hacemos un movimiento normal (o cambiamos de opinion), limpiamos los premoves
                if (this.premoveQueue.length > 0) {
                    this.clearPremoves();
                }
                this.engine.attemptMove(this.selectedSquare, square);
            }
            
            this.clearSelection();
            return;
        }

        // Caso 2: Click en una pieza -> seleccionar
        const piece = this.engine.getPieceAt(square);
        if (piece) {
            const turn = this.engine.getTurn();
            const mode = this.engine.getMode();

            if (mode !== 'PLAY' || piece.color === turn) {
                this.selectedSquare = square;
                this.validDestinations = this.engine.getLegalMovesFor(square);
            } else {
                // Es PLAY pero no es su turno -> Pre-move selection
                this.selectedSquare = square;
                this.validDestinations = this.engine.getPremoveDestinationsFor(square);
            }

            this.eventBus.emit('SQUARE_SELECTED', {
                square,
                legalMoves: this.validDestinations
            });
            return;
        }

        // Caso 3: Click en vacío sin selección previa -> deseleccionar
        this.clearSelection();
    }

    /** Limpia la selección actual */
    public clearSelection(): void {
        if (this.selectedSquare !== null) {
            this.selectedSquare = null;
            this.validDestinations = [];
            this.eventBus.emit('SQUARE_DESELECTED', {});
        }
    }

    /** Limpia la cola de pre-moves */
    public clearPremoves(): void {
        if (this.premoveQueue.length > 0) {
            this.premoveQueue = [];
            this.eventBus.emit('PREMOVE_CANCELLED', {});
        }
    }

    /**
     * Intenta ejecutar el siguiente pre-move de la cola si es el turno correcto.
     */
    private tryExecutePremove(): void {
        if (this.premoveQueue.length === 0) return;
        
        // Si el modo ya no es PLAY, cancelar
        if (this.engine.getMode() !== 'PLAY') {
            this.clearPremoves();
            return;
        }

        const nextPremove = this.premoveQueue[0];
        const piece = this.engine.getPieceAt(nextPremove.from);
        
        // Verificamos si la pieza sigue allí y ahora SÍ es su turno
        if (piece && piece.color === this.engine.getTurn()) {
            this.premoveQueue.shift(); // Sacar de la cola
            
            // Intentar ejecutar
            const result = this.engine.attemptMove(nextPremove.from, nextPremove.to);
            if (result.success) {
                this.eventBus.emit('PREMOVE_EXECUTED', { from: nextPremove.from, to: nextPremove.to });
                // Si aún hay más premoves (algo raro porque los turnos alternan, pero por si acaso)
                // se ejecutarán en el siguiente BOARD_UPDATED
            } else {
                // Si falló (ej: quedó en jaque, pieza bloqueada), cancelar todo
                this.clearPremoves();
            }
        }
    }

    // ═══════════════════════════════════════════════
    //  GETTERS PARA HEADLESS BOARD
    // ═══════════════════════════════════════════════

    public getSelectedSquare(): string | null {
        return this.selectedSquare;
    }

    public getValidDestinations(): string[] {
        return this.validDestinations;
    }

    public getPremoves(): Premove[] {
        return this.premoveQueue;
    }
}
