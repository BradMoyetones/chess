import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
    BoardController,
    SquareData,
    Annotation,
    BoardEffect,
    Premove,
    MoveNodeData,
} from '@/modules/board/core/ports/BoardController.port';

// ─── Store State ─────────────────────────────────────────────────────────────

interface BoardStoreState {
    // === Board visual state (granular) ===
    boardGrid: SquareData[][];
    orientation: 'w' | 'b';
    selectedSquare: string | null;
    /** Valid destinations for the selected square.
     *  Comes from InteractionManager — includes premove destinations when not your turn. */
    validDestinations: string[];
    lastMove: { from: string; to: string } | null;
    annotations: Annotation[];
    effects: BoardEffect[];
    premoves: Premove[];

    // === Game state ===
    turn: 'w' | 'b';
    fen: string;
    isGameOver: boolean;
    isInteractive: boolean;
    canUndo: boolean;
    canRedo: boolean;

    // === Navigation state (for history panel) ===
    mainLine: MoveNodeData[];
    currentNodeId: string;

    // === Sync action ===
    /** Reads all visual state from the controller and updates the store.
     *  Call this after every user interaction or board event. */
    syncFromController: (controller: BoardController) => void;
}

// ─── Shallow equality for arrays ─────────────────────────────────────────────

function arraysEqual<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// ─── Store Creation ──────────────────────────────────────────────────────────

export const useBoardStore = create<BoardStoreState>()(
    subscribeWithSelector((set) => ({
        // Initial empty state
        boardGrid: [],
        orientation: 'w',
        selectedSquare: null,
        validDestinations: [],
        lastMove: null,
        annotations: [],
        effects: [],
        premoves: [],
        turn: 'w',
        fen: '',
        isGameOver: false,
        isInteractive: true,
        canUndo: false,
        canRedo: false,
        mainLine: [],
        currentNodeId: '',

        syncFromController: (controller: BoardController) => {
            const newGrid = controller.getBoardGrid();
            const newOrientation = controller.getOrientation();
            const newSelected = controller.getSelectedSquare();
            const newValidDests = newSelected ? controller.getValidDestinations() : [];
            const newLastMove = controller.getLastMove();
            const newAnnotations = controller.getAnnotations();
            const newEffects = controller.getActiveEffects();
            const newPremoves = controller.getPremoves();
            const newTurn = controller.getTurn();
            const newFen = controller.getFen();
            const newIsGameOver = controller.isGameOver();
            const newIsInteractive = controller.isInteractive();
            const newCanUndo = controller.canUndo();
            const newCanRedo = controller.canRedo();
            const newMainLine = controller.getMainLine();
            const newCurrentNodeId = controller.getCurrentNodeId();

            set((state) => {
                const updates: Partial<BoardStoreState> = {};
                let hasChanges = false;

                // Only update fields that actually changed
                if (state.fen !== newFen) {
                    updates.boardGrid = newGrid;
                    updates.fen = newFen;
                    hasChanges = true;
                }
                if (state.orientation !== newOrientation) {
                    updates.orientation = newOrientation;
                    hasChanges = true;
                }
                if (state.selectedSquare !== newSelected || !arraysEqual(state.validDestinations, newValidDests)) {
                    updates.selectedSquare = newSelected;
                    updates.validDestinations = newValidDests;
                    hasChanges = true;
                }
                if (state.lastMove?.from !== newLastMove?.from || state.lastMove?.to !== newLastMove?.to) {
                    updates.lastMove = newLastMove;
                    hasChanges = true;
                }
                if (state.annotations.length !== newAnnotations.length) {
                    updates.annotations = newAnnotations;
                    hasChanges = true;
                }
                if (state.effects.length !== newEffects.length) {
                    updates.effects = newEffects;
                    hasChanges = true;
                }
                if (state.premoves.length !== newPremoves.length) {
                    updates.premoves = newPremoves;
                    hasChanges = true;
                }
                if (state.turn !== newTurn) {
                    updates.turn = newTurn;
                    hasChanges = true;
                }
                if (state.isGameOver !== newIsGameOver) {
                    updates.isGameOver = newIsGameOver;
                    hasChanges = true;
                }
                if (state.isInteractive !== newIsInteractive) {
                    updates.isInteractive = newIsInteractive;
                    hasChanges = true;
                }
                if (state.canUndo !== newCanUndo) {
                    updates.canUndo = newCanUndo;
                    hasChanges = true;
                }
                if (state.canRedo !== newCanRedo) {
                    updates.canRedo = newCanRedo;
                    hasChanges = true;
                }
                if (state.currentNodeId !== newCurrentNodeId) {
                    updates.mainLine = newMainLine;
                    updates.currentNodeId = newCurrentNodeId;
                    hasChanges = true;
                }

                return hasChanges ? updates : state;
            });
        },
    }))
);

// ─── Selector hooks for granular subscriptions ───────────────────────────────
// Components should use these selectors to avoid unnecessary re-renders.

export const useBoardGrid = () => useBoardStore((s) => s.boardGrid);
export const useBoardOrientation = () => useBoardStore((s) => s.orientation);
export const useSelectedSquare = () => useBoardStore((s) => s.selectedSquare);
export const useValidDestinations = () => useBoardStore((s) => s.validDestinations);
export const useLastMoveSquares = () => useBoardStore((s) => s.lastMove);
export const useBoardAnnotations = () => useBoardStore((s) => s.annotations);
export const useBoardEffects = () => useBoardStore((s) => s.effects);
export const useBoardPremoves = () => useBoardStore((s) => s.premoves);
export const useBoardTurn = () => useBoardStore((s) => s.turn);
export const useBoardFen = () => useBoardStore((s) => s.fen);
export const useIsGameOver = () => useBoardStore((s) => s.isGameOver);
export const useIsInteractive = () => useBoardStore((s) => s.isInteractive);
export const useCanUndo = () => useBoardStore((s) => s.canUndo);
export const useCanRedo = () => useBoardStore((s) => s.canRedo);
export const useMainLine = () => useBoardStore((s) => s.mainLine);
export const useCurrentNodeId = () => useBoardStore((s) => s.currentNodeId);
