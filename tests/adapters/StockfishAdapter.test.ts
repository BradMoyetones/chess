import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StockfishAdapter } from '../../src/Adapters/StockfishAdapter';
import { EventBus } from '../../src/Core/EventBus';

describe('StockfishAdapter', () => {
    let eventBus: EventBus;
    let adapter: StockfishAdapter;

    beforeEach(() => {
        eventBus = new EventBus();
        adapter = new StockfishAdapter(eventBus);
        
        // Mock isBrowser for tests since vitest runs in Node
        vi.stubGlobal('window', undefined);
        vi.stubGlobal('Worker', undefined);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        adapter.destroy();
    });

    describe('Initialization', () => {
        it('should require binaryPath for Node.js', async () => {
            await expect(adapter.init({ defaultDepth: 10 })).rejects.toThrow('StockfishAdapter: se requiere binaryPath para Node.js');
        });

        // We can't easily mock child_process here without a lot of setup,
        // so we'll test the parsing logic directly by bypassing init and using the private parseInfoLine method.
    });

    describe('UCI Parsing', () => {
        // Access private method for testing
        const parseInfoLine = (line: string) => {
            return (adapter as any).parseInfoLine(line);
        };

        it('should parse score correctly (centipawns)', () => {
            const line = 'info depth 18 seldepth 24 multipv 1 score cp 35 nodes 1234567 nps 800000 time 500 pv e2e4 e7e5';
            const result = parseInfoLine(line);
            
            expect(result.depth).toBe(18);
            expect(result.score).toBe(35);
            expect(result.mate).toBeNull();
            expect(result.nodes).toBe(1234567);
            expect(result.time).toBe(500);
            expect(result.pv).toEqual(['e2e4', 'e7e5']);
        });

        it('should parse score correctly (mate)', () => {
            const line = 'info depth 10 score mate 3 nodes 50000 time 100 pv QF7';
            const result = parseInfoLine(line);
            
            expect(result.score).toBe(100000); // our defined high score for mate
            expect(result.mate).toBe(3);
        });

        it('should parse negative score mate correctly', () => {
            const line = 'info depth 10 score mate -2 nodes 50000 time 100 pv QF7';
            const result = parseInfoLine(line);
            
            expect(result.score).toBe(-100000); // mate against us
            expect(result.mate).toBe(-2);
        });
    });

    describe('Message Handling and Evaluation', () => {
        it('should resolve evaluate when bestmove is received', async () => {
            // Mock ensureReady to bypass init
            (adapter as any).ready = true;
            (adapter as any).ensureReady = vi.fn();
            (adapter as any).config = { defaultDepth: 10 };
            (adapter as any).sendCommand = vi.fn();

            const evalPromise = adapter.evaluate('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

            // Simulate incoming messages
            (adapter as any).onMessage('info depth 10 score cp 45 nodes 100 time 50 pv e2e4');
            (adapter as any).onMessage('bestmove e2e4 ponder e7e5');

            const result = await evalPromise;
            
            expect(result.depth).toBe(10);
            expect(result.score).toBe(45);
            expect(result.bestMove).toBe('e2e4');
            expect(result.ponder).toBe('e7e5');
        });
        
        it('should resolve multiPV when bestmove is received', async () => {
            (adapter as any).ready = true;
            (adapter as any).ensureReady = vi.fn();
            (adapter as any).config = { defaultDepth: 10, multiPV: 2 };
            (adapter as any).sendCommand = vi.fn();

            const evalPromise = adapter.evaluateMultiPV('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 2);

            // Simulate incoming messages for multiple lines
            (adapter as any).onMessage('info depth 10 multipv 1 score cp 45 nodes 100 time 50 pv e2e4');
            (adapter as any).onMessage('info depth 10 multipv 2 score cp 35 nodes 80 time 50 pv d2d4');
            (adapter as any).onMessage('bestmove e2e4 ponder e7e5');

            const result = await evalPromise;
            
            expect(result.length).toBe(2);
            expect(result[0].score).toBe(45);
            expect(result[0].pv[0]).toBe('e2e4');
            expect(result[1].score).toBe(35);
            expect(result[1].pv[0]).toBe('d2d4');
        });
    });
});
