import type { PieceSymbol, Color } from 'chess.js';

// ─── Square & Piece Primitives ───────────────────────────────────────────────

export interface SquareCoord {
    x: number;
    y: number;
}

export interface PieceData {
    type: PieceSymbol;
    color: Color;
}

export interface SquareData {
    algebraic: string;
    isLight: boolean;
    piece: PieceData | null;
}

// ─── Move Types ──────────────────────────────────────────────────────────────

export interface MoveResult {
    success: boolean;
    move?: MoveData;
    reason?: 'illegal' | 'wrong_turn' | 'game_over' | 'promotion_required';
}

export interface MoveData {
    from: string;
    to: string;
    san: string;
    lan: string;
    piece: PieceSymbol;
    captured?: PieceSymbol;
    promotion?: PieceSymbol;
    isCheck: boolean;
    isCheckmate: boolean;
    isCastle: boolean;
    isEnPassant: boolean;
    isPromotion: boolean;
    fenBefore: string;
    fenAfter: string;
}

// ─── Visual Effect System ────────────────────────────────────────────────────

export type EffectVariant = 'success' | 'danger' | 'info' | 'warning';
export type EffectAnimation = 'bounce' | 'fade' | 'pulse';

export interface BoardEffect {
    id: string;
    type: string; // 'checkmate' | 'stalemate' | 'timeout' | 'winner' | 'puzzle-complete' | etc.
    square: string; // algebraic notation
    variant: EffectVariant;
    label?: string;
    animation?: EffectAnimation;
}

// ─── Annotation Types ────────────────────────────────────────────────────────

export interface ArrowAnnotation {
    id: string;
    type: 'arrow';
    from: string;
    to: string;
    color: string;
}

export interface HighlightAnnotation {
    id: string;
    type: 'highlight';
    square: string;
    color: string;
}

export type Annotation = ArrowAnnotation | HighlightAnnotation;

// ─── Premove ─────────────────────────────────────────────────────────────────

export interface Premove {
    from: string;
    to: string;
}

// ─── Game Tree Node (for history panel) ──────────────────────────────────────

export interface MoveNodeData {
    id: string;
    move: MoveData | null;
    fen: string;
    children: MoveNodeData[];
    comment: string;
}

// ─── BoardController Interface ───────────────────────────────────────────────
// This is the CORE port that decouples the Board UI from any game logic.
// Each game mode (Online, Bot, Analysis) implements this contract.

export interface BoardController {
    // === Orientation ===
    getOrientation(): Color;

    // === Game State ===
    isGameOver(): boolean;
    isInteractive(): boolean;
    getTurn(): Color;
    getFen(): string;
    canUndo(): boolean;
    canRedo(): boolean;

    // === Movement ===
    canMoveFrom(square: string): boolean;
    getLegalDestinations(square: string): string[];
    getPremoveDestinations(square: string): string[];
    makeMove(from: string, to: string, promotion?: PieceSymbol): MoveResult;
    isPromotionMove(from: string, to: string): boolean;

    // === Selection & Premoves ===
    getSelectedSquare(): string | null;
    selectSquare(square: string): void;
    clearSelection(): void;
    getPremoves(): Premove[];
    clearPremoves(): void;

    // === Board Data ===
    getPieceAt(square: string): PieceData | null;
    getBoardGrid(): SquareData[][];
    getLastMove(): { from: string; to: string } | null;

    // === Annotations ===
    getAnnotations(): Annotation[];
    addArrow(from: string, to: string, color?: string): void;
    addHighlight(square: string, color?: string): void;
    removeAnnotation(id: string): void;
    clearAnnotations(): void;

    // === Effects ===
    getActiveEffects(): BoardEffect[];

    // === Navigation (for history panel) ===
    getMainLine(): MoveNodeData[];
    getCurrentNodeId(): string;
    goToMove(nodeId: string): void;
    goToStart(): void;
    goToEnd(): void;
    undo(): void;
    redo(): void;

    // === Events ===
    onBoardChange(callback: () => void): () => void;
}
