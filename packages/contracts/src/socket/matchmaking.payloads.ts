import type { Color, TimeControl } from '../shared/player';
import type { SocketAck } from '../shared/errors';
import type { RoomSnapshot } from './room.payloads';

// ── Client → Server ──

export interface FindMatchData {
    timeControl: TimeControl;
    rating?: number;
    preferredColor?: Color | 'random';
}

// ── Internal (Server-only) ──

export interface MatchRequest {
    userId: string;
    socketId: string;
    name: string;
    avatar: string;
    rating: number;
    timeControl: TimeControl;
    speed: string;
    preferredColor: Color | 'random';
    timestamp: number;
}

export interface MatchResult {
    player1: MatchRequest;
    player2: MatchRequest;
}

// ── Server → Client (Callbacks) ──

export interface FindMatchResponse extends SocketAck {
    matched?: boolean;
    message?: string;
    queueStats?: Record<string, number>;
    // If matched, includes room snapshot fields:
    roomId?: string;
    color?: Color;
    fen?: string;
    pgn?: string;
}

// ── Server → Client (Emits) ──

export interface MatchFoundPayload extends Partial<RoomSnapshot> {
    color: Color;
}
