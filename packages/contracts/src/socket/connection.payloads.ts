// ── Server → Client (Emits) ──

export interface DisconnectPayload {
    hostConnected: boolean;
    guestConnected: boolean;
}
