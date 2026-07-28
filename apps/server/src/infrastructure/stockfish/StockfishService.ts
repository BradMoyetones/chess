import { StockfishAdapter, EventBus } from '@chess-fw/core';
import type { EvaluationData, StockfishConfig } from '@chess-fw/core';

/**
 * Wraps the StockfishAdapter from @chess-fw/core for server-side bot evaluation.
 */
export class StockfishService {
    private stockfish: StockfishAdapter;
    private initialized = false;

    constructor() {
        const eventBus = new EventBus();
        this.stockfish = new StockfishAdapter(eventBus);
    }

    async init(config: Partial<StockfishConfig> & { binaryPath: string }): Promise<void> {
        await this.stockfish.init({
            binaryPath: config.binaryPath,
            defaultDepth: config.defaultDepth ?? 15,
            threads: config.threads ?? 1,
            hashSize: config.hashSize ?? 16,
        });
        this.initialized = true;
        console.log('[*] Stockfish inicializado en el servidor.');
    }

    async evaluate(fen: string, options?: { skillLevel?: number; depth?: number }): Promise<EvaluationData> {
        if (!this.initialized) throw new Error('Stockfish not initialized');

        if (options?.skillLevel !== undefined) {
            this.stockfish.setOption('UCI_LimitStrength', 'true');
            const elo = Math.min(3200, Math.max(1320, 1320 + options.skillLevel * 90));
            this.stockfish.setOption('UCI_Elo', elo.toString());
            this.stockfish.setOption('Skill Level', options.skillLevel.toString());
        } else {
            this.stockfish.setOption('UCI_LimitStrength', 'false');
            this.stockfish.setOption('Skill Level', '20');
        }

        return this.stockfish.evaluate(fen, options?.depth);
    }
}
