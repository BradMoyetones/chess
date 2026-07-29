import type { SocketAck } from '../shared/errors';
import type {
    CreateRoomData,
    JoinRoomData,
    CreateRoomResponse,
    JoinRoomResponse,
    OpponentJoinedPayload,
} from './room.payloads';
import type {
    MovePayload,
    GameOverData,
    MoveResponse,
    MoveReceivedPayload,
    GameEndedPayload,
} from './game.payloads';
import type {
    FindMatchData,
    FindMatchResponse,
    MatchFoundPayload,
} from './matchmaking.payloads';
import type {
    GetOpenRoomsData,
    GetOpenRoomsResponse,
    LobbyRoom,
    RoomIdPayload,
} from './lobby.payloads';
import type {
    RematchAcceptResponse,
    RematchRequestedPayload,
    RematchAcceptedPayload,
} from './rematch.payloads';
import type {
    EvaluateBotData,
    BotMoveResponse,
} from './bot.payloads';
import type { DisconnectPayload } from './connection.payloads';

/**
 * Events the CLIENT sends TO the SERVER.
 * Used with: socket.emit('event_name', data, callback)
 */
export interface ClientToServerEvents {
    // Room
    create_room: (data: CreateRoomData, callback: (res: CreateRoomResponse) => void) => void;
    join_room: (data: JoinRoomData, callback: (res: JoinRoomResponse) => void) => void;

    // Game
    move: (data: MovePayload, callback: (res: MoveResponse) => void) => void;
    game_over: (data: GameOverData, callback: (res: SocketAck) => void) => void;

    // Matchmaking
    find_match: (data: FindMatchData, callback: (res: FindMatchResponse) => void) => void;
    cancel_search: (data: Record<string, never>, callback: (res: SocketAck) => void) => void;

    // Lobby
    get_open_rooms: (data: GetOpenRoomsData, callback: (res: GetOpenRoomsResponse) => void) => void;
    join_lobby: (data: Record<string, never>, callback: (res: SocketAck) => void) => void;
    leave_lobby: (data: Record<string, never>, callback: (res: SocketAck) => void) => void;

    // Rematch
    request_rematch: (data: RoomIdPayload, callback: (res: SocketAck) => void) => void;
    accept_rematch: (data: RoomIdPayload, callback: (res: RematchAcceptResponse) => void) => void;
    decline_rematch: (data: RoomIdPayload, callback: (res: SocketAck) => void) => void;

    // Bot
    evaluate_bot_move: (data: EvaluateBotData, callback: (res: BotMoveResponse) => void) => void;
}

/**
 * Events the SERVER sends TO the CLIENT.
 * Used with: socket.on('event_name', handler)
 */
export interface ServerToClientEvents {
    // Room
    opponent_joined: (data: OpponentJoinedPayload) => void;
    room_closed: () => void;

    // Game
    move_received: (data: MoveReceivedPayload) => void;
    game_ended: (data: GameEndedPayload) => void;

    // Matchmaking
    match_found: (data: MatchFoundPayload) => void;

    // Lobby
    room_created: (data: LobbyRoom) => void;
    room_filled: (data: RoomIdPayload) => void;

    // Rematch
    rematch_requested: (data: RematchRequestedPayload) => void;
    rematch_accepted: (data: RematchAcceptedPayload) => void;
    rematch_declined: () => void;

    // Connection
    opponent_disconnected: (data: DisconnectPayload) => void;
    opponent_reconnected: () => void;
}

/**
 * Socket.IO server-side socket data (populated by auth middleware)
 */
export interface SocketData {
    user?: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
    session?: {
        id: string;
        token: string;
    };
}
