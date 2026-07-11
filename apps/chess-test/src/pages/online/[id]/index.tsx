import { useParams } from 'react-router';
import { useOnlineMatch } from '@/hooks/use-online-match';
import { GameBoard } from './components/game-board';
import { PlayerInfoBar } from './components/player-info-bar';
import { GameHistoryPanel } from './components/game-history-panel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

export default function OnlineMatch() {
    const { id: urlRoomId } = useParams();
    const {
        app,
        boardSnapshot,
        setBoardSnapshot,
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
        getMaterialAdvantage,
    } = useOnlineMatch(urlRoomId);

    const [boardSize, setBoardSize] = useState<number | null>(null);
    const mainRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mainRef.current) return;
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
    }, [status]); // Only observe when playing

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

    const { w: materialW, b: materialB } = getMaterialAdvantage();
    const localIsHost = serverPlayers?.host?.playerId === playerId;

    const opponent = localIsHost ? serverPlayers?.guest : serverPlayers?.host;
    const local = localIsHost ? serverPlayers?.host : serverPlayers?.guest;

    const localColor = playerColor;
    const opponentColor = playerColor === 'w' ? 'b' : 'w';

    return (
        <div className='flex bg-muted'>
            <div className="h-screen w-screen flex flex-col overflow-hidden">
                {/* Mobile History (Horizontal) */}
                <GameHistoryPanel app={app} setBoardSnapshot={setBoardSnapshot} variant="mobile" />

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
            </div>
            {/* Desktop History Sidebar */}
            <GameHistoryPanel app={app} setBoardSnapshot={setBoardSnapshot} variant="desktop" />
        </div>
    );
}
