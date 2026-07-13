import { useState, useEffect, useCallback } from 'react';
import { ChessApp, type BoardSnapshot } from '@chess-fw/core';

export function useCoreGame() {
    const [app] = useState(() => new ChessApp());
    const [boardSnapshot, setBoardSnapshot] = useState<BoardSnapshot | null>(null);

    useEffect(() => {
        setBoardSnapshot(app.getSnapshot());

        const handleUpdate = () => {
            setBoardSnapshot(app.getSnapshot());
        };

        const unsubs = [
            app.events.on('BOARD_UPDATED', handleUpdate),
            app.events.on('PREMOVE_CANCELLED', handleUpdate),
            app.events.on('PREMOVE_QUEUED', handleUpdate),
        ];

        return () => unsubs.forEach((unsub) => unsub());
    }, [app]);

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

    return {
        app,
        boardSnapshot,
        setBoardSnapshot,
        getMaterialAdvantage
    };
}
