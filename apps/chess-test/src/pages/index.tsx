import { ChessApp, type BoardSnapshot } from "@chess-fw/core";
import Coordinates from "../components/coordinates";
import { BoardAnnotations } from "../components/board/board-annotations";
import { BoardHighlights } from "../components/board/board-highlights";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type PieceSymbol } from "chess.js"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { theme, coordinateColors } from "../lib/theme";

// Utilidad pura para convertir "e2" a { x: 4, y: 6 }
const toCoords = (algebraic: string | null) => {
    if (!algebraic) return null;
    const x = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
    const y = 8 - parseInt(algebraic[1]);
    return { x, y };
};

export default function Chess() {
    const [app] = useState(() => new ChessApp());

    // Refs para evitar memory leaks de listeners
    const handleMouseMove = useRef<(e: MouseEvent) => void>(() => {});
    const handleMouseUp = useRef<(e: MouseEvent) => void>(() => {});
    const handleAnnotationDropRef = useRef<(e: MouseEvent) => void>(() => {});

    // Referencias estables que nunca cambian durante re-renders
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

    useEffect(() => {
        setBoardSnapshot(app.getSnapshot())
        
        const handleUpdate = () => setBoardSnapshot(app.getSnapshot());
        
        const unsubs = [
            app.events.on("BOARD_UPDATED", handleUpdate),
            app.events.on("PREMOVE_CANCELLED", handleUpdate),
            app.events.on("PREMOVE_QUEUED", handleUpdate)
        ];
        
        return () => unsubs.forEach(unsub => unsub());
    }, [app])

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

            const dropX = Math.floor((e.clientX - boardRect.left) / pieceSize);
            const dropY = Math.floor((e.clientY - boardRect.top) / pieceSize);
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

                const dropX = Math.floor((e.clientX - boardRect.left) / pieceSize);
                const dropY = Math.floor((e.clientY - boardRect.top) / pieceSize);

                if (dropX >= 0 && dropX <= 7 && dropY >= 0 && dropY <= 7) {
                    const targetFile = String.fromCharCode('a'.charCodeAt(0) + dropX);
                    const targetRank = String(8 - dropY);
                    const targetAlgebraic = `${targetFile}${targetRank}`;

                    const fromSquare = originSquare.current;

                    if (fromSquare && fromSquare !== targetAlgebraic) {
                        const pieceSquare = boardSnapshot?.board.flat().find(s => s.algebraic === fromSquare);
                        const piece = pieceSquare?.piece;

                        if (piece && piece.type === 'p' && ((piece.color === 'w' && targetRank === '8') || (piece.color === 'b' && targetRank === '1'))) {
                            setPendingPromotion({ from: fromSquare, to: targetAlgebraic, color: piece.color, dropX, dropY });
                        } else {
                            const turn = app.engine.getTurn();
                            if (piece && piece.color !== turn) {
                                // Es un premove: pasamos por el InteractionManager para que lo encole
                                app.interaction.selectSquare(targetAlgebraic);
                            } else {
                                // Movimiento normal: lo enviamos directo al engine.
                                // PARCHE PARA BUG EN @chess-fw/core v2.0.0:
                                // Guardamos los colores originales de los premoves encolados
                                const premovesBefore = app.interaction.getPremoves();
                                const premoveColors = premovesBefore.map((p: any) => app.engine.getPieceAt(p.from)?.color);

                                const result = app.engine.attemptMove(fromSquare, targetAlgebraic);
                                if (result && result.success) {
                                    app.interaction.clearSelection();

                                    // Si la librería falló en ejecutar un premove porque la pieza fue capturada
                                    // (tryExecutePremove ignora la pieza y la deja en cola), lo detectamos aquí:
                                    const remainingPremoves = app.interaction.getPremoves();
                                    if (remainingPremoves.length > 0) {
                                        const firstRemaining = remainingPremoves[0];
                                        const origIdx = premovesBefore.findIndex((p: any) => p.from === firstRemaining.from && p.to === firstRemaining.to);
                                        const origColor = origIdx !== -1 ? premoveColors[origIdx] : null;

                                        // Si es el turno del color que encoló el premove, y SIGUE en la cola, es porque es un premove STALE (inválido)
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
            app.engine.attemptMove(pendingPromotion.from, pendingPromotion.to, pieceType);
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

            const dropX = Math.floor((e.clientX - boardRect.left) / pieceSize);
            const dropY = Math.floor((e.clientY - boardRect.top) / pieceSize);

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
                // Trigger a re-render to fetch new annotations
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
                
                const dropX = Math.floor((e.clientX - boardRect.left) / pieceSize);
                const dropY = Math.floor((e.clientY - boardRect.top) / pieceSize);

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
        if (app.interaction.getSelectedSquare() === algebraic) {
            app.interaction.clearSelection();
            setBoardSnapshot(app.getSnapshot());
            return;
        }

        app.click(algebraic);
        setBoardSnapshot(app.getSnapshot());
    }, [app]);

    const grabPiece = (e: React.MouseEvent, squareAlgebraic: string) => {
        if (e.button !== 0) return;
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

    const canRedo = useMemo(() => {
        return app.engine.canRedo();
    }, [boardSnapshot, app]);

    const canUndo = useMemo(() => {
        return app.engine.canUndo();
    }, [boardSnapshot, app]);

    // Actualizamos las referencias en cada render
    handleMouseMove.current = movePiece;
    handleMouseUp.current = dropPiece;
    handleAnnotationDropRef.current = handleAnnotationDrop;

    // --- Extracción de Datos para los Componentes Desacoplados ---
    const selectedSquareAlg = app.interaction.getSelectedSquare();
    const selectedPiece = selectedSquareAlg ? app.engine.getPieceAt(selectedSquareAlg) : null;
    const isSelectedTurn = selectedPiece ? selectedPiece.color === app.engine.getTurn() : false;

    // 1. Valid Destinations
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
        
    // 2. Premoves
    const premoves = app.interaction.getPremoves().map((pm: any) => ({
        from: toCoords(pm.from)!,
        to: toCoords(pm.to)!
    }));

    // 3. Anotaciones
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

    return (
        <div className="h-screen overflow-hidden p-2">
            <div className="flex flex-col md:flex-row gap-2 w-fit mx-auto">
                <Card className="w-fit">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Chess with <span className="font-mono bg-secondary rounded-md border text-cyan-600">@chess-fw/core</span></CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 md:flex-row">
                        <div className="flex flex-col w-full">
                            <div 
                                className="board-height board-width contain-layout relative"
                                onContextMenu={(e) => e.preventDefault()}
                                onMouseDown={handleBoardMouseDown}
                            >
                                <div
                                    className="inset-0 absolute bg-cover bg-center select-none rounded-md"
                                    style={{
                                        backgroundImage: `url(${theme.board.backgroundImage})`
                                    }}
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
                                    />
                                    
                                    <BoardAnnotations 
                                        arrows={mappedArrows}
                                        highlights={mappedHighlights}
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
                                                    width: '12.5%'
                                                }}
                                            >
                                                {(['q', 'n', 'r', 'b'] as PieceSymbol[]).map(pieceType => (
                                                    <div
                                                        key={pieceType}
                                                        className="w-full aspect-square hover:bg-muted/50 cursor-pointer flex items-center justify-center transition-colors"
                                                        onClick={() => handlePromotionSelect(pieceType)}
                                                    >
                                                        <img
                                                            src={theme.pieces[pieceType as keyof typeof theme.pieces][pendingPromotion.color]}
                                                            alt={pieceType}
                                                            className="w-[85%] h-[85%] object-contain drop-shadow-md"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* Capa de piezas y mousedown puro (Interaction Layer integrada) */}
                                    {boardSnapshot && boardSnapshot.board.flatMap((row, rowIndex) =>
                                        row.map((square, colIndex) => {
                                            return (
                                                <div
                                                    key={`sq-int-${square.algebraic}`}
                                                    className="absolute w-[12.5%] h-[12.5%] flex items-center justify-center cursor-pointer pointer-events-auto z-25"
                                                    style={{
                                                        top: `${rowIndex * 12.5}%`,
                                                        left: `${colIndex * 12.5}%`
                                                    }}
                                                    onMouseDown={(e) => {
                                                        if (e.button === 0) {
                                                            safeHandleSquareClick(square.algebraic);
                                                            
                                                            if (square.piece) {
                                                                const isHint = square.isValidDestination && isSelectedTurn;
                                                                if (!isHint) {
                                                                    grabPiece(e, square.algebraic);
                                                                }
                                                            }
                                                        }
                                                    }}
                                                >
                                                    {square.piece && (
                                                        <img
                                                            src={theme.pieces[square.piece.type as keyof typeof theme.pieces][square.piece.color]}
                                                            alt={square.piece.type}
                                                            className={`w-full h-full object-contain pointer-events-none relative`}
                                                            // Asignamos el data-square al contenedor pero dejamos la imagen como ghost
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
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <div className="flex gap-2">
                            <Button disabled={!canUndo} onClick={() => { app.engine.undo(); setBoardSnapshot(app.getSnapshot()); }}>
                                <ArrowLeft />
                            </Button>
                            <Button disabled={!canRedo} onClick={() => { app.engine.redo(); setBoardSnapshot(app.getSnapshot()); }}>
                                <ArrowRight />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
                <Card className="flex flex-col w-64 max-h-[calc(100vh-2rem)]">
                    <CardHeader>
                        <CardTitle>History</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-y-auto flex-1 p-0">
                        <div className="flex flex-col text-sm">
                            {app.engine.getGameTree().getMainLine().slice(1).reduce((acc, node, i) => {
                                if (i % 2 === 0) acc.push({ turn: i / 2 + 1, white: node, black: null });
                                else acc[acc.length - 1].black = node;
                                return acc;
                            }, [] as any[]).map((pair) => (
                                <div key={pair.turn} className="flex items-center px-4 py-1 hover:bg-muted/30 group">
                                    <div className="w-8 text-muted-foreground font-mono select-none flex items-center">{pair.turn}.</div>
                                    <div className="grid w-full grid-cols-2 gap-2">
                                        <Button
                                            variant={app.engine.getGameTree().getCurrentNode().id === pair.white.id ? 'default' : 'secondary'}
                                            onClick={() => { app.engine.goToMove(pair.white.id); setBoardSnapshot(app.getSnapshot()); }}
                                            className={"w-fit"}
                                        >
                                            {pair.white.move?.san}
                                        </Button>
                                        {pair.black && (
                                            <Button
                                                variant={app.engine.getGameTree().getCurrentNode().id === pair.black.id ? 'default' : 'secondary'}
                                                onClick={() => { app.engine.goToMove(pair.black.id); setBoardSnapshot(app.getSnapshot()); }}
                                            className={"w-fit"}
                                            >
                                                {pair.black.move?.san}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
