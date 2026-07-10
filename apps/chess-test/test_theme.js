import { Container, ThemeManager, ChessEngine, HeadlessBoard } from '@chess-fw/core';

function testWithoutThemeManager() {
    console.log("=== Testing Without ThemeManager ===");
    const engine = Container.resolve(ChessEngine);
    engine.initialize();
    
    // In a pure Node.js/Vanilla environment, we just need the game state.
    // The HeadlessBoard gives us the board snapshot.
    const board = new HeadlessBoard(engine, {});
    const snapshot = board.getBoardSnapshot();
    
    // Developer manually maps pieces to images/characters
    console.log("Turn:", snapshot.gameState.turn);
    console.log("Square a1 piece:", snapshot.board[7][0].piece);
    
    // For Vanilla JS developers, they often just use a dictionary to map:
    // const pieceImages = { 'wR': 'white-rook.svg', 'bR': 'black-rook.svg' };
}

function testWithThemeManager() {
    console.log("\n=== Testing With ThemeManager ===");
    const engine = Container.resolve(ChessEngine);
    engine.initialize();

    const themeManager = Container.resolve(ThemeManager);
    themeManager.initialize({
        boardTheme: { lightSquare: '#f0d9b5', darkSquare: '#b58863' },
        pieceTheme: 'neo'
    });
    
    console.log("Light square color from ThemeManager:", themeManager.getSquareColor(true));
    console.log("White pawn skin from ThemeManager:", themeManager.getPieceSkin('p', 'w'));
    
    // Is this really necessary when doing standard Vanilla JS?
}

const start = performance.now();
testWithoutThemeManager();
const mid = performance.now();
testWithThemeManager();
const end = performance.now();

console.log(`\n=== Performance / Usability ===`);
console.log(`Time without ThemeManager: ${(mid - start).toFixed(4)} ms`);
console.log(`Time with ThemeManager: ${(end - mid).toFixed(4)} ms`);
