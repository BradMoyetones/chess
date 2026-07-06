// tests/managers/PuzzleValidator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PuzzleValidator } from '../../src/Managers/PuzzleValidator';
import { ChessEngine } from '../../src/Core/ChessEngine';
import { EventBus } from '../../src/Core/EventBus';
import type { PuzzleConfig } from '../../src/Types/puzzle.types';
import { Container } from '../../src/Decorators/di.decorators';

describe('PuzzleValidator', () => {
    let engine: ChessEngine;
    let eventBus: EventBus;
    let validator: PuzzleValidator;

    beforeEach(() => {
        Container.clear();
        eventBus = Container.resolve(EventBus);
        engine = Container.resolve(ChessEngine);
        validator = Container.resolve(PuzzleValidator);
    });

    // ═════════════════════════════════════════
    //  MATE EN 1 (el puzzle más simple posible)
    // ═════════════════════════════════════════

    describe('Mate en 1', () => {
        // Posición: blancas tienen Dama en h5, Rey en g1.
        // Negras tienen Rey en g8, peón en f7, peón en g7, peón en h7.
        // Solución: Qh7# (es turno de blancas, jugador = blancas)
        const mateIn1: PuzzleConfig = {
            id: 'mate-in-1-basic',
            fen: '6k1/5ppp/8/7Q/8/8/8/6K1 w - - 0 1',
            solution: ['Qxh7#'],
            playerColor: 'w',
            rating: 800,
            themes: ['mate-in-1']
        };

        it('should load puzzle and emit PUZZLE_STARTED', () => {
            const handler = vi.fn();
            eventBus.on('PUZZLE_STARTED', handler);

            validator.loadPuzzle(mateIn1);

            expect(handler).toHaveBeenCalledOnce();
            expect(handler).toHaveBeenCalledWith({
                fen: mateIn1.fen,
                movesRequired: 1
            });
            expect(validator.isActive()).toBe(true);
        });

        it('should accept correct move and complete puzzle', () => {
            validator.loadPuzzle(mateIn1);
            const completedHandler = vi.fn();
            eventBus.on('PUZZLE_COMPLETED', completedHandler);

            // Ejecutar el movimiento correcto en el engine primero
            engine.attemptMove('h5', 'h7');
            const result = validator.validatePlayerMove('Qxh7#');

            expect(result).toBe('correct');
            expect(validator.isComplete()).toBe(true);
            expect(completedHandler).toHaveBeenCalledOnce();
        });

        it('should reject incorrect move and fail puzzle', () => {
            validator.loadPuzzle(mateIn1);
            const failedHandler = vi.fn();
            eventBus.on('PUZZLE_FAILED', failedHandler);

            const result = validator.validatePlayerMove('Qf3');

            expect(result).toBe('incorrect');
            expect(validator.isFailed()).toBe(true);
            expect(failedHandler).toHaveBeenCalledWith({
                expected: 'Qxh7#',
                actual: 'Qf3'
            });
        });
    });

    // ═════════════════════════════════════════
    //  MATE EN 2 (oponente responde automáticamente)
    // ═════════════════════════════════════════

    describe('Mate en 2 (con respuesta del oponente)', () => {
        // Posición: blancas en h5, negras en g8 (con peones en f7, g7, h7)
        // solution = ['Qxh7+', 'Kf8', 'Qh8+']
        // Jugador = blancas. Turno = blancas.
        // Flujo: jugador mueve Qxh7+, oponente responde Kf8 auto, jugador mueve Qh8+
        const mateIn2: PuzzleConfig = {
            id: 'mate-in-2-basic',
            fen: '6k1/5ppp/8/7Q/8/8/8/6K1 w - - 0 1',
            solution: ['Qxh7+', 'Kf8', 'Qh8+'],
            playerColor: 'w',
            rating: 1200,
            themes: ['mate-in-2']
        };

        it('should handle multi-move puzzle with opponent auto-response', () => {
            validator.loadPuzzle(mateIn2);
            const correctHandler = vi.fn();
            eventBus.on('PUZZLE_CORRECT_MOVE', correctHandler);

            // Paso 1: jugador mueve Qxh7+
            engine.attemptMove('h5', 'h7');
            const r1 = validator.validatePlayerMove('Qxh7+');
            expect(r1).toBe('correct');

            // El oponente debería haber respondido automáticamente (Kf8)
            // Verificar que el rey se movió
            expect(engine.getPieceAt('f8')?.type).toBe('k');

            // Paso 2: jugador mueve Qh8+
            engine.attemptMove('h7', 'h8');
            const r2 = validator.validatePlayerMove('Qh8+');
            expect(r2).toBe('correct');
            expect(validator.isComplete()).toBe(true);
        });
    });

    // ═════════════════════════════════════════
    //  PUZZLE DONDE NEGRAS JUEGAN PRIMERO
    // ═════════════════════════════════════════

    describe('Puzzle con jugador = negras', () => {
        // El turno inicial es de blancas (oponente).
        // solution[0] = Ka2
        // solution[1] = Kg7
        const blackPuzzle: PuzzleConfig = {
            id: 'black-plays',
            fen: '6k1/8/8/8/8/8/P7/K7 w - - 0 1',
            solution: ['Kb1', 'Kg7'],
            playerColor: 'b',
            rating: 600,
            themes: ['mate-in-1']
        };

        it('should auto-play opponent first move when player is black', () => {
            validator.loadPuzzle(blackPuzzle);

            // El oponente (blancas) debería haber movido automáticamente Kb1
            // Ahora es turno de negras (el jugador)
            expect(engine.getTurn()).toBe('b');
            expect(engine.getPieceAt('b1')?.type).toBe('k');
        });
    });

    // ═════════════════════════════════════════
    //  RESET Y REINTENTAR
    // ═════════════════════════════════════════

    describe('Reset', () => {
        const simplePuzzle: PuzzleConfig = {
            id: 'reset-test',
            fen: '6k1/5ppp/8/7Q/8/8/8/6K1 w - - 0 1',
            solution: ['Qxh7#'],
            playerColor: 'w',
        };

        it('should allow retry after failure', () => {
            validator.loadPuzzle(simplePuzzle);

            // Fallar primero
            validator.validatePlayerMove('Qf3');
            expect(validator.isFailed()).toBe(true);

            // Reiniciar
            validator.reset();
            expect(validator.isActive()).toBe(true);
            expect(validator.isFailed()).toBe(false);

            // Ahora acertar
            engine.attemptMove('h5', 'h7');
            const result = validator.validatePlayerMove('Qxh7#');
            expect(result).toBe('correct');
            expect(validator.isComplete()).toBe(true);
        });

        it('should unload puzzle completely', () => {
            validator.loadPuzzle(simplePuzzle);
            validator.unload();

            expect(validator.isActive()).toBe(false);
            expect(validator.getConfig()).toBeNull();
        });
    });

    // ═════════════════════════════════════════
    //  PROGRESO
    // ═════════════════════════════════════════

    describe('Progress tracking', () => {
        it('should report correct progress', () => {
            const puzzle: PuzzleConfig = {
                id: 'progress-test',
                fen: '5rk1/5ppp/8/7Q/8/8/8/6K1 w - - 0 1',
                solution: ['Qh7+', 'Kf8', 'Qh8#'],
                playerColor: 'w',
            };

            validator.loadPuzzle(puzzle);

            const before = validator.getProgress();
            expect(before.current).toBe(0);
            expect(before.total).toBeGreaterThan(0);

            // Mover correctamente
            engine.attemptMove('h5', 'h7');
            validator.validatePlayerMove('Qh7+');

            const after = validator.getProgress();
            expect(after.current).toBe(1);
        });
    });
});
