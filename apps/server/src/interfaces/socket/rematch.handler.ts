import type { Server, Socket } from 'socket.io';
import type { RoomManager } from '../../domain/services/RoomManager';

export function registerRematchHandlers(
    socket: Socket,
    io: Server,
    roomManager: RoomManager
): void {
    socket.on('request_rematch', ({ roomId }: any, callback?: (res: any) => void) => {
        const room = roomManager.getRoom(roomId);
        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        const role = room.getPlayerRole(socket.id);
        if (!role) {
            if (callback) callback({ success: false, error: 'No eres un jugador' });
            return;
        }

        const player = room.getPlayerByRole(role);
        if (player) {
            room.rematchRequested = player.userId;
            socket.to(roomId).emit('rematch_requested', {
                requestedBy: player.userId,
                playerName: player.name,
            });
            console.log(`[REMATCH] Sala ${roomId} | ${player.name} solicitó revancha`);
        }

        if (callback) callback({ success: true });
    });

    socket.on('accept_rematch', ({ roomId }: any, callback?: (res: any) => void) => {
        const room = roomManager.getRoom(roomId);
        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        const role = room.getPlayerRole(socket.id);
        if (!role) {
            if (callback) callback({ success: false, error: 'No eres un jugador' });
            return;
        }

        if (!room.rematchRequested) {
            if (callback) callback({ success: false, error: 'No hay solicitud de revancha' });
            return;
        }

        room.resetForRematch();
        const snapshot = room.buildSnapshot();
        const guestColor = room.hostColor === 'w' ? 'b' : 'w';

        io.to(roomId).emit('rematch_accepted', {
            ...snapshot,
            hostColor: room.hostColor,
            guestColor,
        });

        console.log(`[REMATCH] Sala ${roomId} | Aceptada (host=${room.hostColor}, guest=${guestColor})`);

        if (callback) callback({ success: true, ...snapshot, hostColor: room.hostColor, guestColor });
    });

    socket.on('decline_rematch', ({ roomId }: any, callback?: (res: any) => void) => {
        const room = roomManager.getRoom(roomId);
        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        room.rematchRequested = null;
        socket.to(roomId).emit('rematch_declined');
        console.log(`[REMATCH] Sala ${roomId} | Rechazada`);
        if (callback) callback({ success: true });
    });
}
