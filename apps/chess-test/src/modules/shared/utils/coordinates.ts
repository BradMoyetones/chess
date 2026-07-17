import type { SquareCoord } from '@/modules/board/core/ports/BoardController.port';

/**
 * Converts algebraic notation (e.g., 'e4') to board coordinates { x, y }.
 * x = file (0=a, 7=h), y = rank inverted (0=rank8, 7=rank1)
 */
export function toCoords(algebraic: string | null): SquareCoord | null {
    if (!algebraic) return null;
    const x = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
    const y = 8 - parseInt(algebraic[1]);
    return { x, y };
}

/**
 * Converts board coordinates back to algebraic notation.
 */
export function toAlgebraic(x: number, y: number): string {
    const file = String.fromCharCode('a'.charCodeAt(0) + x);
    const rank = String(8 - y);
    return `${file}${rank}`;
}

/**
 * Flips coordinates based on board orientation.
 * When flipped (playing as black), coordinates are mirrored.
 */
export function flipCoord(coord: SquareCoord, flipped: boolean): SquareCoord {
    if (!flipped) return coord;
    return { x: 7 - coord.x, y: 7 - coord.y };
}

/**
 * Computes the algebraic square from pixel coordinates within a board element.
 * Accounts for board orientation (flip).
 */
export function pixelToSquare(
    clientX: number,
    clientY: number,
    boardRect: DOMRect,
    flipped: boolean,
): string | null {
    const pieceSize = boardRect.width / 8;
    const rawX = Math.floor((clientX - boardRect.left) / pieceSize);
    const rawY = Math.floor((clientY - boardRect.top) / pieceSize);
    const x = flipped ? 7 - rawX : rawX;
    const y = flipped ? 7 - rawY : rawY;

    if (x < 0 || x > 7 || y < 0 || y > 7) return null;

    return toAlgebraic(x, y);
}

/**
 * Computes raw column/row indices from pixel coordinates (before flip).
 * Useful for promotion dialog positioning.
 */
export function pixelToRawIndices(
    clientX: number,
    clientY: number,
    boardRect: DOMRect,
): { rawX: number; rawY: number } {
    const pieceSize = boardRect.width / 8;
    return {
        rawX: Math.floor((clientX - boardRect.left) / pieceSize),
        rawY: Math.floor((clientY - boardRect.top) / pieceSize),
    };
}
