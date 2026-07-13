import { useState, useEffect, useCallback, useRef } from 'react';
import { useCoreGame } from './use-core-game';
import type { BotConfig, TimeControl, EvaluationData } from '@/types/game';
import type { PieceSymbol } from 'chess.js';

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
        const currentTurn = app.engine.getTurn();
        setServerTurn(currentTurn);
    }, [app]);

    useEffect(() => {
        if (status !== 'playing' || !botConfig || !engineAdapter) return;

        let active = true;

        const checkBotTurn = async () => {
            const currentTurn = app.engine.getTurn();
            setServerTurn(currentTurn);

            if (currentTurn !== playerColor && !app.engine.isGameOver() && !isBotThinkingRef.current) {
                isBotThinkingRef.current = true;
                setIsBotThinking(true);
                
                try {
                    const delay = botConfig.engineOptions.thinkTimeBaseMs || 500;
                    // Add slight random variation
                    const randomizedDelay = delay + Math.random() * 500;
                    await new Promise((res) => setTimeout(res, randomizedDelay));

                    if (!active) return;

                    const evaluation = await engineAdapter.evaluate(app.engine.getFen(), botConfig.engineOptions);
                    
                    if (!active) return;

                    if (evaluation.bestMove) {
                        const from = evaluation.bestMove.substring(0, 2);
                        const to = evaluation.bestMove.substring(2, 4);
                        const promotion = evaluation.bestMove.length > 4 ? evaluation.bestMove[4] : undefined;
                        
                        const result = app.engine.attemptMove(from, to, promotion as PieceSymbol);
                        if (result && result.success) {
                            app.interaction.clearSelection();
                            setBoardSnapshot(app.getSnapshot());
                            setServerTurn(app.engine.getTurn());
                        }
                    }
                } catch (error) {
                    console.error("Error getting bot move:", error);
                } finally {
                    isBotThinkingRef.current = false;
                    if (active) setIsBotThinking(false);
                }
            }
        };

        const handleUpdate = () => {
            setBoardSnapshot(app.getSnapshot());
            checkBotTurn();
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
        emitMove
    };
}
