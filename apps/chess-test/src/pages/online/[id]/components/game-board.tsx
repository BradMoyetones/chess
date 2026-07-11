import { useCallback, useEffect, useRef, useState } from 'react';
import { type PieceSymbol } from 'chess.js';
import { ChessApp, type BoardSnapshot } from '@chess-fw/core';
import { BoardAnnotations } from '@/components/board/board-annotations';
import { BoardHighlights } from '@/components/board/board-highlights';
import Coordinates from '@/components/coordinates';
import { theme, coordinateColors } from '@/lib/theme';

interface GameBoardProps {
    app: ChessApp;
    boardSnapshot: BoardSnapshot | null;
    setBoardSnapshot: (snapshot: any) => void;
    playerColor: 'w' | 'b';
    emitMove: (moveData: any) => void;
}

const toCoords = (algebraic: string | null) => {
    if (!algebraic) return null;
    const x = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
    const y = 8 - parseInt(algebraic[1]);
    return { x, y };
};

export function GameBoard({ app, boardSnapshot, setBoardSnapshot, playerColor, emitMove }: GameBoardProps) {
    const handleMouseMove = useRef<(e: MouseEvent | TouchEvent) => void>(() => { });
    const handleMouseUp = useRef<(e: MouseEvent | TouchEvent) => void>(() => { });
    const handleAnnotationDropRef = useRef<(e: MouseEvent) => void>(() => { });

    const moveWrapper = useCallback((e: MouseEvent | TouchEvent) => handleMouseMove.current(e), []);
    const dropWrapper = useCallback((e: MouseEvent | TouchEvent) => handleMouseUp.current(e), []);
    const annotationDropWrapper = useCallback((e: MouseEvent) => handleAnnotationDropRef.current(e), []);

    const activePiece = useRef<HTMLElement | null>(null);
    const chessboardRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            if (chessboardRef.current && !chessboardRef.current.contains(e.target as Node)) {
                app.interaction.clearSelection();
                setBoardSnapshot(app.getSnapshot());
            }
        };
        window.addEventListener('mousedown', handleGlobalClick);
        return () => window.removeEventListener('mousedown', handleGlobalClick);
    }, [app, setBoardSnapshot]);

    const movePiece = (e: MouseEvent | TouchEvent) => {
        const chessboard = chessboardRef.current;
        if (activePiece.current && chessboard) {
            const boardRect = chessboard.getBoundingClientRect();
            const pieceSize = boardRect.width / 8;

            const isTouch = 'touches' in e;
            const clientX = isTouch ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = isTouch ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

            let x = clientX - boardRect.left - pieceSize / 2;
            let y = clientY - boardRect.top - pieceSize / 2;

            const maxX = boardRect.width - pieceSize;
            const maxY = boardRect.height - pieceSize;

            x = Math.max(0, Math.min(x, maxX));
            y = Math.max(0, Math.min(y, maxY));

            activePiece.current.style.left = `${x}px`;
            activePiece.current.style.top = `${y}px`;

            const rawDropX = Math.floor((clientX - boardRect.left) / pieceSize);
            const rawDropY = Math.floor((clientY - boardRect.top) / pieceSize);
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

    const dropPiece = (e: MouseEvent | TouchEvent) => {
        try {
            const chessboard = chessboardRef.current;
            if (activePiece.current && chessboard) {
                const boardRect = chessboard.getBoundingClientRect();
                const pieceSize = boardRect.width / 8;

                const isTouch = 'changedTouches' in e;
                const clientX = isTouch ? (e as TouchEvent).changedTouches[0].clientX : (e as MouseEvent).clientX;
                const clientY = isTouch ? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;

                const rawDropX = Math.floor((clientX - boardRect.left) / pieceSize);
                const rawDropY = Math.floor((clientY - boardRect.top) / pieceSize);
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
                                app.interaction.selectSquare(targetAlgebraic);
                            } else {
                                const premovesBefore = app.interaction.getPremoves();
                                const premoveColors = premovesBefore.map(
                                    (p: any) => app.engine.getPieceAt(p.from)?.color
                                );

                                const result = app.engine.attemptMove(fromSquare, targetAlgebraic);
                                if (result && result.success) {
                                    app.interaction.clearSelection();
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
            window.removeEventListener('touchmove', moveWrapper);
            window.removeEventListener('touchend', dropWrapper);
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
            // app.interaction.clearPremoves(); // Se limpian los premoves en caso de arrepentimiento
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
            if (app.engine.canRedo()) return;

            const piece = app.engine.getPieceAt(algebraic);

            if (piece && piece.color !== playerColor) {
                const selectedSq = app.interaction.getSelectedSquare();
                if (selectedSq) {
                    const validDests = app.interaction.getValidDestinations();
                    if (!validDests.includes(algebraic)) {
                        return;
                    }
                } else {
                    return;
                }
            }

            if (app.interaction.getSelectedSquare() === algebraic) {
                app.interaction.clearSelection();
                setBoardSnapshot(app.getSnapshot());
                return;
            }

            const fenBefore = app.engine.getFen();
            app.click(algebraic);
            const fenAfter = app.engine.getFen();

            if (fenBefore !== fenAfter) {
                const lastMove = app.engine.getLastMove();
                if (lastMove) emitMove(lastMove);
            }

            setBoardSnapshot(app.getSnapshot());
        },
        [app, playerColor, emitMove, setBoardSnapshot]
    );

    const grabPiece = (e: React.MouseEvent | React.TouchEvent, squareAlgebraic: string) => {
        if (app.engine.canRedo()) return;
        const isMouse = 'button' in e;
        if (isMouse && (e as React.MouseEvent).button !== 0) return;

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

            const isTouch = 'touches' in e;
            const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

            const x = clientX - boardRect.left - pieceSize / 2;
            const y = clientY - boardRect.top - pieceSize / 2;

            element.style.zIndex = '100';
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;

            activePiece.current = element;

            window.addEventListener('mousemove', moveWrapper);
            window.addEventListener('mouseup', dropWrapper);
            window.addEventListener('touchmove', moveWrapper, { passive: false });
            window.addEventListener('touchend', dropWrapper);
        }
    };

    useEffect(() => {
        handleMouseMove.current = movePiece;
        handleMouseUp.current = dropPiece;
        handleAnnotationDropRef.current = handleAnnotationDrop;
    });

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

    return (
        <div className="w-full h-full flex items-center justify-center" style={{ containerType: 'size' }}>
            <div
                className="board-square contain-layout relative"
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
                                            touchAction: 'none'
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
                                        onTouchStart={(e) => {
                                            safeHandleSquareClick(square.algebraic);
                                            if (square.piece) {
                                                const isHint = square.isValidDestination && isSelectedTurn;
                                                if (!isHint) grabPiece(e, square.algebraic);
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
        </div>
    );
}
