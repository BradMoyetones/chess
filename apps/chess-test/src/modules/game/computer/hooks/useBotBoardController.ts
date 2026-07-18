import { useRef } from 'react';
import { BotBoardController } from '@/modules/game/computer/adapters/BotBoardController';
import type { ChessApp, Color } from '@chess-fw/core';

interface UseBotBoardControllerParams {
    app: ChessApp;
    playerColor: Color;
    isGameOver: boolean;
    whiteTime?: number | null;
    blackTime?: number | null;
}

/**
 * Bridge hook that creates and maintains a BotBoardController instance.
 */
export function useBotBoardController({
    app,
    playerColor,
    isGameOver,
    whiteTime,
    blackTime,
}: UseBotBoardControllerParams) {
    const controllerRef = useRef<BotBoardController | null>(null);

    if (!controllerRef.current) {
        controllerRef.current = new BotBoardController({
            app,
            playerColor,
            isGameOver,
            whiteTime,
            blackTime,
        });
    }

    controllerRef.current.update({
        playerColor,
        isGameOver,
        whiteTime,
        blackTime,
    });

    return controllerRef.current;
}
