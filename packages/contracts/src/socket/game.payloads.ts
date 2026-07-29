import type { Color, PlayersSnapshot } from '../shared/player';
import type { GameResultData } from '../shared/game-result';
import type { SocketAck } from '../shared/errors';
import type { RoomSnapshot } from './room.payloads';

// ── Client → Server ──

export interface MovePayload {
    roomId: string;
    moveData: {
        from: string;
        to: string;
        promotion?: string;
    };
}

export interface GameOverData {
    roomId: string;
    result: {
        winner: Color | 'draw';
        reason: string;
    };
}

// ── Server → Client (Callbacks) ──

export interface MoveResponse extends SocketAck {
    players?: PlayersSnapshot;
    turn?: Color;
    lastMoveTime?: number;
}

// ── Server → Client (Emits) ──

export interface MoveReceivedPayload {
    moveData: {
        from: string;
        to: string;
        san: string;
        promotion?: string;
        captured?: string;
        flags?: string;
    };
    fen: string;
    pgn: string;
    players?: PlayersSnapshot;
    turn?: Color;
    lastMoveTime?: number;
}

export interface GameEndedPayload extends Partial<RoomSnapshot> {
    result: GameResultData;
}
