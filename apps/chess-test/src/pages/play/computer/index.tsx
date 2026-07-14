import { useEffect, useRef, useState } from 'react';
import { Crown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBotMatch, type IEngineAdapter } from '@/hooks/use-bot-match';

import { BotLobbyPanel } from './components/bot-lobby-panel';
import { LobbyBoard } from '../online/components/lobby-board';

// Componentes agnósticos del online/[id]
import { GameBoard } from '../online/[id]/components/game-board';
import { PlayerInfoBar } from '../online/[id]/components/player-info-bar';
import { GameHistoryPanel } from '../online/[id]/components/game-history-panel';
import PGNButtonsNavigate from '../online/[id]/components/pgn-buttons-navigate';
import { useChessAudio } from '@/hooks/use-chess-audio';
import type { Player, BotConfig } from '@/types/game';
import { io } from 'socket.io-client';
import { StockfishAdapter, EventBus, type EvaluationData } from '@chess-fw/core';
import { toast } from 'sonner';

let localAdapterInstance: StockfishAdapter | null = null;

const botSocket = io(import.meta.env.VITE_WS_URL);

// Adaptador real que se comunica con el servidor vía WebSockets
const socketEngineAdapter: IEngineAdapter = {
    evaluate: async (fen: string, options?: BotConfig['engineOptions']): Promise<EvaluationData> => {
        return new Promise((resolve, reject) => {
            botSocket.emit('evaluate_bot_move', { fen, options }, (response: any) => {
                if (response.success) {
                    resolve(response.evaluation);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }
};

export default function ComputerMatch() {
    const {
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
        botPlayer,
        startGame,
        endGame,
        emitMove
    } = useBotMatch();

    const { playSound } = useChessAudio();
    const lastNodeId = useRef<string | null>(null);

    const [boardSize, setBoardSize] = useState<number | null>(null);
    const mainRef = useRef<HTMLDivElement>(null);

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
        if (status !== 'playing' || !mainRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                const minDimension = Math.min(width, height);
                const roundedSize = Math.floor(minDimension / 8) * 8;
                setBoardSize(roundedSize);
            }
        });
        observer.observe(mainRef.current);
        return () => observer.disconnect();
    }, [status]);

    // Audio Playback Sync
    useEffect(() => {
        if (status === 'lobby') return;
        const currentNode = app.engine.getGameTree().getCurrentNode();
        if (currentNode.id !== lastNodeId.current) {
            lastNodeId.current = currentNode.id;
            const move = currentNode.move;
            if (move && move.san) {
                if (move.san.includes('+') || move.san.includes('#')) {
                    playSound('moveCheck');
                } else if (move.san.includes('x')) {
                    playSound('capture');
                } else if (move.san === 'O-O' || move.san === 'O-O-O') {
                    playSound('castle');
                } else if (move.san.includes('=')) {
                    playSound('promote');
                } else {
                    playSound('moveSelf');
                }
            }
        }
    }, [app, boardSnapshot, playSound, status]);

    useEffect(() => {
        if (hintState && hintState.fen !== app.engine.getFen()) {
            setHintState(null);
            app.annotations.clearAll();
            setBoardSnapshot(app.getSnapshot());
        }
    }, [boardSnapshot, hintState, app, setBoardSnapshot]);

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
                        <BotLobbyPanel socket={botSocket} onPlay={async (color, bot, tc, mode) => {
                            let adapterToUse = socketEngineAdapter;
                            if (mode === 'local') {
                                try {
                                    if (!localAdapterInstance) {
                                        localAdapterInstance = new StockfishAdapter(new EventBus());
                                        await localAdapterInstance.init({ workerPath: '/stockfish.js', defaultDepth: 15 });
                                    }
                                    adapterToUse = {
                                        evaluate: async (fen: string, options?: BotConfig['engineOptions']) => {
                                            if (options?.skillLevel !== undefined) {
                                                localAdapterInstance!.setOption('Skill Level', options.skillLevel);
                                            }
                                            return localAdapterInstance!.evaluate(fen, options?.depth);
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

    const { w: materialW, b: materialB } = getMaterialAdvantage();

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
                setBoardSnapshot(app.getSnapshot());
            }
            return;
        }

        // Fetch new hint
        setHintState(null);
        app.annotations.clearAll();
        
        try {
            // Evaluamos con un nivel alto para asegurar una buena pista
            const evaluation = await currentAdapter.evaluate(currentFen, { skillLevel: 20, depth: 15 });
            if (evaluation.bestMove) {
                const from = evaluation.bestMove.substring(0, 2);
                const to = evaluation.bestMove.substring(2, 4);
                
                app.annotations.addHighlight(from, hintColor);
                setHintState({ fen: currentFen, from, to, step: 1 });
                setBoardSnapshot(app.getSnapshot());
            }
        } catch (error) {
            console.error("Failed to fetch hint:", error);
        }
    };



    const restoreMove = () => {
        if (status === 'game_over') return;
        if (!app.engine.canUndo()) return;
        
        const currentTurn = app.engine.getTurn();
        // Si nos toca a nosotros, deshacemos 2 (la nuestra y la del bot)
        // Si le toca al bot (ej. está pensando), deshacemos 1 (la nuestra)
        const movesToUndo = currentTurn === playerColor ? 2 : 1;
        
        for (let i = 0; i < movesToUndo; i++) {
            if (app.engine.canUndo()) {
                app.engine.undo();
            }
        }
        
        // Truncar el árbol para que no se pueda "rehacer" (borramos el futuro)
        const currentNode = app.engine.getGameTree().getCurrentNode();
        currentNode.children.splice(0, currentNode.children.length);
        
        app.annotations.clearAll();
        app.interaction.clearSelection();
        setHintState(null);
        setBoardSnapshot(app.getSnapshot());
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
                <GameHistoryPanel app={app} setBoardSnapshot={setBoardSnapshot} variant="mobile" onBestMove={getBestMove} onRestoreMove={restoreMove} embed={gameEmbed} />

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
                        material={opponentColor === 'w' ? materialW : materialB}
                        timeControl={timeControl}
                    />
                </header>

                {/* Tablero (Centro) */}
                <main className="flex-1 min-h-0 w-full relative" ref={mainRef}>
                    <GameBoard
                        app={app}
                        boardSnapshot={boardSnapshot}
                        setBoardSnapshot={setBoardSnapshot}
                        playerColor={playerColor}
                        emitMove={emitMove}
                        whiteTime={localWhiteTime}
                        blackTime={localBlackTime}
                        isGameOver={status === 'game_over'}
                    />
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
                        material={localColor === 'w' ? materialW : materialB}
                        timeControl={timeControl}
                    />
                </footer>
                <PGNButtonsNavigate app={app} setBoardSnapshot={setBoardSnapshot} onBestMove={getBestMove} onRestoreMove={restoreMove} />
            </div>
            {/* Desktop History Sidebar */}
            <GameHistoryPanel app={app} setBoardSnapshot={setBoardSnapshot} variant="desktop" onBestMove={getBestMove} onRestoreMove={restoreMove} embed={gameEmbed} />
        </div>
    );
}
