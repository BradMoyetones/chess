import type { PieceSymbol } from 'chess.js';
import { ChessApp } from '@chess-fw/core';
import type {
    BoardController,
    MoveResult,
    MoveData,
    Annotation,
    BoardEffect,
    Premove,
    PieceData,
    SquareData,
    MoveNodeData,
} from '@/modules/board/core/ports/BoardController.port';

/**
 * BoardController adapter for Analysis mode.
 * Key differences:
 * - Both colors can move (no player color restriction)
 * - Variations are allowed (via core's ANALYSIS mode)
 * - No game over effects
 * - Free navigation through move tree
 */
export class AnalysisBoardController implements BoardController {
    private app: ChessApp;
    private orientation: 'w' | 'b';

    constructor(app: ChessApp, orientation: 'w' | 'b' = 'w') {
        this.app = app;
        this.orientation = orientation;
        // Set core to ANALYSIS mode — allows either color to move
        this.app.engine.setMode('ANALYSIS');
    }

    getOrientation(): 'w' | 'b' {
        return this.orientation;
    }

    setOrientation(color: 'w' | 'b'): void {
        this.orientation = color;
    }

    flipBoard(): void {
        this.orientation = this.orientation === 'w' ? 'b' : 'w';
    }

    isGameOver(): boolean {
        return false; // Analysis never ends
    }

    isInteractive(): boolean {
        return true; // Always interactive
    }

    getTurn(): 'w' | 'b' {
        return this.app.engine.getTurn();
    }

    getFen(): string {
        return this.app.engine.getFen();
    }

    canUndo(): boolean {
        return this.app.engine.canUndo();
    }

    canRedo(): boolean {
        return this.app.engine.canRedo();
    }

    canMoveFrom(_square: string): boolean {
        return true; // In analysis, any piece can be moved
    }

    getLegalDestinations(square: string): string[] {
        return this.app.engine.getLegalMovesFor(square);
    }

    getPremoveDestinations(_square: string): string[] {
        return []; // No premoves in analysis
    }

    makeMove(from: string, to: string, promotion?: PieceSymbol): MoveResult {
        const result = this.app.engine.attemptMove(from, to, promotion);
        if (result && result.success) {
            this.app.interaction.clearSelection();
        }
        return result as unknown as MoveResult;
    }

    isPromotionMove(from: string, to: string): boolean {
        const piece = this.app.engine.getPieceAt(from);
        if (!piece || piece.type !== 'p') return false;
        const targetRank = to[1];
        return (
            (piece.color === 'w' && targetRank === '8') ||
            (piece.color === 'b' && targetRank === '1')
        );
    }

    getSelectedSquare(): string | null {
        return this.app.interaction.getSelectedSquare();
    }

    getValidDestinations(): string[] {
        return this.app.interaction.getValidDestinations();
    }

    selectSquare(square: string): void {
        this.app.interaction.selectSquare(square);
    }

    clearSelection(): void {
        this.app.interaction.clearSelection();
    }

    getPremoves(): Premove[] {
        return []; // No premoves in analysis
    }

    clearPremoves(): void {
        // No-op in analysis
    }

    handleSquareClick(square: string): MoveData | null {
        if (this.app.interaction.getSelectedSquare() === square) {
            this.app.interaction.clearSelection();
            return null;
        }

        const fenBefore = this.app.engine.getFen();
        this.app.click(square);
        const fenAfter = this.app.engine.getFen();

        if (fenBefore !== fenAfter) {
            const lastMove = this.app.engine.getLastMove();
            return lastMove as unknown as MoveData | null;
        }

        return null;
    }

    getPieceAt(square: string): PieceData | null {
        return this.app.engine.getPieceAt(square) as PieceData | null;
    }

    getBoardGrid(): SquareData[][] {
        const snapshot = this.app.getSnapshot();
        return snapshot.board as unknown as SquareData[][];
    }

    getLastMove(): { from: string; to: string } | null {
        const lastMove = this.app.engine.getLastMove();
        if (!lastMove) return null;
        return { from: lastMove.from, to: lastMove.to };
    }

    getAnnotations(): Annotation[] {
        return this.app.annotations.getAnnotations() as unknown as Annotation[];
    }

    addArrow(from: string, to: string, color?: string): void {
        this.app.annotations.addArrow(from, to, color || 'green');
    }

    addHighlight(square: string, color?: string): void {
        this.app.annotations.addHighlight(square, color || 'yellow');
    }

    removeAnnotation(id: string): void {
        this.app.annotations.removeAnnotation(id);
    }

    clearAnnotations(): void {
        this.app.annotations.clearAll();
    }

    getActiveEffects(): BoardEffect[] {
        return []; // No effects in analysis
    }

    getMainLine(): MoveNodeData[] {
        return this.app.engine.getGameTree().getMainLine() as unknown as MoveNodeData[];
    }

    getCurrentNodeId(): string {
        return this.app.engine.getGameTree().getCurrentNode().id;
    }

    goToMove(nodeId: string): void {
        this.app.engine.goToMove(nodeId);
    }

    goToStart(): void {
        this.app.engine.goToStart();
    }

    goToEnd(): void {
        this.app.engine.goToEnd();
    }

    undo(): void {
        this.app.engine.undo();
    }

    redo(): void {
        this.app.engine.redo();
    }

    onBoardChange(callback: () => void): () => void {
        const unsubs = [
            this.app.events.on('BOARD_UPDATED', callback),
            this.app.events.on('SQUARE_SELECTED', callback),
            this.app.events.on('SQUARE_DESELECTED', callback),
            this.app.events.on('ANNOTATION_ADDED', callback),
            this.app.events.on('ANNOTATION_REMOVED', callback),
            this.app.events.on('ANNOTATIONS_CLEARED', callback),
        ];
        return () => unsubs.forEach((unsub) => unsub());
    }

    // Load a position or game for analysis
    loadFen(fen: string): void {
        this.app.engine.loadFen(fen);
    }

    loadPgn(pgn: string): void {
        this.app.engine.loadPgn(pgn);
    }

    getApp(): ChessApp {
        return this.app;
    }
}
