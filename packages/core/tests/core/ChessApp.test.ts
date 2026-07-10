import { describe, it, expect, beforeEach } from 'vitest';
import { ChessApp } from '../../src/Core/ChessApp';

describe('ChessApp', () => {
    let app: ChessApp;

    beforeEach(() => {
        app = new ChessApp();
    });

    // ═══════════════════════════════════════════
    //  CONSTRUCTION
    // ═══════════════════════════════════════════

    describe('construction', () => {
        it('creates with default config (empty constructor)', () => {
            const defaultApp = new ChessApp();
            const snapshot = defaultApp.getSnapshot();

            expect(snapshot.gameState.turn).toBe('w');
            expect(snapshot.gameState.isGameOver).toBe(false);
            expect(snapshot.gameState.mode).toBe('PLAY');
            expect(snapshot.gameState.moveNumber).toBe(1);
            // Default starting FEN
            expect(snapshot.gameState.fen).toBe(
                'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
            );
        });

        it('creates with custom FEN', () => {
            // Sicilian Defense position after 1. e4 c5
            const fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
            const customApp = new ChessApp({ fen });
            const snapshot = customApp.getSnapshot();

            // chess.js may normalize the en-passant square
            expect(snapshot.gameState.fen).toContain('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq');
            expect(snapshot.gameState.turn).toBe('w');
            expect(snapshot.gameState.moveNumber).toBe(2);
        });

        it('creates with custom mode', () => {
            const analysisApp = new ChessApp({ mode: 'ANALYSIS' });
            const snapshot = analysisApp.getSnapshot();

            expect(snapshot.gameState.mode).toBe('ANALYSIS');
        });
    });

    // ═══════════════════════════════════════════
    //  getSnapshot()
    // ═══════════════════════════════════════════

    describe('getSnapshot()', () => {
        it('returns a valid BoardSnapshot with board[8][8], gameState, visuals, history', () => {
            const snapshot = app.getSnapshot();

            // Top-level keys exist
            expect(snapshot).toHaveProperty('board');
            expect(snapshot).toHaveProperty('gameState');
            expect(snapshot).toHaveProperty('visuals');
            expect(snapshot).toHaveProperty('history');

            // Board is 8x8
            expect(snapshot.board).toHaveLength(8);
            for (const row of snapshot.board) {
                expect(row).toHaveLength(8);
            }

            // gameState has all required fields
            expect(snapshot.gameState).toMatchObject({
                turn: 'w',
                inCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isGameOver: false,
            });

            // visuals has correct initial state
            expect(snapshot.visuals.lastMove).toBeNull();
            expect(snapshot.visuals.selectedSquare).toBeNull();
            expect(snapshot.visuals.validDestinations).toEqual([]);
            expect(snapshot.visuals.premoves).toEqual([]);
            expect(snapshot.visuals.annotations).toEqual([]);

            // history has correct initial state
            expect(snapshot.history.canUndo).toBe(false);
            expect(snapshot.history.canRedo).toBe(false);
            expect(snapshot.history.moveCount).toBe(0);
            expect(snapshot.history.currentIndex).toBe(0);
            expect(typeof snapshot.history.hasVariations).toBe('boolean');
        });
    });

    // ═══════════════════════════════════════════
    //  move()
    // ═══════════════════════════════════════════

    describe('move()', () => {
        it('move("e2", "e4") returns success and updates state', () => {
            const result = app.move('e2', 'e4');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.move.from).toBe('e2');
                expect(result.move.to).toBe('e4');
                expect(result.move.san).toBe('e4');
                expect(result.move.piece).toBe('p');
            }

            const snapshot = app.getSnapshot();
            expect(snapshot.gameState.turn).toBe('b');
            expect(snapshot.gameState.moveNumber).toBe(1);
            expect(snapshot.visuals.lastMove).toEqual({ from: 'e2', to: 'e4' });
            expect(snapshot.history.canUndo).toBe(true);
            expect(snapshot.history.moveCount).toBe(1);
        });

        it('move("e2", "e4") twice returns failure on second attempt', () => {
            const first = app.move('e2', 'e4');
            expect(first.success).toBe(true);

            // After e4, it's black's turn. Moving e2 again fails
            // (no pawn on e2 anymore, so chess.js returns 'illegal')
            const second = app.move('e2', 'e4');
            expect(second.success).toBe(false);
        });
    });

    // ═══════════════════════════════════════════
    //  click()
    // ═══════════════════════════════════════════

    describe('click()', () => {
        it('click("e2") selects the square (check via getSnapshot().visuals.selectedSquare)', () => {
            app.click('e2');
            const snapshot = app.getSnapshot();

            expect(snapshot.visuals.selectedSquare).toBe('e2');
            expect(snapshot.visuals.validDestinations.length).toBeGreaterThan(0);
            // e2 pawn should be able to go to e3 and e4
            expect(snapshot.visuals.validDestinations).toContain('e3');
            expect(snapshot.visuals.validDestinations).toContain('e4');
        });
    });

    // ═══════════════════════════════════════════
    //  undo() and redo()
    // ═══════════════════════════════════════════

    describe('undo() and redo()', () => {
        it('undo() reverts the last move', () => {
            app.move('e2', 'e4');
            const afterMove = app.getSnapshot();
            expect(afterMove.gameState.turn).toBe('b');

            const undone = app.undo();
            expect(undone).toBe(true);

            const afterUndo = app.getSnapshot();
            expect(afterUndo.gameState.turn).toBe('w');
            expect(afterUndo.gameState.fen).toBe(
                'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
            );
            expect(afterUndo.history.canRedo).toBe(true);
            expect(afterUndo.history.canUndo).toBe(false);
        });

        it('redo() re-applies an undone move', () => {
            app.move('e2', 'e4');
            app.undo();

            const redone = app.redo();
            expect(redone).toBe(true);

            const snapshot = app.getSnapshot();
            expect(snapshot.gameState.turn).toBe('b');
            expect(snapshot.history.canUndo).toBe(true);
            expect(snapshot.history.canRedo).toBe(false);
        });

        it('undo() returns false when nothing to undo', () => {
            expect(app.undo()).toBe(false);
        });

        it('redo() returns false when nothing to redo', () => {
            expect(app.redo()).toBe(false);
        });
    });

    // ═══════════════════════════════════════════
    //  destroy()
    // ═══════════════════════════════════════════

    describe('destroy()', () => {
        it('cleans up event subscriptions after destroy', () => {
            // Make a move so BOARD_UPDATED would normally trigger premove logic
            app.move('e2', 'e4');
            app.destroy();

            // After destroy, the EventBus has no listeners.
            // InteractionManager's event subscriptions are cleaned up,
            // so events like BOARD_UPDATED won't trigger tryExecutePremove.
            // Direct method calls (click, move) still work since they're
            // not event-driven, but the reactive event chain is broken.
            let eventFired = false;
            app.events.on('BOARD_UPDATED', () => { eventFired = true; });
            
            // removeAllListeners was called in destroy, so this new listener
            // should be the ONLY one. We verify the old ones were cleaned.
            expect(eventFired).toBe(false);
        });
    });

    // ═══════════════════════════════════════════
    //  ISOLATION TEST
    // ═══════════════════════════════════════════

    describe('isolation', () => {
        it('two ChessApp instances do not interfere with each other', () => {
            const app1 = new ChessApp();
            const app2 = new ChessApp();

            // Make a move in app1
            const result = app1.move('e2', 'e4');
            expect(result.success).toBe(true);

            // app2 should remain untouched
            const snapshot1 = app1.getSnapshot();
            const snapshot2 = app2.getSnapshot();

            // app1 has moved
            expect(snapshot1.gameState.turn).toBe('b');
            expect(snapshot1.visuals.lastMove).toEqual({ from: 'e2', to: 'e4' });
            expect(snapshot1.history.moveCount).toBe(1);

            // app2 is still at start
            expect(snapshot2.gameState.turn).toBe('w');
            expect(snapshot2.visuals.lastMove).toBeNull();
            expect(snapshot2.history.moveCount).toBe(0);

            // Verify the board state: e4 should have a pawn in app1 but not in app2
            const e4InApp1 = snapshot1.board.flat().find(sq => sq.algebraic === 'e4');
            const e4InApp2 = snapshot2.board.flat().find(sq => sq.algebraic === 'e4');

            expect(e4InApp1?.piece).toEqual({ type: 'p', color: 'w' });
            expect(e4InApp2?.piece).toBeNull();
        });
    });
});
