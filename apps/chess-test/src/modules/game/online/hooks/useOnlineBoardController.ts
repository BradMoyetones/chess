import { useRef } from 'react';
import { OnlineBoardController } from '@/modules/game/online/adapters/OnlineBoardController';
import type { ChessApp } from '@chess-fw/core';

interface UseOnlineBoardControllerParams {
    app: ChessApp;
    playerColor: 'w' | 'b';
    isGameOver: boolean;
    emitMove: (moveData: any) => void;
    whiteTime?: number | null;
    blackTime?: number | null;
}

/**
 * Bridge hook that creates and maintains an OnlineBoardController instance
 * from the existing useOnlineMatch return values.
 * 
 * This allows gradual migration: the page still uses useOnlineMatch for
 * socket/lobby logic, but passes the BoardController to the new Board component.
 */
export function useOnlineBoardController({
    app,
    playerColor,
    isGameOver,
    emitMove,
    whiteTime,
    blackTime,
}: UseOnlineBoardControllerParams) {
    const controllerRef = useRef<OnlineBoardController | null>(null);

    // Create controller once
    if (!controllerRef.current) {
        controllerRef.current = new OnlineBoardController({
            app,
            playerColor,
            isGameOver,
            onMoveEmit: emitMove,
            whiteTime,
            blackTime,
        });
    }

    // Update mutable state on every render
    controllerRef.current.update({
        isGameOver,
        whiteTime,
        blackTime,
        onMoveEmit: emitMove,
    });

    return controllerRef.current;
}
