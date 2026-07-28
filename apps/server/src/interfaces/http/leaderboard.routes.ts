import { Router } from 'express';
import { desc, sql } from 'drizzle-orm';
import { user, userProfile } from '@chess-fw/db';
import { eq } from 'drizzle-orm';
import { db } from '../../infrastructure/db/connection';

export function createLeaderboardRoutes(): Router {
    const router = Router();

    /**
     * GET /api/leaderboard/:speed?limit=50&offset=0
     * Get leaderboard for a speed category
     * speed: bullet | blitz | rapid | classical
     */
    router.get('/:speed', async (req, res) => {
        try {
            const { speed } = req.params;
            const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
            const offset = parseInt(req.query.offset as string) || 0;

            const validSpeeds = ['bullet', 'blitz', 'rapid', 'classical'];
            if (!validSpeeds.includes(speed)) {
                res.status(400).json({ error: `Invalid speed. Must be one of: ${validSpeeds.join(', ')}` });
                return;
            }

            // Map speed to column
            const ratingColumnMap: Record<string, any> = {
                bullet: userProfile.ratingBullet,
                blitz: userProfile.ratingBlitz,
                rapid: userProfile.ratingRapid,
                classical: userProfile.ratingClassical,
            };

            const ratingColumn = ratingColumnMap[speed];

            const results = await db.select({
                rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${ratingColumn} DESC)`.as('rank'),
                userId: userProfile.userId,
                username: userProfile.username,
                name: user.name,
                image: user.image,
                rating: ratingColumn,
                gamesPlayed: userProfile.gamesPlayed,
                wins: userProfile.wins,
                losses: userProfile.losses,
                draws: userProfile.draws,
            })
            .from(userProfile)
            .innerJoin(user, eq(userProfile.userId, user.id))
            .orderBy(desc(ratingColumn))
            .limit(limit)
            .offset(offset);

            res.json({
                speed,
                leaderboard: results,
                pagination: { limit, offset, count: results.length },
            });
        } catch (error) {
            console.error('[API] Error fetching leaderboard:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
}
