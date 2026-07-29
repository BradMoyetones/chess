import { Router, type Request } from 'express';
import { requireAuth, type AuthenticatedRequest } from './middleware';
import { DrizzleFriendshipRepository } from '../../infrastructure/repositories/DrizzleFriendshipRepository';
import { auth } from '../../infrastructure/auth/setup';
import { fromNodeHeaders } from 'better-auth/node';
import { eq, or, desc } from 'drizzle-orm';
import { user } from '@chess-fw/db';
import { db } from '../../infrastructure/db/connection';



export function createSocialRoutes(friendshipRepo: DrizzleFriendshipRepository): Router {
    const router = Router();

    // All social routes require authentication
    router.use(requireAuth);

    /**
     * POST /api/social/friend-request
     * Send a friend request
     */
    router.post('/friend-request', async (req: Request, res) => {
        try {
            const { addresseeId } = req.body;
            if (!addresseeId) {
                res.status(400).json({ error: 'addresseeId is required' });
                return;
            }

            if (addresseeId === (req as AuthenticatedRequest).user.id) {
                res.status(400).json({ error: 'Cannot send friend request to yourself' });
                return;
            }

            // Check addressee exists
            const [addressee] = await db.select().from(user)
                .where(eq(user.id, addresseeId)).limit(1);
            if (!addressee) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const friendship = await friendshipRepo.sendRequest((req as AuthenticatedRequest).user.id, addresseeId);
            res.status(201).json({ friendship });
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'Friendship request already exists') {
                res.status(409).json({ error: error.message });
                return;
            }
            console.error('[API] Error sending friend request:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    /**
     * POST /api/social/friend-request/:id/accept
     * Accept a friend request
     */
    router.post('/friend-request/:id/accept', async (req: Request, res) => {
        try {
            const friendship = await friendshipRepo.acceptRequest(req.params.id as string, (req as AuthenticatedRequest).user.id);
            res.json({ friendship });
        } catch (error: unknown) {
            console.error('[API] Error accepting friend request:', error);
            res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    /**
     * POST /api/social/friend-request/:id/decline
     * Decline/cancel a friend request
     */
    router.post('/friend-request/:id/decline', async (req: Request, res) => {
        try {
            await friendshipRepo.declineRequest(req.params.id as string, (req as AuthenticatedRequest).user.id);
            res.json({ success: true });
        } catch (error: unknown) {
            console.error('[API] Error declining friend request:', error);
            res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    /**
     * GET /api/social/friends
     * List all accepted friends
     */
    router.get('/friends', async (req: Request, res) => {
        try {
            const friends = await friendshipRepo.getFriends((req as AuthenticatedRequest).user.id);
            res.json({ friends });
        } catch (error) {
            console.error('[API] Error fetching friends:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    /**
     * GET /api/social/pending
     * List pending friend requests
     */
    router.get('/pending', async (req: Request, res) => {
        try {
            const requests = await friendshipRepo.getPendingRequests((req as AuthenticatedRequest).user.id);
            res.json({ requests });
        } catch (error) {
            console.error('[API] Error fetching pending requests:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    /**
     * DELETE /api/social/friend/:id
     * Remove a friend
     */
    router.delete('/friend/:id', async (req: Request, res) => {
        try {
            await friendshipRepo.removeFriend(req.params.id as string, (req as AuthenticatedRequest).user.id);
            res.json({ success: true });
        } catch (error: unknown) {
            console.error('[API] Error removing friend:', error);
            res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    return router;
}
