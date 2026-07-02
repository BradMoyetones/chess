// src/Managers/InteractionManager.ts
// Puente entre el input del usuario y la lógica del motor.
// Gestiona: selección de casillas, destinos legales, y click-to-move.

import { ChessEngine } from '../Core/ChessEngine';
import { EventBus } from '../Core/EventBus';

export class InteractionManager {
    private engine: ChessEngine;
    private eventBus: EventBus;
    private selectedSquare: string | null = null;
    private validDestinations: string[] = [];

    constructor(engine: ChessEngine, eventBus: EventBus) {
        this.engine = engine;
        this.eventBus = eventBus;

        // Limpiar selección cuando el tablero cambia por navegación
        this.eventBus.on('NAVIGATE_TO_MOVE', () => this.clearSelection());
        this.eventBus.on('POSITION_LOADED', () => this.clearSelection());
        this.eventBus.on('GAME_RESET', () => this.clearSelection());
    }

    /**
     * Maneja el click/tap en una casilla.
     * 
     * Lógica:
     * 1. Si hay selección y la casilla es destino legal -> ejecutar movimiento
     * 2. Si es pieza propia -> seleccionar y calcular legales
     * 3. Si no -> deseleccionar
     */
    public selectSquare(square: string): void {
        // Caso 1: Ya hay selección y este square es un destino válido -> mover
        if (this.selectedSquare && this.validDestinations.includes(square)) {
            this.engine.attemptMove(this.selectedSquare, square);
            this.clearSelection();
            return;
        }

        // Caso 2: Click en una pieza -> seleccionar
        const piece = this.engine.getPieceAt(square);
        if (piece) {
            const turn = this.engine.getTurn();
            const mode = this.engine.getMode();

            // En PLAY solo seleccionar piezas del turno actual
            // En ANALYSIS/SETUP seleccionar cualquier pieza
            if (mode !== 'PLAY' || piece.color === turn) {
                this.selectedSquare = square;
                this.validDestinations = this.engine.getLegalMovesFor(square);

                this.eventBus.emit('SQUARE_SELECTED', {
                    square,
                    legalMoves: this.validDestinations
                });
                return;
            }
        }

        // Caso 3: Click en vacío o pieza enemiga sin selección previa -> deseleccionar
        this.clearSelection();
    }

    /**
     * Limpia la selección actual.
     */
    public clearSelection(): void {
        if (this.selectedSquare !== null) {
            this.selectedSquare = null;
            this.validDestinations = [];
            this.eventBus.emit('SQUARE_DESELECTED', {});
        }
    }

    /** Retorna la casilla seleccionada actualmente */
    public getSelectedSquare(): string | null {
        return this.selectedSquare;
    }

    /** Retorna los destinos legales para la pieza seleccionada */
    public getValidDestinations(): string[] {
        return this.validDestinations;
    }
}
