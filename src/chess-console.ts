import chalk from "chalk";
import { EventBus } from "./Core/EventBus";
import { ChessEngine } from "./Core/ChessEngine";
import { ThemeManager } from "./Managers/ThemeManager";
import { AudioManager } from "./Managers/AudioManager";
import { HeadlessBoard, SquareMetadata } from "./Core/HeadlessBoard";
import { ThemeConfig } from "./Types";
import * as readline from 'node:readline';

const bespokeTheme: ThemeConfig = {
    id: "bespoke-01",
    name: "Bespoke Walnut & Ivory",
    board: {
        lightSquareColor: "#FFFFF0", // Ivory
        darkSquareColor: "#4B3621",  // Dark Walnut
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

const eventBus = new EventBus();
const engine = new ChessEngine(eventBus);
const themeManager = new ThemeManager(bespokeTheme, eventBus);
const audioManager = new AudioManager(eventBus, themeManager); // Aun inicializamos por si hay logs
const board = new HeadlessBoard(themeManager, engine);

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

function printBoardToConsole(snapshot: SquareMetadata[][]) {
    // Volvemos el cursor a la esquina superior izquierda y limpiamos hacia abajo
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);

    let output = chalk.cyan("--- CHESS CONSOLE INTERACTIVE ---") + "\n\n";

    const asciiPieces: Record<string, string> = {
        'p': '♟', 'n': '♞', 'b': '♝',
        'r': '♜', 'q': '♛', 'k': '♚'
    };

    const pieceStyle = {
        'w': chalk.hex('#D4AF37').bold, 
        'b': chalk.hex('#1A1A1A').bold  
    };

    output += chalk.gray("     a   b   c   d   e   f   g   h\n");
    output += chalk.gray("   ┌───┬───┬───┬───┬───┬───┬───┬───┐\n");

    snapshot.forEach((row, rowIndex) => {
        let rowString = chalk.gray(` ${row[0].algebraic.charAt(1)} │`);

        row.forEach(square => {
            const bgTheme = chalk.bgHex(square.backgroundColor);

            if (square.piece) {
                const icon = asciiPieces[square.piece.type];
                const styledIcon = pieceStyle[square.piece.color](` ${icon} `);
                rowString += bgTheme(styledIcon) + chalk.gray('│');
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

    if (lastMessage) {
        output += "\n" + lastMessage + "\n";
        lastMessage = ""; // Limpiamos el mensaje después de mostrarlo
    }

    process.stdout.write(output + "\n");
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function promptMove() {
    rl.question(chalk.green('\nIngresa tu movimiento (ej. "e2 e4") o "quit" para salir: '), (answer) => {
        const input = answer.trim().toLowerCase();
        
        if (input === 'quit' || input === 'exit') {
            console.log(chalk.cyan("¡Gracias por jugar!"));
            rl.close();
            return;
        }

        const parts = input.split(/\s+/);
        if (parts.length === 2) {
            const success = board.handleExternalInteraction(parts[0], parts[1]);
            if (!success) {
                lastMessage = chalk.red(`❌ Movimiento inválido: de ${parts[0]} a ${parts[1]}`);
            }
        } else {
            lastMessage = chalk.yellow("⚠️ Formato incorrecto. Usa 'origen destino', ej. 'e2 e4'.");
        }

        printBoardToConsole(board.getBoardSnapshot());
        promptMove();
    });
}

// Inicializar la terminal
console.clear();
printBoardToConsole(board.getBoardSnapshot());
promptMove();
