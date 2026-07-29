import type { Socket } from 'socket.io';
import type { EvaluateBotData, BotMoveResponse } from '@chess-fw/contracts';
import type { StockfishService } from '../../infrastructure/stockfish/StockfishService';

export function registerBotHandlers(
    socket: Socket,
    stockfishService: StockfishService
): void {
    socket.on('evaluate_bot_move', async (data: EvaluateBotData, callback?: (res: BotMoveResponse) => void) => {
        const { fen, options } = data;

        try {
            const evaluation = await stockfishService.evaluate(fen, options);
            if (callback) callback({ success: true, evaluation });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('[BOT] Error evaluando posición:', message);
            if (callback) callback({ success: false, error: message });
        }
    });
}
