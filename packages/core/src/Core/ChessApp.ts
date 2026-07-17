import { EventBus } from './EventBus';
import { ChessEngine } from './ChessEngine';
import { HeadlessBoard } from './HeadlessBoard';
import { InteractionManager } from '../Managers/InteractionManager';
import { AnnotationManager } from '../Managers/AnnotationManager';
import type { BoardSnapshot, MoveResult, EngineMode } from '../Types';
import type { PieceSymbol } from 'chess.js';

export interface ChessAppConfig {
    fen?: string;
    mode?: EngineMode;
}

/**
 * @class ChessApp
 * @description Punto de entrada principal del framework.
 * Encapsula todo el ecosistema (Engine, Board, Interaction, Annotations, Events)
 * en una sola instancia autocontenida. Permite crear múltiples tableros
 * independientes sin colisiones de estado.
 */
export class ChessApp {
    readonly engine: ChessEngine;
    readonly board: HeadlessBoard;
    readonly events: EventBus;
    readonly interaction: InteractionManager;
    readonly annotations: AnnotationManager;

    private boardOrientation: 'w' | 'b' = 'w';

    constructor(config: ChessAppConfig = {}) {
        this.events = new EventBus();
        this.engine = new ChessEngine(this.events, config.fen);
        this.interaction = new InteractionManager(this.engine, this.events);
        this.annotations = new AnnotationManager(this.events);
        this.board = new HeadlessBoard(this.engine, {
            interactionManager: this.interaction,
            annotationManager: this.annotations,
            getOrientation: () => this.boardOrientation,
        });

        if (config.mode) this.engine.setMode(config.mode);
    }

    /** Retorna el snapshot completo del tablero */
    getSnapshot(): BoardSnapshot {
        return this.board.getBoardSnapshot();
    }

    /** Ejecuta un movimiento */
    move(from: string, to: string, promotion?: PieceSymbol): MoveResult {
        return this.engine.attemptMove(from, to, promotion);
    }

    /** Maneja click en una casilla (selección, movimiento, deselección) */
    click(square: string): void {
        this.board.handleSquareClick(square);
    }

    /** Deshace el último movimiento */
    undo(): boolean {
        return this.engine.undo();
    }

    /** Rehace el siguiente movimiento */
    redo(): boolean {
        return this.engine.redo();
    }

    /** Toggles the board orientation between 'w' and 'b' */
    flipBoard(): void {
        this.boardOrientation = this.boardOrientation === 'w' ? 'b' : 'w';
    }

    /** Sets the board orientation to a specific color */
    setBoardOrientation(color: 'w' | 'b'): void {
        this.boardOrientation = color;
    }

    /** Returns the current board orientation */
    getBoardOrientation(): 'w' | 'b' {
        return this.boardOrientation;
    }

    /** Resets the game, clearing all state including annotations and interaction */
    resetGame(fen?: string): void {
        this.engine.resetGame(fen);
        this.annotations.clearAll();
        this.interaction.clearSelection();
        this.interaction.clearPremoves();
    }

    /** Limpia todas las suscripciones y estado */
    destroy(): void {
        this.interaction.destroy();
        this.events.removeAllListeners();
    }
}
