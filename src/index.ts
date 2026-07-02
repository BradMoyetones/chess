import chalk from "chalk";
import { EventBus } from "./Core/EventBus";
import { ChessEngine } from "./Core/ChessEngine";
import { ThemeManager } from "./Managers/ThemeManager";
import { AudioManager } from "./Managers/AudioManager";
import { HeadlessBoard, SquareMetadata } from "./Core/HeadlessBoard";
import { ThemeConfig } from "./Types"; // O donde hayas puesto tu interface
import * as readline from 'node:readline';

// 1. MOCK DE DATA: El Tema "Bespoke Walnut"
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

// 2. INICIALIZACIÓN DEL SISTEMA
console.log("⚙️ Inicializando el motor...");
const eventBus = new EventBus();
const engine = new ChessEngine(eventBus);
const themeManager = new ThemeManager(bespokeTheme, eventBus);
const audioManager = new AudioManager(eventBus, themeManager);
const board = new HeadlessBoard(themeManager, engine);

// 3. LISTENERS DE PRUEBA (Para ver los eventos en consola)
eventBus.on('PIECE_MOVED', (data) => {
    console.log(`\n📢 EVENTO: Pieza movida de ${data.from} a ${data.to}`);
});
eventBus.on('PIECE_CAPTURED', (data) => {
    console.log(`\n⚔️ EVENTO: ¡Captura brutal en ${data.to}! Se comieron un ${data.capturedPiece}`);
});
eventBus.on('CHECK', (data) => {
    console.log(`\n⚠️ EVENTO: ¡Jaque al rey de color ${data.kingColor}!`);
});

// 4. SIMULACIÓN Y PRUEBAS

console.log("\n--- ESTADO INICIAL ---");
printBoardToConsole(board.getBoardSnapshot());

console.log("\n--- JUGADA 1: Peón Blanco de e2 a e4 ---");
board.handleExternalInteraction('e2', 'e4');
printBoardToConsole(board.getBoardSnapshot());

console.log("\n--- JUGADA 2: Peón Negro de d7 a d5 ---");
board.handleExternalInteraction('d7', 'd5');
printBoardToConsole(board.getBoardSnapshot());

console.log("\n--- JUGADA 3: Peón Blanco captura en d5 ---");
// Esto disparará el evento PIECE_CAPTURED automáticamente
board.handleExternalInteraction('e4', 'd5');
printBoardToConsole(board.getBoardSnapshot());


// --- FUNCIÓN HELPER PARA VISUALIZAR EN CONSOLA (Mejorada) ---
function printBoardToConsole(snapshot: SquareMetadata[][]) {
    let output = "\n";

    // Mapeo simple de iconos. Usamos las versiones "rellenas" para mejor contraste
    const asciiPieces: Record<string, string> = {
        'p': '♟', 'n': '♞', 'b': '♝',
        'r': '♜', 'q': '♛', 'k': '♚'
    };

    // Estilos de color Bespoke para las piezas
    const pieceStyle = {
        'w': chalk.hex('#D4AF37').bold, // Un tono Oro/Latón para las blancas
        'b': chalk.hex('#1A1A1A').bold  // Un gris casi negro para las oscuras
    };

    // Borde superior
    output += chalk.gray("     a   b   c   d   e   f   g   h\n");
    output += chalk.gray("   ┌───┬───┬───┬───┬───┬───┬───┬───┐\n");

    snapshot.forEach((row, rowIndex) => {
        // Coordenada Y (Rank) izquierda
        let rowString = chalk.gray(` ${row[0].algebraic.charAt(1)} │`);

        row.forEach(square => {
            // Aplicamos el color de fondo exacto que provee el ThemeManager
            const bgTheme = chalk.bgHex(square.backgroundColor);

            if (square.piece) {
                const icon = asciiPieces[square.piece.type];
                const styledIcon = pieceStyle[square.piece.color](` ${icon} `);
                rowString += bgTheme(styledIcon) + chalk.gray('│');
            } else {
                // Casilla vacía (3 espacios de ancho para hacerlo "más grande")
                rowString += bgTheme('   ') + chalk.gray('│');
            }
        });

        // Coordenada Y (Rank) derecha
        output += `${rowString} ${chalk.gray(row[0].algebraic.charAt(1))}\n`;

        // Separadores de filas (excepto en la última)
        if (rowIndex < 7) {
            output += chalk.gray("   ├───┼───┼───┼───┼───┼───┼───┼───┤\n");
        }
    });

    // Borde inferior
    output += chalk.gray("   └───┴───┴───┴───┴───┴───┴───┴───┘\n");
    output += chalk.gray("     a   b   c   d   e   f   g   h\n");

    console.log(output);
}