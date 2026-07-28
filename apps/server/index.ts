/**
 * Chess Game Server
 * Express + Socket.IO + Better Auth + Stockfish
 *
 * Clean Architecture Bootstrap
 * All logic is delegated to domain entities, services, and handlers.
 */

// ─── Config & Infrastructure ─────────────────────────────────────────────────
import { env } from './src/config/env';
import { corsOptions } from './src/config/cors';
import { auth } from './src/infrastructure/auth/setup';

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node';

// ─── Domain & Services ───────────────────────────────────────────────────────
import { RoomManager } from './src/domain/services/RoomManager';
import { StockfishService } from './src/infrastructure/stockfish/StockfishService';

// ─── Socket Handlers ─────────────────────────────────────────────────────────
import { registerRoomHandlers } from './src/interfaces/socket/room.handler';
import { registerGameHandlers } from './src/interfaces/socket/game.handler';
import { registerRematchHandlers } from './src/interfaces/socket/rematch.handler';
import { registerBotHandlers } from './src/interfaces/socket/bot.handler';
import { registerConnectionHandlers } from './src/interfaces/socket/connection.handler';

// ─── Persistence ─────────────────────────────────────────────────────────────
import { GamePersistenceService } from './src/application/GamePersistenceService';
import { DrizzleGameRepository } from './src/infrastructure/repositories/DrizzleGameRepository';
import { DrizzleUserRepository } from './src/infrastructure/repositories/DrizzleUserRepository';
import { createGameRoutes } from './src/interfaces/http/game.routes';
import { createProfileRoutes } from './src/interfaces/http/profile.routes';
import { createSocialRoutes } from './src/interfaces/http/social.routes';
import { createLeaderboardRoutes } from './src/interfaces/http/leaderboard.routes';
import { DrizzleFriendshipRepository } from './src/infrastructure/repositories/DrizzleFriendshipRepository';

// ─── Stockfish Binary Resolution ─────────────────────────────────────────────
import { detectOS } from './constants/os';
import { STOCKFISH_BINARIES } from './constants/stockfish';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const detectedOs = detectOS();
const binary = STOCKFISH_BINARIES.find(b => b.value === detectedOs);
if (!binary) throw new Error(`Unsupported OS: ${detectedOs}`);

const stockfishBinaryPath = path.resolve(__dirname, 'bin', binary.destExe);

// ─── Initialize Stockfish ────────────────────────────────────────────────────
const stockfishService = new StockfishService();
await stockfishService.init({ binaryPath: stockfishBinaryPath });

// ─── Express + Auth ──────────────────────────────────────────────────────────
const app = express();
app.use(cors(corsOptions));
app.all('/api/auth/*splat', toNodeHandler(auth));

// ─── JSON Parsing (after auth routes which need raw body) ──────────────────
app.use(express.json());

// ─── API Routes ──────────────────────────────────────────────────────────────
const gameRepo = new DrizzleGameRepository();
const userRepo = new DrizzleUserRepository();
const persistenceService = new GamePersistenceService(gameRepo, userRepo);

app.use('/api/games', createGameRoutes(gameRepo));

const friendshipRepo = new DrizzleFriendshipRepository();

app.use('/api/profile', createProfileRoutes());
app.use('/api/social', createSocialRoutes(friendshipRepo));
app.use('/api/leaderboard', createLeaderboardRoutes());

// ─── HTTP + Socket.IO ────────────────────────────────────────────────────────
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: corsOptions.origin,
        methods: corsOptions.methods,
        credentials: true,
    },
});

// ─── Room Manager ────────────────────────────────────────────────────────────
const roomManager = new RoomManager((roomId) => {
    io.to(roomId).emit('room_closed');
    io.socketsLeave(roomId);
});

// ─── Socket Auth Middleware ──────────────────────────────────────────────────
io.use(async (socket, next) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(socket.request.headers),
        });

        if (session?.user) {
            socket.data.user = session.user;
            socket.data.session = session.session;
            console.log(`[AUTH] Autenticado: ${session.user.name} (${session.user.id})`);
            return next();
        }

        // Allow unauthenticated for backwards compatibility (Phase 2 transition)
        console.log(`[AUTH] Sin autenticación: ${socket.id}`);
        next();
    } catch (error) {
        console.log(`[AUTH] Error: ${socket.id}`, error);
        next();
    }
});

// ─── Socket Event Registration ───────────────────────────────────────────────
io.on('connection', (socket: Socket) => {
    console.log(`[+] Cliente conectado: ${socket.id}`);

    registerRoomHandlers(socket, io, roomManager);
    registerGameHandlers(socket, io, roomManager, persistenceService);
    registerRematchHandlers(socket, io, roomManager);
    registerBotHandlers(socket, stockfishService);
    registerConnectionHandlers(socket, io, roomManager, persistenceService);
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = env.PORT;
httpServer.listen(PORT, () => {
    console.log(`[*] Servidor Socket.IO corriendo en http://localhost:${PORT}`);
});
