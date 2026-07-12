import { memo } from 'react';
import { motion } from 'motion/react';
import type { PieceSymbol } from 'chess.js';
import Coordinates from '@/components/coordinates';
import { theme, coordinateColors } from '@/lib/theme';
import { cn } from '@/lib/utils';

type Piece = { type: PieceSymbol; color: 'w' | 'b' } | null;

// Starting position, rank 8 (top) down to rank 1 (bottom).
const START_ROWS: Piece[][] = (() => {
    const back = (color: 'w' | 'b'): Piece[] =>
        (['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'] as PieceSymbol[]).map((type) => ({ type, color }));
    const pawns = (color: 'w' | 'b'): Piece[] =>
        Array.from({ length: 8 }, () => ({ type: 'p' as PieceSymbol, color }));
    const empty = (): Piece[] => Array.from({ length: 8 }, () => null);

    return [back('b'), pawns('b'), empty(), empty(), empty(), empty(), pawns('w'), back('w')];
})();

// Flattened once so pieces get stable keys and a subtle staggered entrance.
const START_PIECES = START_ROWS.flatMap((row, rowIndex) =>
    row.map((piece, colIndex) =>
        piece ? { piece, rowIndex, colIndex, key: `${rowIndex}-${colIndex}` } : null
    )
).filter((v): v is NonNullable<typeof v> => v !== null);

interface LobbyBoardProps {
    className?: string;
}

function LobbyBoardComponent({ className }: LobbyBoardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={cn('relative aspect-square w-full select-none overflow-hidden rounded-xl shadow-2xl ring-1 ring-border', className)}
        >
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${theme.board.backgroundImage})` }}
                aria-hidden="true"
            />

            <Coordinates
                className="pointer-events-none absolute inset-0 z-10 [&>svg]:h-full [&>svg]:w-full"
                light={coordinateColors.light}
                dark={coordinateColors.dark}
            />

            {START_PIECES.map(({ piece, rowIndex, colIndex, key }, i) => (
                <motion.img
                    key={key}
                    src={theme.pieces[piece.type][piece.color]}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    initial={{ opacity: 0, y: piece.color === 'b' ? -8 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.15 + i * 0.01, ease: 'easeOut' }}
                    className="absolute z-20 object-contain drop-shadow-md"
                    style={{
                        width: '12.5%',
                        height: '12.5%',
                        top: `${rowIndex * 12.5}%`,
                        left: `${colIndex * 12.5}%`,
                    }}
                />
            ))}
        </motion.div>
    );
}

export const LobbyBoard = memo(LobbyBoardComponent);
