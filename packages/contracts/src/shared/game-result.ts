import type { Color } from '@chess-fw/core';

// Re-export DB types that already exist in @chess-fw/db
export type { GameStatus, GameTermination, Winner } from '@chess-fw/db';

/** Game result data (runtime, used in Room context) */
export interface GameResultData {
    winner: Color | 'draw';
    reason: string;
    timestamp: number;
}
