import type { PaginationMeta } from '../shared/errors';

/** Response for GET /api/leaderboard/:speed */
export interface LeaderboardResponse {
    speed: string;
    leaderboard: LeaderboardEntry[];
    pagination: PaginationMeta;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string | null;
    name: string;
    image: string | null;
    rating: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
}
