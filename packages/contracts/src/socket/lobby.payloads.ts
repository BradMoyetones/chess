import type { TimeControl } from '../shared/player';
import type { SocketAck } from '../shared/errors';

/** A room visible in the lobby */
export interface LobbyRoom {
    roomId: string;
    host: {
        name: string;
        avatar: string;
        rating?: number;
    };
    hostColor: string;
    timeControl: TimeControl | null;
    speed: string;
    createdAt: number;
}

// ── Client → Server ──

export interface GetOpenRoomsData {
    speed?: string;
}

// ── Server → Client (Callbacks) ──

export interface GetOpenRoomsResponse extends SocketAck {
    rooms?: LobbyRoom[];
}

// ── Server → Client (Emits) ──

export interface RoomIdPayload {
    roomId: string;
}
