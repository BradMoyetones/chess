import { Color } from "@chess-fw/core";

export type Role = 'host' | 'guest';

export type Reason = 'checkmate' | 'stalemate' | 'timeout' | 'resignation' | 'draw_agreement' | 'insufficient_material' | 'fifty_move' | 'threefold_repetition' | 'abandonment';

export type Status = 'waiting' | 'playing' | 'finished';

export interface PlayerData {
    socketId: string;
    playerId: string;
    name: string;
    avatar: string;
    timeRemaining: number | null;
    connected: boolean;
    isBot?: boolean;
    rating?: number;
}

export interface TimeControl {
    initial: number;
    increment: number;
}

export interface GameResult {
    winner: Color | 'draw';
    reason: Reason;
    timestamp: number;
}

export interface GameRecord {
    id: string;
    host: PlayerData;
    guest: PlayerData | null;
    hostColor: Color;
    timeControl: TimeControl | null;
    fen: string;
    pgn: string;
    turn: Color;
    lastMoveTime: number | null;
    createdAt: number;
    lastActivity: number;
    result: GameResult | null;
    status: Status;
    moveCount: number;
    rematchRequested: string | null;
}
