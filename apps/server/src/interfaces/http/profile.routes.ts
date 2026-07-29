import { Router, type Request } from 'express';
import { requireAuth, type AuthenticatedRequest } from './middleware';
import { eq, like, or, desc, sql } from 'drizzle-orm';
import { user, userProfile } from '@chess-fw/db';
import type { UserProfile } from '@chess-fw/db';
import { db } from '../../infrastructure/db/connection';
import { auth } from '../../infrastructure/auth/setup';
import { fromNodeHeaders } from 'better-auth/node';



export function createProfileRoutes(): Router {
    const router = Router();

    /**
     * GET /api/profile/me
     * Get the authenticated user's profile + stats
     */
    router.get('/me', requireAuth, async (req: Request, res) => {
        try {
            const authReq = req as AuthenticatedRequest;
            const userId = authReq.user.id;

            // Get or create profile
            let [profile] = await db.select().from(userProfile)
                .where(eq(userProfile.userId, userId)).limit(1);

            if (!profile) {
                [profile] = await db.insert(userProfile)
                    .values({ userId })
                    .returning();
            }

            res.json({
                user: authReq.user,
                profile,
            });
        } catch (error) {
            console.error('[API] Error fetching profile:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    /**
     * PUT /api/profile/me
     * Update the authenticated user's profile (username, bio, country)
     */
    router.put('/me', requireAuth, async (req: Request, res) => {
        try {
            const userId = (req as AuthenticatedRequest).user.id;
            const { username, bio, country } = req.body;

            // Validate username uniqueness if provided
            if (username) {
                const [existing] = await db.select().from(userProfile)
                    .where(eq(userProfile.username, username)).limit(1);
                if (existing && existing.userId !== userId) {
                    res.status(409).json({ error: 'Username already taken' });
                    return;
                }
            }

            const updateData: Partial<{ username: string; bio: string; country: string }> = {};
            if (username !== undefined) updateData.username = username;
            if (bio !== undefined) updateData.bio = bio;
            if (country !== undefined) updateData.country = country;

            // Upsert: update if exists, create if not
            let [profile] = await db.select().from(userProfile)
                .where(eq(userProfile.userId, userId)).limit(1);

            if (profile) {
                [profile] = await db.update(userProfile)
                    .set(updateData)
                    .where(eq(userProfile.userId, userId))
                    .returning();
            } else {
                [profile] = await db.insert(userProfile)
                    .values({ userId, ...updateData })
                    .returning();
            }

            res.json({ profile });
        } catch (error) {
            console.error('[API] Error updating profile:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    /**
     * GET /api/profile/search?q=term&limit=20
     * Search users by name or username
     */
    router.get('/search', async (req, res) => {
        try {
            const query = req.query.q as string;
            const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

            if (!query || query.length < 2) {
                res.status(400).json({ error: 'Search query must be at least 2 characters' });
                return;
            }

            const pattern = `%${query}%`;

            const results = await db.select({
                id: user.id,
                name: user.name,
                image: user.image,
                username: userProfile.username,
                ratingBullet: userProfile.ratingBullet,
                ratingBlitz: userProfile.ratingBlitz,
                ratingRapid: userProfile.ratingRapid,
            })
            .from(user)
            .leftJoin(userProfile, eq(user.id, userProfile.userId))
            .where(
                or(
                    like(user.name, pattern),
                    like(userProfile.username, pattern)
                )
            )
            .limit(limit);

            res.json({ users: results });
        } catch (error) {
            console.error('[API] Error searching users:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    /**
     * GET /api/profile/:userId
     * Get any user's public profile
     */
    router.get('/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            const [userData] = await db.select().from(user)
                .where(eq(user.id, userId)).limit(1);

            if (!userData) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const [profile] = await db.select().from(userProfile)
                .where(eq(userProfile.userId, userId)).limit(1);

            res.json({
                user: {
                    id: userData.id,
                    name: userData.name,
                    image: userData.image,
                    createdAt: userData.createdAt,
                },
                profile: profile || null,
            });
        } catch (error) {
            console.error('[API] Error fetching user profile:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
}
