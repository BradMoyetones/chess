import { ChessApp } from '@chess-fw/core';
import { Button } from '@/components/ui/button';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PGNButtonsNavigateProps {
    app: ChessApp;
    setBoardSnapshot: (snapshot: any) => void;
}

export default function PGNButtonsNavigate({ app, setBoardSnapshot }: PGNButtonsNavigateProps) {
    const canUndo = app.engine.canUndo();
    const canRedo = app.engine.canRedo();
    const [play, setPlay] = useState(false);

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

    return (
        <div className='lg:hidden border-t p-2 flex gap-2 bg-background'>
            <Button
                variant='outline'
                disabled={!canUndo}
                onClick={() => {
                    app.engine.goToStart();
                    setBoardSnapshot(app.getSnapshot());
                }}
                className='flex-2'
            >
                <ChevronFirst />
            </Button>
            <Button
                variant='outline'
                disabled={!canUndo}
                onClick={() => {
                    app.engine.undo();
                    setBoardSnapshot(app.getSnapshot());
                }}
                className='flex-2'
            >
                <ChevronLeft />
            </Button>
            <Button
                variant='outline'
                disabled={!canRedo}
                onClick={() => {
                    setPlay((prev) => !prev);
                }}
                className='flex-1'
            >
                {play ? <Pause className='fill-current' /> : <Play className='fill-current' />}
            </Button>
            <Button
                variant='outline'
                disabled={!canRedo}
                onClick={() => {
                    app.engine.redo();
                    setBoardSnapshot(app.getSnapshot());
                }}
                className='flex-2'
            >
                <ChevronRight />
            </Button>
            <Button
                variant='outline'
                disabled={!canRedo}
                onClick={() => {
                    app.engine.goToEnd();
                    setBoardSnapshot(app.getSnapshot());
                }}
                className='flex-2'
            >
                <ChevronLast />
            </Button>
        </div>
    );
}
