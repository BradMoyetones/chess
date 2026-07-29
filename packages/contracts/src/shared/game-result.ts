import type { Color } from './player';

/** Game result data */
export interface GameResultData {
    winner: Color | 'draw';
    reason: string;
    timestamp: number;
}

/** Possible game statuses in DB */
export type GameStatus = 'created' | 'started' | 'mate' | 'resign' | 'stalemate' | 'timeout' | 'draw' | 'aborted' | 'abandoned';

/** Game termination reason in DB */
export type GameTermination = 'normal' | 'time_forfeit' | 'abandoned' | 'rules_infraction';

/** Winner value */
export type Winner = Color | null;
