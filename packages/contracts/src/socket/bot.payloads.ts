import type { SocketAck } from '../shared/errors';

// ── Client → Server ──

export interface EvaluateBotData {
    fen: string;
    options?: {
        depth?: number;
        timeLimit?: number;
        skillLevel?: number;
    };
}

// ── Server → Client (Callbacks) ──

export interface BotMoveResponse extends SocketAck {
    evaluation?: {
        bestMove: string;
        score?: number;
        depth?: number;
    };
}
