import { useEffect, useRef, useState } from 'react';
import { Crown } from 'lucide-react';
import { useBotMatch, type IEngineAdapter } from '@/hooks/use-bot-match';

import { BotLobbyPanel } from './components/bot-lobby-panel';
import { LobbyBoard } from '../online/components/lobby-board';

// Componentes agnósticos del online/[id]
import { GameBoard } from '../online/[id]/components/game-board';
import { PlayerInfoBar } from '../online/[id]/components/player-info-bar';
import { GameHistoryPanel } from '../online/[id]/components/game-history-panel';
import PGNButtonsNavigate from '../online/[id]/components/pgn-buttons-navigate';
import { useChessAudio } from '@/hooks/use-chess-audio';
import type { Player, EvaluationData, BotConfig } from '@/types/game';
import { io } from 'socket.io-client';

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
        if (status !== 'playing') return;
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
                        <BotLobbyPanel onPlay={(color, bot, tc) => startGame(color, bot, socketEngineAdapter, tc)} />
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
            const evaluation = await socketEngineAdapter.evaluate(currentFen, { skillLevel: 20, depth: 15 });
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
        
    }

    return (
        <div className='flex bg-muted'>
            <div className="h-screen w-screen flex flex-col overflow-hidden">
                {/* Mobile History (Horizontal) */}
                <GameHistoryPanel app={app} setBoardSnapshot={setBoardSnapshot} variant="mobile" onBestMove={getBestMove} onRestoreMove={restoreMove} />

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
                <PGNButtonsNavigate app={app} setBoardSnapshot={setBoardSnapshot} />
            </div>
            {/* Desktop History Sidebar */}
            <GameHistoryPanel app={app} setBoardSnapshot={setBoardSnapshot} variant="desktop" onBestMove={getBestMove} onRestoreMove={restoreMove}   />
        </div>
    );
}
