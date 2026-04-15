import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Crown, HandshakeIcon, RotateCcwIcon } from "lucide-react"

export function GameOverOverlay({
    winner,
    reason,
    onReset,
}: {
    winner: "white" | "black" | "draw"
    reason: string
    onReset: () => void
}) {
    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 text-center">
                <div
                    className={cn(
                        "flex h-20 w-20 items-center justify-center rounded-full",
                        winner === "white" && "bg-white shadow-lg",
                        winner === "black" && "bg-neutral-800 shadow-lg",
                        winner === "draw" && "bg-amber-100"
                    )}
                >
                    {winner === "draw" ? (
                        <HandshakeIcon className="h-10 w-10 text-amber-600" />
                    ) : (
                        <Crown
                            className={cn(
                                "h-10 w-10",
                                winner === "white" ? "text-neutral-800" : "text-white"
                            )}
                        />
                    )}
                </div>
                <div>
                    <h2 className="text-2xl font-bold">
                        {winner === "draw"
                            ? "¡Empate!"
                            : `¡Ganan las ${winner === "white" ? "Blancas" : "Negras"}!`}
                    </h2>
                    <p className="text-muted-foreground">{reason}</p>
                </div>
                <Button onClick={onReset} size="lg">
                    <RotateCcwIcon />
                    Nueva Partida
                </Button>
            </div>
        </div>
    )
}