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

    constructor(config: ChessAppConfig = {}) {
        this.events = new EventBus();
        this.engine = new ChessEngine(this.events, config.fen);
        this.interaction = new InteractionManager(this.engine, this.events);
        this.annotations = new AnnotationManager(this.events);
        this.board = new HeadlessBoard(this.engine, {
            interactionManager: this.interaction,
            annotationManager: this.annotations,
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

    /** Limpia todas las suscripciones y estado */
    destroy(): void {
        this.interaction.destroy();
        this.events.removeAllListeners();
    }
}
