import type { PaginationMeta } from '../shared/errors';

/** Response for GET /api/games/user/:userId */
export interface UserGamesResponse {
    games: GameRecord[];
    pagination: PaginationMeta;
}

/** Full game record from the database */
export interface GameRecord {
    id: string;
    whiteId: string;
    blackId: string;
    status: string;
    winner: string | null;
    termination: string | null;
    timeInitial: number | null;
    timeIncrement: number | null;
    speed: string | null;
    initialFen: string;
    moves: string;
    pgn: string;
    halfMoves: number;
    eco: string | null;
    openingName: string | null;
    whiteRating: number | null;
    blackRating: number | null;
    whiteRatingDiff: number | null;
    blackRatingDiff: number | null;
    clocks: string | null;
    rated: boolean;
    variant: string;
    source: string;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
}
