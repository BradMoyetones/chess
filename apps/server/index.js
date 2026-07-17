/**
 * Chess Game Server
 * Express + Socket.IO + Stockfish
 *
 * @typedef {import('./types.js').PlayerData} PlayerData
 * @typedef {import('./types.js').TimeControl} TimeControl
 * @typedef {import('./types.js').GameResult} GameResult
 * @typedef {import('./types.js').GameRecord} GameRecord
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { StockfishAdapter, EventBus } from '@chess-fw/core';
import { detectOS } from './constants/os.js';
import { STOCKFISH_BINARIES } from './constants/stockfish.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const DISCONNECT_TIMEOUT_MS = 30_000; // 30 seconds before auto-forfeit
const GC_INTERVAL_MS = 60_000; // Garbage collector runs every minute
const ROOM_INACTIVITY_MS = 5 * 60_000; // 5 minutes

// ─── Path Setup ──────────────────────────────────────────────────────────────

const filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(filename);

const detectedOs = detectOS();
const binary = STOCKFISH_BINARIES.find(binary => binary.value === detectedOs);
const stockfishBinaryPath = path.resolve(__dirname, 'bin', binary.destExe);

// ─── Express + Socket.IO Setup ───────────────────────────────────────────────

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ─── Stockfish Initialization ────────────────────────────────────────────────

const eventBus = new EventBus();
const stockfish = new StockfishAdapter(eventBus);

await stockfish.init({
    binaryPath: stockfishBinaryPath,
    defaultDepth: 15,
    threads: 1,
    hashSize: 16
});
console.log('[*] Stockfish inicializado en el servidor.');

// ─── In-Memory State ─────────────────────────────────────────────────────────

/** @type {Map<string, GameRecord>} */
const rooms = new Map();

/** @type {Map<string, NodeJS.Timeout>} Disconnect timers keyed by `${roomId}:${playerId}` */
const disconnectTimers = new Map();

// ─── Helper Functions ────────────────────────────────────────────────────────

function generateRoomId() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

/**
 * Resolve the host color from the requested value, handling 'random'.
 * @param {string|undefined} hostColor
 * @returns {'w'|'b'}
 */
function resolveHostColor(hostColor) {
    if (hostColor === 'random' || !hostColor) {
        return Math.random() < 0.5 ? 'w' : 'b';
    }
    return hostColor;
}

/**
 * Create a new PlayerData object.
 * @param {string} socketId
 * @param {string} playerId
 * @param {string} name
 * @param {string} avatar
 * @param {number|null} timeRemainingMs
 * @returns {PlayerData}
 */
function createPlayer(socketId, playerId, name, avatar, timeRemainingMs) {
    return {
        socketId,
        playerId,
        name,
        avatar,
        timeRemaining: timeRemainingMs,
        connected: true,
    };
}

/**
 * Create a new GameRecord for a room.
 * @param {string} roomId
 * @param {PlayerData} host
 * @param {'w'|'b'} hostColor
 * @param {TimeControl|null} timeControl
 * @returns {GameRecord}
 */
function createRoom(roomId, host, hostColor, timeControl) {
    return {
        id: roomId,
        host,
        guest: null,
        hostColor,
        timeControl,
        fen: START_FEN,
        pgn: '',
        turn: 'w',
        lastMoveTime: null,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        result: null,
        status: 'waiting',
        moveCount: 0,
        rematchRequested: null,
    };
}

/**
 * Determine which player role a socket occupies in a room.
 * @param {GameRecord} room
 * @param {string} socketId
 * @returns {'host'|'guest'|null}
 */
function getPlayerRole(room, socketId) {
    if (room.host.socketId === socketId) return 'host';
    if (room.guest && room.guest.socketId === socketId) return 'guest';
    return null;
}

/**
 * Get the player's color based on their role.
 * @param {GameRecord} room
 * @param {'host'|'guest'} role
 * @returns {'w'|'b'}
 */
function getPlayerColor(room, role) {
    return role === 'host' ? room.hostColor : (room.hostColor === 'w' ? 'b' : 'w');
}

/**
 * Build a standardised game-state snapshot for callbacks / events.
 * @param {GameRecord} room
 */
function buildGameSnapshot(room) {
    return {
        roomId: room.id,
        fen: room.fen,
        pgn: room.pgn,
        timeControl: room.timeControl,
        players: { host: room.host, guest: room.guest },
        turn: room.turn,
        lastMoveTime: room.lastMoveTime,
        status: room.status,
        moveCount: room.moveCount,
    };
}

/**
 * Clear a disconnect timer for a player if one exists.
 * @param {string} roomId
 * @param {string} playerId
 */
function clearDisconnectTimer(roomId, playerId) {
    const key = `${roomId}:${playerId}`;
    const timer = disconnectTimers.get(key);
    if (timer) {
        clearTimeout(timer);
        disconnectTimers.delete(key);
    }
}

/**
 * Start a disconnect timer. If the player doesn't reconnect within
 * DISCONNECT_TIMEOUT_MS the game is auto-forfeited.
 * @param {string} roomId
 * @param {string} playerId
 * @param {'w'|'b'} playerColor
 */
function startDisconnectTimer(roomId, playerId, playerColor) {
    const key = `${roomId}:${playerId}`;
    // Clear any existing timer first
    clearDisconnectTimer(roomId, playerId);

    const timer = setTimeout(() => {
        const room = rooms.get(roomId);
        if (!room || room.status === 'finished') return;

        const winner = playerColor === 'w' ? 'b' : 'w';

        /** @type {GameResult} */
        const result = {
            winner,
            reason: 'abandonment',
            timestamp: Date.now(),
        };

        room.result = result;
        room.status = 'finished';
        room.lastActivity = Date.now();

        io.to(roomId).emit('game_ended', { result, ...buildGameSnapshot(room) });
        console.log(`[TIMEOUT] Sala ${roomId} | Jugador ${playerId} abandonó → ${winner} gana`);

        disconnectTimers.delete(key);
    }, DISCONNECT_TIMEOUT_MS);

    disconnectTimers.set(key, timer);
}

// ─── Socket.IO Event Handlers ────────────────────────────────────────────────

io.on('connection', (socket) => {
    console.log(`[+] Cliente conectado: ${socket.id}`);

    // ── Evaluate Bot Move ────────────────────────────────────────────────
    socket.on('evaluate_bot_move', async ({ fen, options }, callback) => {
        try {
            if (options && options.skillLevel !== undefined) {
                stockfish.setOption('UCI_LimitStrength', 'true');
                const elo = Math.min(3200, Math.max(1320, 1320 + options.skillLevel * 90));
                stockfish.setOption('UCI_Elo', elo);
                stockfish.setOption('Skill Level', options.skillLevel);
            } else {
                stockfish.setOption('UCI_LimitStrength', 'false');
                stockfish.setOption('Skill Level', 20);
            }

            const evaluation = await stockfish.evaluate(fen, options?.depth);

            if (callback) callback({ success: true, evaluation });
        } catch (error) {
            console.error('Error evaluando move:', error);
            if (callback) callback({ success: false, error: error.message });
        }
    });

    // ── Create Room ──────────────────────────────────────────────────────
    socket.on('create_room', ({ hostColor, timeControl, playerName, playerAvatar, playerId }, callback) => {
        const roomId = generateRoomId();
        const finalHostColor = resolveHostColor(hostColor);
        const initialTimeMs = timeControl ? timeControl.initial * 1000 : null;

        const host = createPlayer(socket.id, playerId, playerName || 'Jugador 1', playerAvatar, initialTimeMs);
        const room = createRoom(roomId, host, finalHostColor, timeControl ?? null);
        rooms.set(roomId, room);

        socket.join(roomId);
        console.log(`[ROOM] ${socket.id} creó la sala ${roomId} (Host Color: ${finalHostColor})`);

        if (callback) callback({ success: true, roomId, color: finalHostColor, fen: START_FEN });
    });

    // ── Join Room ────────────────────────────────────────────────────────
    socket.on('join_room', ({ roomId, playerId, playerName, playerAvatar }, callback) => {
        const room = rooms.get(roomId);

        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        const guestColor = room.hostColor === 'w' ? 'b' : 'w';

        // ── Host reconnection ────────────────────────────────────────
        if (room.host.playerId === playerId) {
            console.log(`[ROOM] ${socket.id} (Host) se reconectó a la sala ${roomId}`);
            room.host.socketId = socket.id;
            room.host.connected = true;
            socket.join(roomId);

            // Cancel any pending forfeit timer
            clearDisconnectTimer(roomId, playerId);

            if (callback) {
                callback({
                    success: true, roomId, color: room.hostColor, fen: room.fen, pgn: room.pgn,
                    waiting: !room.guest,
                    timeControl: room.timeControl,
                    players: { host: room.host, guest: room.guest },
                    turn: room.turn,
                    lastMoveTime: room.lastMoveTime
                });
            }

            if (room.guest) {
                socket.to(roomId).emit('opponent_joined', { players: { host: room.host, guest: room.guest } });
            }
            return;
        }

        // ── Guest reconnection ───────────────────────────────────────
        if (room.guest && room.guest.playerId === playerId) {
            console.log(`[ROOM] ${socket.id} (Guest) se reconectó a la sala ${roomId}`);
            room.guest.socketId = socket.id;
            room.guest.connected = true;
            socket.join(roomId);

            // Cancel any pending forfeit timer
            clearDisconnectTimer(roomId, playerId);

            if (callback) {
                callback({
                    success: true, roomId, color: guestColor, fen: room.fen, pgn: room.pgn,
                    waiting: false,
                    timeControl: room.timeControl,
                    players: { host: room.host, guest: room.guest },
                    turn: room.turn,
                    lastMoveTime: room.lastMoveTime
                });
            }

            socket.to(roomId).emit('opponent_joined', { players: { host: room.host, guest: room.guest } });
            return;
        }

        // ── New player joining ───────────────────────────────────────
        if (room.guest) {
            if (callback) callback({ success: false, error: 'La sala está llena' });
            return;
        }

        const initialTimeMs = room.timeControl ? room.timeControl.initial * 1000 : null;

        room.guest = createPlayer(socket.id, playerId, playerName || 'Jugador 2', playerAvatar, initialTimeMs);
        room.status = 'playing';
        room.lastActivity = Date.now();
        room.lastMoveTime = null;
        socket.join(roomId);

        console.log(`[ROOM] ${socket.id} se unió a la sala ${roomId} como nuevo Guest (Color: ${guestColor})`);

        if (callback) {
            callback({
                success: true, roomId, color: guestColor, fen: room.fen, pgn: room.pgn,
                waiting: false,
                timeControl: room.timeControl,
                players: { host: room.host, guest: room.guest },
                turn: room.turn,
                lastMoveTime: room.lastMoveTime
            });
        }

        socket.to(roomId).emit('opponent_joined', {
            players: { host: room.host, guest: room.guest },
            lastMoveTime: room.lastMoveTime
        });
    });

    // ── Move ─────────────────────────────────────────────────────────────
    socket.on('move', ({ roomId, moveData, fen, pgn }, callback) => {
        const room = rooms.get(roomId);
        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        // Validate: socket must be a player in this room
        const role = getPlayerRole(room, socket.id);
        if (!role) {
            if (callback) callback({ success: false, error: 'No eres un jugador en esta sala' });
            return;
        }

        // Validate: it must be this player's turn
        const playerColor = getPlayerColor(room, role);
        if (room.turn !== playerColor) {
            if (callback) callback({ success: false, error: 'No es tu turno' });
            return;
        }

        // Validate: game must still be active
        if (room.status === 'finished') {
            if (callback) callback({ success: false, error: 'La partida ya terminó' });
            return;
        }

        const now = Date.now();

        // Update time control if applicable
        if (room.timeControl && room.lastMoveTime) {
            const timeElapsed = now - room.lastMoveTime;
            const incrementMs = room.timeControl.increment * 1000;

            if (room.turn === room.hostColor) {
                room.host.timeRemaining = Math.max(0, room.host.timeRemaining - timeElapsed) + incrementMs;
            } else {
                room.guest.timeRemaining = Math.max(0, room.guest.timeRemaining - timeElapsed) + incrementMs;
            }
        }

        room.fen = fen;
        if (pgn) room.pgn = pgn;
        room.turn = room.turn === 'w' ? 'b' : 'w';
        room.lastMoveTime = now;
        room.lastActivity = now;
        room.moveCount += 1;

        const ackData = {
            players: { host: room.host, guest: room.guest },
            turn: room.turn,
            lastMoveTime: room.lastMoveTime
        };

        if (callback) callback(ackData);

        socket.to(roomId).emit('move_received', {
            moveData, fen, pgn,
            ...ackData
        });
        console.log(`[MOVE] Sala ${roomId} | ${moveData.from} -> ${moveData.to} (move #${room.moveCount})`);
    });

    // ── Game Over ────────────────────────────────────────────────────────
    socket.on('game_over', ({ roomId, result }, callback) => {
        const room = rooms.get(roomId);
        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        // Only a player in the room can declare game over
        const role = getPlayerRole(room, socket.id);
        if (!role) {
            if (callback) callback({ success: false, error: 'No eres un jugador en esta sala' });
            return;
        }

        // Don't allow ending an already-finished game
        if (room.status === 'finished') {
            if (callback) callback({ success: false, error: 'La partida ya terminó' });
            return;
        }

        /** @type {GameResult} */
        const gameResult = {
            winner: result.winner,
            reason: result.reason,
            timestamp: Date.now(),
        };

        room.result = gameResult;
        room.status = 'finished';
        room.lastActivity = Date.now();

        // Notify opponent
        socket.to(roomId).emit('game_ended', { result: gameResult, ...buildGameSnapshot(room) });

        console.log(`[GAME OVER] Sala ${roomId} | Ganador: ${gameResult.winner} | Razón: ${gameResult.reason}`);

        // Return the final game record for potential DB storage
        if (callback) callback({ success: true, gameRecord: buildGameSnapshot(room), result: gameResult });
    });

    // ── Request Rematch ──────────────────────────────────────────────────
    socket.on('request_rematch', ({ roomId }, callback) => {
        const room = rooms.get(roomId);
        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        const role = getPlayerRole(room, socket.id);
        if (!role) {
            if (callback) callback({ success: false, error: 'No eres un jugador en esta sala' });
            return;
        }

        const player = role === 'host' ? room.host : room.guest;
        room.rematchRequested = player.playerId;

        // Notify opponent
        socket.to(roomId).emit('rematch_requested', { requestedBy: player.playerId, playerName: player.name });

        console.log(`[REMATCH] Sala ${roomId} | ${player.name} solicitó revancha`);
        if (callback) callback({ success: true });
    });

    // ── Accept Rematch ───────────────────────────────────────────────────
    socket.on('accept_rematch', ({ roomId }, callback) => {
        const room = rooms.get(roomId);
        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        const role = getPlayerRole(room, socket.id);
        if (!role) {
            if (callback) callback({ success: false, error: 'No eres un jugador en esta sala' });
            return;
        }

        if (!room.rematchRequested) {
            if (callback) callback({ success: false, error: 'No hay solicitud de revancha pendiente' });
            return;
        }

        // Swap colors
        room.hostColor = room.hostColor === 'w' ? 'b' : 'w';

        // Reset game state
        const initialTimeMs = room.timeControl ? room.timeControl.initial * 1000 : null;
        room.fen = START_FEN;
        room.pgn = '';
        room.turn = 'w';
        room.lastMoveTime = null;
        room.lastActivity = Date.now();
        room.result = null;
        room.status = 'playing';
        room.moveCount = 0;
        room.rematchRequested = null;

        // Reset player times
        room.host.timeRemaining = initialTimeMs;
        room.guest.timeRemaining = initialTimeMs;

        const snapshot = buildGameSnapshot(room);
        const guestColor = room.hostColor === 'w' ? 'b' : 'w';

        // Notify both players
        io.to(roomId).emit('rematch_accepted', {
            ...snapshot,
            hostColor: room.hostColor,
            guestColor,
        });

        console.log(`[REMATCH] Sala ${roomId} | Revancha aceptada (nuevos colores: host=${room.hostColor}, guest=${guestColor})`);

        if (callback) {
            callback({
                success: true,
                ...snapshot,
                hostColor: room.hostColor,
                guestColor,
            });
        }
    });

    // ── Decline Rematch ──────────────────────────────────────────────────
    socket.on('decline_rematch', ({ roomId }, callback) => {
        const room = rooms.get(roomId);
        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        const role = getPlayerRole(room, socket.id);
        if (!role) {
            if (callback) callback({ success: false, error: 'No eres un jugador en esta sala' });
            return;
        }

        room.rematchRequested = null;

        // Notify opponent
        socket.to(roomId).emit('rematch_declined');

        console.log(`[REMATCH] Sala ${roomId} | Revancha rechazada`);
        if (callback) callback({ success: true });
    });

    // ── Disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        console.log(`[-] Cliente desconectado: ${socket.id}`);

        for (const [roomId, room] of rooms.entries()) {
            let disconnectedRole = null;
            let disconnectedPlayerId = null;
            let disconnectedColor = null;

            if (room.host.socketId === socket.id) {
                room.host.connected = false;
                disconnectedRole = 'host';
                disconnectedPlayerId = room.host.playerId;
                disconnectedColor = room.hostColor;
            } else if (room.guest && room.guest.socketId === socket.id) {
                room.guest.connected = false;
                disconnectedRole = 'guest';
                disconnectedPlayerId = room.guest.playerId;
                disconnectedColor = room.hostColor === 'w' ? 'b' : 'w';
            }

            if (disconnectedRole) {
                io.to(roomId).emit('opponent_disconnected', {
                    hostConnected: room.host.connected,
                    guestConnected: room.guest ? room.guest.connected : false,
                });

                // Start auto-forfeit timer for active games with time control
                if (room.status === 'playing' && room.timeControl && room.guest) {
                    startDisconnectTimer(roomId, disconnectedPlayerId, disconnectedColor);
                    console.log(`[DISCONNECT] Sala ${roomId} | Temporizador de abandono iniciado para ${disconnectedPlayerId} (${DISCONNECT_TIMEOUT_MS / 1000}s)`);
                }
            }
        }
    });
});

// ─── Garbage Collector (Room Cleanup) ────────────────────────────────────────

setInterval(() => {
    const now = Date.now();

    for (const [roomId, room] of rooms.entries()) {
        const isInactive = (now - room.lastActivity) > ROOM_INACTIVITY_MS;

        const hostConnected = room.host.connected;
        const guestConnected = room.guest ? room.guest.connected : false;

        const isAbandoned = !hostConnected && !guestConnected && room.guest;
        const isHostAbandoned = !hostConnected && !room.guest && (now - room.createdAt) > ROOM_INACTIVITY_MS;

        if (isInactive || isAbandoned || isHostAbandoned) {
            console.log(`[GC] Eliminando sala inactiva: ${roomId}`);

            // Clean up any disconnect timers for this room
            if (room.host) clearDisconnectTimer(roomId, room.host.playerId);
            if (room.guest) clearDisconnectTimer(roomId, room.guest.playerId);

            io.to(roomId).emit('room_closed');
            io.socketsLeave(roomId);
            rooms.delete(roomId);
        }
    }
}, GC_INTERVAL_MS);

// ─── Start Server ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`[*] Servidor Socket.IO corriendo en http://localhost:${PORT}`);
});
