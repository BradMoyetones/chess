import { ChessApp } from '@chess-fw/core';
import { Button } from '@/components/ui/button';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Lightbulb, Pause, Play, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';

interface PGNButtonsNavigateProps {
    app: ChessApp;
    setBoardSnapshot: (snapshot: any) => void;
    onRestoreMove?: () => void;
    onBestMove?: () => Promise<void>;
}

export default function PGNButtonsNavigate({
    app,
    setBoardSnapshot,
    onRestoreMove,
    onBestMove,
}: PGNButtonsNavigateProps) {
    const canUndo = app.engine.canUndo();
    const canRedo = app.engine.canRedo();
    const [play, setPlay] = useState(false);
    const [loadingBestMove, setLoadingBestMove] = useState(false);

    useEffect(() => {
        if (play) {
            app.engine.redo();
            setBoardSnapshot(app.getSnapshot());
            const interval = setInterval(() => {
                app.engine.redo();
                setBoardSnapshot(app.getSnapshot());
                if (!app.engine.canRedo()) {
                    setPlay(false);
                }
            }, 600);
            return () => clearInterval(interval);
        }
    }, [play]);

    const handleBestMove = async () => {
        if (onBestMove) {
            setLoadingBestMove(true);
            await onBestMove();
            setLoadingBestMove(false);
        }
    };
    return (
        <div className="lg:hidden border-t p-2 flex flex-col gap-2 bg-background">
            {(onRestoreMove || onBestMove) && (
                <div className="flex w-full gap-2">
                    {onRestoreMove && (
                        <Button variant="outline" size='sm' onClick={onRestoreMove} className="flex-1">
                            <Undo2 />
                        </Button>
                    )}
                    {onBestMove && (
                        <Button
                            variant="outline"
                            size='sm'
                            onClick={handleBestMove}
                            className="flex-1"
                            disabled={loadingBestMove}
                        >
                            {loadingBestMove ? <Spinner /> : <Lightbulb />}
                        </Button>
                    )}
                </div>
            )}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size='sm'
                    disabled={!canUndo}
                    onClick={() => {
                        app.engine.goToStart();
                        setBoardSnapshot(app.getSnapshot());
                    }}
                    className="flex-2"
                >
                    <ChevronFirst />
                </Button>
                <Button
                    variant="outline"
                    size='sm'
                    disabled={!canUndo}
                    onClick={() => {
                        app.engine.undo();
                        setBoardSnapshot(app.getSnapshot());
                    }}
                    className="flex-2"
                >
                    <ChevronLeft />
                </Button>
                <Button
                    variant="outline"
                    size='sm'
                    disabled={!canRedo}
                    onClick={() => {
                        setPlay((prev) => !prev);
                    }}
                    className="flex-1"
                >
                    {play ? <Pause className="fill-current" /> : <Play className="fill-current" />}
                </Button>
                <Button
                    variant="outline"
                    size='sm'
                    disabled={!canRedo}
                    onClick={() => {
                        app.engine.redo();
                        setBoardSnapshot(app.getSnapshot());
                    }}
                    className="flex-2"
                >
                    <ChevronRight />
                </Button>
                <Button
                    variant="outline"
                    size='sm'
                    disabled={!canRedo}
                    onClick={() => {
                        app.engine.goToEnd();
                        setBoardSnapshot(app.getSnapshot());
                    }}
                    className="flex-2"
                >
                    <ChevronLast />
                </Button>
            </div>
        </div>
    );
}
