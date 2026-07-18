import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Lightbulb, Pause, Play, Undo2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import type { BoardController } from '@/modules/board/core/ports/BoardController.port';
import { useIsMobile } from '@/hooks/use-mobile';

interface PGNButtonsNavigateProps {
    controller: BoardController;
    renderKey?: number;
    onRestoreMove?: () => void;
    onBestMove?: () => Promise<void>;
}

export function PGNButtonsNavigate({
    controller,
    onRestoreMove,
    onBestMove,
}: PGNButtonsNavigateProps) {
    const [play, setPlay] = useState(false);
    const [loadingBestMove, setLoadingBestMove] = useState(false);
    const [, forceUpdate] = useState(0);
    const isMobile = useIsMobile();

    const canUndo = controller.canUndo();
    const canRedo = controller.canRedo();

    useEffect(() => {
        const unsub = controller.onBoardChange(() => forceUpdate((c) => c + 1));
        return unsub;
    }, [controller]);

    useEffect(() => {
        if (play) {
            controller.redo();
            forceUpdate((c) => c + 1);
            const interval = setInterval(() => {
                controller.redo();
                forceUpdate((c) => c + 1);
                if (!controller.canRedo()) {
                    setPlay(false);
                }
            }, 600);
            return () => clearInterval(interval);
        }
    }, [play, controller]);

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
                        <Button variant="outline" size="sm" onClick={onRestoreMove} className="flex-1">
                            <Undo2 />
                        </Button>
                    )}
                    {onBestMove && (
                        <Button
                            variant="outline"
                            size="sm"
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
                    size="sm"
                    disabled={!canUndo}
                    onClick={() => { controller.goToStart(); forceUpdate((c) => c + 1); }}
                    className="flex-2"
                >
                    <ChevronFirst />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!canUndo}
                    onClick={() => { controller.undo(); forceUpdate((c) => c + 1); }}
                    className="flex-2"
                >
                    <ChevronLeft />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!canRedo}
                    onClick={() => setPlay((prev) => !prev)}
                    className="flex-1"
                >
                    {play ? <Pause className="fill-current" /> : <Play className="fill-current" />}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!canRedo}
                    onClick={() => { controller.redo(); forceUpdate((c) => c + 1); }}
                    className="flex-2"
                >
                    <ChevronRight />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!canRedo}
                    onClick={() => { controller.goToEnd(); forceUpdate((c) => c + 1); }}
                    className="flex-2"
                >
                    <ChevronLast />
                </Button>
            </div>
            {isMobile && <div className='py-1.5' />}
        </div>
    );
}
