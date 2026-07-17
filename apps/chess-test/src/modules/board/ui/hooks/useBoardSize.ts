import { useState, useEffect } from 'react';

/**
 * Shared hook for observing board container size.
 * Returns a size rounded to a multiple of 8 for pixel-perfect squares.
 * Previously duplicated in OnlineMatch and ComputerMatch.
 */
export function useBoardSize(containerRef: React.RefObject<HTMLElement | null>, enabled: boolean = true) {
    const [boardSize, setBoardSize] = useState<number | null>(null);

    useEffect(() => {
        if (!enabled || !containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                const minDimension = Math.min(width, height);
                const roundedSize = Math.floor(minDimension / 8) * 8;
                setBoardSize(roundedSize);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [enabled, containerRef]);

    return boardSize;
}
