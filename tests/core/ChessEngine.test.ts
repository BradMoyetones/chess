// tests/core/ChessEngine.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChessEngine } from '../../src/Core/ChessEngine';
import { EventBus } from '../../src/Core/EventBus';

describe('ChessEngine', () => {
    let engine: ChessEngine;
    let eventBus: EventBus;

    beforeEach(() => {
        eventBus = new EventBus();
        engine = new ChessEngine(eventBus);
    });

    describe('Basic Moves', () => {
        it('should execute a legal move', () => {
            const result = engine.attemptMove('e2', 'e4');
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.move.san).toBe('e4');
                expect(result.move.from).toBe('e2');
                expect(result.move.to).toBe('e4');
            }
        });

        it('should reject an illegal move', () => {
            const result = engine.attemptMove('e2', 'e5'); // Can't jump 3 squares
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.reason).toBe('illegal');
            }
        });

        it('should reject wrong turn in PLAY mode', () => {
            // It's white's turn, try to move black piece
            const result = engine.attemptMove('e7', 'e5');
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.reason).toBe('wrong_turn');
            }
        });

        it('should track last move', () => {
            expect(engine.getLastMove()).toBeNull();
            engine.attemptMove('e2', 'e4');
            expect(engine.getLastMove()).toEqual({ from: 'e2', to: 'e4' });
        });
    });

    describe('Events', () => {
        it('should emit PIECE_MOVED on normal move', () => {
            const handler = vi.fn();
            eventBus.on('PIECE_MOVED', handler);
            engine.attemptMove('e2', 'e4');
            expect(handler).toHaveBeenCalledWith({
                from: 'e2', to: 'e4', piece: 'p'
            });
        });

        it('should emit PIECE_CAPTURED on capture', () => {
            const handler = vi.fn();
            eventBus.on('PIECE_CAPTURED', handler);

            engine.attemptMove('e2', 'e4');
            engine.attemptMove('d7', 'd5');
            engine.attemptMove('e4', 'd5'); // Capture

            expect(handler).toHaveBeenCalledOnce();
            expect(handler.mock.calls[0][0].capturedPiece).toBe('p');
        });

        it('should emit BOARD_UPDATED after every move', () => {
            const handler = vi.fn();
            eventBus.on('BOARD_UPDATED', handler);
            engine.attemptMove('e2', 'e4');
            expect(handler).toHaveBeenCalled();
        });
    });

    describe('Time Travel (Undo/Redo)', () => {
        it('should undo a move', () => {
            engine.attemptMove('e2', 'e4');
            expect(engine.getTurn()).toBe('b');

            const undone = engine.undo();
            expect(undone).toBe(true);
            expect(engine.getTurn()).toBe('w');
            expect(engine.getPieceAt('e2')?.type).toBe('p');
            expect(engine.getPieceAt('e4')).toBeNull();
        });

        it('should redo after undo', () => {
            engine.attemptMove('e2', 'e4');
            engine.undo();

            const redone = engine.redo();
            expect(redone).toBe(true);
            expect(engine.getPieceAt('e4')?.type).toBe('p');
            expect(engine.getTurn()).toBe('b');
        });

        it('should handle multiple undo/redo', () => {
            engine.attemptMove('e2', 'e4');
            engine.attemptMove('e7', 'e5');
            engine.attemptMove('g1', 'f3');

            // Undo 3 times
            expect(engine.undo()).toBe(true);
            expect(engine.undo()).toBe(true);
            expect(engine.undo()).toBe(true);
            expect(engine.undo()).toBe(false); // Can't undo past root

            // Redo 2 times
            expect(engine.redo()).toBe(true);
            expect(engine.redo()).toBe(true);
            expect(engine.getPieceAt('e5')?.type).toBe('p');
            expect(engine.getTurn()).toBe('w');
        });

        it('should go to start and end', () => {
            engine.attemptMove('e2', 'e4');
            engine.attemptMove('e7', 'e5');
            engine.attemptMove('g1', 'f3');

            engine.goToStart();
            expect(engine.getTurn()).toBe('w');
            expect(engine.getLastMove()).toBeNull();

            engine.goToEnd();
            expect(engine.getPieceAt('f3')?.type).toBe('n');
        });

        it('should report canUndo/canRedo correctly', () => {
            expect(engine.canUndo()).toBe(false);
            expect(engine.canRedo()).toBe(false);

            engine.attemptMove('e2', 'e4');
            expect(engine.canUndo()).toBe(true);
            expect(engine.canRedo()).toBe(false);

            engine.undo();
            expect(engine.canUndo()).toBe(false);
            expect(engine.canRedo()).toBe(true);
        });
    });

    describe('FEN & PGN', () => {
        it('should load a FEN position', () => {
            const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
            const loaded = engine.loadFen(fen);
            expect(loaded).toBe(true);
            expect(engine.getFen()).toBe(fen);
            expect(engine.getTurn()).toBe('b');
        });

        it('should reject invalid FEN', () => {
            const loaded = engine.loadFen('invalid-fen-string');
            expect(loaded).toBe(false);
        });

        it('should load a PGN game', () => {
            const pgn = '1. e4 e5 2. Nf3 Nc6';
            const loaded = engine.loadPgn(pgn);
            expect(loaded).toBe(true);
            expect(engine.getTurn()).toBe('w');
            expect(engine.getPieceAt('f3')?.type).toBe('n');
            expect(engine.getPieceAt('c6')?.type).toBe('n');
        });

        it('should generate PGN from moves', () => {
            engine.attemptMove('e2', 'e4');
            engine.attemptMove('e7', 'e5');
            engine.attemptMove('g1', 'f3');

            const pgn = engine.getPgn();
            expect(pgn).toContain('1.');
            expect(pgn).toContain('e4');
            expect(pgn).toContain('e5');
            expect(pgn).toContain('Nf3');
        });
    });

    describe('Modes', () => {
        it('should start in PLAY mode', () => {
            expect(engine.getMode()).toBe('PLAY');
        });

        it('should change mode and emit event', () => {
            const handler = vi.fn();
            eventBus.on('MODE_CHANGED', handler);

            engine.setMode('ANALYSIS');
            expect(engine.getMode()).toBe('ANALYSIS');
            expect(handler).toHaveBeenCalledWith({ from: 'PLAY', to: 'ANALYSIS' });
        });

        it('should allow moving both colors in ANALYSIS mode', () => {
            engine.setMode('ANALYSIS');

            // Move white
            const r1 = engine.attemptMove('e2', 'e4');
            expect(r1.success).toBe(true);

            // Move white again (not black's turn but ANALYSIS allows it)
            const r2 = engine.attemptMove('d2', 'd4');
            expect(r2.success).toBe(true);
        });

        it('should allow piece placement in SETUP mode', () => {
            engine.setMode('SETUP');

            const placed = engine.placePiece('e5', 'q', 'w');
            expect(placed).toBe(true);
            expect(engine.getPieceAt('e5')?.type).toBe('q');
        });

        it('should reject piece placement outside SETUP mode', () => {
            const placed = engine.placePiece('e5', 'q', 'w');
            expect(placed).toBe(false);
        });
    });

    describe('Promotion', () => {
        it('should require promotion choice', () => {
            // Set up a position where white pawn is about to promote
            const fen = '8/4P3/8/8/8/8/8/4K2k w - - 0 1';
            engine.loadFen(fen);

            const handler = vi.fn();
            eventBus.on('PROMOTION_REQUIRED', handler);

            const result = engine.attemptMove('e7', 'e8'); // No promotion specified
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.reason).toBe('promotion_required');
            }
            expect(handler).toHaveBeenCalled();
        });

        it('should execute move with promotion piece', () => {
            const fen = '8/4P3/8/8/8/8/8/4K2k w - - 0 1';
            engine.loadFen(fen);

            const result = engine.attemptMove('e7', 'e8', 'q');
            expect(result.success).toBe(true);
            expect(engine.getPieceAt('e8')?.type).toBe('q');
        });
    });

    describe('Game Tree Integration', () => {
        it('should create variations when making different moves from the same position', () => {
            engine.attemptMove('e2', 'e4');
            engine.undo(); // Back to start

            engine.attemptMove('d2', 'd4'); // Different move → creates variation

            const tree = engine.getGameTree();
            expect(tree.hasVariations()).toBe(true);
        });

        it('should emit VARIATION_CREATED for new variations', () => {
            const handler = vi.fn();
            eventBus.on('VARIATION_CREATED', handler);

            engine.attemptMove('e2', 'e4');
            engine.undo();
            engine.attemptMove('d2', 'd4'); // Creates variation

            expect(handler).toHaveBeenCalled();
        });
    });

    describe('Reset', () => {
        it('should reset to initial position', () => {
            engine.attemptMove('e2', 'e4');
            engine.attemptMove('e7', 'e5');

            engine.resetGame();
            expect(engine.getTurn()).toBe('w');
            expect(engine.getPieceAt('e2')?.type).toBe('p');
            expect(engine.getLastMove()).toBeNull();
            expect(engine.canUndo()).toBe(false);
        });

        it('should reset to custom FEN', () => {
            const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
            engine.resetGame(fen);
            expect(engine.getFen()).toBe(fen);
        });
    });
});
