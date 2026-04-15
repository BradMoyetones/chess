import { ScrollArea } from "@/components/ui/scroll-area"
import { useEffect, useRef } from "react"

export function MoveHistory({ history, onSelectMove }: { history: string[]; onSelectMove?: (index: number) => void }) {
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [history])

    if (history.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Realiza tu primer movimiento
            </div>
        )
    }

    // Agrupar movimientos en pares (blanco, negro)
    const movePairs: { white: string; black?: string }[] = []
    for (let i = 0; i < history.length; i += 2) {
        movePairs.push({
            white: history[i],
            black: history[i + 1],
        })
    }

    return (
        <ScrollArea className="h-full pr-2" ref={scrollRef}>
            <div className="space-y-1">
                {movePairs.map((pair, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-[2rem_1fr_1fr] gap-2 text-sm"
                    >
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <button
                            onClick={() => onSelectMove?.(index * 2)}
                            className="rounded px-1.5 py-0.5 text-left font-mono transition-colors hover:bg-muted"
                        >
                            {pair.white}
                        </button>
                        {pair.black && (
                            <button
                                onClick={() => onSelectMove?.(index * 2 + 1)}
                                className="rounded px-1.5 py-0.5 text-left font-mono transition-colors hover:bg-muted"
                            >
                                {pair.black}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </ScrollArea>
    )
}