import { ChessEngine } from '../Core';
import type { MoveData } from '../Types';
import { Service, Inject } from '../Decorators';

/**
 * @class HistoryManager
 * @description Capa de conveniencia sobre el GameTree + ChessEngine para operaciones
 * de historial de alto nivel. Facilita el Time Travel API.
 * Gestiona el viaje en el tiempo y la serialización PGN/FEN.
 */
@Service()
export class HistoryManager {
    @Inject(ChessEngine)
    private engine!: ChessEngine;

    // ═══════════════════════════════════════════
    //  TIME TRAVEL API
    // ═══════════════════════════════════════════

    /** 
     * @method undo
     * @description Deshace el último movimiento 
     */
    public undo(): boolean {
        return this.engine.undo();
    }

    /** 
     * @method redo
     * @description Rehace el siguiente movimiento 
     */
    public redo(): boolean {
        return this.engine.redo();
    }

    /** 
     * @method goToStart
     * @description Salta al inicio de la partida 
     */
    public goToStart(): void {
        this.engine.goToStart();
    }

    /** 
     * @method goToEnd
     * @description Salta al final de la partida 
     */
    public goToEnd(): void {
        this.engine.goToEnd();
    }

    /** 
     * @method goToMove
     * @description Navega a un movimiento específico por ID de nodo 
     * @param nodeId El ID del nodo en el Game Tree
     */
    public goToMove(nodeId: string): boolean {
        return this.engine.goToMove(nodeId);
    }

    // ═══════════════════════════════════════════
    //  SERIALIZACIÓN
    // ═══════════════════════════════════════════

    /** 
     * @method exportPgn
     * @description Exporta la partida actual como PGN 
     */
    public exportPgn(): string {
        return this.engine.getPgn();
    }

    /** 
     * @method importPgn
     * @description Importa una partida desde PGN 
     */
    public importPgn(pgn: string): boolean {
        return this.engine.loadPgn(pgn);
    }

    /** 
     * @method exportFen
     * @description Exporta la posición actual como FEN 
     */
    public exportFen(): string {
        return this.engine.getFen();
    }

    /** 
     * @method importFen
     * @description Importa una posición desde FEN 
     */
    public importFen(fen: string): boolean {
        return this.engine.loadFen(fen);
    }

    // ═══════════════════════════════════════════
    //  CONSULTAS
    // ═══════════════════════════════════════════

    /** 
     * @method canUndo
     * @description Indica si se puede deshacer un movimiento 
     */
    public canUndo(): boolean {
        return this.engine.canUndo();
    }

    /** 
     * @method canRedo
     * @description Indica si se puede rehacer un movimiento 
     */
    public canRedo(): boolean {
        return this.engine.canRedo();
    }

    /** 
     * @method getMoveList
     * @description Retorna la lista de movimientos de la línea principal 
     */
    public getMoveList(): MoveData[] {
        const mainLine = this.engine.getGameTree().getMainLine();
        return mainLine
            .filter(node => node.move !== null)
            .map(node => node.move!);
    }

    /** 
     * @method getCurrentMoveIndex
     * @description Retorna el índice del movimiento actual 
     */
    public getCurrentMoveIndex(): number {
        return this.engine.getGameTree().getCurrentNode().halfMoveIndex;
    }

    /** 
     * @method getTotalMoves
     * @description Retorna el total de movimientos en la línea principal 
     */
    public getTotalMoves(): number {
        return this.engine.getGameTree().getMainLine().length - 1;
    }
}
