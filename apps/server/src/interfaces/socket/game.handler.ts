import type { Server, Socket } from 'socket.io';
import type { Color } from '@chess-fw/core';
import type { RoomManager } from '../../domain/services/RoomManager';
import type { RoomEntity } from '../../domain/entities/RoomEntity';

import type { GamePersistenceService } from '../../application/GamePersistenceService';

/**
 * Handles timeout when a player's clock runs out.
 * Exported for use by connection handler (abandonment).
 */
export function handleTimeout(
    roomId: string,
    loser: Color,
    io: Server,
    roomManager: RoomManager,
    persistenceService: GamePersistenceService
): void {
    const room = roomManager.getRoom(roomId);
    if (!room || room.status === 'finished') return;

    const winner: Color = loser === 'w' ? 'b' : 'w';
    room.result = {
        winner,
        reason: 'timeout',
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

    console.log(`[TIMEOUT] Sala ${roomId} | ${loser} agotó el tiempo → ${winner} gana`);
}

export function registerGameHandlers(
    socket: Socket,
    io: Server,
    roomManager: RoomManager,
    persistenceService: GamePersistenceService
): void {
    socket.on('move', (data: any, callback?: (res: any) => void) => {
        const { roomId, moveData } = data;
        const room = roomManager.getRoom(roomId);

        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        const role = room.getPlayerRole(socket.id);
        if (!role) {
            if (callback) callback({ success: false, error: 'No eres un jugador en esta sala' });
            return;
        }

        const playerColor = room.getPlayerColor(role);
        if (room.game.getTurn() !== playerColor) {
            if (callback) callback({ success: false, error: 'No es tu turno' });
            return;
        }

        if (room.status === 'finished') {
            if (callback) callback({ success: false, error: 'La partida ya terminó' });
            return;
        }

        // ── Server-side move validation ──
        const from = moveData?.from;
        const to = moveData?.to;
        const promotion = moveData?.promotion;

        if (!from || !to) {
            if (callback) callback({ success: false, error: 'Movimiento inválido' });
            return;
        }

        const result = room.game.attemptMove(from, to, promotion);

        if (!result.success) {
            if (callback) callback({ success: false, error: `Movimiento ilegal: ${result.reason}` });
            return;
        }

        // ── Clock management ──
        if (room.clock) {
            if (room.game.getHalfMoves() === 1) {
                // First move made: start the clock for the opponent
                room.clock.start(room.game.getTurn(), (loser) => {
                    handleTimeout(roomId, loser, io, roomManager, persistenceService);
                });
            } else {
                room.clock.switchTurn();
            }

            // Record clock snapshot for PGN {[%clk]} reconstruction
            const remainingMs = playerColor === 'w'
                ? room.clock.getWhiteTime()
                : room.clock.getBlackTime();
            room.game.recordClockSnapshot(Math.round(remainingMs / 10));
        }

        room.touch();

        // ── Build response (backwards-compatible format) ──
        const snapshot = room.buildSnapshot();

        const ackData = {
            success: true,
            players: snapshot.players,
            turn: snapshot.turn,
            lastMoveTime: Date.now(),
        };

        if (callback) callback(ackData);

        // Broadcast to opponent with server-authoritative FEN/PGN
        socket.to(roomId).emit('move_received', {
            moveData: result.move, // MoveData from @chess-fw/core engine
            fen: room.game.getFen(),
            pgn: room.game.getPgn(),
            ...ackData,
        });

        console.log(`[MOVE] Sala ${roomId} | ${result.move.san} (move #${room.game.getHalfMoves()})`);

        // ── Check for natural game over ──
        if (room.game.isGameOver()) {
            const gameResult = room.game.getResult();
            if (gameResult) {
                room.status = 'finished';
                room.result = {
                    winner: gameResult.winner,
                    reason: gameResult.reason,
                    timestamp: Date.now(),
                };
                room.clock?.stop();
                
                persistenceService.persistGame(room).catch(err => {
                    console.error(`[PERSIST] Error:`, err);
                });

                io.to(roomId).emit('game_ended', {
                    result: room.result,
                    ...room.buildSnapshot(),
                });

                console.log(`[GAME OVER] Sala ${roomId} | ${gameResult.winner} por ${gameResult.reason}`);
            }
        }
    });

    socket.on('game_over', (data: any, callback?: (res: any) => void) => {
        const { roomId, result } = data;
        const room = roomManager.getRoom(roomId);

        if (!room) {
            if (callback) callback({ success: false, error: 'Sala no encontrada' });
            return;
        }

        const role = room.getPlayerRole(socket.id);
        if (!role) {
            if (callback) callback({ success: false, error: 'No eres un jugador en esta sala' });
            return;
        }

        if (room.status === 'finished') {
            if (callback) callback({ success: false, error: 'La partida ya terminó' });
            return;
        }

        room.result = {
            winner: result.winner,
            reason: result.reason,
            timestamp: Date.now(),
        };
        room.status = 'finished';
        room.clock?.stop();
        room.touch();

        persistenceService.persistGame(room).catch(err => {
            console.error(`[PERSIST] Error:`, err);
        });

        const snapshot = room.buildSnapshot();

        socket.to(roomId).emit('game_ended', {
            result: room.result,
            ...snapshot,
        });

        console.log(`[GAME OVER] Sala ${roomId} | ${room.result.winner} por ${room.result.reason}`);

        if (callback) {
            callback({
                success: true,
                gameRecord: snapshot,
                result: room.result,
            });
        }
    });
}
