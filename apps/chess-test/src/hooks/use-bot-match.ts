import { useState, useEffect, useCallback, useRef } from 'react';
import { useCoreGame } from './use-core-game';
import type { BotConfig, TimeControl } from '@/types/game';
import type { PieceSymbol } from 'chess.js';
import type { EvaluationData } from '@chess-fw/core';

export interface IEngineAdapter {
    evaluate: (fen: string, options?: BotConfig['engineOptions']) => Promise<EvaluationData>;
}

export function useBotMatch() {
    const { app, boardSnapshot, setBoardSnapshot, getMaterialAdvantage } = useCoreGame();

    const [status, setStatus] = useState<'lobby' | 'playing' | 'game_over'>('lobby');
    const [serverTurn, setServerTurn] = useState<'w' | 'b'>('w');
    const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
    const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
    const [engineAdapter, setEngineAdapter] = useState<IEngineAdapter | null>(null);
    const [timeControl, setTimeControl] = useState<TimeControl | null>(null);
    
    // Simplistic local timers for both sides
    const [localWhiteTime, setLocalWhiteTime] = useState<number | null>(null);
    const [localBlackTime, setLocalBlackTime] = useState<number | null>(null);

    const [isBotThinking, setIsBotThinking] = useState(false);
    const isBotThinkingRef = useRef(false);

    // Initializer
    const startGame = (color: 'w' | 'b' | 'random', selectedBot: BotConfig, adapter: IEngineAdapter, tc: TimeControl | null) => {
        const finalColor = color === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : color;
        setPlayerColor(finalColor);
        setBotConfig(selectedBot);
        setEngineAdapter(adapter);
        setTimeControl(tc);

        if (tc) {
            setLocalWhiteTime(tc.initial * 1000);
            setLocalBlackTime(tc.initial * 1000);
        } else {
            setLocalWhiteTime(null);
            setLocalBlackTime(null);
        }

        app.engine.resetGame();
        app.interaction.clearPremoves();
        app.annotations.clearAll();
        setBoardSnapshot(app.getSnapshot());
        setServerTurn(app.engine.getTurn());
        setStatus('playing');
    };

    const endGame = () => {
        setStatus('lobby');
        setBotConfig(null);
        setEngineAdapter(null);
    };

    const emitMove = useCallback((_moveData: any) => {
        // dummy function for the UI component (GameBoard)
        // the GameBoard calls this when user makes a move
        const mainLine = app.engine.getGameTree().getMainLine();
        const lastNode = mainLine[mainLine.length - 1];
        setServerTurn(lastNode.fen.split(' ')[1] as 'w' | 'b');
    }, [app]);

    useEffect(() => {
        if (status !== 'playing' || !timeControl) return;

        let lastTick = Date.now();
        const intervalId = setInterval(() => {
            const now = Date.now();
            const delta = now - lastTick;
            lastTick = now;

            if (app.engine.isGameOver() && !app.engine.canRedo()) {
                setStatus('game_over');
                return;
            }

            const mainLine = app.engine.getGameTree().getMainLine();
            const lastNode = mainLine[mainLine.length - 1];
            const realTurn = lastNode.fen.split(' ')[1] as 'w' | 'b';

            if (realTurn === 'w') {
                setLocalWhiteTime(prev => {
                    if (prev === null) return null;
                    const next = prev - delta;
                    if (next <= 0) {
                        setStatus('game_over');
                        return 0;
                    }
                    return next;
                });
            } else {
                setLocalBlackTime(prev => {
                    if (prev === null) return null;
                    const next = prev - delta;
                    if (next <= 0) {
                        setStatus('game_over');
                        return 0;
                    }
                    return next;
                });
            }
        }, 100);

        return () => clearInterval(intervalId);
    }, [status, timeControl, app]);

    useEffect(() => {
        if (status !== 'playing' || !botConfig || !engineAdapter) return;

        let active = true;

        const checkBotTurn = async () => {
            const mainLine = app.engine.getGameTree().getMainLine();
            const lastNode = mainLine[mainLine.length - 1];
            const realTurn = lastNode.fen.split(' ')[1] as 'w' | 'b';
            
            setServerTurn(realTurn);

            if (realTurn !== playerColor && !app.engine.isGameOver() && !isBotThinkingRef.current && !app.engine.canRedo()) {
                isBotThinkingRef.current = true;
                setIsBotThinking(true);
                
                let moveData: { from: string, to: string, promotion?: PieceSymbol } | null = null;

                try {
                    const delay = botConfig.engineOptions.thinkTimeBaseMs || 500;
                    // Add slight random variation
                    const randomizedDelay = delay + Math.random() * 500;
                    await new Promise((res) => setTimeout(res, randomizedDelay));

                    if (!active) return;

                    const evaluation = await engineAdapter.evaluate(app.engine.getFen(), botConfig.engineOptions);
                    
                    if (!active) return;

                    if (evaluation.bestMove) {
                        moveData = {
                            from: evaluation.bestMove.substring(0, 2),
                            to: evaluation.bestMove.substring(2, 4),
                            promotion: evaluation.bestMove.length > 4 ? evaluation.bestMove[4] as PieceSymbol : undefined
                        };
                    }
                } catch (error) {
                    console.error("Error getting bot move:", error);
                } finally {
                    isBotThinkingRef.current = false;
                    if (active) setIsBotThinking(false);
                }

                if (moveData && active) {
                    if (app.engine.canRedo()) {
                        app.engine.goToEnd();
                    }
                    const result = app.engine.attemptMove(moveData.from, moveData.to, moveData.promotion);
                    if (result && result.success) {
                        app.interaction.clearSelection();
                        setBoardSnapshot(app.getSnapshot());
                        
                        const updatedMainLine = app.engine.getGameTree().getMainLine();
                        const updatedLastNode = updatedMainLine[updatedMainLine.length - 1];
                        setServerTurn(updatedLastNode.fen.split(' ')[1] as 'w' | 'b');
                    }
                }
            }
        };

        const handleUpdate = () => {
            setBoardSnapshot(app.getSnapshot());
            if (app.engine.isGameOver() && !app.engine.canRedo()) {
                setStatus('game_over');
            } else {
                checkBotTurn();
            }
        };

        const unsubs = [
            app.events.on('BOARD_UPDATED', handleUpdate),
        ];

        // Trigger initially in case bot is white
        checkBotTurn();

        return () => {
            active = false;
            unsubs.forEach(unsub => unsub());
        };
    }, [app, playerColor, botConfig, engineAdapter, status]);

    return {
        app,
        boardSnapshot,
        setBoardSnapshot,
        status,
        playerColor,
        serverTurn,
        timeControl,
        localWhiteTime,
        localBlackTime,
        getMaterialAdvantage,
        botPlayer: botConfig,
        startGame,
        endGame,
        emitMove,

        isBotThinking
    };
}
