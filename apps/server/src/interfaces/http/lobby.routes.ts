import { Router } from 'express';
import type { RoomManager } from '../../domain/services/RoomManager';
import type { MatchmakingService } from '../../domain/services/MatchmakingService';

export function createLobbyRoutes(roomManager: RoomManager, matchmakingService: MatchmakingService): Router {
    const router = Router();

    /**
     * GET /api/lobby/rooms
     * Get open rooms for SSR
     */
    router.get('/rooms', (req, res) => {
        const openRooms = roomManager.getOpenRooms().map(room => ({
            roomId: room.id,
            host: {
                name: room.host.name,
                avatar: room.host.avatar,
                rating: room.host.rating,
            },
            hostColor: room.hostColor,
            timeControl: room.timeControl,
            createdAt: room.createdAt,
        }));

        res.json({ rooms: openRooms });
    });

    /**
     * GET /api/lobby/stats
     * Get lobby statistics
     */
    router.get('/stats', (req, res) => {
        const roomStats = roomManager.getRoomStats();
        const queueStats = matchmakingService.getStats();

        res.json({
            rooms: roomStats,
            matchmaking: queueStats,
        });
    });

    return router;
}
