import { useMemo, useRef } from 'react';
import type { PieceSymbol } from 'chess.js';
import type { BoardController } from '@/modules/board/core/ports/BoardController.port';

export interface StablePiece {
    id: string;
    type: PieceSymbol;
    color: 'w' | 'b';
    square: string;
}

/**
 * Hook that reconciles board state changes to produce a stable list of pieces
 * with persistent IDs for smooth CSS transitions.
 * 
 * Extracted from game-board.tsx's inline useChessPieces hook.
 */
export function useChessPieces(controller: BoardController | null): StablePiece[] {
    const piecesMapRef = useRef<Map<string, StablePiece>>(new Map());
    const lastFenRef = useRef<string | null>(null);

    const pieces = useMemo(() => {
        if (!controller) return [];

        const currentFen = controller.getFen();
        if (lastFenRef.current === currentFen) {
            return Array.from(piecesMapRef.current.values()).sort((a, b) =>
                a.id.localeCompare(b.id),
            );
        }
        lastFenRef.current = currentFen;

        const board = controller.getBoardGrid();
        const currentMap = piecesMapRef.current;
        const nextMap = new Map<string, StablePiece>();
        const unassignedNewPieces: { square: string; type: PieceSymbol; color: 'w' | 'b' }[] = [];
        const availableOldPieces = Array.from(currentMap.values());

        // Pass 1: Identify pieces that stayed in place
        board.flat().forEach((sq) => {
            if (sq.piece) {
                const oldPiece = currentMap.get(sq.algebraic);
                if (
                    oldPiece &&
                    oldPiece.type === sq.piece.type &&
                    oldPiece.color === sq.piece.color
                ) {
                    nextMap.set(sq.algebraic, oldPiece);
                    const idx = availableOldPieces.findIndex((p) => p.id === oldPiece.id);
                    if (idx !== -1) availableOldPieces.splice(idx, 1);
                } else {
                    unassignedNewPieces.push({
                        square: sq.algebraic,
                        type: sq.piece.type as PieceSymbol,
                        color: sq.piece.color as 'w' | 'b',
                    });
                }
            }
        });

        // Pass 2: Assign moved/new pieces
        unassignedNewPieces.forEach((newP) => {
            const exactMatchIdx = availableOldPieces.findIndex(
                (p) => p.type === newP.type && p.color === newP.color,
            );

            if (exactMatchIdx !== -1) {
                const matched = availableOldPieces.splice(exactMatchIdx, 1)[0];
                matched.square = newP.square;
                nextMap.set(newP.square, matched);
            } else {
                // Check for promotion (pawn → promoted piece)
                const promotionMatchIdx = availableOldPieces.findIndex(
                    (p) => p.type === 'p' && p.color === newP.color,
                );
                if (promotionMatchIdx !== -1) {
                    const matched = availableOldPieces.splice(promotionMatchIdx, 1)[0];
                    matched.square = newP.square;
                    matched.type = newP.type;
                    nextMap.set(newP.square, matched);
                } else {
                    nextMap.set(newP.square, {
                        id: `${newP.color}${newP.type}-${newP.square}-${Math.random().toString(36).substr(2, 9)}`,
                        type: newP.type,
                        color: newP.color,
                        square: newP.square,
                    });
                }
            }
        });

        piecesMapRef.current = nextMap;
        return Array.from(nextMap.values()).sort((a, b) => a.id.localeCompare(b.id));
    }, [controller?.getFen()]);

    return pieces;
}
