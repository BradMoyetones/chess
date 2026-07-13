import { useState, useEffect, useCallback, useRef } from 'react';
import { ChessApp, type BoardSnapshot } from '@chess-fw/core';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import type { Player } from '@/types/game';

export function useOnlineMatch(urlRoomId?: string) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [error, setError] = useState<{ type: string, message: string } | null>(null);
    const [status, setStatus] = useState<'lobby' | 'waiting' | 'playing'>('lobby');
    const [roomId, setRoomId] = useState<string>('');
    const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');

    // Perfiles
    const [playerName, setPlayerName] = useState(() => localStorage.getItem('chess_player_name') || '');
    const [playerAvatar, setPlayerAvatar] = useState(() => localStorage.getItem('chess_player_avatar') || '/assets/images/players/player-1.webp');
    const [selectedTimeCategory, setSelectedTimeCategory] = useState<'none' | 'bullet' | 'blitz' | 'rapid'>('none');
    const [selectedTime, setSelectedTime] = useState<{ initial: number, increment: number } | null>(null);
    const [selectedColor, setSelectedColor] = useState<'w' | 'b' | 'random'>('random');

    // Latest-value refs so the socket effect does not re-run (and reconnect)
    // on every keystroke while typing the player name in the lobby.
    const playerNameRef = useRef(playerName);
    const playerAvatarRef = useRef(playerAvatar);
    playerNameRef.current = playerName;
    playerAvatarRef.current = playerAvatar;

    // Server Sync
    const [serverPlayers, setServerPlayers] = useState<{ host: Player | null, guest: Player | null } | null>(null);
    const [serverTurn, setServerTurn] = useState<'w' | 'b'>('w');
    const [lastMoveTime, setLastMoveTime] = useState<number | null>(null);
    const [timeControl, setTimeControl] = useState<{ initial: number, increment: number } | null>(null);

    const [localWhiteTime, setLocalWhiteTime] = useState<number | null>(null);
    const [localBlackTime, setLocalBlackTime] = useState<number | null>(null);

    // Identificador único de jugador
    const [playerId] = useState(() => {
        let id = localStorage.getItem('chess_player_id');
        if (!id) {
            id = Math.random().toString(36).substring(2, 15);
            localStorage.setItem('chess_player_id', id);
        }
        return id;
    });

    const [app] = useState(() => new ChessApp());
    const [boardSnapshot, setBoardSnapshot] = useState<BoardSnapshot | null>(null);

    const emitMove = useCallback(
        (moveData: any) => {
            socket?.emit('move', {
                roomId,
                moveData,
                fen: app.engine.getFen(),
                pgn: app.engine.getPgn(),
            }, (ackData: any) => {
                if (ackData) {
                    if (ackData.players) setServerPlayers(ackData.players);
                    if (ackData.turn) setServerTurn(ackData.turn);
                    if (ackData.lastMoveTime !== undefined) setLastMoveTime(ackData.lastMoveTime);
                }
            });
        },
        [socket, roomId, app]
    );

    useEffect(() => {
        setBoardSnapshot(app.getSnapshot());
        const handleUpdate = () => {
            if (app.engine.getTurn() === playerColor) {
                const pending = app.interaction.getPremoves();
                if (pending.length > 0) {
                    const p = app.engine.getPieceAt(pending[0].from);
                    if (!p || p.color !== playerColor) {
                        app.interaction.clearPremoves();
                    }
                }
            }
            setBoardSnapshot(app.getSnapshot());
        };

        const handlePremoveExecuted = () => {
            handleUpdate();
            const lastMove = app.engine.getLastMove();
            if (lastMove) {
                emitMove(lastMove);
            }
        };

        const unsubs = [
            app.events.on('BOARD_UPDATED', handleUpdate),
            app.events.on('PREMOVE_CANCELLED', handleUpdate),
            app.events.on('PREMOVE_QUEUED', handleUpdate),
            app.events.on('PREMOVE_EXECUTED', handlePremoveExecuted),
        ];

        return () => unsubs.forEach((unsub) => unsub());
    }, [app, emitMove, playerColor]);

    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_WS_URL);
        setSocket(newSocket);

        newSocket.on('opponent_joined', (data) => {
            if (data?.players) setServerPlayers(data.players);
            if (data?.lastMoveTime !== undefined) setLastMoveTime(data.lastMoveTime);
            setStatus('playing');
        });

        newSocket.on('move_received', ({ moveData, players, turn, lastMoveTime }) => {
            const mainLine = app.engine.getGameTree().getMainLine();
            if (mainLine.length > 0) {
                app.engine.goToMove(mainLine[mainLine.length - 1].id);
            }
            app.engine.attemptMove(moveData.from, moveData.to, moveData.promotion);
            app.interaction.clearSelection();
            setBoardSnapshot(app.getSnapshot());
            if (players) setServerPlayers(players);
            if (turn) setServerTurn(turn);
            if (lastMoveTime !== undefined) setLastMoveTime(lastMoveTime);
        });

        newSocket.on('opponent_disconnected', ({ hostConnected, guestConnected }) => {
            setServerPlayers((prev) => {
                if (!prev) return prev;
                return {
                    host: prev.host ? { ...prev.host, connected: hostConnected } as Player : null,
                    guest: prev.guest ? { ...prev.guest, connected: guestConnected } as Player : null
                };
            });
            toast.info('Un jugador se ha desconectado. Esperando reconexión...');
        });

        newSocket.on('room_closed', () => {
            setStatus('lobby');
            setRoomId('');
            setError({ type: 'room_closed', message: 'La sala fue cerrada por inactividad.' });
        });

        if (urlRoomId) {
            newSocket.emit('join_room', { roomId: urlRoomId, playerId, playerName: playerNameRef.current, playerAvatar: playerAvatarRef.current }, (res: any) => {
                if (res.success) {
                    setRoomId(res.roomId);
                    setPlayerColor(res.color);
                    app.annotations.clearAll();
                    app.interaction.clearPremoves();
                    if (res.pgn) {
                        app.engine.loadPgn(res.pgn);
                    } else {
                        app.engine.loadFen(res.fen);
                    }
                    if (res.players) setServerPlayers(res.players);
                    if (res.turn) setServerTurn(res.turn);
                    if (res.timeControl) setTimeControl(res.timeControl);
                    if (res.lastMoveTime !== undefined) setLastMoveTime(res.lastMoveTime);
                    setBoardSnapshot(app.getSnapshot());
                    setStatus(res.waiting ? 'waiting' : 'playing');
                } else {
                    setError({ type: 'join_failed', message: res.error });
                }
            });
        }

        return () => {
            newSocket.close();
        };
        // playerName/playerAvatar are read via refs above so the socket connects
        // once per room instead of reconnecting on every keystroke.
    }, [app, urlRoomId, playerId]);

    useEffect(() => {
        if (!timeControl || status !== 'playing' || !serverPlayers) return;

        const interval = setInterval(() => {
            const now = Date.now();
            let hostColor = serverPlayers.host?.playerId === playerId ? playerColor : (playerColor === 'w' ? 'b' : 'w');

            let currentWt = hostColor === 'w' ? serverPlayers.host?.timeRemaining : serverPlayers.guest?.timeRemaining;
            let currentBt = hostColor === 'b' ? serverPlayers.host?.timeRemaining : serverPlayers.guest?.timeRemaining;

            if (lastMoveTime) {
                const elapsed = now - lastMoveTime;
                if (serverTurn === 'w') {
                    currentWt = Math.max(0, (currentWt || 0) - elapsed);
                } else {
                    currentBt = Math.max(0, (currentBt || 0) - elapsed);
                }
            }

            setLocalWhiteTime(currentWt ?? null);
            setLocalBlackTime(currentBt ?? null);
        }, 100);
        return () => clearInterval(interval);
    }, [timeControl, status, serverPlayers, serverTurn, lastMoveTime, playerColor, playerId]);

    const getMaterialAdvantage = useCallback(() => {
        if (!boardSnapshot) return { w: { score: 0, pieces: [] }, b: { score: 0, pieces: [] } };
        const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        const STARTING_COUNT: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };

        const currentCount: Record<string, number> = {
            'w-p': 0, 'w-n': 0, 'w-b': 0, 'w-r': 0, 'w-q': 0,
            'b-p': 0, 'b-n': 0, 'b-b': 0, 'b-r': 0, 'b-q': 0
        };

        let wScore = 0;
        let bScore = 0;

        boardSnapshot.board.flat().forEach(sq => {
            if (sq.piece && sq.piece.type !== 'k') {
                currentCount[`${sq.piece.color}-${sq.piece.type}`]++;
                const val = PIECE_VALUES[sq.piece.type] || 0;
                if (sq.piece.color === 'w') wScore += val;
                else bScore += val;
            }
        });

        const capturedByWhite: string[] = [];
        const capturedByBlack: string[] = [];

        ['p', 'n', 'b', 'r', 'q'].forEach(type => {
            const missingW = Math.max(0, STARTING_COUNT[type] - currentCount[`w-${type}`]);
            const missingB = Math.max(0, STARTING_COUNT[type] - currentCount[`b-${type}`]);

            for (let i = 0; i < missingW; i++) capturedByBlack.push(type);
            for (let i = 0; i < missingB; i++) capturedByWhite.push(type);
        });

        return {
            w: { score: Math.max(0, wScore - bScore), pieces: capturedByWhite },
            b: { score: Math.max(0, bScore - wScore), pieces: capturedByBlack }
        };
    }, [boardSnapshot]);

    const handleCreateRoom = (color: 'w' | 'b' | 'random'): Promise<{ success: boolean; roomId?: string; error?: string }> => {
        return new Promise((resolve) => {
            if (!playerName) { resolve({ success: false, error: "Por favor, ingresa un nombre" }); return; }
            localStorage.setItem('chess_player_name', playerName);
            localStorage.setItem('chess_player_avatar', playerAvatar);

            if (!socket) { resolve({ success: false, error: "No hay conexión al servidor" }); return; }

            socket.emit('create_room', { hostColor: color, timeControl: selectedTime, playerName, playerAvatar, playerId }, (res: any) => {
                resolve(res);
            });
        });
    };

    const handleJoinRoom = (inputRoomId: string): Promise<{ success: boolean; error?: string }> => {
        return new Promise((resolve) => {
            if (!inputRoomId) { resolve({ success: false, error: "Ingresa un ID de sala" }); return; }
            if (!playerName) { resolve({ success: false, error: "Por favor, ingresa un nombre" }); return; }
            localStorage.setItem('chess_player_name', playerName);
            localStorage.setItem('chess_player_avatar', playerAvatar);
            resolve({ success: true });
        });
    };

    return {
        app,
        boardSnapshot,
        setBoardSnapshot,
        socket,
        error,
        status,
        roomId,
        playerColor,
        playerName,
        setPlayerName,
        playerAvatar,
        setPlayerAvatar,
        selectedTimeCategory,
        setSelectedTimeCategory,
        selectedTime,
        setSelectedTime,
        selectedColor,
        setSelectedColor,
        serverPlayers,
        serverTurn,
        timeControl,
        localWhiteTime,
        localBlackTime,
        playerId,
        emitMove,
        getMaterialAdvantage,
        handleCreateRoom,
        handleJoinRoom
    };
}
