import type { Server, Socket } from 'socket.io';
import type { CreateRoomData, CreateRoomResponse, JoinRoomData, JoinRoomResponse } from '@chess-fw/contracts';
import type { Color } from '@chess-fw/core';
import type { RoomManager } from '../../domain/services/RoomManager';
import type { PlayerInfo } from '../../domain/entities/RoomEntity';
import { classifySpeed } from '../../utils/game';

export function registerRoomHandlers(
    socket: Socket,
    io: Server,
    roomManager: RoomManager
): void {
    socket.on('create_room', (data: CreateRoomData, callback?: (res: CreateRoomResponse) => void) => {
        const { hostColor, timeControl, playerName, playerAvatar, playerId } = data;

        // Prefer authenticated user data, fallback to provided data
        const userId = socket.data.user?.id || playerId || socket.id;
        const name = socket.data.user?.name || playerName || 'Jugador 1';
        const avatar = socket.data.user?.image || playerAvatar || '';

        const finalHostColor: Color = hostColor === 'random' || !hostColor
            ? (Math.random() < 0.5 ? 'w' : 'b')
            : hostColor as Color;

        const host: PlayerInfo = {
            socketId: socket.id,
            userId,
            name,
            avatar,
            connected: true,
        };

        const room = roomManager.createRoom(host, finalHostColor, timeControl ?? null);
        socket.join(room.id);

        io.to('lobby').emit('room_created', {
            roomId: room.id,
            host: { name, avatar, rating: socket.data.user?.rating },
            hostColor: finalHostColor,
            timeControl: timeControl ?? null,
            speed: timeControl ? classifySpeed(timeControl.initial, timeControl.increment) : 'classical',
            createdAt: room.createdAt,
        });

        console.log(`[ROOM] ${name} creó la sala ${room.id} (Color: ${finalHostColor})`);

        if (callback) {
            callback({
                success: true,
                roomId: room.id,
                color: finalHostColor,
                fen: room.game.getFen(),
            });
        }
    });

    socket.on('join_room', (data: JoinRoomData, callback?: (res: JoinRoomResponse) => void) => {
        const { roomId, playerId, playerName, playerAvatar } = data;
        const room = roomManager.getRoom(roomId);

        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        const userId = socket.data.user?.id || playerId || socket.id;
        const name = socket.data.user?.name || playerName || 'Jugador 2';
        const avatar = socket.data.user?.image || playerAvatar || '';
        const guestColor: Color = room.hostColor === 'w' ? 'b' : 'w';

        // ── Host Reconnection ──
        if (room.host.userId === userId) {
            console.log(`[ROOM] ${name} (Host) se reconectó a ${roomId}`);
            room.host.socketId = socket.id;
            room.host.connected = true;
            socket.join(roomId);
            roomManager.clearDisconnectTimer(roomId, userId);

            if (callback) {
                callback({
                    success: true,
                    ...room.buildSnapshot(),
                    color: room.hostColor,
                    waiting: !room.guest,
                });
            }

            if (room.guest) {
                socket.to(roomId).emit('opponent_joined', {
                    players: room.buildSnapshot().players,
                });
            }
            return;
        }

        // ── Guest Reconnection ──
        if (room.guest?.userId === userId) {
            const guest = room.guest!;
            console.log(`[ROOM] ${name} (Guest) se reconectó a ${roomId}`);
            guest.socketId = socket.id;
            guest.connected = true;
            socket.join(roomId);
            roomManager.clearDisconnectTimer(roomId, userId);

            if (callback) {
                callback({
                    success: true,
                    ...room.buildSnapshot(),
                    color: guestColor,
                    waiting: false,
                });
            }

            socket.to(roomId).emit('opponent_joined', {
                players: room.buildSnapshot().players,
            });
            return;
        }

        // ── New Player Joining ──
        if (room.guest) {
            if (callback) callback({ success: false, error: 'La sala está llena' });
            return;
        }

        room.guest = {
            socketId: socket.id,
            userId,
            name,
            avatar,
            connected: true,
        };

        room.startGame();

        io.to('lobby').emit('room_filled', { roomId });

        socket.join(roomId);

        console.log(`[ROOM] ${name} se unió a ${roomId} como Guest (Color: ${guestColor})`);

        const snapshot = room.buildSnapshot();

        if (callback) {
            callback({
                success: true,
                ...snapshot,
                color: guestColor,
                waiting: false,
            });
        }

        socket.to(roomId).emit('opponent_joined', {
            players: snapshot.players,
        });
    });
}
