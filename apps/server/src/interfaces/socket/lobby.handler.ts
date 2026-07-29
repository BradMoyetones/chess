import type { Server, Socket } from 'socket.io';
import type { RoomManager } from '../../domain/services/RoomManager';

export interface LobbyRoom {
    roomId: string;
    host: {
        name: string;
        avatar: string;
        rating?: number;
    };
    hostColor: string;
    timeControl: { initial: number; increment: number } | null;
    speed: string;
    createdAt: number;
}

/** Speed classification */
function classifySpeed(initial: number, increment: number): string {
    const totalTime = initial + (40 * increment);
    if (totalTime < 30) return 'ultraBullet';
    if (totalTime < 180) return 'bullet';
    if (totalTime < 480) return 'blitz';
    if (totalTime < 1500) return 'rapid';
    return 'classical';
}

export function registerLobbyHandlers(
    socket: Socket,
    io: Server,
    roomManager: RoomManager
): void {
    /**
     * get_open_rooms: List all rooms waiting for a player
     * Can optionally filter by speed
     */
    socket.on('get_open_rooms', (data: any, callback?: (res: any) => void) => {
        const speedFilter = data?.speed;
        const openRooms: LobbyRoom[] = [];

        // Access rooms through RoomManager
        // We need a method to iterate rooms - we'll use the public API
        const allRooms = roomManager.getOpenRooms();

        for (const room of allRooms) {
            const speed = room.timeControl
                ? classifySpeed(room.timeControl.initial, room.timeControl.increment)
                : 'classical';

            if (speedFilter && speed !== speedFilter) continue;

            openRooms.push({
                roomId: room.id,
                host: {
                    name: room.host.name,
                    avatar: room.host.avatar,
                    rating: room.host.rating,
                },
                hostColor: room.hostColor,
                timeControl: room.timeControl,
                speed,
                createdAt: room.createdAt,
            });
        }

        // Sort by most recent first
        openRooms.sort((a, b) => b.createdAt - a.createdAt);

        if (callback) {
            callback({ success: true, rooms: openRooms });
        }
    });

    /**
     * join_lobby: Join a lobby room to receive real-time updates about open rooms
     */
    socket.on('join_lobby', (data: any, callback?: (res: any) => void) => {
        socket.join('lobby');
        console.log(`[LOBBY] ${socket.data.user?.name || socket.id} se unió al lobby`);

        if (callback) {
            callback({ success: true });
        }
    });

    /**
     * leave_lobby: Stop receiving lobby updates
     */
    socket.on('leave_lobby', (data: any, callback?: (res: any) => void) => {
        socket.leave('lobby');
        if (callback) {
            callback({ success: true });
        }
    });
}
