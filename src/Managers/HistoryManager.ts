// src/Managers/HistoryManager.ts
// Capa de conveniencia sobre el GameTree + ChessEngine para operaciones
// de historial de alto nivel. Facilita el Time Travel API.

import { ChessEngine } from '../Core/ChessEngine';
import { EventBus } from '../Core/EventBus';
import type { MoveData } from '../Types/game-tree.types';

export class HistoryManager {
    private engine: ChessEngine;
    private eventBus: EventBus;

    constructor(engine: ChessEngine, eventBus: EventBus) {
        this.engine = engine;
        this.eventBus = eventBus;
    }

    // ═══════════════════════════════════════════
    //  TIME TRAVEL API
    // ═══════════════════════════════════════════

    /** Deshace el último movimiento */
    public undo(): boolean {
        return this.engine.undo();
    }

    /** Rehace el siguiente movimiento */
    public redo(): boolean {
        return this.engine.redo();
    }

    /** Salta al inicio de la partida */
    public goToStart(): void {
        this.engine.goToStart();
    }

    /** Salta al final de la partida */
    public goToEnd(): void {
        this.engine.goToEnd();
    }

    /** Navega a un movimiento específico por ID de nodo */
    public goToMove(nodeId: string): boolean {
        return this.engine.goToMove(nodeId);
    }

    // ═══════════════════════════════════════════
    //  SERIALIZACIÓN
    // ═══════════════════════════════════════════

    /** Exporta la partida actual como PGN */
    public exportPgn(): string {
        return this.engine.getPgn();
    }

    /** Importa una partida desde PGN */
    public importPgn(pgn: string): boolean {
        return this.engine.loadPgn(pgn);
    }

    /** Exporta la posición actual como FEN */
    public exportFen(): string {
        return this.engine.getFen();
    }

    /** Importa una posición desde FEN */
    public importFen(fen: string): boolean {
        return this.engine.loadFen(fen);
    }

    // ═══════════════════════════════════════════
    //  CONSULTAS
    // ═══════════════════════════════════════════

    /** Se puede deshacer? */
    public canUndo(): boolean {
        return this.engine.canUndo();
    }

    /** Se puede rehacer? */
    public canRedo(): boolean {
        return this.engine.canRedo();
    }

    /** Retorna la lista de movimientos de la línea principal */
    public getMoveList(): MoveData[] {
        const mainLine = this.engine.getGameTree().getMainLine();
        return mainLine
            .filter(node => node.move !== null)
            .map(node => node.move!);
    }

    /** Retorna el índice del movimiento actual */
    public getCurrentMoveIndex(): number {
        return this.engine.getGameTree().getCurrentNode().halfMoveIndex;
    }

    /** Retorna el total de movimientos en la línea principal */
    public getTotalMoves(): number {
        return this.engine.getGameTree().getMainLine().length - 1;
    }
}
