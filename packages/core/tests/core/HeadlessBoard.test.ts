import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChessEngine } from '../../src/Core/ChessEngine';
import { EventBus } from '../../src/Core/EventBus';
import { HeadlessBoard } from '../../src/Core/HeadlessBoard';
import { InteractionManager } from '../../src/Managers/InteractionManager';
import { AnnotationManager } from '../../src/Managers/AnnotationManager';

describe('HeadlessBoard', () => {
    let eventBus: EventBus;
    let engine: ChessEngine;
    let interaction: InteractionManager;
    let annotations: AnnotationManager;
    let board: HeadlessBoard;

    beforeEach(() => {
        eventBus = new EventBus();
        engine = new ChessEngine(eventBus);
        interaction = new InteractionManager(engine, eventBus);
        annotations = new AnnotationManager(eventBus);
        board = new HeadlessBoard(engine, {
            interactionManager: interaction,
            annotationManager: annotations,
        });
    });

    // ═══════════════════════════════════════════
    //  getBoardSnapshot() STRUCTURE
    // ═══════════════════════════════════════════

    describe('getBoardSnapshot()', () => {
        it('returns correct structure (8x8 grid, gameState, visuals, history)', () => {
            const snapshot = board.getBoardSnapshot();

            // Board grid is 8 rows × 8 columns
            expect(snapshot.board).toHaveLength(8);
            snapshot.board.forEach(row => {
                expect(row).toHaveLength(8);
            });

            // gameState
            expect(snapshot.gameState).toEqual(expect.objectContaining({
                turn: 'w',
                inCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isGameOver: false,
                moveNumber: 1,
                mode: 'PLAY',
            }));
            expect(typeof snapshot.gameState.fen).toBe('string');

            // visuals
            expect(snapshot.visuals).toEqual(expect.objectContaining({
                lastMove: null,
                selectedSquare: null,
                validDestinations: [],
                premoves: [],
                annotations: [],
            }));

            // history
            expect(snapshot.history).toEqual(expect.objectContaining({
                canUndo: false,
                canRedo: false,
                moveCount: 0,
                currentIndex: 0,
            }));
            expect(typeof snapshot.history.hasVariations).toBe('boolean');
        });
    });

    // ═══════════════════════════════════════════
    //  ALGEBRAIC NOTATION
    // ═══════════════════════════════════════════

    describe('algebraic notation', () => {
        it('board grid has correct algebraic notation (a8 top-left, h1 bottom-right)', () => {
            const snapshot = board.getBoardSnapshot();

            // Top-left corner (row 0, col 0) should be a8
            expect(snapshot.board[0][0].algebraic).toBe('a8');

            // Top-right corner (row 0, col 7) should be h8
            expect(snapshot.board[0][7].algebraic).toBe('h8');

            // Bottom-left corner (row 7, col 0) should be a1
            expect(snapshot.board[7][0].algebraic).toBe('a1');

            // Bottom-right corner (row 7, col 7) should be h1
            expect(snapshot.board[7][7].algebraic).toBe('h1');

            // Some middle squares
            expect(snapshot.board[4][4].algebraic).toBe('e4'); // row 4 = rank 4, col 4 = file e
            expect(snapshot.board[3][3].algebraic).toBe('d5'); // row 3 = rank 5, col 3 = file d
        });
    });

    // ═══════════════════════════════════════════
    //  isLight ALTERNATION
    // ═══════════════════════════════════════════

    describe('isLight alternation', () => {
        it('isLight alternates correctly across the board', () => {
            const snapshot = board.getBoardSnapshot();

            // a8 (0,0) → isLight = (0+0)%2 === 0 → true (a8 is a light square)
            expect(snapshot.board[0][0].isLight).toBe(true);

            // b8 (0,1) → isLight = (0+1)%2 === 0 → false
            expect(snapshot.board[0][1].isLight).toBe(false);

            // a7 (1,0) → isLight = (1+0)%2 === 0 → false
            expect(snapshot.board[1][0].isLight).toBe(false);

            // b7 (1,1) → isLight = (1+1)%2 === 0 → true
            expect(snapshot.board[1][1].isLight).toBe(true);

            // Verify checkerboard pattern: adjacent squares should have opposite isLight
            for (let r = 0; r < 8; r++) {
                for (let f = 0; f < 7; f++) {
                    expect(snapshot.board[r][f].isLight).not.toBe(
                        snapshot.board[r][f + 1].isLight
                    );
                }
            }
        });
    });

    // ═══════════════════════════════════════════
    //  STARTING POSITION
    // ═══════════════════════════════════════════

    describe('starting position', () => {
        it('pieces are in starting position', () => {
            const snapshot = board.getBoardSnapshot();
            const flat = snapshot.board.flat();

            const sq = (algebraic: string) => flat.find(s => s.algebraic === algebraic)!;

            // Black pieces (rank 8)
            expect(sq('a8').piece).toEqual({ type: 'r', color: 'b' });
            expect(sq('b8').piece).toEqual({ type: 'n', color: 'b' });
            expect(sq('c8').piece).toEqual({ type: 'b', color: 'b' });
            expect(sq('d8').piece).toEqual({ type: 'q', color: 'b' });
            expect(sq('e8').piece).toEqual({ type: 'k', color: 'b' });
            expect(sq('f8').piece).toEqual({ type: 'b', color: 'b' });
            expect(sq('g8').piece).toEqual({ type: 'n', color: 'b' });
            expect(sq('h8').piece).toEqual({ type: 'r', color: 'b' });

            // Black pawns (rank 7)
            for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
                expect(sq(`${file}7`).piece).toEqual({ type: 'p', color: 'b' });
            }

            // Empty ranks 3–6
            for (const rank of ['3', '4', '5', '6']) {
                for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
                    expect(sq(`${file}${rank}`).piece).toBeNull();
                }
            }

            // White pawns (rank 2)
            for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
                expect(sq(`${file}2`).piece).toEqual({ type: 'p', color: 'w' });
            }

            // White pieces (rank 1)
            expect(sq('a1').piece).toEqual({ type: 'r', color: 'w' });
            expect(sq('b1').piece).toEqual({ type: 'n', color: 'w' });
            expect(sq('c1').piece).toEqual({ type: 'b', color: 'w' });
            expect(sq('d1').piece).toEqual({ type: 'q', color: 'w' });
            expect(sq('e1').piece).toEqual({ type: 'k', color: 'w' });
            expect(sq('f1').piece).toEqual({ type: 'b', color: 'w' });
            expect(sq('g1').piece).toEqual({ type: 'n', color: 'w' });
            expect(sq('h1').piece).toEqual({ type: 'r', color: 'w' });
        });
    });

    // ═══════════════════════════════════════════
    //  SquareData SHAPE (v2 cleanup)
    // ═══════════════════════════════════════════

    describe('SquareData shape', () => {
        it('does NOT have backgroundColor or skinUrl (confirm removal)', () => {
            const snapshot = board.getBoardSnapshot();
            const anySquare = snapshot.board[0][0];

            // These legacy fields should not exist in v2
            expect(anySquare).not.toHaveProperty('backgroundColor');
            expect(anySquare).not.toHaveProperty('skinUrl');

            // Verify the v2 shape has the expected keys
            expect(anySquare).toHaveProperty('algebraic');
            expect(anySquare).toHaveProperty('isLight');
            expect(anySquare).toHaveProperty('piece');
            expect(anySquare).toHaveProperty('isLastMoveOrigin');
            expect(anySquare).toHaveProperty('isLastMoveDestination');
            expect(anySquare).toHaveProperty('isSelected');
            expect(anySquare).toHaveProperty('isValidDestination');
            expect(anySquare).toHaveProperty('isPremoveOrigin');
            expect(anySquare).toHaveProperty('isPremoveDestination');

            // Exhaustive check: verify exact key set on all squares
            const expectedKeys = [
                'algebraic', 'isLight', 'piece',
                'isLastMoveOrigin', 'isLastMoveDestination',
                'isSelected', 'isValidDestination',
                'isPremoveOrigin', 'isPremoveDestination',
            ];

            for (const row of snapshot.board) {
                for (const sq of row) {
                    const keys = Object.keys(sq).sort();
                    expect(keys).toEqual(expectedKeys.sort());
                }
            }
        });
    });

    // ═══════════════════════════════════════════
    //  handleMove()
    // ═══════════════════════════════════════════

    describe('handleMove()', () => {
        it('handleMove("e2", "e4") returns success MoveResult', () => {
            const result = board.handleMove('e2', 'e4');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.move.from).toBe('e2');
                expect(result.move.to).toBe('e4');
                expect(result.move.piece).toBe('p');
                expect(result.move.san).toBe('e4');
            }

            // Verify board state changed
            const snapshot = board.getBoardSnapshot();
            expect(snapshot.gameState.turn).toBe('b');
            const flat = snapshot.board.flat();
            const e4 = flat.find(sq => sq.algebraic === 'e4')!;
            expect(e4.piece).toEqual({ type: 'p', color: 'w' });
        });

        it('handleMove returns failure for illegal moves', () => {
            const result = board.handleMove('e2', 'e5'); // Illegal: pawn can't jump 3 squares

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.reason).toBe('illegal');
            }
        });
    });

    // ═══════════════════════════════════════════
    //  handleSquareClick()
    // ═══════════════════════════════════════════

    describe('handleSquareClick()', () => {
        it('delegates to interactionManager', () => {
            const spy = vi.spyOn(interaction, 'selectSquare');

            board.handleSquareClick('e2');
            expect(spy).toHaveBeenCalledWith('e2');
            expect(spy).toHaveBeenCalledTimes(1);

            // Verify the effect: square should be selected
            expect(interaction.getSelectedSquare()).toBe('e2');
        });

        it('works without interactionManager (no-op)', () => {
            const boardWithoutInteraction = new HeadlessBoard(engine);

            // Should not throw
            expect(() => {
                boardWithoutInteraction.handleSquareClick('e2');
            }).not.toThrow();
        });
    });
});
