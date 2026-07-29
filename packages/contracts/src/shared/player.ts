// Re-export Color from the single source of truth
export type { Color } from '@chess-fw/core';

/** Player role in a room */
export type Role = 'host' | 'guest';

/** Room lifecycle status */
export type RoomStatus = 'waiting' | 'playing' | 'finished';

/** Time control settings */
export interface TimeControl {
    initial: number;   // seconds
    increment: number; // seconds
}

/** Player information within a room */
export interface PlayerInfo {
    socketId: string;
    userId: string;
    name: string;
    avatar: string;
    connected: boolean;
    isBot?: boolean;
    rating?: number;
}

/** Player info with time remaining (for snapshots) */
export interface PlayerSnapshot extends PlayerInfo {
    timeRemaining: number | null;
}

/** Players snapshot in a room */
export interface PlayersSnapshot {
    host: PlayerSnapshot;
    guest: PlayerSnapshot | null;
}
