import type { Server, Socket } from 'socket.io';
import type { Color } from '@chess-fw/core';
import type { RoomManager } from '../../domain/services/RoomManager';
import { MatchmakingService } from '../../domain/services/MatchmakingService';
import type { FindMatchData, FindMatchResponse, SocketAck, MatchRequest } from '@chess-fw/contracts';
import type { PlayerInfo, TimeControl } from '@chess-fw/contracts';

/** Speed classification */
function classifySpeed(initial: number, increment: number): string {
    const totalTime = initial + (40 * increment);
    if (totalTime < 30) return 'ultraBullet';
    if (totalTime < 180) return 'bullet';
    if (totalTime < 480) return 'blitz';
    if (totalTime < 1500) return 'rapid';
    return 'classical';
}

export function registerMatchmakingHandlers(
    socket: Socket,
    io: Server,
    roomManager: RoomManager,
    matchmakingService: MatchmakingService
): void {
    /**
     * find_match: Player joins matchmaking queue
     * data: { timeControl: { initial, increment }, rating?: number }
     */
    socket.on('find_match', (data: FindMatchData, callback?: (res: FindMatchResponse) => void) => {
        const userId = socket.data.user?.id || socket.id;
        const name = socket.data.user?.name || 'Jugador';
        const avatar = socket.data.user?.image || '';

        if (!data.timeControl?.initial) {
            if (callback) callback({ success: false, error: 'timeControl es requerido' });
            return;
        }

        const timeControl: TimeControl = {
            initial: data.timeControl.initial,
            increment: data.timeControl.increment || 0,
        };

        const speed = classifySpeed(timeControl.initial, timeControl.increment);
        const rating = data.rating || 1500;

        const request: MatchRequest = {
            userId,
            socketId: socket.id,
            name,
            avatar,
            rating,
            timeControl,
            speed,
            preferredColor: data.preferredColor || 'random',
            timestamp: Date.now(),
        };

        console.log(`[MATCHMAKING] ${name} busca partida ${speed} (${timeControl.initial}+${timeControl.increment}) rating: ${rating}`);

        const result = matchmakingService.enqueue(request);

        if (result) {
            // Match found! Create room
            const { player1, player2 } = result;

            // Determine colors
            let hostColor: Color;
            if (player1.preferredColor !== 'random' && player2.preferredColor !== 'random') {
                hostColor = Math.random() < 0.5 ? 'w' : 'b';
            } else if (player1.preferredColor !== 'random') {
                hostColor = player1.preferredColor;
            } else if (player2.preferredColor !== 'random') {
                hostColor = player2.preferredColor === 'w' ? 'b' : 'w';
            } else {
                hostColor = Math.random() < 0.5 ? 'w' : 'b';
            }

            const hostInfo: PlayerInfo = {
                socketId: player1.socketId,
                userId: player1.userId,
                name: player1.name,
                avatar: player1.avatar,
                connected: true,
                rating: player1.rating,
            };

            const room = roomManager.createRoom(hostInfo, hostColor, timeControl);

            // Set guest
            room.guest = {
                socketId: player2.socketId,
                userId: player2.userId,
                name: player2.name,
                avatar: player2.avatar,
                connected: true,
                rating: player2.rating,
            };

            room.startGame();

            // Join both sockets to the room
            const player1Socket = io.sockets.sockets.get(player1.socketId);
            const player2Socket = io.sockets.sockets.get(player2.socketId);

            if (player1Socket) player1Socket.join(room.id);
            if (player2Socket) player2Socket.join(room.id);

            const guestColor: Color = hostColor === 'w' ? 'b' : 'w';
            const snapshot = room.buildSnapshot();

            // Notify player1 (who was waiting in queue)
            if (player1Socket) {
                player1Socket.emit('match_found', {
                    ...snapshot,
                    color: hostColor,
                });
            }

            // Notify player2 (who just searched, via callback)
            if (callback) {
                callback({
                    success: true,
                    matched: true,
                    ...snapshot,
                    color: guestColor,
                });
            }

            console.log(`[MATCHMAKING] ¡Match! ${player1.name} (${player1.rating}) vs ${player2.name} (${player2.rating}) | Sala: ${room.id}`);
        } else {
            // No match, player is now in queue
            if (callback) {
                callback({
                    success: true,
                    matched: false,
                    message: 'Buscando oponente...',
                    queueStats: matchmakingService.getStats(),
                });
            }

            console.log(`[MATCHMAKING] ${name} en cola (${speed})`);
        }
    });

    /**
     * cancel_search: Player leaves matchmaking queue
     */
    socket.on('cancel_search', (_data: Record<string, never>, callback?: (res: SocketAck) => void) => {
        const userId = socket.data.user?.id || socket.id;
        const removed = matchmakingService.dequeue(userId);

        if (callback) {
            callback({ success: true });
        }

        if (removed) {
            console.log(`[MATCHMAKING] ${socket.data.user?.name || userId} canceló búsqueda`);
        }
    });
}
