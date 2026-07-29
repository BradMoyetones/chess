import type { Color, TimeControl, PlayersSnapshot, RoomStatus } from '../shared/player';
import type { SocketAck } from '../shared/errors';

// ── Client → Server ──

export interface CreateRoomData {
    hostColor: Color | 'random';
    timeControl?: TimeControl;
    playerName?: string;
    playerAvatar?: string;
    playerId?: string;
}

export interface JoinRoomData {
    roomId: string;
    playerId?: string;
    playerName?: string;
    playerAvatar?: string;
}

// ── Server → Client (Callbacks) ──

export interface RoomSnapshot {
    roomId: string;
    fen: string;
    pgn: string;
    timeControl: TimeControl | null;
    players: PlayersSnapshot;
    hostColor: Color;
    turn: Color;
    status: RoomStatus;
    moveCount: number;
}

export interface CreateRoomResponse extends SocketAck {
    roomId?: string;
    color?: Color;
    fen?: string;
}

export interface JoinRoomResponse extends SocketAck, Partial<RoomSnapshot> {
    color?: Color;
    waiting?: boolean;
}

// ── Server → Client (Emits) ──

export interface OpponentJoinedPayload {
    players: PlayersSnapshot;
}
