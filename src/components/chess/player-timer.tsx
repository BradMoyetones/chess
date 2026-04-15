import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/time"
import { Crown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function PlayerTimer({
    name,
    time,
    isActive,
    color,
    isCheck,
}: {
    name: string
    time: number
    isActive: boolean
    color: "white" | "black"
    isCheck: boolean
}) {
    const isLowTime = time <= 30
    const isVeryLowTime = time <= 10

    return (
        <div
            className={cn(
                "flex items-center gap-3 rounded-xl border-2 p-3 transition-all duration-300",
                isActive
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-muted/30",
                isCheck && isActive && "border-destructive bg-destructive/10 shadow-destructive/20"
            )}
        >
            <div
                className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2",
                    color === "white"
                        ? "border-neutral-300 bg-white"
                        : "border-neutral-600 bg-neutral-800"
                )}
            >
                <Crown
                    className={cn("h-5 w-5", color === "white" ? "text-neutral-800" : "text-white")}
                />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">{name}</span>
                <span
                    className={cn(
                        "font-mono text-2xl font-bold tabular-nums tracking-tight",
                        isVeryLowTime && isActive && "animate-pulse text-destructive",
                        isLowTime && !isVeryLowTime && isActive && "text-amber-500",
                        !isLowTime && "text-foreground"
                    )}
                >
                    {formatTime(time)}
                </span>
            </div>
            {isCheck && isActive && (
                <Badge variant="destructive" className="ml-auto animate-pulse">
                    ¡Jaque!
                </Badge>
            )}
            {isActive && !isCheck && (
                <div className="ml-auto h-3 w-3 animate-pulse rounded-full bg-primary" />
            )}
        </div>
    )
}