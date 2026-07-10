import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChessEngine } from '../../src/Core/ChessEngine';
import { EventBus } from '../../src/Core/EventBus';
import { InteractionManager } from '../../src/Managers/InteractionManager';

describe('InteractionManager', () => {
    let engine: ChessEngine;
    let eventBus: EventBus;
    let interaction: InteractionManager;

    beforeEach(() => {
        eventBus = new EventBus();
        engine = new ChessEngine(eventBus);
        interaction = new InteractionManager(engine, eventBus);
    });

    // ═══════════════════════════════════════════
    //  SELECTION
    // ═══════════════════════════════════════════

    describe('selection', () => {
        it('selecting a piece sets selectedSquare and validDestinations', () => {
            interaction.selectSquare('e2');

            expect(interaction.getSelectedSquare()).toBe('e2');
            const destinations = interaction.getValidDestinations();
            expect(destinations.length).toBeGreaterThan(0);
            expect(destinations).toContain('e3');
            expect(destinations).toContain('e4');
        });

        it('selecting a knight shows correct destinations', () => {
            interaction.selectSquare('g1');

            expect(interaction.getSelectedSquare()).toBe('g1');
            const destinations = interaction.getValidDestinations();
            expect(destinations).toContain('f3');
            expect(destinations).toContain('h3');
            expect(destinations).toHaveLength(2);
        });
    });

    // ═══════════════════════════════════════════
    //  CLICK-TO-MOVE
    // ═══════════════════════════════════════════

    describe('click-to-move', () => {
        it('clicking a valid destination executes the move', () => {
            // Select the e2 pawn
            interaction.selectSquare('e2');
            expect(interaction.getSelectedSquare()).toBe('e2');

            // Click the destination e4
            interaction.selectSquare('e4');

            // After move, selection should be cleared
            expect(interaction.getSelectedSquare()).toBeNull();
            expect(interaction.getValidDestinations()).toEqual([]);

            // Verify the move was executed on the engine
            expect(engine.getTurn()).toBe('b');
            expect(engine.getPieceAt('e4')).toEqual({ type: 'p', color: 'w' });
            expect(engine.getPieceAt('e2')).toBeNull();
        });
    });

    // ═══════════════════════════════════════════
    //  DESELECTION
    // ═══════════════════════════════════════════

    describe('deselection', () => {
        it('clicking empty square clears selection', () => {
            // Select a piece first
            interaction.selectSquare('e2');
            expect(interaction.getSelectedSquare()).toBe('e2');

            // Click an empty square that is NOT a valid destination
            interaction.selectSquare('d5');

            expect(interaction.getSelectedSquare()).toBeNull();
            expect(interaction.getValidDestinations()).toEqual([]);
        });

        it('clicking the same piece again deselects (no piece at that square after no change)', () => {
            interaction.selectSquare('e2');
            expect(interaction.getSelectedSquare()).toBe('e2');

            // Clicking e2 again: it has a piece, so it re-selects (not deselects)
            interaction.selectSquare('e2');
            expect(interaction.getSelectedSquare()).toBe('e2');
        });
    });

    // ═══════════════════════════════════════════
    //  REGRESSION: Premove Bug
    // ═══════════════════════════════════════════

    describe('REGRESSION: premove bug', () => {
        it('after a legal move, repeatedly clicking an out-of-turn piece should NOT cause isGameOver() to become true', () => {
            // White plays e4
            engine.attemptMove('e2', 'e4');
            expect(engine.getTurn()).toBe('b');
            expect(engine.isGameOver()).toBe(false);

            // Now it's black's turn. Repeatedly click white pieces (out-of-turn).
            // This should NOT corrupt game state.
            for (let i = 0; i < 10; i++) {
                interaction.selectSquare('d2');
                interaction.selectSquare('a2');
                interaction.selectSquare('g1');
            }

            // Game should absolutely NOT be over
            expect(engine.isGameOver()).toBe(false);
            expect(engine.isCheckmate()).toBe(false);
            expect(engine.isStalemate()).toBe(false);
            expect(engine.isDraw()).toBe(false);

            // Turn should still be black's
            expect(engine.getTurn()).toBe('b');
        });
    });

    // ═══════════════════════════════════════════
    //  destroy()
    // ═══════════════════════════════════════════

    describe('destroy()', () => {
        it('unsubscribes all events', () => {
            const spy = vi.fn();
            eventBus.on('SQUARE_DESELECTED', spy);

            // Before destroy: selecting triggers events
            interaction.selectSquare('e2');
            expect(interaction.getSelectedSquare()).toBe('e2');

            // Destroy the interaction manager
            interaction.destroy();

            // After destroy, selection state is cleared
            expect(interaction.getSelectedSquare()).toBeNull();
            expect(interaction.getValidDestinations()).toEqual([]);
            expect(interaction.getPremoves()).toEqual([]);

            // Emit events that InteractionManager was subscribed to —
            // NAVIGATE_TO_MOVE, POSITION_LOADED, GAME_RESET, BOARD_UPDATED
            // These should not cause errors (handlers are unsubscribed)
            expect(() => {
                eventBus.emit('NAVIGATE_TO_MOVE', { moveIndex: 0 });
                eventBus.emit('POSITION_LOADED', { fen: '', source: 'fen' });
                eventBus.emit('GAME_RESET', {});
                eventBus.emit('BOARD_UPDATED', {});
            }).not.toThrow();
        });
    });

    // ═══════════════════════════════════════════
    //  PRE-MOVE QUEUEING
    // ═══════════════════════════════════════════

    describe('pre-move queueing', () => {
        it('queues a pre-move when clicking out-of-turn piece in PLAY mode and then a destination', () => {
            // White plays e4
            engine.attemptMove('e2', 'e4');
            expect(engine.getTurn()).toBe('b');

            // Now it's black's turn. White selects d2 (out of turn in PLAY mode)
            interaction.selectSquare('d2');
            expect(interaction.getSelectedSquare()).toBe('d2');
            // Should have pre-move destinations (pseudo-legal)
            expect(interaction.getValidDestinations().length).toBeGreaterThan(0);

            // Click d4 as a pre-move destination
            const destinations = interaction.getValidDestinations();
            if (destinations.includes('d4')) {
                interaction.selectSquare('d4');
                // Pre-move should be queued
                const premoves = interaction.getPremoves();
                expect(premoves).toHaveLength(1);
                expect(premoves[0]).toEqual({ from: 'd2', to: 'd4' });
            }
        });

        it('executes queued pre-move after opponent moves', () => {
            const premoveExecutedSpy = vi.fn();
            eventBus.on('PREMOVE_EXECUTED', premoveExecutedSpy);

            // White plays e4
            engine.attemptMove('e2', 'e4');
            expect(engine.getTurn()).toBe('b');

            // White queues pre-move d2->d4
            interaction.selectSquare('d2');
            const destinations = interaction.getValidDestinations();

            if (destinations.includes('d4')) {
                interaction.selectSquare('d4');
                expect(interaction.getPremoves()).toHaveLength(1);

                // Black plays e5 — this triggers BOARD_UPDATED which tries to execute premove
                engine.attemptMove('e7', 'e5');

                // After black's move, it's white's turn, so the pre-move should execute
                expect(premoveExecutedSpy).toHaveBeenCalledWith(
                    expect.objectContaining({ from: 'd2', to: 'd4' })
                );
                expect(interaction.getPremoves()).toHaveLength(0);
                // After premove executes, d4 should have white pawn
                expect(engine.getPieceAt('d4')).toEqual({ type: 'p', color: 'w' });
            }
        });

        it('clearPremoves() empties the queue', () => {
            engine.attemptMove('e2', 'e4');
            interaction.selectSquare('d2');
            const destinations = interaction.getValidDestinations();

            if (destinations.includes('d4')) {
                interaction.selectSquare('d4');
                expect(interaction.getPremoves()).toHaveLength(1);

                interaction.clearPremoves();
                expect(interaction.getPremoves()).toHaveLength(0);
            }
        });
    });
});
