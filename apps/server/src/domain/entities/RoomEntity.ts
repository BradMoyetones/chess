import type { Color } from '@chess-fw/core';
import { GameEntity } from './GameEntity';
import { ClockService } from '../services/ClockService';

export type Role = 'host' | 'guest';
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface PlayerInfo {
    socketId: string;
    userId: string;
    name: string;
    avatar: string;
    connected: boolean;
    isBot?: boolean;
    rating?: number;
}

export interface TimeControl {
    initial: number;   // seconds
    increment: number; // seconds
}

export interface GameResultData {
    winner: Color | 'draw';
    reason: string;
    timestamp: number;
}

export class RoomEntity {
    readonly id: string;
    host: PlayerInfo;
    guest: PlayerInfo | null = null;
    hostColor: Color;
    timeControl: TimeControl | null;
    game: GameEntity;
    clock: ClockService | null = null;
    status: RoomStatus = 'waiting';
    result: GameResultData | null = null;
    createdAt: number;
    lastActivity: number;
    rematchRequested: string | null = null;

    constructor(id: string, host: PlayerInfo, hostColor: Color, timeControl: TimeControl | null) {
        this.id = id;
        this.host = host;
        this.hostColor = hostColor;
        this.timeControl = timeControl;
        this.game = new GameEntity();
        this.createdAt = Date.now();
        this.lastActivity = Date.now();

        if (timeControl) {
            this.clock = new ClockService(
                timeControl.initial * 1000,
                timeControl.increment * 1000
            );
        }
    }

    getPlayerRole(socketId: string): Role | null {
        if (this.host.socketId === socketId) return 'host';
        if (this.guest?.socketId === socketId) return 'guest';
        return null;
    }

    getPlayerColor(role: Role): Color {
        return role === 'host' ? this.hostColor : (this.hostColor === 'w' ? 'b' : 'w');
    }

    getPlayerByRole(role: Role): PlayerInfo | null {
        return role === 'host' ? this.host : this.guest;
    }

    getPlayerByUserId(userId: string): { player: PlayerInfo; role: Role } | null {
        if (this.host.userId === userId) return { player: this.host, role: 'host' };
        if (this.guest?.userId === userId) return { player: this.guest, role: 'guest' };
        return null;
    }

    touch(): void {
        this.lastActivity = Date.now();
    }

    /** Build a backwards-compatible snapshot with timeRemaining on players */
    buildSnapshot() {
        const hostTime = this.hostColor === 'w'
            ? this.clock?.getWhiteTime() ?? null
            : this.clock?.getBlackTime() ?? null;
        const guestTime = this.hostColor === 'w'
            ? this.clock?.getBlackTime() ?? null
            : this.clock?.getWhiteTime() ?? null;

        return {
            roomId: this.id,
            fen: this.game.getFen(),
            pgn: this.game.getPgn(),
            timeControl: this.timeControl,
            players: {
                host: { ...this.host, timeRemaining: hostTime },
                guest: this.guest
                    ? { ...this.guest, timeRemaining: guestTime }
                    : null,
            },
            hostColor: this.hostColor,
            turn: this.game.getTurn(),
            status: this.status,
            moveCount: this.game.getHalfMoves(),
        };
    }

    startGame(): void {
        this.status = 'playing';
        this.touch();
    }

    resetForRematch(): void {
        this.hostColor = this.hostColor === 'w' ? 'b' : 'w';
        this.game.resetGame();
        this.status = 'playing';
        this.result = null;
        this.rematchRequested = null;
        this.touch();

        if (this.timeControl) {
            this.clock?.stop();
            this.clock = new ClockService(
                this.timeControl.initial * 1000,
                this.timeControl.increment * 1000
            );
        }
    }
}
