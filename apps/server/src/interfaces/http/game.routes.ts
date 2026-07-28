import { Router } from 'express';
import type { GameRepository } from '../../domain/ports/GameRepository.port';

export function createGameRoutes(gameRepo: GameRepository): Router {
    const router = Router();

    /**
     * GET /api/games/:id
     * Retrieve a specific game by ID
     */
    router.get('/:id', async (req, res) => {
        try {
            const game = await gameRepo.findById(req.params.id);
            if (!game) {
                res.status(404).json({ error: 'Game not found' });
                return;
            }
            res.json(game);
        } catch (error) {
            console.error('[API] Error fetching game:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    /**
     * GET /api/games/user/:userId?limit=20&offset=0
     * List games for a specific user with pagination
     */
    router.get('/user/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
            const offset = parseInt(req.query.offset as string) || 0;

            const games = await gameRepo.findByUserId(userId, limit, offset);
            res.json({ games, pagination: { limit, offset, count: games.length } });
        } catch (error) {
            console.error('[API] Error fetching user games:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
}
