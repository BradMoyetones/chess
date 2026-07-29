import type { PaginationMeta } from '../shared/errors';
import type { Game } from '@chess-fw/db';

// Re-export Game type from DB for convenience
export type { Game } from '@chess-fw/db';

/** Response for GET /api/games/user/:userId */
export interface UserGamesResponse {
    games: Game[];
    pagination: PaginationMeta;
}
