import { ChessApp } from '@chess-fw/core';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface PGNButtonsNavigateProps {
    app: ChessApp;
    setBoardSnapshot: (snapshot: any) => void;
}

export default function PGNButtonsNavigate({ app, setBoardSnapshot }: PGNButtonsNavigateProps) {
    const canUndo = app.engine.canUndo();
    const canRedo = app.engine.canRedo();
    return (
        <div className='lg:hidden border-t p-2 grid grid-cols-2 gap-2 bg-background'>
            <Button
                variant='outline'
                disabled={!canUndo}
                onClick={() => {
                    app.engine.undo();
                    setBoardSnapshot(app.getSnapshot());
                }}
            >
                <ArrowLeft />
            </Button>
            <Button
                variant='outline'
                disabled={!canRedo}
                onClick={() => {
                    app.engine.redo();
                    setBoardSnapshot(app.getSnapshot());
                }}
            >
                <ArrowRight />
            </Button>
        </div>
    );
}
