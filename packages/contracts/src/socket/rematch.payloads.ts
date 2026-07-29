import type { Color } from '../shared/player';
import type { RoomSnapshot } from './room.payloads';
import type { SocketAck } from '../shared/errors';

// ── Client → Server ──
// All rematch events use RoomIdPayload from lobby.payloads

// ── Server → Client (Callbacks) ──

export interface RematchAcceptResponse extends SocketAck, Partial<RoomSnapshot> {
    hostColor?: Color;
    guestColor?: Color;
}

// ── Server → Client (Emits) ──

export interface RematchRequestedPayload {
    requestedBy: string;
    playerName: string;
}

export interface RematchAcceptedPayload extends RoomSnapshot {
    hostColor: Color;
    guestColor: Color;
}
