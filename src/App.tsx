// React imports
import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react"

// Lucide icons
import {
    Crown,
    RotateCcwIcon,
    Undo2Icon,
    PlayIcon,
    PauseIcon,
    FlagIcon,
    FlipVertical2Icon,
    SunIcon,
    MoonIcon,
} from "lucide-react"

// UI imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PlayerTimer } from "@/components/chess/player-timer"
import { GameOverOverlay } from "@/components/chess/game-over-overlay"
import { MoveHistory } from "@/components/chess/move-history"
import Footer from "@/components/footer"
import { toast } from "sonner"
import { useTheme } from "next-themes"

// Chess imports (Libraries)
import {
    Chess,
    type Square
} from "chess.js"
import {
    Chessboard,
    type PieceDropHandlerArgs,
    type SquareHandlerArgs
} from "react-chessboard"

const INITIAL_TIME = 10 * 60 // 10 minutos en segundos (Proximamente en configuraciones con Sheet de Shadcn)

export default function ChessGame() {
    const { resolvedTheme, setTheme } = useTheme()
    const [game, setGame] = useState(new Chess())
    const [whiteTime, setWhiteTime] = useState(INITIAL_TIME)
    const [blackTime, setBlackTime] = useState(INITIAL_TIME)
    const [isPlaying, setIsPlaying] = useState(false)
    const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white")
    const [moveFrom, setMoveFrom] = useState<Square | null>(null)
    const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({})
    const [lastMoveSquares, setLastMoveSquares] = useState<Record<string, React.CSSProperties>>({})
    const [gameOver, setGameOver] = useState<{
        winner: "white" | "black" | "draw"
        reason: string
    } | null>(null)

    const turn = useMemo(() => game.turn(), [game])
    const isCheck = useMemo(() => game.isCheck(), [game])
    const history = useMemo(() => game.history(), [game])

    // Timer logic
    useEffect(() => {
        if (!isPlaying || gameOver) return

        const interval = setInterval(() => {
            if (turn === "w") {
                setWhiteTime((prev) => {
                    if (prev <= 1) {
                        setIsPlaying(false)
                        setGameOver({ winner: "black", reason: "Tiempo agotado" })
                        toast.error("¡Tiempo agotado!", {
                            description: "Las negras ganan por tiempo.",
                        })
                        return 0
                    }
                    return prev - 1
                })
            } else {
                setBlackTime((prev) => {
                    if (prev <= 1) {
                        setIsPlaying(false)
                        setGameOver({ winner: "white", reason: "Tiempo agotado" })
                        toast.error("¡Tiempo agotado!", {
                            description: "Las blancas ganan por tiempo.",
                        })
                        return 0
                    }
                    return prev - 1
                })
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [isPlaying, turn, gameOver])

    // Check for game over conditions
    useEffect(() => {
        if (game.isCheckmate()) {
            const winner = turn === "w" ? "black" : "white"
            setGameOver({ winner, reason: "Jaque Mate" })
            setIsPlaying(false)
            toast.success("¡Jaque Mate!", {
                description: `Las ${winner === "white" ? "blancas" : "negras"} ganan la partida.`,
            })
        } else if (game.isDraw()) {
            let reason = "Empate"
            if (game.isStalemate()) reason = "Ahogado"
            else if (game.isThreefoldRepetition()) reason = "Repetición triple"
            else if (game.isInsufficientMaterial()) reason = "Material insuficiente"

            setGameOver({ winner: "draw", reason })
            setIsPlaying(false)
            toast.info("¡Empate!", { description: reason })
        } else if (game.isCheck()) {
            toast.warning("¡Jaque!", {
                description: `El rey ${turn === "w" ? "blanco" : "negro"} está en jaque.`,
                duration: 2000,
            })
        }
    }, [game, turn])

    const getMoveOptions = useCallback(
        (square: Square) => {
            const moves = game.moves({ square, verbose: true })
            if (moves.length === 0) return false

            const newSquares: Record<string, React.CSSProperties> = {}

            moves.forEach((move) => {
                const isCapture = game.get(move.to as Square) || move.flags.includes("e")
                newSquares[move.to] = {
                    background: isCapture
                        ? "radial-gradient(circle, rgba(239, 68, 68, 0.4) 85%, transparent 85%)"
                        : "radial-gradient(circle, rgba(34, 197, 94, 0.4) 25%, transparent 25%)",
                    borderRadius: "50%",
                }
            })

            newSquares[square] = {
                background: "rgba(34, 197, 94, 0.3)",
            }

            setOptionSquares(newSquares)
            return true
        },
        [game]
    )

    function makeAMove(move: { from: string; to: string; promotion?: string }) {
        // Usar PGN para preservar el historial de movimientos
        const gameCopy = new Chess()
        gameCopy.loadPgn(game.pgn())
        const result = gameCopy.move(move)

        if (result) {
            setGame(gameCopy)
            setLastMoveSquares({
                [move.from]: { background: "rgba(255, 255, 0, 0.3)" },
                [move.to]: { background: "rgba(255, 255, 0, 0.3)" },
            })

            // Auto-start timer on first move
            if (!isPlaying && history.length === 0) {
                setIsPlaying(true)
            }
        }

        return result
    }

    function onSquareClick({ square }: SquareHandlerArgs) {
        const sq = square as Square
        
        // Si ya hay una pieza seleccionada, intentar mover
        if (moveFrom) {
            // Si clicamos la misma casilla, deseleccionar
            if (moveFrom === sq) {
                setMoveFrom(null)
                setOptionSquares({})
                return
            }

            const move = makeAMove({
                from: moveFrom,
                to: sq,
                promotion: "q",
            })

            // Si el movimiento fue exitoso, limpiar seleccion
            if (move) {
                setMoveFrom(null)
                setOptionSquares({})
                return
            }

            // Si el movimiento fallo, verificar si hay otra pieza seleccionable
            const piece = game.get(sq)
            if (piece && piece.color === turn) {
                const hasMoves = getMoveOptions(sq)
                if (hasMoves) {
                    setMoveFrom(sq)
                    return
                }
            }

            // Si no hay pieza valida, limpiar seleccion
            setMoveFrom(null)
            setOptionSquares({})
            return
        }

        // Verificar si hay una pieza que se pueda mover
        const piece = game.get(sq)
        if (piece && piece.color === turn) {
            const hasMoves = getMoveOptions(sq)
            if (hasMoves) {
                setMoveFrom(sq)
            }
        }
    }

    function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs) {
        const move = makeAMove({
            from: sourceSquare,
            to: targetSquare,
            promotion: "q",
        })

        setMoveFrom(null)
        setOptionSquares({})

        return move !== null
    }

    function undoMove() {
        if (history.length === 0) {
            toast.warning("No hay movimientos para deshacer")
            return
        }
        // Usar PGN para preservar el historial
        const gameCopy = new Chess()
        gameCopy.loadPgn(game.pgn())
        const undoneMove = gameCopy.undo()
        
        if (undoneMove) {
            setGame(gameCopy)
            // Actualizar last move squares con el movimiento anterior si existe
            const newHistory = gameCopy.history({ verbose: true })
            if (newHistory.length > 0) {
                const lastMove = newHistory[newHistory.length - 1]
                setLastMoveSquares({
                    [lastMove.from]: { background: "rgba(255, 255, 0, 0.3)" },
                    [lastMove.to]: { background: "rgba(255, 255, 0, 0.3)" },
                })
            } else {
                setLastMoveSquares({})
            }
            setOptionSquares({})
            setMoveFrom(null)
            toast.info("Movimiento deshecho")
        }
    }

    function resetGame() {
        setGame(new Chess())
        setWhiteTime(INITIAL_TIME)
        setBlackTime(INITIAL_TIME)
        setIsPlaying(false)
        setGameOver(null)
        setMoveFrom(null)
        setOptionSquares({})
        setLastMoveSquares({})
        toast.success("¡Nueva partida iniciada!")
    }

    function resign() {
        const winner = turn === "w" ? "black" : "white"
        setGameOver({ winner, reason: "Rendición" })
        setIsPlaying(false)
        toast.info("Partida terminada", {
            description: `Las ${turn === "w" ? "blancas" : "negras"} se han rendido.`,
        })
    }

    return (
        <>
            {/* Background (https://bg.ibelick.com/) */}
            <div className="absolute inset-0 bg-background bg-[radial-gradient(var(--muted)_1px,var(--background)_1px)] bg-size-[20px_20px]" />
            <div className="relative flex min-h-screen items-center justify-center p-4">
                <div className="flex w-full max-w-5xl flex-col gap-4 lg:flex-row lg:items-start">
                    {/* Main Board Area */}
                    <Card className="flex-1">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-2xl">
                                    <Crown />
                                    Ajedrez
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        className="relative transition-all"
                                        size="icon"
                                        onClick={() => {
                                            const isDark = resolvedTheme === "dark"
                                            document.startViewTransition(() => {
                                                setTheme(isDark ? "light" : "dark")
                                            })
                                        }}
                                    >
                                        <SunIcon className="absolute rotate-0 scale-100  dark:-rotate-90 dark:scale-0 transition-all! duration-300" />
                                        <MoonIcon className="absolute rotate-90 scale-0 dark:rotate-0 dark:scale-100 transition-all! duration-300" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setIsPlaying(!isPlaying)}
                                        disabled={!!gameOver}
                                        title={isPlaying ? "Pausar" : "Reanudar"}
                                    >
                                        {isPlaying ? (
                                            <PauseIcon />
                                        ) : (
                                            <PlayIcon />
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                            setBoardOrientation((prev) =>
                                                prev === "white" ? "black" : "white"
                                            )
                                        }
                                        title="Voltear tablero"
                                    >
                                        <FlipVertical2Icon />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Opponent Timer (arriba) */}
                            <PlayerTimer
                                name={boardOrientation === "white" ? "Negras" : "Blancas"}
                                time={boardOrientation === "white" ? blackTime : whiteTime}
                                isActive={
                                    boardOrientation === "white" ? turn === "b" : turn === "w"
                                }
                                color={boardOrientation === "white" ? "black" : "white"}
                                isCheck={
                                    isCheck &&
                                    (boardOrientation === "white" ? turn === "b" : turn === "w")
                                }
                            />

                            {/* Board */}
                            <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                                {gameOver && (
                                    <GameOverOverlay
                                        winner={gameOver.winner}
                                        reason={gameOver.reason}
                                        onReset={resetGame}
                                    />
                                )}
                                <Chessboard
                                    options={{
                                        id: "chess-board",
                                        position: game.fen(),
                                        onPieceDrop: onPieceDrop,
                                        onSquareClick: onSquareClick,
                                        boardOrientation: boardOrientation,
                                        squareStyles: {
                                            ...optionSquares,
                                            ...lastMoveSquares,
                                        },
                                        boardStyle: {
                                            borderRadius: "0.5rem",
                                        },
                                        darkSquareStyle: {
                                            backgroundColor: "#779952",
                                        },
                                        lightSquareStyle: {
                                            backgroundColor: "#edeed1",
                                        },
                                        canDragPiece: () => !gameOver,
                                    }}
                                />
                            </div>

                            {/* Player Timer (abajo) */}
                            <PlayerTimer
                                name={boardOrientation === "white" ? "Blancas" : "Negras"}
                                time={boardOrientation === "white" ? whiteTime : blackTime}
                                isActive={
                                    boardOrientation === "white" ? turn === "w" : turn === "b"
                                }
                                color={boardOrientation === "white" ? "white" : "black"}
                                isCheck={
                                    isCheck &&
                                    (boardOrientation === "white" ? turn === "w" : turn === "b")
                                }
                            />

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={undoMove}
                                    disabled={history.length === 0 || !!gameOver}
                                >
                                    <Undo2Icon />
                                    Deshacer
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={resetGame}
                                >
                                    <RotateCcwIcon />
                                    Reiniciar
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={resign}
                                    disabled={history.length === 0 || !!gameOver}
                                >
                                    <FlagIcon />
                                    Rendirse
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Side Panel - Move History */}
                    <Card className="h-fit w-full lg:w-72">
                        <CardHeader>
                            <CardTitle className="text-lg">Historial</CardTitle>
                            <CardDescription>
                                Lista de movimientos realizados en la partida.
                            </CardDescription>
                        </CardHeader>
                        <Separator />
                        <CardContent>
                            <div className="h-64">
                                <MoveHistory history={history} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Footer />
        </>
    )
}
