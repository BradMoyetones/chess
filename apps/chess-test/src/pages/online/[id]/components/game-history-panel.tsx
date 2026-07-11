import { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ChessApp } from '@chess-fw/core';

interface GameHistoryPanelProps {
    app: ChessApp;
    setBoardSnapshot: (snapshot: any) => void;
    variant: 'mobile' | 'desktop';
}

export function GameHistoryPanel({ app, setBoardSnapshot, variant }: GameHistoryPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollRefPc = useRef<HTMLDivElement>(null);

    const canUndo = app.engine.canUndo();
    const canRedo = app.engine.canRedo();
    const gameTree = app.engine.getGameTree();
    const mainLine = gameTree.getMainLine();

    useEffect(() => {
        if (!canRedo) {
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
                }
                if (scrollRefPc.current) {
                    scrollRefPc.current.scrollTo({ top: scrollRefPc.current.scrollHeight * 100, behavior: 'smooth' });
                }
            }, 50);
        }
    }, [mainLine.length, canRedo]);

    if (variant === 'mobile') {
        return (
            <div className="lg:hidden block w-full">
                <div className="w-full rounded-md border bg-secondary/20 scrollbar-none overflow-x-auto scroll-fade-x" ref={scrollRef}>
                    <div className="flex w-max space-x-2 p-2 items-center h-12">
                        {mainLine.length > 1 ? mainLine.slice(1).map((node: any, i: number) => (
                            <div key={node.id} className="inline-flex items-center gap-1">
                                {i % 2 === 0 && <span className="text-muted-foreground text-xs font-mono ml-2">{i / 2 + 1}.</span>}
                                <Button
                                    variant={gameTree.getCurrentNode().id === node.id ? 'default' : 'secondary'}
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={() => { app.engine.goToMove(node.id); setBoardSnapshot(app.getSnapshot()); }}
                                >
                                    {node.move?.san}
                                </Button>
                            </div>
                        )) : (
                            <div className="text-sm text-muted-foreground px-4">No moves played yet...</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Card className="hidden lg:flex flex-col w-[400px] h-screen">
            <CardHeader>
                <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent ref={scrollRefPc} className="overflow-y-auto flex-1 p-0 scroll-fade-y scrollbar-none">
                <div className="flex flex-col text-sm">
                    {mainLine.length > 1 ? mainLine.slice(1).reduce((acc: any, node: any, i: number) => {
                        if (i % 2 === 0) acc.push({ turn: i / 2 + 1, white: node, black: null });
                        else acc[acc.length - 1].black = node;
                        return acc;
                    }, [] as any[]).map((pair: any) => (
                        <div key={pair.turn} className="flex items-center px-4 py-1.5 hover:bg-muted/30 group border-b border-border/50">
                            <div className="w-8 text-muted-foreground font-mono select-none flex items-center">{pair.turn}.</div>
                            <div className="grid w-full grid-cols-2 gap-2">
                                <Button
                                    variant={gameTree.getCurrentNode().id === pair.white.id ? 'default' : 'secondary'}
                                    size="sm"
                                    onClick={() => { app.engine.goToMove(pair.white.id); setBoardSnapshot(app.getSnapshot()); }}
                                    className={"w-fit"}
                                >
                                    {pair.white.move?.san}
                                </Button>
                                {pair.black && (
                                    <Button
                                        variant={gameTree.getCurrentNode().id === pair.black.id ? 'default' : 'secondary'}
                                        size="sm"
                                        onClick={() => { app.engine.goToMove(pair.black.id); setBoardSnapshot(app.getSnapshot()); }}
                                        className={"w-fit"}
                                    >
                                        {pair.black.move?.san}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )) : <div className="text-center py-4 text-muted-foreground">No moves yet</div>}
                </div>
            </CardContent>
            <CardFooter>
                <div className="flex gap-2 w-full justify-center md:justify-start">
                    <Button disabled={!canUndo} onClick={() => { app.engine.undo(); setBoardSnapshot(app.getSnapshot()); }}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Button disabled={!canRedo} onClick={() => { app.engine.redo(); setBoardSnapshot(app.getSnapshot()); }}>
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
