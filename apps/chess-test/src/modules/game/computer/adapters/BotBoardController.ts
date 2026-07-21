import { ChessApp, type Color, type PieceSymbol } from '@chess-fw/core';
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

export interface BotBoardControllerConfig {
    app: ChessApp;
    playerColor: Color;
    isGameOver: boolean;
    whiteTime?: number | null;
    blackTime?: number | null;
}

/**
 * BoardController adapter for bot/computer games.
 * Similar to Online but:
 * - No socket emission
 * - Server turn is derived from game tree
 * - Supports undo/redo freely
 */
export class BotBoardController implements BoardController {
    private app: ChessApp;
    private playerColor: Color;
    private _isGameOver: boolean;
    private whiteTime: number | null;
    private blackTime: number | null;

    constructor(config: BotBoardControllerConfig) {
        this.app = config.app;
        this.playerColor = config.playerColor;
        this._isGameOver = config.isGameOver;
        this.whiteTime = config.whiteTime ?? null;
        this.blackTime = config.blackTime ?? null;
    }

    update(config: Partial<BotBoardControllerConfig>): void {
        if (config.playerColor !== undefined) this.playerColor = config.playerColor;
        if (config.isGameOver !== undefined) this._isGameOver = config.isGameOver;
        if (config.whiteTime !== undefined) this.whiteTime = config.whiteTime ?? null;
        if (config.blackTime !== undefined) this.blackTime = config.blackTime ?? null;
    }

    getOrientation(): Color {
        return this.playerColor;
    }

    isGameOver(): boolean {
        const isWhiteTimeout = this.whiteTime !== null && this.whiteTime <= 0;
        const isBlackTimeout = this.blackTime !== null && this.blackTime <= 0;
        return this._isGameOver || this.app.engine.isGameOver() || isWhiteTimeout || isBlackTimeout;
    }

    isInteractive(): boolean {
        return !this.isGameOver() && !this.app.engine.canRedo();
    }

    getTurn(): Color {
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

    canMoveFrom(square: string): boolean {
        if (!this.isInteractive()) return false;
        const piece = this.app.engine.getPieceAt(square);
        return piece !== null && piece.color === this.playerColor;
    }

    getLegalDestinations(square: string): string[] {
        return this.app.engine.getLegalMovesFor(square);
    }

    getPremoveDestinations(square: string): string[] {
        return this.app.engine.getPremoveDestinationsFor(square);
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
        return this.app.interaction.getPremoves();
    }

    clearPremoves(): void {
        this.app.interaction.clearPremoves();
    }

    handleSquareClick(square: string): MoveData | null {
        if (this.isGameOver()) return null;
        if (this.app.engine.canRedo()) return null;

        const piece = this.app.engine.getPieceAt(square);
        if (piece && piece.color !== this.playerColor) {
            const selectedSq = this.app.interaction.getSelectedSquare();
            if (selectedSq) {
                const validDests = this.app.interaction.getValidDestinations();
                if (!validDests.includes(square)) {
                    return null;
                }
            } else {
                return null;
            }
        }

        if (this.app.interaction.getSelectedSquare() === square) {
            this.app.interaction.clearSelection();
            return null;
        }

        const fenBefore = this.app.engine.getFen();
        this.app.click(square);
        const fenAfter = this.app.engine.getFen();

        if (fenBefore !== fenAfter) {
            const lastMove = this.app.engine.getLastMove();
            if (lastMove) {
                return lastMove as unknown as MoveData;
            }
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
        const effects: BoardEffect[] = [];
        const isCheckmate = this.app.engine.isCheckmate();
        const isWhiteTimeout = this.whiteTime !== null && this.whiteTime <= 0;
        const isBlackTimeout = this.blackTime !== null && this.blackTime <= 0;
        const isStalemate = this.app.engine.isStalemate();
        const isDraw = this.app.engine.isDraw();

        if (!this.isGameOver()) return effects;

        const board = this.app.getSnapshot().board;
        let loserKing: string | null = null;
        let winnerKing: string | null = null;
        const turn = this.app.engine.getTurn();
        const loserColor = isWhiteTimeout ? 'w' : isBlackTimeout ? 'b' : turn;

        board.flat().forEach((sq: any) => {
            if (sq.piece?.type === 'k') {
                if (sq.piece.color === loserColor) loserKing = sq.algebraic;
                else winnerKing = sq.algebraic;
            }
        });

        if (isStalemate || (isDraw && !isCheckmate)) {
            if (loserKing) {
                effects.push({
                    id: 'draw-1', type: 'draw', square: loserKing,
                    variant: 'warning', label: isStalemate ? 'Stalemate' : 'Draw',
                });
            }
            if (winnerKing) {
                effects.push({
                    id: 'draw-2', type: 'draw', square: winnerKing,
                    variant: 'warning', label: isStalemate ? 'Stalemate' : 'Draw',
                });
            }
        } else {
            if (loserKing) {
                effects.push({
                    id: 'loser',
                    type: isWhiteTimeout || isBlackTimeout ? 'timeout' : 'checkmate',
                    square: loserKing,
                    variant: 'danger',
                    label: isWhiteTimeout || isBlackTimeout ? 'Timeout' : 'Checkmate',
                });
            }
            if (winnerKing) {
                effects.push({
                    id: 'winner', type: 'winner', square: winnerKing,
                    variant: 'success', label: 'Winner',
                });
            }
        }

        return effects;
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
            this.app.events.on('PREMOVE_CANCELLED', callback),
            this.app.events.on('PREMOVE_QUEUED', callback),
            this.app.events.on('SQUARE_SELECTED', callback),
            this.app.events.on('SQUARE_DESELECTED', callback),
            this.app.events.on('ANNOTATION_ADDED', callback),
            this.app.events.on('ANNOTATION_REMOVED', callback),
            this.app.events.on('ANNOTATIONS_CLEARED', callback),
        ];
        return () => unsubs.forEach((unsub) => unsub());
    }

    getApp(): ChessApp {
        return this.app;
    }
}
