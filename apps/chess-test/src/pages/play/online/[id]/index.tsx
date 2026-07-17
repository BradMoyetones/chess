import { useParams, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useOnlineMatch } from '@/hooks/use-online-match';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useEffect, useRef } from 'react';

// New modular imports
import { Board } from '@/modules/board/ui/components/Board';
import { GameHistoryPanel } from '@/modules/board/ui/components/GameHistoryPanel';
import { PGNButtonsNavigate as PGNNavigation } from '@/modules/board/ui/components/PGNNavigation';
import { PlayerInfoBar } from '@/modules/board/ui/components/PlayerInfoBar';
import { useOnlineBoardController } from '@/modules/game/online/hooks/useOnlineBoardController';
import { useBoardSize } from '@/modules/board/ui/hooks/useBoardSize';
import { useChessAudio } from '@/modules/board/ui/hooks/useChessAudio';
import { computeMaterialAdvantage } from '@/modules/board/core/usecases/ComputeMaterial.usecase';

export default function OnlineMatch() {
    const { id: urlRoomId } = useParams();
    const {
        app,
        status,
        roomId,
        playerColor,
        serverPlayers,
        serverTurn,
        timeControl,
        localWhiteTime,
        localBlackTime,
        playerId,
        emitMove,
        error,
    } = useOnlineMatch(urlRoomId);

    const navigate = useNavigate();
    const mainRef = useRef<HTMLDivElement>(null);

    // New: BoardController bridge
    const isGameOver = app.engine.isGameOver() || (localWhiteTime !== null && localWhiteTime <= 0) || (localBlackTime !== null && localBlackTime <= 0);
    const controller = useOnlineBoardController({
        app,
        playerColor,
        isGameOver,
        emitMove,
        whiteTime: localWhiteTime,
        blackTime: localBlackTime,
    });

    // New: shared hooks replace duplicated code
    const boardSize = useBoardSize(mainRef, status === 'playing');
    useChessAudio(controller, status === 'playing');

    useEffect(() => {
        if (error) {
            toast.error(error.message);
            navigate('/play/online');
        }
    }, [error, navigate]);

    if (status === 'lobby') {
        return <div className="h-screen flex items-center justify-center p-4"><Spinner /></div>;
    }

    if (status === 'waiting') {
        return (
            <div className="h-screen flex items-center justify-center p-4 bg-muted/20">
                <Card className="w-full max-w-sm text-center border-primary/20 shadow-lg">
                    <CardHeader><CardTitle>Sala Creada</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-center gap-6 pb-6">
                        <Spinner className="size-8" />
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-sm text-muted-foreground">Comparte este código con tu oponente:</p>
                            <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-md font-mono text-xl border shadow-inner">
                                <span>{roomId}</span>
                                <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(roomId)} className="h-8 w-8 ml-2"><Copy className="h-4 w-4" /></Button>
                            </div>
                        </div>
                        <p className="text-sm animate-pulse text-primary/80">Esperando a que se una...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Material advantage from centralized usecase
    const material = computeMaterialAdvantage(controller.getBoardGrid());
    const localIsHost = serverPlayers?.host?.playerId === playerId;

    const opponent = (localIsHost ? serverPlayers?.guest : serverPlayers?.host) ?? null;
    const local = (localIsHost ? serverPlayers?.host : serverPlayers?.guest) ?? null;

    const localColor = playerColor;
    const opponentColor = playerColor === 'w' ? 'b' : 'w';

    return (
        <div className='flex bg-muted'>
            <div className="h-screen w-screen flex flex-col overflow-hidden">
                {/* Mobile History (Horizontal) */}
                <GameHistoryPanel controller={controller} variant="mobile" />

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
                <PGNNavigation controller={controller} />
            </div>
            {/* Desktop History Sidebar */}
            <GameHistoryPanel controller={controller} variant="desktop" />
        </div>
    );
}
