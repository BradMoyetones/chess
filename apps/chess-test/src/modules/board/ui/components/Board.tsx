import { useCallback, useEffect, useRef, useState, memo } from 'react';
import type { PieceSymbol } from 'chess.js';
import type { BoardController } from '@/modules/board/core/ports/BoardController.port';
import { BoardAnnotations } from '@/components/board/board-annotations';
import { BoardEffects } from '@/modules/board/ui/components/BoardEffects';
import { BoardHighlights } from '@/components/board/board-highlights';
import Coordinates from '@/components/board/coordinates';
import { useChessPieces } from '@/modules/board/ui/hooks/useChessPieces';
import { useBoardStore } from '@/modules/board/ui/store/useBoardStore';
import { toCoords, pixelToSquare, pixelToRawIndices } from '@/modules/shared/utils/coordinates';
import { theme, coordinateColors } from '@/lib/theme';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface BoardProps {
    controller: BoardController;
    /** External trigger to force re-render (e.g., snapshot counter) */
    renderKey?: number;
}

// ─── Board Component ─────────────────────────────────────────────────────────

export function Board({ controller }: BoardProps) {
    // ─── Refs ────────────────────────────────────────────────────────────────
    const handleMouseMoveRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {});
    const handleMouseUpRef = useRef<(e: MouseEvent | TouchEvent) => void>(() => {});
    const handleAnnotationDropRef = useRef<(e: MouseEvent) => void>(() => {});

    const moveWrapper = useCallback((e: MouseEvent | TouchEvent) => handleMouseMoveRef.current(e), []);
    const dropWrapper = useCallback((e: MouseEvent | TouchEvent) => handleMouseUpRef.current(e), []);
    const annotationDropWrapper = useCallback((e: MouseEvent) => handleAnnotationDropRef.current(e), []);

    const boardContainerRef = useRef<HTMLDivElement>(null);
    const chessboardRef = useRef<HTMLDivElement>(null);
    const activePiece = useRef<HTMLElement | null>(null);
    const originSquare = useRef<string | null>(null);
    const originalStyle = useRef<{ left: string; top: string; zIndex: string; transition: string } | null>(null);
    const annotationStartSquare = useRef<string | null>(null);
    // Hover square as ref — NO useState, NO re-renders during drag
    const hoverSquareRef = useRef<string | null>(null);
    const [hoverSquareForHighlight, setHoverSquareForHighlight] = useState<string | null>(null);
    // Zustand store for granular state updates
    const syncFromController = useBoardStore((s) => s.syncFromController);

    // Helper: sync store after any mutation
    const syncBoard = useCallback(() => {
        syncFromController(controller);
    }, [controller, syncFromController]);

    // Read state from Zustand store (granular subscriptions)
    const flipped = useBoardStore((s) => s.orientation === 'b');
    const isGameOver = useBoardStore((s) => s.isGameOver);
    const isInteractive = useBoardStore((s) => s.isInteractive);
    const selectedSquareAlg = useBoardStore((s) => s.selectedSquare);
    const storeValidDests = useBoardStore((s) => s.validDestinations);
    const storePremoves = useBoardStore((s) => s.premoves);
    const storeTurn = useBoardStore((s) => s.turn);

    // ─── Pieces Reconciliation ───────────────────────────────────────────────
    const stablePieces = useChessPieces(controller);

    // ─── Promotion State ─────────────────────────────────────────────────────
    const [pendingPromotion, setPendingPromotion] = useState<{
        from: string;
        to: string;
        color: 'w' | 'b';
        dropX: number;
        dropY: number;
    } | null>(null);

    // ─── Subscribe to board changes ──────────────────────────────────────────
    useEffect(() => {
        // Initial sync
        syncBoard();
        const unsub = controller.onBoardChange(() => {
            syncBoard();
        });
        return unsub;
    }, [controller, syncBoard]);

    // ─── Click outside board clears selection ────────────────────────────────
    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            if (chessboardRef.current && !chessboardRef.current.contains(e.target as Node)) {
                controller.clearSelection();
                syncBoard();
            }
        };
        window.addEventListener('mousedown', handleGlobalClick);
        return () => window.removeEventListener('mousedown', handleGlobalClick);
    }, [controller]);

    // ─── Game over cleanup ───────────────────────────────────────────────────
    useEffect(() => {
        if (isGameOver) {
            controller.clearSelection();
            controller.clearPremoves();
            syncBoard();
        }
    }, [isGameOver, controller, syncBoard]);

    // ─── Move Piece (drag handler) ───────────────────────────────────────────
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

            // Direct DOM manipulation — ZERO React re-renders
            activePiece.current.style.left = `${x}px`;
            activePiece.current.style.top = `${y}px`;

            // Compute hover square via ref, only update React state if square changed
            const newSquare = pixelToSquare(clientX, clientY, boardRect, flipped);
            if (newSquare !== hoverSquareRef.current) {
                hoverSquareRef.current = newSquare;
                setHoverSquareForHighlight(newSquare);
            }
        }
    };

    // ─── Drop Piece ──────────────────────────────────────────────────────────
    const dropPiece = (e: MouseEvent | TouchEvent) => {
        try {
            if (isGameOver) return;
            const chessboard = chessboardRef.current;
            if (activePiece.current && chessboard) {
                const boardRect = chessboard.getBoundingClientRect();

                const isTouch = 'changedTouches' in e;
                const clientX = isTouch ? (e as TouchEvent).changedTouches[0].clientX : (e as MouseEvent).clientX;
                const clientY = isTouch ? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;

                const targetSquare = pixelToSquare(clientX, clientY, boardRect, flipped);
                const fromSquare = originSquare.current;

                if (fromSquare && targetSquare && fromSquare !== targetSquare) {
                    // Check for promotion
                    if (controller.isPromotionMove(fromSquare, targetSquare)) {
                        const piece = controller.getPieceAt(fromSquare);
                        const { rawX, rawY } = pixelToRawIndices(clientX, clientY, boardRect);
                        setPendingPromotion({
                            from: fromSquare,
                            to: targetSquare,
                            color: piece!.color,
                            dropX: rawX,
                            dropY: rawY,
                        });
                    } else {
                        const piece = controller.getPieceAt(fromSquare);
                        const turn = controller.getTurn();
                        if (piece && piece.color !== turn) {
                            controller.selectSquare(targetSquare);
                        } else {
                            controller.makeMove(fromSquare, targetSquare);
                        }
                    }
                }
            }
        } finally {
            hoverSquareRef.current = null;
            setHoverSquareForHighlight(null);

            if (boardContainerRef.current) {
                boardContainerRef.current.classList.add('instant-snap');
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        boardContainerRef.current?.classList.remove('instant-snap');
                    });
                });
            }

            if (originalStyle.current && activePiece.current) {
                activePiece.current.style.zIndex = originalStyle.current.zIndex;
                activePiece.current.style.left = originalStyle.current.left;
                activePiece.current.style.top = originalStyle.current.top;
                activePiece.current.style.transition = originalStyle.current.transition;
            }
            activePiece.current = null;
            originSquare.current = null;
            window.removeEventListener('mousemove', moveWrapper);
            window.removeEventListener('mouseup', dropWrapper);
            window.removeEventListener('touchmove', moveWrapper);
            window.removeEventListener('touchend', dropWrapper);
            syncBoard();
        }
    };

    // ─── Promotion Select ────────────────────────────────────────────────────
    const handlePromotionSelect = (pieceType: PieceSymbol) => {
        if (pendingPromotion) {
            controller.makeMove(pendingPromotion.from, pendingPromotion.to, pieceType);
            controller.clearSelection();
            setPendingPromotion(null);
            syncBoard();
        }
    };

    // ─── Annotation Handling (right-click) ───────────────────────────────────
    const handleAnnotationDrop = (e: MouseEvent) => {
        const chessboard = chessboardRef.current;
        if (annotationStartSquare.current && chessboard) {
            const boardRect = chessboard.getBoundingClientRect();
            const targetSquare = pixelToSquare(e.clientX, e.clientY, boardRect, flipped);

            if (targetSquare) {
                if (targetSquare === annotationStartSquare.current) {
                    const existing = controller.getAnnotations().find(
                        (a: any) => a.type === 'highlight' && a.square === targetSquare,
                    );
                    if (existing) {
                        controller.removeAnnotation(existing.id);
                    } else {
                        controller.addHighlight(targetSquare, '#ef4444');
                    }
                } else {
                    controller.addArrow(annotationStartSquare.current, targetSquare);
                }
                syncBoard();
            }
        }

        annotationStartSquare.current = null;
        window.removeEventListener('mouseup', annotationDropWrapper);
    };

    // ─── Board Mouse Down (left click / right click) ─────────────────────────
    const handleBoardMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) {
            // Left click: only clear annotations. Do NOT clear premoves here!
            // Premove clearing is handled by InteractionManager (empty square click)
            // and by right-click below. Clearing here would kill premove chaining
            // because events bubble from piece → board container.
            controller.clearAnnotations();
            syncBoard();
        } else if (e.button === 2) {
            // Right click cancels premoves (chess.com behavior)
            controller.clearPremoves();
            const chessboard = chessboardRef.current;
            if (chessboard) {
                const boardRect = chessboard.getBoundingClientRect();
                const sq = pixelToSquare(e.clientX, e.clientY, boardRect, flipped);
                if (sq) {
                    annotationStartSquare.current = sq;
                    window.addEventListener('mouseup', annotationDropWrapper);
                }
            }
            syncBoard();
        }
    };

    // ─── Square Click (click-to-move) ────────────────────────────────────────
    // Delegates to controller.handleSquareClick which uses app.click() internally.
    // Promotion must be intercepted BEFORE the click reaches the InteractionManager.
    const safeHandleSquareClick = useCallback(
        (algebraic: string) => {
            if (!isInteractive && !controller.getSelectedSquare()) return;

            // Intercept promotion: if selected square -> algebraic is a promotion move,
            // show the dialog instead of delegating to InteractionManager
            const selectedSq = controller.getSelectedSquare();
            if (selectedSq) {
                const validDests = controller.getValidDestinations();
                if (validDests.includes(algebraic) && controller.isPromotionMove(selectedSq, algebraic)) {
                    const selectedPiece = controller.getPieceAt(selectedSq);
                    if (selectedPiece) {
                        const coords = toCoords(algebraic);
                        if (coords) {
                            const dropX = flipped ? 7 - coords.x : coords.x;
                            const dropY = flipped ? 7 - coords.y : coords.y;
                            setPendingPromotion({
                                from: selectedSq,
                                to: algebraic,
                                color: selectedPiece.color,
                                dropX,
                                dropY,
                            });
                            return;
                        }
                    }
                }
            }

            controller.handleSquareClick(algebraic);
            syncBoard();
        },
        [controller, isInteractive, flipped, syncBoard],
    );

    // ─── Grab Piece (drag start) ─────────────────────────────────────────────
    const grabPiece = (e: React.MouseEvent | React.TouchEvent, squareAlgebraic: string) => {
        if (!isInteractive) return;
        const isMouse = 'button' in e;
        if (isMouse && (e as React.MouseEvent).button !== 0) return;

        const piece = controller.getPieceAt(squareAlgebraic);
        const orientation = controller.getOrientation();
        if (piece && piece.color !== orientation) return;

        e.preventDefault();

        const element = e.currentTarget as HTMLElement;

        if (controller.getSelectedSquare() !== squareAlgebraic) {
            controller.selectSquare(squareAlgebraic);
            syncBoard();
        }

        const chessboard = chessboardRef.current;
        if (chessboard) {
            originSquare.current = squareAlgebraic;
            originalStyle.current = {
                left: element.style.left,
                top: element.style.top,
                zIndex: element.style.zIndex,
                transition: element.style.transition,
            };

            const boardRect = chessboard.getBoundingClientRect();
            const pieceSize = boardRect.width / 8;

            const isTouch = 'touches' in e;
            const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

            const x = clientX - boardRect.left - pieceSize / 2;
            const y = clientY - boardRect.top - pieceSize / 2;

            element.style.transition = 'none';
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

    // ─── Update ref handlers ─────────────────────────────────────────────────
    useEffect(() => {
        handleMouseMoveRef.current = movePiece;
        handleMouseUpRef.current = dropPiece;
        handleAnnotationDropRef.current = handleAnnotationDrop;
    });

    // ─── Derived Visual State (from Zustand store, NOT from controller) ─────
    // selectedSquareAlg, storeValidDests, storePremoves are read from store
    // subscriptions above — this guarantees React re-renders when they change.

    // UX per turn: Only show valid destination dots when it's the player's turn.
    // When it's the rival's turn, interaction still works for premoves but the
    // visual dots are hidden. The player selects a piece → no dots shown →
    // clicks a destination square → premove is queued. This matches chess.com UX.
    const playerColor = controller.getOrientation();
    const isPlayerTurn = storeTurn === playerColor;

    const validDestinations = selectedSquareAlg && !isGameOver && isPlayerTurn
        ? storeValidDests.map((sq) => {
            const coords = toCoords(sq);
            return {
                x: coords!.x,
                y: coords!.y,
                containsPiece: !!controller.getPieceAt(sq),
            };
        })
        : [];

    const premoves = !isGameOver
        ? storePremoves.map((pm) => ({
            from: toCoords(pm.from)!,
            to: toCoords(pm.to)!,
        }))
        : [];

    const coreAnnotations = controller.getAnnotations();
    const mappedArrows = coreAnnotations
        .filter((a): a is Extract<typeof a, { type: 'arrow' }> => a.type === 'arrow')
        .map((a) => ({
            id: String(a.id),
            from: toCoords(a.from)!,
            to: toCoords(a.to)!,
            color: a.color === 'green' ? undefined : a.color,
        }));

    const mappedHighlights = coreAnnotations
        .filter((a): a is Extract<typeof a, { type: 'highlight' }> => a.type === 'highlight')
        .map((a) => ({
            id: String(a.id),
            x: toCoords(a.square)!.x,
            y: toCoords(a.square)!.y,
            color: a.color,
        }));

    const lastMoveVisual = controller.getLastMove();
    const effects = controller.getActiveEffects();

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="w-full h-full flex items-center justify-center" style={{ containerType: 'size' }}>
            <style>{`
                .instant-snap .board-piece {
                    transition: none !important;
                }
            `}</style>
            <div
                className="board-square contain-layout relative"
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={handleBoardMouseDown}
                ref={boardContainerRef}
            >
                <div
                    className="inset-0 absolute bg-cover bg-center select-none rounded-sm overflow-hidden"
                    style={{ backgroundImage: `url(${theme.board.backgroundImage})` }}
                    ref={chessboardRef}
                >
                    <BoardHighlights
                        selectedSquare={toCoords(selectedSquareAlg)}
                        lastMove={
                            lastMoveVisual
                                ? {
                                    from: toCoords(lastMoveVisual.from)!,
                                    to: toCoords(lastMoveVisual.to)!,
                                }
                                : null
                        }
                        validDestinations={validDestinations}
                        hoverSquare={toCoords(hoverSquareForHighlight)}
                        premoves={premoves}
                        flipped={flipped}
                    />

                    <BoardAnnotations
                        arrows={mappedArrows}
                        highlights={mappedHighlights}
                        flipped={flipped}
                    />

                    <BoardEffects effects={effects} flipped={flipped} />

                    {/* Promotion Dialog */}
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
                                            src={theme.pieces[pieceType as keyof typeof theme.pieces][pendingPromotion.color]}
                                            alt={pieceType}
                                            className="w-[85%] h-[85%] object-contain drop-shadow-md"
                                        />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Interaction Grid - Memoized, only re-renders on flip change */}
                    <InteractionGrid
                        flipped={flipped}
                        onSquareClick={safeHandleSquareClick}
                    />

                    {/* Pieces Layer */}
                    {stablePieces.map((piece) => {
                        const coords = toCoords(piece.square);
                        if (!coords) return null;
                        const renderRow = flipped ? 7 - coords.y : coords.y;
                        const renderCol = flipped ? 7 - coords.x : coords.x;

                        return (
                            <div
                                key={piece.id}
                                className="board-piece absolute w-[12.5%] h-[12.5%] flex items-center justify-center cursor-pointer pointer-events-auto z-20"
                                style={{
                                    top: `${renderRow * 12.5}%`,
                                    left: `${renderCol * 12.5}%`,
                                    transition: 'top 0.2s ease-in-out, left 0.2s ease-in-out',
                                    touchAction: 'none',
                                }}
                                onMouseDown={(e) => {
                                    if (e.button === 0) {
                                        safeHandleSquareClick(piece.square);
                                        const isHint = storeValidDests.includes(piece.square);
                                        if (!isHint) grabPiece(e, piece.square);
                                    }
                                }}
                                onTouchStart={(e) => {
                                    safeHandleSquareClick(piece.square);
                                    const isHint = storeValidDests.includes(piece.square);
                                    if (!isHint) grabPiece(e, piece.square);
                                }}
                            >
                                <img
                                    src={theme.pieces[piece.type][piece.color]}
                                    alt={piece.type}
                                    className="w-full h-full object-contain pointer-events-none relative"
                                    data-square={piece.square}
                                />
                            </div>
                        );
                    })}
                </div>
                <Coordinates
                    className="pointer-events-none z-30 relative"
                    light={coordinateColors.light}
                    dark={coordinateColors.dark}
                    flipped={flipped}
                />
            </div>
        </div>
    );
}

// ─── Memoized Interaction Grid ───────────────────────────────────────────────
// This generates the 64 invisible click/touch targets.
// Memoized so it only re-renders when flip changes, NOT on every board update.

const SQUARES_64 = (() => {
    const squares: { algebraic: string; row: number; col: number }[] = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const file = String.fromCharCode('a'.charCodeAt(0) + col);
            const rank = String(8 - row);
            squares.push({ algebraic: `${file}${rank}`, row, col });
        }
    }
    return squares;
})();

const InteractionGrid = memo(function InteractionGrid({
    flipped,
    onSquareClick,
}: {
    flipped: boolean;
    onSquareClick: (algebraic: string) => void;
}) {
    return (
        <>
            {SQUARES_64.map(({ algebraic, row, col }) => {
                const renderRow = flipped ? 7 - row : row;
                const renderCol = flipped ? 7 - col : col;
                return (
                    <div
                        key={`sq-int-${algebraic}`}
                        className="absolute w-[12.5%] h-[12.5%] flex items-center justify-center cursor-pointer pointer-events-auto z-10"
                        style={{
                            top: `${renderRow * 12.5}%`,
                            left: `${renderCol * 12.5}%`,
                            touchAction: 'none',
                        }}
                        onMouseDown={(e) => {
                            if (e.button === 0) onSquareClick(algebraic);
                        }}
                        onTouchStart={() => onSquareClick(algebraic)}
                    />
                );
            })}
        </>
    );
});
