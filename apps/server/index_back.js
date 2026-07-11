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

// Mapa en memoria: roomId -> { host, guest, hostColor, fen, pgn, createdAt, lastActivity }
const rooms = new Map();

function generateRoomId() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

io.on('connection', (socket) => {
    console.log(`[+] Cliente conectado: ${socket.id}`);

    // --- CREAR SALA ---
    socket.on('create_room', ({ hostColor, playerId }, callback) => {
        const roomId = generateRoomId();
        const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

        rooms.set(roomId, {
            id: roomId,
            host: { socketId: socket.id, playerId },
            guest: null,
            hostColor: hostColor || 'w', // 'w' o 'b'
            fen: startFen,
            pgn: '',
            createdAt: Date.now(),
            lastActivity: Date.now()
        });

        socket.join(roomId);
        console.log(`[ROOM] ${socket.id} creó la sala ${roomId} (Host Color: ${hostColor})`);
        
        if (callback) callback({ success: true, roomId, color: hostColor, fen: startFen });
    });

    // --- UNIRSE A SALA ---
    socket.on('join_room', ({ roomId, playerId }, callback) => {
        const room = rooms.get(roomId);

        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        // ¿Es una reconexión del Host?
        if (room.host.playerId === playerId) {
            console.log(`[ROOM] ${socket.id} (Host) se reconectó a la sala ${roomId}`);
            room.host.socketId = socket.id;
            socket.join(roomId);
            if (callback) callback({ success: true, roomId, color: room.hostColor, fen: room.fen, pgn: room.pgn, waiting: !room.guest });
            
            // Notificar al guest (si está) que el host volvió
            if (room.guest) {
                socket.to(roomId).emit('opponent_joined');
            }
            return;
        }

        // ¿Es una reconexión del Guest?
        if (room.guest && room.guest.playerId === playerId) {
            console.log(`[ROOM] ${socket.id} (Guest) se reconectó a la sala ${roomId}`);
            room.guest.socketId = socket.id;
            socket.join(roomId);
            const guestColor = room.hostColor === 'w' ? 'b' : 'w';
            if (callback) callback({ success: true, roomId, color: guestColor, fen: room.fen, pgn: room.pgn, waiting: false });
            
            // Notificamos al host que volvió
            socket.to(roomId).emit('opponent_joined');
            return;
        }

        // Es un jugador nuevo intentando unirse
        if (room.guest) {
            if (callback) callback({ success: false, error: 'La sala está llena' });
            return;
        }

        room.guest = { socketId: socket.id, playerId };
        room.lastActivity = Date.now();
        socket.join(roomId);
        
        const guestColor = room.hostColor === 'w' ? 'b' : 'w';
        console.log(`[ROOM] ${socket.id} se unió a la sala ${roomId} como nuevo Guest (Color: ${guestColor})`);

        if (callback) {
            callback({ success: true, roomId, color: guestColor, fen: room.fen, pgn: room.pgn, waiting: false });
        }

        socket.to(roomId).emit('opponent_joined');
    });

    // --- MOVIMIENTO ---
    socket.on('move', ({ roomId, moveData, fen, pgn }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        room.fen = fen;
        if (pgn) room.pgn = pgn;
        room.lastActivity = Date.now();

        socket.to(roomId).emit('move_received', { moveData, fen, pgn });
        console.log(`[MOVE] Sala ${roomId} | ${moveData.from} -> ${moveData.to}`);
    });

    // --- DESCONEXIÓN ---
    socket.on('disconnect', () => {
        console.log(`[-] Cliente desconectado: ${socket.id}`);
        for (const [roomId, room] of rooms.entries()) {
            if (room.host.socketId === socket.id || (room.guest && room.guest.socketId === socket.id)) {
                io.to(roomId).emit('opponent_disconnected');
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
        
        // Verificamos si ambos sockets están muertos
        let hostConnected = false;
        let guestConnected = false;
        
        if (io.sockets.sockets.has(room.host.socketId)) hostConnected = true;
        if (room.guest && io.sockets.sockets.has(room.guest.socketId)) guestConnected = true;

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