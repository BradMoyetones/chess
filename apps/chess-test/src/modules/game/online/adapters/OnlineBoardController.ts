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

export interface OnlineBoardControllerConfig {
    app: ChessApp;
    playerColor: 'w' | 'b';
    isGameOver: boolean;
    onMoveEmit: (move: MoveData) => void;
    whiteTime?: number | null;
    blackTime?: number | null;
}

/**
 * BoardController adapter for online multiplayer games.
 * Wraps ChessApp and adds online-specific constraints:
 * - Can only move own pieces
 * - Premoves for opponent's turn
 * - Game over prevents interaction
 * - Moves are emitted via socket
 */
export class OnlineBoardController implements BoardController {
    private app: ChessApp;
    private playerColor: 'w' | 'b';
    private _isGameOver: boolean;
    private onMoveEmit: (move: MoveData) => void;
    private whiteTime: number | null;
    private blackTime: number | null;

    constructor(config: OnlineBoardControllerConfig) {
        this.app = config.app;
        this.playerColor = config.playerColor;
        this._isGameOver = config.isGameOver;
        this.onMoveEmit = config.onMoveEmit;
        this.whiteTime = config.whiteTime ?? null;
        this.blackTime = config.blackTime ?? null;
    }

    update(config: Partial<OnlineBoardControllerConfig>): void {
        if (config.isGameOver !== undefined) this._isGameOver = config.isGameOver;
        if (config.whiteTime !== undefined) this.whiteTime = config.whiteTime ?? null;
        if (config.blackTime !== undefined) this.blackTime = config.blackTime ?? null;
        if (config.onMoveEmit) this.onMoveEmit = config.onMoveEmit;
    }

    // === Orientation ===
    getOrientation(): 'w' | 'b' {
        return this.playerColor;
    }

    // === Game State ===
    isGameOver(): boolean {
        const isWhiteTimeout = this.whiteTime !== null && this.whiteTime <= 0;
        const isBlackTimeout = this.blackTime !== null && this.blackTime <= 0;
        return this._isGameOver || this.app.engine.isGameOver() || isWhiteTimeout || isBlackTimeout;
    }

    isInteractive(): boolean {
        return !this.isGameOver() && !this.app.engine.canRedo();
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

    // === Movement ===
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
            this.onMoveEmit(result.move as unknown as MoveData);

            // Clean up premoves if needed
            const premovesBefore = this.app.interaction.getPremoves();
            if (premovesBefore.length > 0) {
                const first = premovesBefore[0];
                const p = this.app.engine.getPieceAt(first.from);
                if (p && p.color === this.app.engine.getTurn()) {
                    this.app.interaction.clearPremoves();
                }
            }
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

    // === Selection & Premoves ===
    getSelectedSquare(): string | null {
        return this.app.interaction.getSelectedSquare();
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

    // === Board Data ===
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

    // === Annotations ===
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

    // === Effects ===
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
                if (sq.piece.color === loserColor) {
                    loserKing = sq.algebraic;
                } else {
                    winnerKing = sq.algebraic;
                }
            }
        });

        if (isStalemate || (isDraw && !isCheckmate)) {
            // Draw effects on both kings
            if (loserKing) {
                effects.push({
                    id: 'draw-1',
                    type: 'draw',
                    square: loserKing,
                    variant: 'warning',
                    label: isStalemate ? 'Stalemate' : 'Draw',
                });
            }
            if (winnerKing) {
                effects.push({
                    id: 'draw-2',
                    type: 'draw',
                    square: winnerKing,
                    variant: 'warning',
                    label: isStalemate ? 'Stalemate' : 'Draw',
                });
            }
        } else {
            // Win/loss effects
            if (loserKing) {
                let effectType = 'checkmate';
                let label = 'Checkmate';
                if (isWhiteTimeout || isBlackTimeout) {
                    effectType = 'timeout';
                    label = 'Timeout';
                }
                effects.push({
                    id: 'loser',
                    type: effectType,
                    square: loserKing,
                    variant: 'danger',
                    label,
                });
            }
            if (winnerKing) {
                effects.push({
                    id: 'winner',
                    type: 'winner',
                    square: winnerKing,
                    variant: 'success',
                    label: 'Winner',
                });
            }
        }

        return effects;
    }

    // === Navigation ===
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

    // === Events ===
    onBoardChange(callback: () => void): () => void {
        const unsubs = [
            this.app.events.on('BOARD_UPDATED', callback),
            this.app.events.on('PREMOVE_CANCELLED', callback),
            this.app.events.on('PREMOVE_QUEUED', callback),
        ];
        return () => unsubs.forEach((unsub) => unsub());
    }

    // === Access to underlying app (for advanced use) ===
    getApp(): ChessApp {
        return this.app;
    }
}
