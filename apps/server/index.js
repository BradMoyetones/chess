import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Permitimos cualquier origen en desarrollo
        methods: ["GET", "POST"]
    }
});

// Mapa en memoria: roomId -> { host, guest, hostColor, timeControl, fen, pgn, turn, lastMoveTime, createdAt, lastActivity }
const rooms = new Map();

function generateRoomId() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

io.on('connection', (socket) => {
    console.log(`[+] Cliente conectado: ${socket.id}`);

    // --- CREAR SALA ---
    socket.on('create_room', ({ hostColor, timeControl, playerName, playerAvatar, playerId }, callback) => {
        const roomId = generateRoomId();
        const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        
        let finalHostColor = hostColor;
        if (hostColor === 'random' || !hostColor) {
            finalHostColor = Math.random() < 0.5 ? 'w' : 'b';
        }

        const initialTimeMs = timeControl ? timeControl.initial * 1000 : null;

        rooms.set(roomId, {
            id: roomId,
            host: { socketId: socket.id, playerId, name: playerName || 'Jugador 1', avatar: playerAvatar, timeRemaining: initialTimeMs, connected: true },
            guest: null,
            hostColor: finalHostColor,
            timeControl: timeControl, // { initial, increment } en segundos
            fen: startFen,
            pgn: '',
            turn: 'w',
            lastMoveTime: null,
            createdAt: Date.now(),
            lastActivity: Date.now()
        });

        socket.join(roomId);
        console.log(`[ROOM] ${socket.id} creó la sala ${roomId} (Host Color: ${finalHostColor})`);
        
        if (callback) callback({ success: true, roomId, color: finalHostColor, fen: startFen });
    });

    // --- UNIRSE A SALA ---
    socket.on('join_room', ({ roomId, playerId, playerName, playerAvatar }, callback) => {
        const room = rooms.get(roomId);

        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        const guestColor = room.hostColor === 'w' ? 'b' : 'w';

        // ¿Es una reconexión del Host?
        if (room.host.playerId === playerId) {
            console.log(`[ROOM] ${socket.id} (Host) se reconectó a la sala ${roomId}`);
            room.host.socketId = socket.id;
            room.host.connected = true;
            socket.join(roomId);
            
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

        // ¿Es una reconexión del Guest?
        if (room.guest && room.guest.playerId === playerId) {
            console.log(`[ROOM] ${socket.id} (Guest) se reconectó a la sala ${roomId}`);
            room.guest.socketId = socket.id;
            room.guest.connected = true;
            socket.join(roomId);
            
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

        // Es un jugador nuevo intentando unirse
        if (room.guest) {
            if (callback) callback({ success: false, error: 'La sala está llena' });
            return;
        }

        const initialTimeMs = room.timeControl ? room.timeControl.initial * 1000 : null;

        room.guest = { 
            socketId: socket.id, 
            playerId, 
            name: playerName || 'Jugador 2', 
            avatar: playerAvatar, 
            timeRemaining: initialTimeMs, 
            connected: true 
        };
        room.lastActivity = Date.now();
        room.lastMoveTime = Date.now(); // Comienza el reloj de las blancas cuando entra el guest
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

        socket.to(roomId).emit('opponent_joined', { players: { host: room.host, guest: room.guest }, lastMoveTime: room.lastMoveTime });
    });

    // --- MOVIMIENTO ---
    socket.on('move', ({ roomId, moveData, fen, pgn }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const now = Date.now();
        
        // Actualizar tiempos si hay control de tiempo
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

        socket.to(roomId).emit('move_received', { 
            moveData, fen, pgn, 
            players: { host: room.host, guest: room.guest },
            turn: room.turn,
            lastMoveTime: room.lastMoveTime
        });
        console.log(`[MOVE] Sala ${roomId} | ${moveData.from} -> ${moveData.to}`);
    });

    // --- DESCONEXIÓN ---
    socket.on('disconnect', () => {
        console.log(`[-] Cliente desconectado: ${socket.id}`);
        for (const [roomId, room] of rooms.entries()) {
            if (room.host.socketId === socket.id) {
                room.host.connected = false;
                io.to(roomId).emit('opponent_disconnected', { hostConnected: false, guestConnected: room.guest ? room.guest.connected : false });
            } else if (room.guest && room.guest.socketId === socket.id) {
                room.guest.connected = false;
                io.to(roomId).emit('opponent_disconnected', { hostConnected: room.host.connected, guestConnected: false });
            }
        }
    });
});

// --- GARBAGE COLLECTOR (Limpieza de salas) ---
setInterval(() => {
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    for (const [roomId, room] of rooms.entries()) {
        const isInactive = (now - room.lastActivity) > FIVE_MINUTES;
        
        const hostConnected = room.host.connected;
        const guestConnected = room.guest ? room.guest.connected : false;

        const isAbandoned = !hostConnected && !guestConnected && room.guest; // Si ambos se fueron
        const isHostAbandoned = !hostConnected && !room.guest && (now - room.createdAt) > FIVE_MINUTES; // Si lo creó y nadie entró

        if (isInactive || isAbandoned || isHostAbandoned) {
            console.log(`[GC] Eliminando sala inactiva: ${roomId}`);
            io.to(roomId).emit('room_closed');
            io.socketsLeave(roomId);
            rooms.delete(roomId);
        }
    }
}, 60 * 1000); // Cada minuto

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`[*] Servidor Socket.IO corriendo en http://localhost:${PORT}`);
});
