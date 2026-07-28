import crypto from 'crypto';
import type { Color } from '@chess-fw/core';
import { RoomEntity, type PlayerInfo, type TimeControl } from '../entities/RoomEntity';

const DISCONNECT_TIMEOUT_MS = 30_000;
const GC_INTERVAL_MS = 60_000;
const ROOM_INACTIVITY_MS = 5 * 60_000;

export class RoomManager {
    private rooms = new Map<string, RoomEntity>();
    private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private gcInterval: ReturnType<typeof setInterval> | null = null;

    constructor(private onRoomClosed?: (roomId: string) => void) {
        this.startGarbageCollector();
    }

    createRoom(host: PlayerInfo, hostColor: Color, timeControl: TimeControl | null): RoomEntity {
        const roomId = this.generateRoomId();
        const room = new RoomEntity(roomId, host, hostColor, timeControl);
        this.rooms.set(roomId, room);
        return room;
    }

    getRoom(roomId: string): RoomEntity | undefined {
        return this.rooms.get(roomId);
    }

    deleteRoom(roomId: string): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.clock?.stop();
            this.clearDisconnectTimer(roomId, room.host.userId);
            if (room.guest) this.clearDisconnectTimer(roomId, room.guest.userId);
        }
        this.rooms.delete(roomId);
    }

    findRoomsBySocketId(socketId: string): [string, RoomEntity][] {
        const results: [string, RoomEntity][] = [];
        for (const [roomId, room] of this.rooms) {
            if (room.host.socketId === socketId || room.guest?.socketId === socketId) {
                results.push([roomId, room]);
            }
        }
        return results;
    }

    // ─── Disconnect Timer Management ─────────────────────────────────────

    startDisconnectTimer(
        roomId: string,
        userId: string,
        onExpire: () => void
    ): void {
        const key = `${roomId}:${userId}`;
        this.clearDisconnectTimer(roomId, userId);

        const timer = setTimeout(() => {
            this.disconnectTimers.delete(key);
            onExpire();
        }, DISCONNECT_TIMEOUT_MS);

        this.disconnectTimers.set(key, timer);
    }

    clearDisconnectTimer(roomId: string, userId: string): void {
        const key = `${roomId}:${userId}`;
        const timer = this.disconnectTimers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.disconnectTimers.delete(key);
        }
    }

    // ─── Garbage Collector ────────────────────────────────────────────────

    private startGarbageCollector(): void {
        this.gcInterval = setInterval(() => {
            const now = Date.now();

            for (const [roomId, room] of this.rooms) {
                const isInactive = (now - room.lastActivity) > ROOM_INACTIVITY_MS;
                const hostDisconnected = !room.host.connected;
                const guestDisconnected = room.guest ? !room.guest.connected : true;
                const bothDisconnected = hostDisconnected && guestDisconnected && room.guest !== null;
                const isEmptyAndStale = !room.guest && hostDisconnected
                    && (now - room.createdAt) > ROOM_INACTIVITY_MS;

                if (isInactive || bothDisconnected || isEmptyAndStale) {
                    console.log(`[GC] Eliminando sala inactiva: ${roomId}`);
                    this.deleteRoom(roomId);
                    this.onRoomClosed?.(roomId);
                }
            }
        }, GC_INTERVAL_MS);
    }

    destroy(): void {
        if (this.gcInterval) clearInterval(this.gcInterval);
        for (const timer of this.disconnectTimers.values()) {
            clearTimeout(timer);
        }
        this.rooms.clear();
        this.disconnectTimers.clear();
    }

    private generateRoomId(): string {
        return crypto.randomBytes(3).toString('hex').toUpperCase();
    }
}
