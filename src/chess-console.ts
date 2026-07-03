import chalk from "chalk";
import { EventBus } from "./Core/EventBus";
import { ChessEngine } from "./Core/ChessEngine";
import { ThemeManager } from "./Managers/ThemeManager";
import { AudioManager } from "./Managers/AudioManager";
import { HeadlessBoard } from "./Core/HeadlessBoard";
import { InteractionManager } from "./Managers/InteractionManager";
import { AnnotationManager } from "./Managers/AnnotationManager";
import { HistoryManager } from "./Managers/HistoryManager";
import { PuzzleValidator } from "./Managers/PuzzleValidator";
import { StockfishAdapter } from "./Adapters/StockfishAdapter";
import { ThemeConfig } from "./Types";
import type { BoardSnapshot, SquareData } from "./Types/board.types";
import * as readline from 'node:readline';

// ══════════════════════════════════════════════════
//  MOCK DE DATA: El Tema "Bespoke Walnut"
// ══════════════════════════════════════════════════

const bespokeTheme: ThemeConfig = {
    id: "bespoke-01",
    name: "Bespoke Walnut & Ivory",
    board: {
        lightSquareColor: "#FFFFF0",
        darkSquareColor: "#4B3621",
    },
    pieces: {
        'p': { 'w': 'url(ivory-pawn.png)', 'b': 'url(walnut-pawn.png)' },
        'n': { 'w': 'url(ivory-knight.png)', 'b': 'url(walnut-knight.png)' },
        'b': { 'w': 'url(ivory-bishop.png)', 'b': 'url(walnut-bishop.png)' },
        'r': { 'w': 'url(ivory-rook.png)', 'b': 'url(walnut-rook.png)' },
        'q': { 'w': 'url(ivory-queen.png)', 'b': 'url(walnut-queen.png)' },
        'k': { 'w': 'url(ivory-king.png)', 'b': 'url(walnut-king.png)' },
    },
    sounds: {
        move: "https://mis-sonidos.com/soft-wood-tap.mp3",
        capture: "https://mis-sonidos.com/sharp-wood-clack.mp3",
        check: "https://mis-sonidos.com/elegant-chime.mp3",
        gameEnd: "https://mis-sonidos.com/orchestra-chord.mp3",
    }
};

// ══════════════════════════════════════════════════
//  INICIALIZACIÓN DEL SISTEMA
// ══════════════════════════════════════════════════

const eventBus = new EventBus();
const engine = new ChessEngine(eventBus);
const themeManager = new ThemeManager(bespokeTheme, eventBus);
const audioManager = new AudioManager(eventBus, themeManager);
const interactionManager = new InteractionManager(engine, eventBus);
const annotationManager = new AnnotationManager(eventBus);
const historyManager = new HistoryManager(engine, eventBus);
const puzzleValidator = new PuzzleValidator(engine, eventBus);
const stockfishAdapter = new StockfishAdapter(eventBus);

// HeadlessBoard con todas las dependencias opcionales conectadas
const board = new HeadlessBoard(engine, {
    themeManager,
    interactionManager,
    annotationManager,
});

// ══════════════════════════════════════════════════
//  EVENT LISTENERS
// ══════════════════════════════════════════════════

let lastMessage = "";

eventBus.on('PIECE_MOVED', (data) => {
    lastMessage = chalk.green(`📢 Pieza movida de ${data.from} a ${data.to}`);
});
eventBus.on('PIECE_CAPTURED', (data) => {
    lastMessage = chalk.red(`⚔️ ¡Captura brutal en ${data.to}! Se comieron un ${data.capturedPiece}`);
});
eventBus.on('CHECK', (data) => {
    lastMessage = chalk.yellow(`⚠️ ¡Jaque al rey de color ${data.kingColor}!`);
});
eventBus.on('CASTLED', (data) => {
    lastMessage = chalk.cyan(`🏰 Enroque ${data.side} de las ${data.color === 'w' ? 'blancas' : 'negras'}`);
});
eventBus.on('GAME_OVER', (data) => {
    if (data.winner === 'draw') {
        lastMessage = chalk.gray(`🤝 Tablas por ${data.reason}`);
    } else {
        lastMessage = chalk.magenta(`👑 ¡Ganan las ${data.winner === 'w' ? 'blancas' : 'negras'} por ${data.reason}!`);
    }
});
eventBus.on('VARIATION_CREATED', () => {
    lastMessage = chalk.blue(`🌿 Nueva variante creada en el Game Tree`);
});

// ══════════════════════════════════════════════════
//  RENDER DEL TABLERO
// ══════════════════════════════════════════════════

function printBoardToConsole(snapshot: BoardSnapshot) {
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);

    const { gameState, board: grid, history } = snapshot;

    let output = chalk.cyan("══════════════════════════════════════\n");
    output += chalk.cyan("  ♟  CHESS FRAMEWORK — INTERACTIVE  ♟\n");
    output += chalk.cyan("══════════════════════════════════════\n\n");

    // Info del estado
    const turnLabel = gameState.turn === 'w' ? chalk.white.bold('⬜ Blancas') : chalk.gray.bold('⬛ Negras');
    const modeLabel = chalk.dim(`[${gameState.mode}]`);
    output += `  Turno: ${turnLabel}  ${modeLabel}  Jugada: ${gameState.moveNumber}\n`;
    output += `  Historial: ← ${history.canUndo ? '✓' : '✗'}  → ${history.canRedo ? '✓' : '✗'}  `;
    output += `Movimientos: ${history.moveCount}`;
    if (history.hasVariations) output += chalk.blue('  🌿 Variantes');
    output += '\n\n';

    const asciiPieces: Record<string, string> = {
        'p': '♟', 'n': '♞', 'b': '♝',
        'r': '♜', 'q': '♛', 'k': '♚'
    };

    const pieceStyle: Record<string, (text: string) => string> = {
        'w': chalk.hex('#D4AF37').bold,
        'b': chalk.hex('#1A1A1A').bold
    };

    output += chalk.gray("     a   b   c   d   e   f   g   h\n");
    output += chalk.gray("   ┌───┬───┬───┬───┬───┬───┬───┬───┐\n");

    grid.forEach((row: SquareData[], rowIndex: number) => {
        let rowString = chalk.gray(` ${row[0].algebraic.charAt(1)} │`);

        row.forEach((square: SquareData) => {
            // Determinar el color de fondo
            let bgColor = square.backgroundColor;

            // Highlights visuales: último movimiento en amarillo suave
            if (square.isLastMoveOrigin || square.isLastMoveDestination) {
                bgColor = square.isLight ? '#F5F682' : '#B9CA43';
            }
            // Casilla seleccionada en azul
            if (square.isSelected) {
                bgColor = '#7B61FF';
            }

            const bgTheme = chalk.bgHex(bgColor);

            if (square.piece) {
                const icon = asciiPieces[square.piece.type];
                const styledIcon = pieceStyle[square.piece.color](` ${icon} `);
                // Puntito de destino válido sobre pieza (captura posible)
                if (square.isValidDestination) {
                    rowString += chalk.bgHex('#E74C3C')(styledIcon) + chalk.gray('│');
                } else {
                    rowString += bgTheme(styledIcon) + chalk.gray('│');
                }
            } else if (square.isValidDestination) {
                // Puntito de destino válido en casilla vacía
                rowString += bgTheme(chalk.hex('#4CAF50')(' • ')) + chalk.gray('│');
            } else {
                rowString += bgTheme('   ') + chalk.gray('│');
            }
        });

        output += `${rowString} ${chalk.gray(row[0].algebraic.charAt(1))}\n`;

        if (rowIndex < 7) {
            output += chalk.gray("   ├───┼───┼───┼───┼───┼───┼───┼───┤\n");
        }
    });

    output += chalk.gray("   └───┴───┴───┴───┴───┴───┴───┴───┘\n");
    output += chalk.gray("     a   b   c   d   e   f   g   h\n");

    // FEN actual
    output += chalk.dim(`\n  FEN: ${gameState.fen}\n`);

    // PGN si hay movimientos
    const pgn = engine.getPgn();
    if (pgn) {
        output += chalk.dim(`  PGN: ${pgn}\n`);
    }

    if (lastMessage) {
        output += "\n  " + lastMessage + "\n";
        lastMessage = "";
    }

    process.stdout.write(output + "\n");
}

// ══════════════════════════════════════════════════
//  PROMPT INTERACTIVO
// ══════════════════════════════════════════════════

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function promptMove() {
    const helpText = chalk.dim('(move: "e2 e4" | undo | redo | start | end | fen <fen> | mode <play|analysis|setup> | quit)');
    rl.question(chalk.green(`\n  Tu comando ${helpText}\n  > `), (answer: string) => {
        const input = answer.trim().toLowerCase();
        const parts = input.split(/\s+/);

        if (input === 'quit' || input === 'exit') {
            console.log(chalk.cyan("\n  ¡Gracias por jugar! 🎉\n"));
            rl.close();
            return;
        }

        if (input === 'undo') {
            if (!historyManager.undo()) {
                lastMessage = chalk.yellow("⚠️ No hay movimientos para deshacer");
            }
        } else if (input === 'redo') {
            if (!historyManager.redo()) {
                lastMessage = chalk.yellow("⚠️ No hay movimientos para rehacer");
            }
        } else if (input === 'start') {
            historyManager.goToStart();
            lastMessage = chalk.cyan("⏪ Inicio de la partida");
        } else if (input === 'end') {
            historyManager.goToEnd();
            lastMessage = chalk.cyan("⏩ Final de la partida");
        } else if (parts[0] === 'fen' && parts.length > 1) {
            const fen = parts.slice(1).join(' ');
            if (engine.loadFen(fen)) {
                lastMessage = chalk.cyan(`📋 FEN cargado exitosamente`);
            } else {
                lastMessage = chalk.red(`❌ FEN inválido`);
            }
        } else if (parts[0] === 'mode' && parts[1]) {
            const mode = parts[1].toUpperCase() as 'PLAY' | 'ANALYSIS' | 'SETUP';
            if (['PLAY', 'ANALYSIS', 'SETUP'].includes(mode)) {
                engine.setMode(mode);
                lastMessage = chalk.cyan(`🔧 Modo cambiado a ${mode}`);
            } else {
                lastMessage = chalk.yellow("⚠️ Modos válidos: play, analysis, setup");
            }
        } else if (input === 'eval') {
            if (!stockfishAdapter.isInitialized()) {
                lastMessage = chalk.yellow("⏳ Iniciando Stockfish...");
                stockfishAdapter.init({ defaultDepth: 15, binaryPath: 'stockfish' })
                    .then(() => {
                        lastMessage = chalk.cyan("🧠 Evaluando posición...");
                        printBoardToConsole(board.getBoardSnapshot());
                        return stockfishAdapter.evaluate(engine.getFen());
                    })
                    .then(evalData => {
                        const score = evalData.mate ? `M${evalData.mate}` : `${(evalData.score / 100).toFixed(2)}`;
                        lastMessage = chalk.green(`🧠 Evaluación: ${score} | Mejor mov: ${evalData.bestMove} | Prof: ${evalData.depth}`);
                        printBoardToConsole(board.getBoardSnapshot());
                        promptMove();
                    })
                    .catch(err => {
                        lastMessage = chalk.red(`❌ Error Stockfish: ${err.message} (¿Tienes 'stockfish' en tu PATH?)`);
                        printBoardToConsole(board.getBoardSnapshot());
                        promptMove();
                    });
                return; // Wait for promise
            } else {
                lastMessage = chalk.cyan("🧠 Evaluando posición...");
                stockfishAdapter.evaluate(engine.getFen())
                    .then(evalData => {
                        const score = evalData.mate ? `M${evalData.mate}` : `${(evalData.score / 100).toFixed(2)}`;
                        lastMessage = chalk.green(`🧠 Evaluación: ${score} | Mejor mov: ${evalData.bestMove} | Prof: ${evalData.depth}`);
                        printBoardToConsole(board.getBoardSnapshot());
                        promptMove();
                    });
                return;
            }
        } else if (parts[0] === 'puzzle' && parts[1]) {
            const MOCK_PUZZLES: Record<string, any> = {
                "1": { id: "1", fen: "6k1/5ppp/8/7Q/8/8/8/6K1 w - - 0 1", solution: ["Qxh7+", "Kf8", "Qh8+"], playerColor: "w" },
                "2": { id: "2", fen: "6k1/8/8/8/8/8/P7/K7 w - - 0 1", solution: ["Kb1", "Kg7"], playerColor: "b" }
            };
            const p = MOCK_PUZZLES[parts[1]];
            if (p) {
                puzzleValidator.loadPuzzle(p);
                lastMessage = chalk.cyan(`🧩 Puzzle ${p.id} cargado. ¡A jugar!`);
            } else {
                lastMessage = chalk.yellow(`⚠️ Puzzle no encontrado. Puzzles disp: 1, 2`);
            }
        } else if (parts.length === 2) {
            // Si hay un puzzle activo, interceptar validación
            if (puzzleValidator.isActive()) {
                const moveSan = parts.join(''); // Ej: "e2e4" pero nosotros necesitamos SAN. En consola es dificil.
                // Mejor dejemos que handleMove convierta e2 e4, y luego vemos.
                // Wait, move validation in PuzzleValidator expects SAN like "Qxh7+".
                // This console uses "h5 h7" (from to). Let's convert from/to -> SAN.
                // chess.js moves() can give us the SAN.
                const moves = engine.getAllLegalMoves();
                const move = moves.find(m => m.from === parts[0] && m.to === parts[1]);
                if (move) {
                    const result = puzzleValidator.validatePlayerMove(move.san);
                    if (result === 'correct') {
                        board.handleMove(parts[0], parts[1]);
                        // el oponente responde automaticamente, no necesitamos llamar handleMove para él porque PuzzleValidator usa attemptMove
                    } else {
                        lastMessage = chalk.red(`❌ Movimiento incorrecto para el puzzle.`);
                    }
                } else {
                    lastMessage = chalk.red(`❌ Movimiento ilegal.`);
                }
            } else {
                const result = board.handleMove(parts[0], parts[1]);
                if (!result.success) {
                    lastMessage = chalk.red(`❌ Movimiento inválido: ${result.reason}`);
                }
            }
        } else if (parts.length === 3 && parts[2].length === 1) {
            // Movimiento con promoción: "e7 e8 q"
            if (puzzleValidator.isActive()) {
                const moves = engine.getAllLegalMoves();
                const move = moves.find(m => m.from === parts[0] && m.to === parts[1] && m.promotion === parts[2]);
                if (move) {
                    if (puzzleValidator.validatePlayerMove(move.san) === 'correct') {
                        board.handleMove(parts[0], parts[1], parts[2]);
                    }
                }
            } else {
                const result = board.handleMove(parts[0], parts[1], parts[2]);
                if (!result.success) {
                    lastMessage = chalk.red(`❌ Movimiento inválido: ${result.reason}`);
                }
            }
        } else {
            lastMessage = chalk.yellow("⚠️ Formato: 'e2 e4', 'undo', 'redo', 'start', 'end', 'fen <fen>', 'mode <play|analysis|setup>', 'puzzle <id>', 'eval'");
        }

        printBoardToConsole(board.getBoardSnapshot());
        promptMove();
    });
}

// ══════════════════════════════════════════════════
//  INICIAR
// ══════════════════════════════════════════════════

console.clear();
printBoardToConsole(board.getBoardSnapshot());
promptMove();
