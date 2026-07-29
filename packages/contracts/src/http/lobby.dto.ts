import type { TimeControl } from '../shared/player';

/** Response for GET /api/lobby/rooms */
export interface LobbyRoomsResponse {
    rooms: LobbyRoomInfo[];
}

export interface LobbyRoomInfo {
    roomId: string;
    host: {
        name: string;
        avatar: string;
        rating?: number;
    };
    hostColor: string;
    timeControl: TimeControl | null;
    createdAt: number;
}

/** Response for GET /api/lobby/stats */
export interface LobbyStatsResponse {
    rooms: {
        waiting: number;
        playing: number;
        finished: number;
        total: number;
    };
    matchmaking: Record<string, number>;
}
