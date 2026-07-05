import chalk from "chalk";
import * as readline from 'node:readline';
import * as fs from 'fs';
import * as path from 'path';
import { 
    EventBus, 
    ChessEngine, 
    ThemeManager, 
    InteractionManager, 
    HistoryManager, 
    PuzzleValidator, 
    HeadlessBoard,
    ThemeConfig,
    BoardSnapshot,
    SquareData 
} from '../index';
import { Container } from '../Decorators/di.decorators';

// ══════════════════════════════════════════════════
//  CARGA DINÁMICA DE SKINS DESDE JSON
// ══════════════════════════════════════════════════
const skinsRaw = fs.readFileSync(path.join(__dirname, 'default_skins.json'), 'utf8');
const skinsData = JSON.parse(skinsRaw);

let activeSkinName = "Ocean";
let activeStyleSize = "extended"; // small, compact, extended, large

type RgbColor = { Rgb: [number, number, number] } | string;

function parseColor(c: RgbColor): string {
    if (typeof c === 'string') {
        const map: Record<string, string> = {
            "LightBlue": "#ADD8E6",
            "LightGreen": "#90EE90",
        };
        return map[c] || "#FFFFFF";
    }
    if (c.Rgb) {
        const [r, g, b] = c.Rgb;
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }
    return "#FFFFFF";
}

function getActiveSkin() {
    return skinsData.skins.find((s: any) => s.name.toLowerCase() === activeSkinName.toLowerCase()) || skinsData.skins[0];
}

function getActivePieceStyleDef() {
    const skin = getActiveSkin();
    const styleName = skin.piece_style;
    return skinsData.piece_styles.find((ps: any) => ps.name === styleName) || skinsData.piece_styles[0];
}

function padPieceLine(line: string, targetWidth: number): string {
    const chars = [...(line || "")];
    let currentLen = chars.length;
    let padTotal = targetWidth - currentLen;
    if (padTotal < 0) padTotal = 0;
    const padLeft = Math.floor(padTotal / 2);
    const padRight = Math.ceil(padTotal / 2);
    return " ".repeat(padLeft) + chars.join('') + " ".repeat(padRight);
}

function getNormalizedPieces() {
    const def = getActivePieceStyleDef();
    const styleData = def[activeStyleSize] || def["small"];
    
    const rawPieces: Record<string, string[]> = {};
    const mapKeys: Record<string, string> = {
        'pawn': 'p', 'knight': 'n', 'bishop': 'b', 'rook': 'r', 'queen': 'q', 'king': 'k'
    };
    
    let maxLines = 0;
    for (const [key, val] of Object.entries(styleData)) {
        if (mapKeys[key]) {
            const lines = (val as string).split('\n');
            if (lines.length > maxLines) maxLines = lines.length;
            rawPieces[mapKeys[key]] = lines;
        }
    }

    // Heurística para padding de cuadrado perfecto: ancho ≈ 2 * alto + 1
    const targetWidth = Math.max(maxLines * 2 + 1, 3); 
    
    const normalized: Record<string, string[]> = {};
    for (const [k, lines] of Object.entries(rawPieces)) {
        const newLines = [];
        const diff = maxLines - lines.length;
        for(let i=0; i<diff; i++) newLines.push(padPieceLine("", targetWidth));
        for(const l of lines) newLines.push(padPieceLine(l, targetWidth));
        normalized[k] = newLines;
    }
    
    return { pieces: normalized, maxLines, targetWidth };
}

// ══════════════════════════════════════════════════
//  INICIALIZACIÓN DEL MOTOR
// ══════════════════════════════════════════════════
// Configuramos un ThemeManager tonto para que HeadlessBoard no se queje
const dummyTheme: ThemeConfig = {
    id: "dummy", 
    name: "Dummy", 
    board: { 
        lightSquareColor: "", 
        darkSquareColor: "" 
    }, 
    pieces: {
        b: {
            b: "",
            w: ""
        },
        k: {
            b: "",
            w: ""
        },
        n: {
            b: "",
            w: ""
        },
        p: {
            b: "",
            w: ""
        },
        q: {
            b: "",
            w: ""
        },
        r: {
            b: "",
            w: ""
        }
    },
    sounds: {
        capture: "",
        check: "",
        move: "",
        gameEnd: "",
    }
};

const eventBus = Container.resolve(EventBus);
const engine = Container.resolve(ChessEngine);
const interactionManager = Container.resolve(InteractionManager);
const historyManager = Container.resolve(HistoryManager);
const board = new HeadlessBoard(engine, { interactionManager });

let lastMessage = "";

eventBus.on('PIECE_MOVED', (data) => lastMessage = chalk.green(`📢 Movimiento: ${data.from} a ${data.to}`));
eventBus.on('PIECE_CAPTURED', (data) => lastMessage = chalk.red(`⚔️ ¡Captura en ${data.to}! (${data.capturedPiece})`));
eventBus.on('CHECK', (data) => lastMessage = chalk.yellow(`⚠️ ¡Jaque al rey ${data.kingColor === 'w' ? 'blanco' : 'negro'}!`));
eventBus.on('CASTLED', (data) => lastMessage = chalk.cyan(`🏰 Enroque ${data.side}`));
eventBus.on('GAME_OVER', (data) => {
    if (data.winner === 'draw') lastMessage = chalk.gray(`🤝 Tablas por ${data.reason}`);
    else lastMessage = chalk.magenta(`👑 ¡Ganan las ${data.winner === 'w' ? 'blancas' : 'negras'} por ${data.reason}!`);
});

// ══════════════════════════════════════════════════
//  RENDER TUI AVANZADO
// ══════════════════════════════════════════════════
function getPgnLines(engine: ChessEngine): string[] {
    const moves = engine.getGameTree().getMainLine().filter(n => n.move).map(n => n.move!.san);
    const lines = [];
    for (let i = 0; i < moves.length; i += 2) {
        const num = `${Math.floor(i/2) + 1}.`;
        const w = moves[i];
        const b = moves[i+1] || "";
        lines.push(`${num.padEnd(3, ' ')} ${w.padEnd(7, ' ')} ${b}`);
    }
    return lines;
}

function getCapturedPieces(fen: string, whiteColorHex: string, blackColorHex: string) {
    const boardPart = fen.split(' ')[0];
    const counts: Record<string, number> = {
        'P': 8, 'N': 2, 'B': 2, 'R': 2, 'Q': 1, 
        'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1  
    };
    for (const char of boardPart) if (counts[char] !== undefined) counts[char]--;
    
    // Convertimos la pieza a su representación Unicode de un solo caracter para el HUD
    const whiteCap = [];
    if (counts['p'] > 0) whiteCap.push(chalk.hex(blackColorHex).bold('♟'.repeat(counts['p'])));
    if (counts['n'] > 0) whiteCap.push(chalk.hex(blackColorHex).bold('♞'.repeat(counts['n'])));
    if (counts['b'] > 0) whiteCap.push(chalk.hex(blackColorHex).bold('♝'.repeat(counts['b'])));
    if (counts['r'] > 0) whiteCap.push(chalk.hex(blackColorHex).bold('♜'.repeat(counts['r'])));
    if (counts['q'] > 0) whiteCap.push(chalk.hex(blackColorHex).bold('♛'.repeat(counts['q'])));

    const blackCap = [];
    if (counts['P'] > 0) blackCap.push(chalk.hex(whiteColorHex).bold('♟'.repeat(counts['P'])));
    if (counts['N'] > 0) blackCap.push(chalk.hex(whiteColorHex).bold('♞'.repeat(counts['N'])));
    if (counts['B'] > 0) blackCap.push(chalk.hex(whiteColorHex).bold('♝'.repeat(counts['B'])));
    if (counts['R'] > 0) blackCap.push(chalk.hex(whiteColorHex).bold('♜'.repeat(counts['R'])));
    if (counts['Q'] > 0) blackCap.push(chalk.hex(whiteColorHex).bold('♛'.repeat(counts['Q'])));

    return { white: whiteCap.join(' '), black: blackCap.join(' ') };
}

function drawTui(snapshot: BoardSnapshot) {
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);

    const skin = getActiveSkin();
    const lightSquareColor = parseColor(skin.board_white_color);
    const darkSquareColor = parseColor(skin.board_black_color);
    const pieceWhiteColor = parseColor(skin.piece_white_color);
    const pieceBlackColor = parseColor(skin.piece_black_color);
    const lastMoveColor = parseColor(skin.last_move_color);
    const selectionColor = parseColor(skin.selection_color);

    const { pieces: asciiPieces, maxLines, targetWidth } = getNormalizedPieces();
    
    const { gameState, board: grid, history } = snapshot;

    let output = "\n" + chalk.cyan.bold(`  CHESS TUI ENGINE - Tema: ${skin.name} (${activeStyleSize}) \n`) + "\n";

    const pieceStyle: Record<string, (text: string) => string> = {
        'w': chalk.hex(pieceWhiteColor).bold,
        'b': chalk.hex(pieceBlackColor).bold
    };

    const captured = getCapturedPieces(gameState.fen, pieceWhiteColor, pieceBlackColor);
    const pgnLines = getPgnLines(engine);

    // Preparamos la columna de información a la derecha (HUD)
    const infoLines: string[] = [
        chalk.white.bold(`  Turno: ${gameState.turn === 'w' ? 'Blancas' : 'Negras'}`) + chalk.gray(` | Modo: ${gameState.mode}`),
        "",
        chalk.bgHex('#333333').white.bold(" BLACK MATERIAL "),
        `  ${captured.black || 'Ninguno'}`,
        "",
        chalk.bgHex('#333333').white.bold(" MOVE HISTORY   "),
    ];

    const maxHistoryToShow = maxLines === 1 ? 5 : (maxLines * 8) - 15;
    const pgnToShow = pgnLines.slice(-maxHistoryToShow > 0 ? -maxHistoryToShow : 0);
    if (pgnToShow.length === 0) infoLines.push(chalk.dim("  No hay movimientos aún."));
    else pgnToShow.forEach(l => infoLines.push(`  ${l}`));

    const totalBoardLines = 8 * maxLines;
    while (infoLines.length < totalBoardLines - 5) {
        infoLines.push("");
    }

    infoLines.push(chalk.bgHex('#333333').white.bold(" WHITE MATERIAL "));
    infoLines.push(`  ${captured.white || 'Ninguno'}`);
    infoLines.push("");
    if (lastMessage) {
        infoLines.push(chalk.yellow(" ⚠️ Mensaje:"));
        infoLines.push(`  ${lastMessage}`);
    }

    // Cabecera superior del tablero (solo márgenes)
    output += "       \n";

    grid.forEach((row: SquareData[], rowIndex: number) => {
        for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
            
            // Etiqueta del Rank centrada verticalmente
            if (lineIndex === Math.floor(maxLines / 2)) {
                output += chalk.gray(`   ${row[0].algebraic.charAt(1)}   `);
            } else {
                output += "       ";
            }

            row.forEach((square: SquareData) => {
                let bgColor = square.isLight ? lightSquareColor : darkSquareColor;
                
                if (square.isLastMoveOrigin || square.isLastMoveDestination) {
                    bgColor = lastMoveColor;
                }
                if (square.isSelected) bgColor = selectionColor;

                const bgTheme = chalk.bgHex(bgColor);

                if (square.piece) {
                    const iconLine = asciiPieces[square.piece.type][lineIndex];
                    const styledIcon = pieceStyle[square.piece.color](iconLine);
                    output += bgTheme(styledIcon);
                } else {
                    output += bgTheme(" ".repeat(targetWidth));
                }
            });
            
            const globalLineIndex = (rowIndex * maxLines) + lineIndex;
            if (infoLines[globalLineIndex] !== undefined) {
                output += `    │  ${infoLines[globalLineIndex]}`;
            }
            output += "\n";
        }
    });

    // Etiquetas de File en la parte inferior
    const centerPadLeft = Math.floor(targetWidth / 2);
    const centerPadRight = targetWidth - centerPadLeft - 1;
    let fileLabels = "       ";
    ['a','b','c','d','e','f','g','h'].forEach(letter => {
        fileLabels += " ".repeat(centerPadLeft) + letter + " ".repeat(centerPadRight);
    });
    output += chalk.gray(fileLabels) + "\n";

    // Completar líneas de info restantes si el HUD es más grande
    for(let i = totalBoardLines; i < infoLines.length; i++) {
        output += "       " + " ".repeat(targetWidth * 8) + `    │  ${infoLines[i]}\n`;
    }
    
    output += "\n" + chalk.dim("  Comandos: 'e4', 'Nf3', 'e2 e4', 'undo', 'theme Matrix', 'style compact', 'export pgn', 'quit'") + "\n";
    lastMessage = ""; 
    process.stdout.write(output);
}

// ══════════════════════════════════════════════════
//  REPL Y UX INTERACTIVA
// ══════════════════════════════════════════════════
import { input as promptInput, select } from '@inquirer/prompts';

async function promptMove() {
    const answer = await promptInput({ message: chalk.green(`Tu jugada / comando >`) });
    const input = answer.trim();
    const parts = input.split(/\s+/);

    if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') {
        process.stdout.write("\x1b[2J\x1b[3J\x1b[H"); // Clear screen
        console.log(chalk.cyan("\n  ¡Gracias por jugar!\n"));
        process.exit(0);
        return;
    }

    if (input === 'undo') historyManager.undo();
    else if (input === 'redo') historyManager.redo();
    else if (input === 'start') historyManager.goToStart();
    else if (input === 'end') historyManager.goToEnd();
    else if (input === 'export pgn') {
        fs.writeFileSync('export.pgn', engine.getPgn());
        lastMessage = chalk.cyan(`💾 PGN guardado exitosamente en 'export.pgn'`);
    } else if (parts[0] === 'fen' && parts.length > 1) {
        if (engine.loadFen(parts.slice(1).join(' '))) lastMessage = chalk.cyan(`FEN cargado`);
        else lastMessage = chalk.red(`FEN inválido`);
    } else if (parts[0] === 'mode' && parts[1]) {
        const mode = parts[1].toUpperCase() as any;
        if (['PLAY', 'ANALYSIS', 'SETUP'].includes(mode)) {
            engine.setMode(mode);
            lastMessage = chalk.cyan(`Modo: ${mode}`);
        }
    } else if (input.toLowerCase() === 'theme' || parts[0] === 'theme') {
        // Menú interactivo para seleccionar tema
        const themeName = await select({
            message: 'Selecciona un tema para el tablero:',
            choices: skinsData.skins.map((s: any) => ({ value: s.name, name: s.name }))
        });
        activeSkinName = themeName as string;
        lastMessage = chalk.cyan(`🎨 Tema cambiado a ${themeName}`);
    } else if (input.toLowerCase() === 'style' || parts[0] === 'style') {
        // Menú interactivo para tamaño de piezas
        const requested = await select({
            message: 'Selecciona el tamaño del tablero y las piezas:',
            choices: [
                { value: 'small', name: 'Small (1 línea de alto)' },
                { value: 'compact', name: 'Compact (3 líneas de alto)' },
                { value: 'extended', name: 'Extended (4 líneas de alto)' },
                { value: 'large', name: 'Large (5 líneas de alto, inmenso)' },
            ]
        });
        activeStyleSize = requested;
        lastMessage = chalk.cyan(`📏 Tamaño de piezas cambiado a ${requested}`);
    } else {
        const moves = engine.getAllLegalMoves();
        let moveFound = false;

        if (parts.length === 1) { 
            const move = moves.find(m => m.san === input);
            if (move) { board.handleMove(move.from, move.to, move.promotion); moveFound = true; }
        } else if (parts.length === 2) { 
            const move = moves.find(m => m.from === parts[0] && m.to === parts[1]);
            if (move) { board.handleMove(move.from, move.to, move.promotion); moveFound = true; }
        } else if (parts.length === 3) { 
            const move = moves.find(m => m.from === parts[0] && m.to === parts[1] && m.promotion === parts[2]);
            if (move) { board.handleMove(move.from, move.to, move.promotion); moveFound = true; }
        }

        if (!moveFound && input.length > 0) lastMessage = chalk.red(`❌ Comando inválido.`);
    }

    drawTui(board.getBoardSnapshot());
    promptMove();
}

drawTui(board.getBoardSnapshot());
promptMove();
