import type { Server, Socket } from 'socket.io';
import type { Color } from '@chess-fw/core';
import type { RoomManager } from '../../domain/services/RoomManager';

import type { GamePersistenceService } from '../../application/GamePersistenceService';

export function registerConnectionHandlers(
    socket: Socket,
    io: Server,
    roomManager: RoomManager,
    persistenceService: GamePersistenceService
): void {
    socket.on('disconnect', () => {
        console.log(`[-] Cliente desconectado: ${socket.id}`);

        const rooms = roomManager.findRoomsBySocketId(socket.id);

        for (const [roomId, room] of rooms) {
            let disconnectedUserId: string | null = null;
            let disconnectedColor: Color | null = null;

            if (room.host.socketId === socket.id) {
                room.host.connected = false;
                disconnectedUserId = room.host.userId;
                disconnectedColor = room.hostColor;
            } else if (room.guest?.socketId === socket.id) {
                room.guest.connected = false;
                disconnectedUserId = room.guest.userId;
                disconnectedColor = room.hostColor === 'w' ? 'b' : 'w';
            }

            if (!disconnectedUserId || !disconnectedColor) continue;

            // Notify the opponent
            io.to(roomId).emit('opponent_disconnected', {
                hostConnected: room.host.connected,
                guestConnected: room.guest?.connected ?? false,
            });

            // Start abandonment timer for active games with time control
            if (room.status === 'playing' && room.timeControl && room.guest) {
                const loserColor = disconnectedColor;

                roomManager.startDisconnectTimer(roomId, disconnectedUserId, () => {
                    if (room.status === 'finished') return;

                    const winner: Color = loserColor === 'w' ? 'b' : 'w';
                    room.result = {
                        winner,
                        reason: 'abandonment',
                        timestamp: Date.now(),
                    };
                    room.status = 'finished';
                    room.clock?.stop();

                    persistenceService.persistGame(room).catch(err => {
                        console.error(`[PERSIST] Error:`, err);
                    });

                    io.to(roomId).emit('game_ended', {
                        result: room.result,
                        ...room.buildSnapshot(),
                    });

                    console.log(`[ABANDON] Sala ${roomId} | ${disconnectedUserId} abandonó → ${winner} gana`);
                });

                console.log(`[DISCONNECT] Sala ${roomId} | Timer de abandono para ${disconnectedUserId}`);
            }
        }
    });
}
