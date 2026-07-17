import { useEffect, useRef, useState, useMemo } from 'react';
import { Crown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBotMatch, type IEngineAdapter } from '@/hooks/use-bot-match';

import { BotLobbyPanel } from './components/bot-lobby-panel';
import { LobbyBoard } from '../online/components/lobby-board';

// New modular imports
import { Board } from '@/modules/board/ui/components/Board';
import { PlayerInfoBar } from '@/modules/board/ui/components/PlayerInfoBar';
import { GameHistoryPanel } from '@/modules/board/ui/components/GameHistoryPanel';
import { PGNButtonsNavigate as PGNNavigation } from '@/modules/board/ui/components/PGNNavigation';
import { useBotBoardController } from '@/modules/game/computer/hooks/useBotBoardController';
import { useBoardSize } from '@/modules/board/ui/hooks/useBoardSize';
import { useChessAudio } from '@/modules/board/ui/hooks/useChessAudio';
import { computeMaterialAdvantage } from '@/modules/board/core/usecases/ComputeMaterial.usecase';

import type { Player, BotConfig } from '@/types/game';
import { io, Socket } from 'socket.io-client';
import { StockfishAdapter, EventBus, type EvaluationData } from '@chess-fw/core';
import { toast } from 'sonner';

export default function ComputerMatch() {
    const {
        app,
        boardSnapshot,
        status,
        playerColor,
        serverTurn,
        timeControl,
        localWhiteTime,
        localBlackTime,
        botPlayer,
        startGame,
        endGame,
    } = useBotMatch();

    const mainRef = useRef<HTMLDivElement>(null);

    // FIX: Socket scoped to component lifecycle, not module
    const botSocketRef = useRef<Socket | null>(null);
    if (!botSocketRef.current) {
        botSocketRef.current = io(import.meta.env.VITE_WS_URL);
    }

    // FIX: Stockfish adapter scoped to component
    const localAdapterRef = useRef<StockfishAdapter | null>(null);

    // Cleanup socket and stockfish on unmount
    useEffect(() => {
        return () => {
            botSocketRef.current?.close();
            botSocketRef.current = null;
            localAdapterRef.current?.destroy?.();
            localAdapterRef.current = null;
        };
    }, []);

    // Socket engine adapter (memoized, stable reference)
    const socketEngineAdapter = useMemo<IEngineAdapter>(() => ({
        evaluate: async (fen: string, options?: BotConfig['engineOptions']): Promise<EvaluationData> => {
            return new Promise((resolve, reject) => {
                botSocketRef.current?.emit('evaluate_bot_move', { fen, options }, (response: any) => {
                    if (response.success) {
                        resolve(response.evaluation);
                    } else {
                        reject(new Error(response.error));
                    }
                });
            });
        }
    }), []);

    // New: BoardController bridge
    const isGameOver = status === 'game_over';
    const controller = useBotBoardController({
        app,
        playerColor,
        isGameOver,
        whiteTime: localWhiteTime,
        blackTime: localBlackTime,
    });

    // New: shared hooks replace duplicated code
    const boardSize = useBoardSize(mainRef, status === 'playing' || status === 'game_over');
    useChessAudio(controller, status !== 'lobby');

    type HintState = {
        fen: string;
        from: string;
        to: string;
        step: 1 | 2;
    } | null;
    const [hintState, setHintState] = useState<HintState>(null);
    const [currentAdapter, setCurrentAdapter] = useState<IEngineAdapter>(socketEngineAdapter);

    const hintColor = 'rgba(82, 176, 220, 0.8)';

    useEffect(() => {
        if (hintState && hintState.fen !== app.engine.getFen()) {
            setHintState(null);
            app.annotations.clearAll();
        }
    }, [boardSnapshot, hintState, app]);

    if (status === 'lobby') {
        return (
            <div className="min-h-screen w-full bg-background">
                <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 md:py-10">
                    <header className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-chess/15 text-chess">
                            <Crown className="size-6" />
                        </span>
                        <div className="leading-tight">
                            <h1 className="text-xl font-extrabold tracking-tight text-balance">Jugar contra Ordenador</h1>
                            <p className="text-sm text-muted-foreground">Desafía a nuestros bots de ajedrez</p>
                        </div>
                    </header>
                    <main className="grid flex-1 items-center gap-6 md:grid-cols-[minmax(0,1fr)_380px] lg:grid-cols-[minmax(0,1fr)_400px]">
                        <div className="hidden justify-center md:flex">
                            <div className="w-full max-w-[540px]">
                                <LobbyBoard />
                            </div>
                        </div>
                        <BotLobbyPanel socket={botSocketRef.current!} onPlay={async (color, bot, tc, mode) => {
                            let adapterToUse = socketEngineAdapter;
                            if (mode === 'local') {
                                try {
                                    if (!localAdapterRef.current) {
                                        localAdapterRef.current = new StockfishAdapter(new EventBus());
                                        await localAdapterRef.current.init({ workerPath: '/stockfish.js', defaultDepth: 15 });
                                    }
                                    adapterToUse = {
                                        evaluate: async (fen: string, options?: BotConfig['engineOptions']) => {
                                            if (options?.skillLevel !== undefined) {
                                                localAdapterRef.current!.setOption('Skill Level', options.skillLevel);
                                            }
                                            return localAdapterRef.current!.evaluate(fen, options?.depth);
                                        }
                                    };
                                } catch (error) {
                                    toast.error("Error cargando Stockfish local. Usando servidor.");
                                }
                            }
                            setCurrentAdapter(adapterToUse);
                            startGame(color, bot, adapterToUse, tc);
                        }} />
                    </main>
                </div>
            </div>
        );
    }

    // --- FASE 2: PLAYING (Mismo layout de la partida online) ---

    const material = computeMaterialAdvantage(controller.getBoardGrid());

    const localPlayerProfile: Player = {
        playerId: 'local-human',
        name: localStorage.getItem('chess_player_name') || 'Tú',
        avatar: localStorage.getItem('chess_player_avatar') || '/assets/images/players/player-1.webp',
        connected: true
    };

    const opponent = botPlayer!;
    const local = localPlayerProfile;

    const localColor = playerColor;
    const opponentColor = playerColor === 'w' ? 'b' : 'w';

    const getBestMove = async () => {
        if (status === 'game_over') return;
        const currentFen = app.engine.getFen();

        if (hintState && hintState.fen === currentFen) {
            if (hintState.step === 1) {
                app.annotations.addArrow(hintState.from, hintState.to);
                setHintState({ ...hintState, step: 2 });
            }
            return;
        }

        setHintState(null);
        app.annotations.clearAll();
        
        try {
            const evaluation = await currentAdapter.evaluate(currentFen, { skillLevel: 20, depth: 15 });
            if (evaluation.bestMove) {
                const from = evaluation.bestMove.substring(0, 2);
                const to = evaluation.bestMove.substring(2, 4);
                
                app.annotations.addHighlight(from, hintColor);
                setHintState({ fen: currentFen, from, to, step: 1 });
            }
        } catch (error) {
            console.error("Failed to fetch hint:", error);
        }
    };

    const restoreMove = () => {
        if (status === 'game_over') return;
        if (!app.engine.canUndo()) return;
        
        const currentTurn = app.engine.getTurn();
        const movesToUndo = currentTurn === playerColor ? 2 : 1;
        
        for (let i = 0; i < movesToUndo; i++) {
            if (app.engine.canUndo()) {
                app.engine.undo();
            }
        }
        
        const currentNode = app.engine.getGameTree().getCurrentNode();
        currentNode.children.splice(0, currentNode.children.length);
        
        app.annotations.clearAll();
        app.interaction.clearSelection();
        setHintState(null);
    };

    const handleRematch = () => {
        const newColor = playerColor === 'w' ? 'b' : 'w';
        startGame(newColor, botPlayer!, currentAdapter, timeControl);
    };

    const gameEmbed = status === 'game_over' ? (
        <div className="flex flex-col gap-2 w-full pt-1 pb-2">
            <div className="flex items-center justify-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-primary">¡Partida Terminada!</h3>
            </div>
            <Button className="w-full font-bold shadow-sm" onClick={handleRematch}>
                Jugar Revancha
            </Button>
            <Button variant="outline" className="w-full shadow-sm" onClick={endGame}>
                Seleccionar otro Bot
            </Button>
        </div>
    ) : (
        <div className="flex w-full pt-1 pb-2">
            <Button variant="destructive" className="w-full shadow-sm gap-2" onClick={endGame}>
                <LogOut className="w-4 h-4" />
                Salir
            </Button>
        </div>
    );

    return (
        <div className='flex bg-muted'>
            <div className="h-screen w-screen flex flex-col overflow-hidden">
                {/* Mobile History (Horizontal) */}
                <GameHistoryPanel controller={controller} variant="mobile" onBestMove={getBestMove} onRestoreMove={restoreMove} embed={gameEmbed} />

                {/* Oponente (Header) */}
                <header
                    className="shrink-0 lg:px-0 px-2 py-3 flex items-center justify-center w-full mx-auto transition-all"
                    style={{ maxWidth: boardSize ? `${boardSize}px` : '100%' }}
                >
                    <PlayerInfoBar
                        player={opponent}
                        color={opponentColor}
                        isTurn={serverTurn === opponentColor}
                        timeRemaining={opponentColor === 'w' ? localWhiteTime : localBlackTime}
                        material={opponentColor === 'w' ? material.w : material.b}
                        timeControl={timeControl}
                    />
                </header>

                {/* Tablero (Centro) — NEW: uses agnostic Board + controller */}
                <main className="flex-1 min-h-0 w-full relative" ref={mainRef}>
                    <Board controller={controller} />
                </main>

                {/* Local Player (Footer) */}
                <footer
                    className="shrink-0 lg:px-0 px-2 py-3 flex items-center justify-center w-full mx-auto transition-all"
                    style={{ maxWidth: boardSize ? `${boardSize}px` : '100%' }}
                >
                    <PlayerInfoBar
                        player={local}
                        color={localColor}
                        isTurn={serverTurn === localColor}
                        timeRemaining={localColor === 'w' ? localWhiteTime : localBlackTime}
                        material={localColor === 'w' ? material.w : material.b}
                        timeControl={timeControl}
                    />
                </footer>
                <PGNNavigation controller={controller} onBestMove={getBestMove} onRestoreMove={restoreMove} />
            </div>
            {/* Desktop History Sidebar */}
            <GameHistoryPanel controller={controller} variant="desktop" onBestMove={getBestMove} onRestoreMove={restoreMove} embed={gameEmbed} />
        </div>
    );
}
