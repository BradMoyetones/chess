import { ChessApp, type BoardSnapshot } from '@chess-fw/core';
import Coordinates from '../components/coordinates';
import { BoardAnnotations } from '../components/board/board-annotations';
import { BoardHighlights } from '../components/board/board-highlights';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type PieceSymbol } from 'chess.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Copy, ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { ScrollArea, ScrollBar } from '../components/ui/scroll-area';
import { theme, coordinateColors } from '../lib/theme';
import { io, Socket } from 'socket.io-client';
import { useParams, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

const toCoords = (algebraic: string | null) => {
    if (!algebraic) return null;
    const x = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
    const y = 8 - parseInt(algebraic[1]);
    return { x, y };
};

export default function OnlinePlay() {
    const { id: urlRoomId } = useParams();
    const navigate = useNavigate();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [status, setStatus] = useState<'lobby' | 'waiting' | 'playing'>('lobby');
    const [roomId, setRoomId] = useState<string>('');
    const [inputRoomId, setInputRoomId] = useState<string>('');
    const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');

    // Perfiles
    const [playerName, setPlayerName] = useState(() => localStorage.getItem('chess_player_name') || '');
    const [playerAvatar, setPlayerAvatar] = useState(() => localStorage.getItem('chess_player_avatar') || '/assets/images/players/player-1.webp');
    const [selectedTimeCategory, setSelectedTimeCategory] = useState<'none'|'bullet'|'blitz'|'rapid'>('none');
    const [selectedTime, setSelectedTime] = useState<{initial: number, increment: number} | null>(null);
    const [selectedColor, setSelectedColor] = useState<'w'|'b'|'random'>('random');

    // Server Sync
    const [serverPlayers, setServerPlayers] = useState<{host: any, guest: any} | null>(null);
    const [serverTurn, setServerTurn] = useState<'w' | 'b'>('w');
    const [lastMoveTime, setLastMoveTime] = useState<number | null>(null);
    const [timeControl, setTimeControl] = useState<{initial: number, increment: number} | null>(null);
    
    const [localWhiteTime, setLocalWhiteTime] = useState<number | null>(null);
    const [localBlackTime, setLocalBlackTime] = useState<number | null>(null);

    // Generar un ID único persistente para reconexiones
    const [playerId] = useState(() => {
        let id = localStorage.getItem('chess_player_id');
        if (!id) {
            id = Math.random().toString(36).substring(2, 15);
            localStorage.setItem('chess_player_id', id);
        }
        return id;
    });

    const [app] = useState(() => new ChessApp());

    // ... refs and wrappers ...
    const handleMouseMove = useRef<(e: MouseEvent) => void>(() => {});
    const handleMouseUp = useRef<(e: MouseEvent) => void>(() => {});
    const handleAnnotationDropRef = useRef<(e: MouseEvent) => void>(() => {});

    const moveWrapper = useCallback((e: MouseEvent) => handleMouseMove.current(e), []);
    const dropWrapper = useCallback((e: MouseEvent) => handleMouseUp.current(e), []);
    const annotationDropWrapper = useCallback((e: MouseEvent) => handleAnnotationDropRef.current(e), []);

    const activePiece = useRef<HTMLElement | null>(null);
    const chessboardRef = useRef<HTMLDivElement | null>(null);
    const originSquare = useRef<string | null>(null);
    const originalStyle = useRef<{ left: string; top: string; zIndex: string } | null>(null);
    const annotationStartSquare = useRef<string | null>(null);

    const [pendingPromotion, setPendingPromotion] = useState<{
        from: string;
        to: string;
        color: 'w' | 'b';
        dropX: number;
        dropY: number;
    } | null>(null);

    const [hoverSquare, setHoverSquare] = useState<string | null>(null);
    const [boardSnapshot, setBoardSnapshot] = useState<BoardSnapshot | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToRight = useCallback(() => {
        if (scrollRef.current) {
            const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) viewport.scrollTo({ left: viewport.scrollWidth, behavior: 'smooth' });
        }
    }, []);

    const emitMove = useCallback(
        (moveData: any) => {
            socket?.emit('move', {
                roomId,
                moveData,
                fen: app.engine.getFen(),
                pgn: app.engine.getPgn(),
            });
        },
        [socket, roomId, app]
    );

    useEffect(() => {
        const newSocket = io('http://192.168.1.2:3001');
        setSocket(newSocket);

        newSocket.on('opponent_joined', (data) => {
            if (data?.players) setServerPlayers(data.players);
            if (data?.lastMoveTime) setLastMoveTime(data.lastMoveTime);
            setStatus('playing');
        });

        newSocket.on('move_received', ({ moveData, players, turn, lastMoveTime }) => {
            if (players) setServerPlayers(players);
            if (turn) setServerTurn(turn);
            if (lastMoveTime) setLastMoveTime(lastMoveTime);

            const mainLine = app.engine.getGameTree().getMainLine();
            if (mainLine.length > 0) {
                app.engine.goToMove(mainLine[mainLine.length - 1].id);
            }
            app.engine.attemptMove(moveData.from, moveData.to, moveData.promotion);
            app.interaction.clearSelection();
            setBoardSnapshot(app.getSnapshot());
        });

        newSocket.on('opponent_disconnected', ({ hostConnected, guestConnected }) => {
            setServerPlayers((prev: any) => {
                if (!prev) return prev;
                return {
                    host: { ...prev.host, connected: hostConnected },
                    guest: prev.guest ? { ...prev.guest, connected: guestConnected } : null
                };
            });
            toast.info('Un jugador se ha desconectado. Esperando reconexión...');
        });

        newSocket.on('room_closed', () => {
            setStatus('lobby');
            setRoomId('');
            toast.error('La sala fue cerrada por inactividad.');
            navigate('/online');
        });

        if (urlRoomId) {
            newSocket.emit('join_room', { roomId: urlRoomId, playerId, playerName, playerAvatar }, (res: any) => {
                if (res.success) {
                    setRoomId(res.roomId);
                    setPlayerColor(res.color);
                    if (res.players) setServerPlayers(res.players);
                    if (res.turn) setServerTurn(res.turn);
                    if (res.lastMoveTime) setLastMoveTime(res.lastMoveTime);
                    if (res.timeControl) setTimeControl(res.timeControl);

                    if (res.pgn) {
                        app.engine.loadPgn(res.pgn);
                    } else {
                        app.engine.loadFen(res.fen);
                    }
                    setBoardSnapshot(app.getSnapshot());
                    setStatus(res.waiting ? 'waiting' : 'playing');
                } else {
                    toast.error(res.error);
                    navigate('/online');
                }
            });
        }

        return () => {
            newSocket.close();
        };
    }, [app, urlRoomId, navigate, playerId, playerName, playerAvatar]);

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
            
            setLocalWhiteTime(currentWt);
            setLocalBlackTime(currentBt);
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
            
            for(let i=0; i<missingW; i++) capturedByBlack.push(type);
            for(let i=0; i<missingB; i++) capturedByWhite.push(type);
        });

        return {
            w: { score: Math.max(0, wScore - bScore), pieces: capturedByWhite },
            b: { score: Math.max(0, bScore - wScore), pieces: capturedByBlack }
        };
    }, [boardSnapshot]);

    useEffect(() => {
        setBoardSnapshot(app.getSnapshot());
        const handleUpdate = () => {
            setBoardSnapshot(app.getSnapshot());
            if (!app.engine.canRedo()) setTimeout(scrollToRight, 50);
        };
        const handlePremoveExecuted = () => {
            handleUpdate();
            // Cuando la librería ejecuta un premove encolado, dispara PREMOVE_EXECUTED.
            // Emitimos el movimiento al oponente para que también lo reciba.
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
    }, [app, emitMove]);

    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            if (chessboardRef.current && !chessboardRef.current.contains(e.target as Node)) {
                app.interaction.clearSelection();
                setBoardSnapshot(app.getSnapshot());
            }
        };
        window.addEventListener('mousedown', handleGlobalClick);
        return () => window.removeEventListener('mousedown', handleGlobalClick);
    }, [app]);

    const handleCreateRoom = (color: 'w' | 'b' | 'random') => {
        if (!playerName) { toast.error("Por favor, ingresa un nombre"); return; }
        localStorage.setItem('chess_player_name', playerName);
        localStorage.setItem('chess_player_avatar', playerAvatar);

        socket?.emit('create_room', { hostColor: color, timeControl: selectedTime, playerName, playerAvatar, playerId }, (res: any) => {
            if (res.success) {
                navigate(`/online/${res.roomId}`);
            }
        });
    };

    const handleJoinRoom = () => {
        if (!inputRoomId) return;
        if (!playerName) { toast.error("Por favor, ingresa un nombre"); return; }
        localStorage.setItem('chess_player_name', playerName);
        localStorage.setItem('chess_player_avatar', playerAvatar);
        navigate(`/online/${inputRoomId}`);
    };

    const movePiece = (e: MouseEvent) => {
        const chessboard = chessboardRef.current;
        if (activePiece.current && chessboard) {
            const boardRect = chessboard.getBoundingClientRect();
            const pieceSize = boardRect.width / 8;

            let x = e.clientX - boardRect.left - pieceSize / 2;
            let y = e.clientY - boardRect.top - pieceSize / 2;

            const maxX = boardRect.width - pieceSize;
            const maxY = boardRect.height - pieceSize;

            x = Math.max(0, Math.min(x, maxX));
            y = Math.max(0, Math.min(y, maxY));

            activePiece.current.style.left = `${x}px`;
            activePiece.current.style.top = `${y}px`;

            const rawDropX = Math.floor((e.clientX - boardRect.left) / pieceSize);
            const rawDropY = Math.floor((e.clientY - boardRect.top) / pieceSize);
            const dropX = playerColor === 'b' ? 7 - rawDropX : rawDropX;
            const dropY = playerColor === 'b' ? 7 - rawDropY : rawDropY;

            if (dropX >= 0 && dropX <= 7 && dropY >= 0 && dropY <= 7) {
                const targetFile = String.fromCharCode('a'.charCodeAt(0) + dropX);
                const targetRank = String(8 - dropY);
                setHoverSquare(`${targetFile}${targetRank}`);
            } else {
                setHoverSquare(null);
            }
        }
    };

    const dropPiece = (e: MouseEvent) => {
        try {
            const chessboard = chessboardRef.current;
            if (activePiece.current && chessboard) {
                const boardRect = chessboard.getBoundingClientRect();
                const pieceSize = boardRect.width / 8;

                const rawDropX = Math.floor((e.clientX - boardRect.left) / pieceSize);
                const rawDropY = Math.floor((e.clientY - boardRect.top) / pieceSize);
                const dropX = playerColor === 'b' ? 7 - rawDropX : rawDropX;
                const dropY = playerColor === 'b' ? 7 - rawDropY : rawDropY;

                if (dropX >= 0 && dropX <= 7 && dropY >= 0 && dropY <= 7) {
                    const targetFile = String.fromCharCode('a'.charCodeAt(0) + dropX);
                    const targetRank = String(8 - dropY);
                    const targetAlgebraic = `${targetFile}${targetRank}`;

                    const fromSquare = originSquare.current;

                    if (fromSquare && fromSquare !== targetAlgebraic) {
                        const pieceSquare = boardSnapshot?.board.flat().find((s) => s.algebraic === fromSquare);
                        const piece = pieceSquare?.piece;

                        if (
                            piece &&
                            piece.type === 'p' &&
                            ((piece.color === 'w' && targetRank === '8') || (piece.color === 'b' && targetRank === '1'))
                        ) {
                            setPendingPromotion({
                                from: fromSquare,
                                to: targetAlgebraic,
                                color: piece.color,
                                dropX: rawDropX,
                                dropY: rawDropY,
                            });
                        } else {
                            const turn = app.engine.getTurn();
                            if (piece && piece.color !== turn) {
                                // Premove
                                app.interaction.selectSquare(targetAlgebraic);
                            } else {
                                const premovesBefore = app.interaction.getPremoves();
                                const premoveColors = premovesBefore.map(
                                    (p: any) => app.engine.getPieceAt(p.from)?.color
                                );

                                const result = app.engine.attemptMove(fromSquare, targetAlgebraic);
                                if (result && result.success) {
                                    app.interaction.clearSelection();

                                    // EL JUGADOR LOCAL HIZO UN MOVIMIENTO
                                    emitMove(result.move);

                                    const remainingPremoves = app.interaction.getPremoves();
                                    if (remainingPremoves.length > 0) {
                                        const firstRemaining = remainingPremoves[0];
                                        const origIdx = premovesBefore.findIndex(
                                            (p: any) => p.from === firstRemaining.from && p.to === firstRemaining.to
                                        );
                                        const origColor = origIdx !== -1 ? premoveColors[origIdx] : null;
                                        if (origColor === app.engine.getTurn()) {
                                            app.interaction.clearPremoves();
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } finally {
            setHoverSquare(null);
            if (originalStyle.current && activePiece.current) {
                activePiece.current.style.zIndex = originalStyle.current.zIndex;
                activePiece.current.style.left = originalStyle.current.left;
                activePiece.current.style.top = originalStyle.current.top;
            }
            activePiece.current = null;
            originSquare.current = null;
            window.removeEventListener('mousemove', moveWrapper);
            window.removeEventListener('mouseup', dropWrapper);
            setBoardSnapshot(app.getSnapshot());
        }
    };

    const handlePromotionSelect = (pieceType: PieceSymbol) => {
        if (pendingPromotion) {
            const result = app.engine.attemptMove(pendingPromotion.from, pendingPromotion.to, pieceType);
            if (result && result.success) {
                emitMove(result.move);
            }
            app.interaction.clearSelection();
            setPendingPromotion(null);
            setBoardSnapshot(app.getSnapshot());
        }
    };

    const handleAnnotationDrop = (e: MouseEvent) => {
        const chessboard = chessboardRef.current;
        if (annotationStartSquare.current && chessboard) {
            const boardRect = chessboard.getBoundingClientRect();
            const pieceSize = boardRect.width / 8;

            const rawDropX = Math.floor((e.clientX - boardRect.left) / pieceSize);
            const rawDropY = Math.floor((e.clientY - boardRect.top) / pieceSize);
            const dropX = playerColor === 'b' ? 7 - rawDropX : rawDropX;
            const dropY = playerColor === 'b' ? 7 - rawDropY : rawDropY;

            if (dropX >= 0 && dropX <= 7 && dropY >= 0 && dropY <= 7) {
                const targetFile = String.fromCharCode('a'.charCodeAt(0) + dropX);
                const targetRank = String(8 - dropY);
                const targetSquare = `${targetFile}${targetRank}`;

                if (targetSquare === annotationStartSquare.current) {
                    const existingHighlight = app.annotations
                        .getAnnotations()
                        .find((a: any) => a.type === 'highlight' && a.square === targetSquare);
                    if (existingHighlight) {
                        app.annotations.removeAnnotation(existingHighlight.id);
                    } else {
                        app.annotations.addHighlight(targetSquare, '#ef4444');
                    }
                } else {
                    app.annotations.addArrow(annotationStartSquare.current, targetSquare);
                }
                setBoardSnapshot(app.getSnapshot());
            }
        }

        annotationStartSquare.current = null;
        window.removeEventListener('mouseup', annotationDropWrapper);
    };

    const handleBoardMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) {
            app.annotations.clearAll();
            setBoardSnapshot(app.getSnapshot());
        } else if (e.button === 2) {
            const chessboard = chessboardRef.current;
            if (chessboard) {
                const boardRect = chessboard.getBoundingClientRect();
                const pieceSize = boardRect.width / 8;

                const rawDropX = Math.floor((e.clientX - boardRect.left) / pieceSize);
                const rawDropY = Math.floor((e.clientY - boardRect.top) / pieceSize);
                const dropX = playerColor === 'b' ? 7 - rawDropX : rawDropX;
                const dropY = playerColor === 'b' ? 7 - rawDropY : rawDropY;

                if (dropX >= 0 && dropX <= 7 && dropY >= 0 && dropY <= 7) {
                    const file = String.fromCharCode('a'.charCodeAt(0) + dropX);
                    const rank = String(8 - dropY);
                    annotationStartSquare.current = `${file}${rank}`;
                    window.addEventListener('mouseup', annotationDropWrapper);
                }
            }
        }
    };

    const safeHandleSquareClick = useCallback(
        (algebraic: string) => {
            if (app.engine.canRedo()) return; // Modo Lectura: bloquea interacciones si estamos en el pasado

            const piece = app.engine.getPieceAt(algebraic);

            // Bloqueo del oponente
            if (!app.interaction.getSelectedSquare() && piece && piece.color !== playerColor) return;

            if (app.interaction.getSelectedSquare() === algebraic) {
                app.interaction.clearSelection();
                setBoardSnapshot(app.getSnapshot());
                return;
            }

            const fenBefore = app.engine.getFen();
            app.click(algebraic);
            const fenAfter = app.engine.getFen();

            if (fenBefore !== fenAfter) {
                // Un movimiento fue ejecutado por app.click()
                const lastMove = app.engine.getLastMove();
                if (lastMove) {
                    emitMove(lastMove);
                }
            }

            setBoardSnapshot(app.getSnapshot());
        },
        [app, playerColor, emitMove]
    );

    const grabPiece = (e: React.MouseEvent, squareAlgebraic: string) => {
        if (app.engine.canRedo()) return; // Modo Lectura
        if (e.button !== 0) return;

        // Bloqueo del oponente
        const piece = app.engine.getPieceAt(squareAlgebraic);
        if (piece && piece.color !== playerColor) return;

        e.preventDefault();

        const element = e.currentTarget as HTMLElement;

        if (app.interaction.getSelectedSquare() !== squareAlgebraic) {
            app.interaction.selectSquare(squareAlgebraic);
            setBoardSnapshot(app.getSnapshot());
        }

        const chessboard = chessboardRef.current;
        if (chessboard) {
            originSquare.current = squareAlgebraic;
            originalStyle.current = {
                left: element.style.left,
                top: element.style.top,
                zIndex: element.style.zIndex,
            };

            const boardRect = chessboard.getBoundingClientRect();
            const pieceSize = boardRect.width / 8;

            const x = e.clientX - boardRect.left - pieceSize / 2;
            const y = e.clientY - boardRect.top - pieceSize / 2;

            element.style.zIndex = '100';
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;

            activePiece.current = element;

            window.addEventListener('mousemove', moveWrapper);
            window.addEventListener('mouseup', dropWrapper);
        }
    };

    handleMouseMove.current = movePiece;
    handleMouseUp.current = dropPiece;
    handleAnnotationDropRef.current = handleAnnotationDrop;

    const selectedSquareAlg = app.interaction.getSelectedSquare();
    const selectedPiece = selectedSquareAlg ? app.engine.getPieceAt(selectedSquareAlg) : null;
    const isSelectedTurn = selectedPiece ? selectedPiece.color === app.engine.getTurn() : false;

    const validDestinations = isSelectedTurn
        ? (app.interaction.getValidDestinations() || []).map((sq) => {
              const coords = toCoords(sq);
              return {
                  x: coords!.x,
                  y: coords!.y,
                  containsPiece: !!app.engine.getPieceAt(sq),
              };
          })
        : [];

    const premoves = app.interaction.getPremoves().map((pm: any) => ({
        from: toCoords(pm.from)!,
        to: toCoords(pm.to)!,
    }));

    const coreAnnotations = app.annotations.getAnnotations();
    const mappedArrows = coreAnnotations
        .filter((a: any) => a.type === 'arrow')
        .map((a: any) => ({
            id: a.id,
            from: toCoords(a.from)!,
            to: toCoords(a.to)!,
            color: a.color === 'green' ? undefined : a.color,
        }));

    const mappedHighlights = coreAnnotations
        .filter((a: any) => a.type === 'highlight')
        .map((a: any) => ({
            id: a.id,
            x: toCoords(a.square)!.x,
            y: toCoords(a.square)!.y,
            color: a.color || a.backgroundColor,
        }));

    const canUndo = app.engine.canUndo();
    const canRedo = app.engine.canRedo();

        const formatTime = (timeMs: number | null) => {
        if (timeMs === null) return '--:--';
        const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const timeOptions = {
        bullet: [{ i: 60, inc: 0, label: '1 min' }, { i: 60, inc: 1, label: '1+1' }, { i: 120, inc: 1, label: '2+1' }],
        blitz: [{ i: 180, inc: 2, label: '3+2' }, { i: 300, inc: 0, label: '5 min' }, { i: 300, inc: 5, label: '5+5' }],
        rapid: [{ i: 600, inc: 0, label: '10 min' }, { i: 900, inc: 10, label: '15+10' }, { i: 1800, inc: 0, label: '30 min' }, { i: 600, inc: 5, label: '10+5' }, { i: 1200, inc: 0, label: '20 min' }, { i: 3600, inc: 0, label: '60 min' }]
    };

    const avatars = ['/assets/images/players/player-1.webp', '/assets/images/players/player-2.webp'];

    // --- RENDER LOBBY ---
    if (status === 'lobby') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                <Card className="w-full max-w-lg shadow-lg border-primary/20">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-extrabold tracking-tight">Chess Online</CardTitle>
                        <CardDescription>Configura tu perfil y crea o únete a una sala</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6">
                        
                        {/* Perfil */}
                        <div className="flex flex-col gap-3 p-4 bg-secondary/30 rounded-lg border">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Tu Perfil</h3>
                            <div className="flex gap-4 items-center">
                                <div className="flex gap-2">
                                    {avatars.map((av) => (
                                        <img 
                                            key={av} src={av} alt="Avatar" 
                                            className={`w-12 h-12 rounded-md cursor-pointer border-2 ${playerAvatar === av ? 'border-primary' : 'border-transparent opacity-50'}`}
                                            onClick={() => setPlayerAvatar(av)}
                                        />
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    placeholder="Ingresa tu nombre..."
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Crear Sala */}
                        <div className="flex flex-col gap-4 p-4 bg-secondary/30 rounded-lg border">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Crear Sala</h3>
                            
                            <div className="flex gap-2">
                                {(['none', 'bullet', 'blitz', 'rapid'] as const).map(cat => (
                                    <Button 
                                        key={cat} 
                                        variant={selectedTimeCategory === cat ? 'default' : 'outline'} 
                                        onClick={() => setSelectedTimeCategory(cat)}
                                        className="flex-1 text-xs"
                                    >
                                        {cat === 'none' ? 'Sin Tiempo' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </Button>
                                ))}
                            </div>

                            {selectedTimeCategory !== 'none' && (
                                <div className="grid grid-cols-3 gap-2">
                                    {timeOptions[selectedTimeCategory as keyof typeof timeOptions].map(opt => {
                                        const isSelected = selectedTime?.initial === opt.i && selectedTime?.increment === opt.inc;
                                        return (
                                            <Button 
                                                key={opt.label} 
                                                variant={isSelected ? 'default' : 'secondary'}
                                                onClick={() => setSelectedTime({ initial: opt.i, increment: opt.inc })}
                                                className="text-xs"
                                            >
                                                {opt.label}
                                            </Button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2 mt-2">
                                <Button variant={selectedColor === 'w' ? 'default' : 'outline'} onClick={() => setSelectedColor('w')} className="bg-white text-black hover:bg-gray-200">Blancas</Button>
                                <Button variant={selectedColor === 'random' ? 'default' : 'outline'} onClick={() => setSelectedColor('random')}>Aleatorio</Button>
                                <Button variant={selectedColor === 'b' ? 'default' : 'outline'} onClick={() => setSelectedColor('b')} className="bg-black text-white hover:bg-zinc-800">Negras</Button>
                            </div>

                            <Button className="w-full mt-2" onClick={() => handleCreateRoom(selectedColor)}>Crear y Jugar</Button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-muted-foreground/20" /></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-medium">O</span></div>
                        </div>

                        {/* Unirse */}
                        <div className="flex flex-col gap-3 p-4 bg-secondary/30 rounded-lg border">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Unirse a Sala</h3>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm uppercase"
                                    placeholder="Código de Sala"
                                    value={inputRoomId}
                                    onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                                />
                                <Button onClick={handleJoinRoom}>Conectar</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status === 'waiting') {
        return (
            <div className="h-screen flex items-center justify-center p-4 bg-muted/20">
                <Card className="w-full max-w-sm text-center border-primary/20 shadow-lg">
                    <CardHeader><CardTitle>Sala Creada</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-center gap-6 pb-6">
                        <Spinner className="size-8" />
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-sm text-muted-foreground">Comparte este código con tu oponente:</p>
                            <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-md font-mono text-xl border shadow-inner">
                                <span>{roomId}</span>
                                <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(roomId)} className="h-8 w-8 ml-2"><Copy className="h-4 w-4" /></Button>
                            </div>
                        </div>
                        <p className="text-sm animate-pulse text-primary/80">Esperando a que se una...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { w: materialW, b: materialB } = getMaterialAdvantage();

    const localIsHost = serverPlayers?.host?.playerId === playerId;
    
    // Determinar quién es quién para renderizar header (oponente) y footer (local)
    // El oponente siempre es el otro
    const opponent = localIsHost ? serverPlayers?.guest : serverPlayers?.host;
    const local = localIsHost ? serverPlayers?.host : serverPlayers?.guest;

    const localColor = playerColor;
    const opponentColor = playerColor === 'w' ? 'b' : 'w';

    const localMat = localColor === 'w' ? materialW : materialB;
    const oppMat = opponentColor === 'w' ? materialW : materialB;

    const renderPlayerInfo = (player: any, color: 'w'|'b', isOpponent: boolean) => {
        if (!player) return null;

        const isTurn = serverTurn === color;
        const timeRemaining = color === 'w' ? localWhiteTime : localBlackTime;
        const material = color === 'w' ? materialW : materialB;

        return (
            <div className="flex justify-between w-full">
                <div className="flex gap-4 items-center">
                    <div className="relative">
                        <img className="rounded-sm" src={player.avatar || '/assets/images/players/player-1.webp'} alt="Avatar" height="40" width="40" />
                        {!player.connected && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-black" title="Desconectado" />
                        )}
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <h1 className="font-semibold text-md">{player.name || 'Jugador'}</h1>
                            {!player.connected && <span className="text-xs text-red-500 font-bold animate-pulse">Reconectando...</span>}
                        </div>
                        
                        {/* Listado de piezas capturadas */}
                        <div className="flex items-center gap-1 min-h-[20px]">
                            {material.pieces.map((p, idx) => (
                                <img key={idx} src={`/assets/images/pieces/standard/${color === 'w' ? 'b' : 'w'}${p}.svg`} className="w-4 h-4 object-contain" alt={p}/>
                            ))}
                            {material.score > 0 && <span className="text-xs text-muted-foreground ml-1">+{material.score}</span>}
                        </div>
                    </div>
                </div>
                
                {timeControl && (
                    <div className={`flex items-center gap-3 px-4 rounded-md transition-colors ${isTurn ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-secondary-foreground opacity-50'}`}>
                        <Clock className="w-4 h-4" />
                        <div className="font-bold text-lg font-mono">{formatTime(timeRemaining)}</div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
            {/* Oponente (Header) */}
            <header className="flex-shrink-0 h-[80px] p-4 flex items-center justify-center max-w-4xl w-full mx-auto">
                {renderPlayerInfo(opponent, opponentColor, true)}
            </header>

            {/* Tablero (Centro) */}
            <main className="flex-1 min-h-0 w-full flex items-center justify-center p-0 relative">
                <div
                    className="board-height board-width contain-layout relative"
                    onContextMenu={(e) => e.preventDefault()}
                    onMouseDown={handleBoardMouseDown}
                >
                    <div
                        className="inset-0 absolute bg-cover bg-center select-none rounded-sm overflow-hidden"
                        style={{ backgroundImage: `url(${theme.board.backgroundImage})` }}
                        ref={chessboardRef}
                    >
                        <BoardHighlights
                            selectedSquare={toCoords(selectedSquareAlg)}
                            lastMove={
                                app.engine.getLastMove()
                                    ? {
                                          from: toCoords(app.engine.getLastMove()!.from)!,
                                          to: toCoords(app.engine.getLastMove()!.to)!,
                                      }
                                    : null
                            }
                            validDestinations={validDestinations}
                            hoverSquare={toCoords(hoverSquare)}
                            premoves={premoves}
                            flipped={playerColor === 'b'}
                        />

                        <BoardAnnotations
                            arrows={mappedArrows}
                            highlights={mappedHighlights}
                            flipped={playerColor === 'b'}
                        />

                        {pendingPromotion && (
                            <>
                                <div
                                    className="absolute inset-0 z-40 pointer-events-auto"
                                    onClick={() => setPendingPromotion(null)}
                                />
                                <div
                                    className={`absolute z-50 flex ${pendingPromotion.color === 'w' ? 'flex-col' : 'flex-col-reverse'} bg-white dark:bg-black shadow-2xl rounded-md overflow-hidden pointer-events-auto`}
                                    style={{
                                        left: `${pendingPromotion.dropX * 12.5}%`,
                                        ...(pendingPromotion.color === 'w'
                                            ? { top: `${pendingPromotion.dropY * 12.5}%` }
                                            : { bottom: `${(7 - pendingPromotion.dropY) * 12.5}%` }),
                                        width: '12.5%',
                                    }}
                                >
                                    {(['q', 'n', 'r', 'b'] as PieceSymbol[]).map((pieceType) => (
                                        <div
                                            key={pieceType}
                                            className="w-full aspect-square hover:bg-muted/50 cursor-pointer flex items-center justify-center transition-colors"
                                            onClick={() => handlePromotionSelect(pieceType)}
                                        >
                                            <img
                                                src={
                                                    theme.pieces[pieceType as keyof typeof theme.pieces][
                                                        pendingPromotion.color
                                                    ]
                                                }
                                                alt={pieceType}
                                                className="w-[85%] h-[85%] object-contain drop-shadow-md"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {boardSnapshot &&
                            boardSnapshot.board.flatMap((row, rowIndex) =>
                                row.map((square, colIndex) => {
                                    const renderRow = playerColor === 'b' ? 7 - rowIndex : rowIndex;
                                    const renderCol = playerColor === 'b' ? 7 - colIndex : colIndex;

                                    return (
                                        <div
                                            key={`sq-int-${square.algebraic}`}
                                            className="absolute w-[12.5%] h-[12.5%] flex items-center justify-center cursor-pointer pointer-events-auto z-25"
                                            style={{
                                                top: `${renderRow * 12.5}%`,
                                                left: `${renderCol * 12.5}%`,
                                            }}
                                            onMouseDown={(e) => {
                                                if (e.button === 0) {
                                                    safeHandleSquareClick(square.algebraic);
                                                    if (square.piece) {
                                                        const isHint = square.isValidDestination && isSelectedTurn;
                                                        if (!isHint) grabPiece(e, square.algebraic);
                                                    }
                                                }
                                            }}
                                        >
                                            {square.piece && (
                                                <img
                                                    src={
                                                        theme.pieces[
                                                            square.piece.type as keyof typeof theme.pieces
                                                        ][square.piece.color]
                                                    }
                                                    alt={square.piece.type}
                                                    className={`w-full h-full object-contain pointer-events-none relative`}
                                                    data-square={square.algebraic}
                                                />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                    </div>
                    <Coordinates
                        className="pointer-events-none z-30 relative"
                        light={coordinateColors.light}
                        dark={coordinateColors.dark}
                        flipped={playerColor === 'b'}
                    />
                </div>
            </main>

            {/* Local Player (Footer) */}
            <footer className="flex-shrink-0 h-[80px] p-4 flex items-center justify-center max-w-4xl w-full mx-auto">
                {renderPlayerInfo(local, localColor, false)}
            </footer>
        </div>
    );
}
