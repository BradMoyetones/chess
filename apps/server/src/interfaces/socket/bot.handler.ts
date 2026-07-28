import type { Socket } from 'socket.io';
import type { StockfishService } from '../../infrastructure/stockfish/StockfishService';

export function registerBotHandlers(
    socket: Socket,
    stockfishService: StockfishService
): void {
    socket.on('evaluate_bot_move', async (data: any, callback?: (res: any) => void) => {
        const { fen, options } = data;

        try {
            const evaluation = await stockfishService.evaluate(fen, options);
            if (callback) callback({ success: true, evaluation });
        } catch (error: any) {
            console.error('[BOT] Error evaluando posición:', error.message);
            if (callback) callback({ success: false, error: error.message });
        }
    });
}
