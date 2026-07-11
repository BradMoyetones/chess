import { ChessApp, type BoardSnapshot } from "@chess-fw/core";
import Coordinates from "../components/coordinates";
import { BoardAnnotations } from "../components/board/board-annotations";
import { BoardHighlights } from "../components/board/board-highlights";
import { useCallback, useEffect, useRef, useState } from "react";
import { type PieceSymbol } from "chess.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Loader2, Copy, ArrowLeft, ArrowRight } from "lucide-react";
import { ScrollArea, ScrollBar } from "../components/ui/scroll-area";
import { theme, coordinateColors } from "../lib/theme";
import { io, Socket } from "socket.io-client";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";

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
    const [playerColor, setPlayerColor] = useState<'w'|'b'>('w');
    
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

    const activePiece = useRef<HTMLElement | null>(null)
    const chessboardRef = useRef<HTMLDivElement | null>(null)
    const originSquare = useRef<string | null>(null)
    const originalStyle = useRef<{ left: string, top: string, zIndex: string } | null>(null)
    const annotationStartSquare = useRef<string | null>(null)

    const [pendingPromotion, setPendingPromotion] = useState<{
        from: string,
        to: string,
        color: 'w' | 'b',
        dropX: number,
        dropY: number
    } | null>(null)

    const [hoverSquare, setHoverSquare] = useState<string | null>(null)
    const [boardSnapshot, setBoardSnapshot] = useState<BoardSnapshot | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToRight = useCallback(() => {
        if (scrollRef.current) {
            const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) viewport.scrollTo({ left: viewport.scrollWidth, behavior: 'smooth' });
        }
    }, []);

    const emitMove = useCallback((moveData: any) => {
        socket?.emit('move', { 
            roomId, 
            moveData,
            fen: app.engine.getFen(),
            pgn: app.engine.getPgn()
        });
    }, [socket, roomId, app]);

    useEffect(() => {
        const newSocket = io('http://localhost:3001');
        setSocket(newSocket);
        
        newSocket.on('opponent_joined', () => {
            setStatus('playing');
        });
        
        newSocket.on('move_received', ({ moveData }) => {
            const mainLine = app.engine.getGameTree().getMainLine();
            if (mainLine.length > 0) {
                app.engine.goToMove(mainLine[mainLine.length - 1].id);
            }
            app.engine.attemptMove(moveData.from, moveData.to, moveData.promotion);
            app.interaction.clearSelection();
            setBoardSnapshot(app.getSnapshot());
        });
        
        newSocket.on('opponent_disconnected', () => {
            setStatus('waiting');
            toast.info("El oponente se ha desconectado. Esperando reconexión...");
        });

        newSocket.on('room_closed', () => {
            setStatus('lobby');
            setRoomId('');
            toast.error("La sala fue cerrada por inactividad.");
            navigate('/online');
        });
        
        if (urlRoomId) {
            newSocket.emit('join_room', { roomId: urlRoomId, playerId }, (res: any) => {
                if (res.success) {
                    setRoomId(res.roomId);
                    setPlayerColor(res.color);
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
        
        return () => { newSocket.close(); };
    }, [app, urlRoomId, navigate, playerId]);

    useEffect(() => {
        setBoardSnapshot(app.getSnapshot())
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
            app.events.on("BOARD_UPDATED", handleUpdate),
            app.events.on("PREMOVE_CANCELLED", handleUpdate),
            app.events.on("PREMOVE_QUEUED", handleUpdate),
            app.events.on("PREMOVE_EXECUTED", handlePremoveExecuted)
        ];
        return () => unsubs.forEach(unsub => unsub());
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

    const handleCreateRoom = (color: 'w'|'b') => {
        socket?.emit('create_room', { hostColor: color, playerId }, (res: any) => {
            if (res.success) {
                navigate(`/online/${res.roomId}`);
            }
        });
    };
    
    const handleJoinRoom = () => {
        if (!inputRoomId) return;
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
                        const pieceSquare = boardSnapshot?.board.flat().find(s => s.algebraic === fromSquare);
                        const piece = pieceSquare?.piece;

                        if (piece && piece.type === 'p' && ((piece.color === 'w' && targetRank === '8') || (piece.color === 'b' && targetRank === '1'))) {
                            setPendingPromotion({ from: fromSquare, to: targetAlgebraic, color: piece.color, dropX: rawDropX, dropY: rawDropY });
                        } else {
                            const turn = app.engine.getTurn();
                            if (piece && piece.color !== turn) {
                                // Premove
                                app.interaction.selectSquare(targetAlgebraic);
                            } else {
                                const premovesBefore = app.interaction.getPremoves();
                                const premoveColors = premovesBefore.map((p: any) => app.engine.getPieceAt(p.from)?.color);

                                const result = app.engine.attemptMove(fromSquare, targetAlgebraic);
                                if (result && result.success) {
                                    app.interaction.clearSelection();
                                    
                                    // EL JUGADOR LOCAL HIZO UN MOVIMIENTO
                                    emitMove(result.move);

                                    const remainingPremoves = app.interaction.getPremoves();
                                    if (remainingPremoves.length > 0) {
                                        const firstRemaining = remainingPremoves[0];
                                        const origIdx = premovesBefore.findIndex((p: any) => p.from === firstRemaining.from && p.to === firstRemaining.to);
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
                    const existingHighlight = app.annotations.getAnnotations().find((a: any) => a.type === 'highlight' && a.square === targetSquare);
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

    const safeHandleSquareClick = useCallback((algebraic: string) => {
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
    }, [app, playerColor, emitMove]);

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
                zIndex: element.style.zIndex
            };

            const boardRect = chessboard.getBoundingClientRect();
            const pieceSize = boardRect.width / 8;

            const x = e.clientX - boardRect.left - pieceSize / 2;
            const y = e.clientY - boardRect.top - pieceSize / 2;

            element.style.zIndex = "100";
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
        ? (app.interaction.getValidDestinations() || []).map(sq => {
            const coords = toCoords(sq);
            return {
                x: coords!.x,
                y: coords!.y,
                containsPiece: !!app.engine.getPieceAt(sq)
            };
        })
        : [];
        
    const premoves = app.interaction.getPremoves().map((pm: any) => ({
        from: toCoords(pm.from)!,
        to: toCoords(pm.to)!
    }));

    const coreAnnotations = app.annotations.getAnnotations();
    const mappedArrows = coreAnnotations
        .filter((a: any) => a.type === 'arrow')
        .map((a: any) => ({
            id: a.id,
            from: toCoords(a.from)!,
            to: toCoords(a.to)!,
            color: a.color === 'green' ? undefined : a.color
        }));
        
        const mappedHighlights = coreAnnotations
        .filter((a: any) => a.type === 'highlight')
        .map((a: any) => ({
            id: a.id,
            x: toCoords(a.square)!.x,
            y: toCoords(a.square)!.y,
            color: a.color || a.backgroundColor
        }));

    const canUndo = app.engine.canUndo();
    const canRedo = app.engine.canRedo();

    // --- RENDER LOBBY ---
    if (status === 'lobby') {
        return (
            <div className="h-screen flex items-center justify-center p-4 bg-muted/20">
                <Card className="w-full max-w-md shadow-lg border-primary/20">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-extrabold tracking-tight">Online Chess</CardTitle>
                        <CardDescription>Crea una sala o únete con un código</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6">
                        <div className="flex flex-col gap-3 p-4 bg-secondary/50 rounded-lg border">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Crear Sala Nueva</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" className="border-primary/50 hover:bg-primary/10" onClick={() => handleCreateRoom('w')}>
                                    Jugar con Blancas
                                </Button>
                                <Button variant="outline" className="bg-black text-white hover:bg-zinc-800" onClick={() => handleCreateRoom('b')}>
                                    Jugar con Negras
                                </Button>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-muted-foreground/20" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground font-medium">O</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 p-4 bg-secondary/50 rounded-lg border">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Unirse a Sala</h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Room ID"
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
                    <CardHeader>
                        <CardTitle>Sala Creada</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-6 pb-6">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-sm text-muted-foreground">Comparte este código con tu oponente:</p>
                            <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-md font-mono text-xl border shadow-inner">
                                <span>{roomId}</span>
                                <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(roomId)} className="h-8 w-8 ml-2">
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <p className="text-sm animate-pulse text-primary/80">Esperando a que se una...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden p-2">
            <div className="flex flex-col md:flex-row gap-2 w-fit mx-auto">
                <Card className="w-fit">
                    <CardHeader className="flex flex-row justify-between items-center py-4">
                        <CardTitle className="text-2xl font-bold">Online Play <span className="text-sm font-normal text-muted-foreground ml-2">Room: {roomId}</span></CardTitle>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <span className="text-sm text-muted-foreground">Connected as {playerColor === 'w' ? 'White' : 'Black'}</span>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        
                        {/* Mobile History (Horizontal) */}
                        <div className="md:hidden block w-full max-w-[calc(100vw-4rem)]">
                            <ScrollArea className="w-full whitespace-nowrap rounded-md border bg-secondary/20" ref={scrollRef}>
                                <div className="flex w-max space-x-2 p-2 items-center h-12">
                                    {app.engine.getGameTree().getMainLine().slice(1).map((node: any, i: number) => (
                                        <div key={node.id} className="inline-flex items-center gap-1">
                                            {i % 2 === 0 && <span className="text-muted-foreground text-xs font-mono ml-2">{i / 2 + 1}.</span>}
                                            <Button
                                                variant={app.engine.getGameTree().getCurrentNode().id === node.id ? 'default' : 'secondary'}
                                                size="sm"
                                                className="h-7 text-xs px-2"
                                                onClick={() => { app.engine.goToMove(node.id); setBoardSnapshot(app.getSnapshot()); }}
                                            >
                                                {node.move?.san}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </div>

                        <div className="flex flex-col w-full">
                            <div 
                                className="board-height board-width contain-layout relative"
                                onContextMenu={(e) => e.preventDefault()}
                                onMouseDown={handleBoardMouseDown}
                            >
                                <div
                                    className="inset-0 absolute bg-cover bg-center select-none rounded-md"
                                    style={{ backgroundImage: `url(${theme.board.backgroundImage})` }}
                                    ref={chessboardRef}
                                >
                                    <BoardHighlights
                                        selectedSquare={toCoords(selectedSquareAlg)}
                                        lastMove={app.engine.getLastMove() ? {
                                            from: toCoords(app.engine.getLastMove()!.from)!,
                                            to: toCoords(app.engine.getLastMove()!.to)!
                                        } : null}
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
                                            <div className="absolute inset-0 z-40 pointer-events-auto" onClick={() => setPendingPromotion(null)} />
                                            <div
                                                className={`absolute z-50 flex ${pendingPromotion.color === 'w' ? 'flex-col' : 'flex-col-reverse'} bg-white dark:bg-black shadow-2xl rounded-md overflow-hidden pointer-events-auto`}
                                                style={{
                                                    left: `${pendingPromotion.dropX * 12.5}%`,
                                                    ...(pendingPromotion.color === 'w'
                                                        ? { top: `${pendingPromotion.dropY * 12.5}%` }
                                                        : { bottom: `${(7 - pendingPromotion.dropY) * 12.5}%` }),
                                                    width: '12.5%'
                                                }}
                                            >
                                                {(['q', 'n', 'r', 'b'] as PieceSymbol[]).map(pieceType => (
                                                    <div
                                                        key={pieceType}
                                                        className="w-full aspect-square hover:bg-muted/50 cursor-pointer flex items-center justify-center transition-colors"
                                                        onClick={() => handlePromotionSelect(pieceType)}
                                                    >
                                                        <img src={theme.pieces[pieceType as keyof typeof theme.pieces][pendingPromotion.color]} alt={pieceType} className="w-[85%] h-[85%] object-contain drop-shadow-md" />
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {boardSnapshot && boardSnapshot.board.flatMap((row, rowIndex) =>
                                        row.map((square, colIndex) => {
                                            const renderRow = playerColor === 'b' ? 7 - rowIndex : rowIndex;
                                            const renderCol = playerColor === 'b' ? 7 - colIndex : colIndex;
                                            
                                            return (
                                                <div
                                                    key={`sq-int-${square.algebraic}`}
                                                    className="absolute w-[12.5%] h-[12.5%] flex items-center justify-center cursor-pointer pointer-events-auto z-25"
                                                    style={{
                                                        top: `${renderRow * 12.5}%`,
                                                        left: `${renderCol * 12.5}%`
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
                                                            src={theme.pieces[square.piece.type as keyof typeof theme.pieces][square.piece.color]}
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
                                <Coordinates className="pointer-events-none z-30 relative" light={coordinateColors.light} dark={coordinateColors.dark} flipped={playerColor === 'b'} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Desktop History (Vertical Sidebar) */}
                <Card className="hidden md:flex flex-col w-64 h-fit">
                    <CardHeader className="py-4">
                        <CardTitle className="text-xl">History</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-y-auto flex-1 p-0">
                        <div className="flex flex-col text-sm">
                            {app.engine.getGameTree().getMainLine().length > 1 ? app.engine.getGameTree().getMainLine().slice(1).reduce((acc: any, node: any, i: number) => {
                                if (i % 2 === 0) acc.push({ turn: i / 2 + 1, white: node, black: null });
                                else acc[acc.length - 1].black = node;
                                return acc;
                            }, [] as any[]).map((pair: any) => (
                                <div key={pair.turn} className="flex items-center px-4 py-1.5 hover:bg-muted/30 group border-b border-border/50">
                                    <div className="w-8 text-muted-foreground font-mono select-none flex items-center">{pair.turn}.</div>
                                    <div className="grid w-full grid-cols-2 gap-2">
                                        <Button
                                            variant={app.engine.getGameTree().getCurrentNode().id === pair.white.id ? 'default' : 'secondary'}
                                            size="sm"
                                            onClick={() => { app.engine.goToMove(pair.white.id); setBoardSnapshot(app.getSnapshot()); }}
                                            className={"w-full h-7 text-xs"}
                                        >
                                            {pair.white.move?.san}
                                        </Button>
                                        {pair.black && (
                                            <Button
                                                variant={app.engine.getGameTree().getCurrentNode().id === pair.black.id ? 'default' : 'secondary'}
                                                size="sm"
                                                onClick={() => { app.engine.goToMove(pair.black.id); setBoardSnapshot(app.getSnapshot()); }}
                                            className={"w-full h-7 text-xs"}
                                            >
                                                {pair.black.move?.san}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )) : <div className="text-center py-4 text-muted-foreground">No moves yet</div>}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <div className="flex gap-2 w-full justify-center md:justify-start">
                            <Button disabled={!canUndo} onClick={() => { app.engine.undo(); setBoardSnapshot(app.getSnapshot()); }}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <Button disabled={!canRedo} onClick={() => { app.engine.redo(); setBoardSnapshot(app.getSnapshot()); }}>
                                <ArrowRight className="h-5 w-5" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}