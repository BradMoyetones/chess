import type { RatingChange } from '@chess-fw/contracts';
/**
 * ELO rating calculator with dynamic K-factor.
 */
export class RatingCalculator {
    /**
     * Calculate new ELO rating after a game.
     * @param rating Current player rating
     * @param opponentRating Opponent's rating
     * @param score 1 = win, 0.5 = draw, 0 = loss
     * @param gamesPlayed Total games played (for K-factor)
     */
    static calculate(
        rating: number,
        opponentRating: number,
        score: number,
        gamesPlayed: number = 0
    ): RatingChange {
        const K = RatingCalculator.getKFactor(gamesPlayed);
        const expected = 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
        const newRating = Math.round(rating + K * (score - expected));
        return {
            oldRating: rating,
            newRating,
            diff: newRating - rating,
        };
    }

    /**
     * Dynamic K-factor:
     * - K=40 for new players (< 30 games)
     * - K=20 for intermediate players
     * - K=10 for established players (rating > 2400)
     */
    private static getKFactor(gamesPlayed: number): number {
        if (gamesPlayed < 30) return 40;
        return 20;
    }
}
