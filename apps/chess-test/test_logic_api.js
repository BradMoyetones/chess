import { Container, ChessEngine, GameTree, HistoryManager, AnnotationManager } from './node_modules/@chess-fw/core/dist/index.js';
import process from 'process';

function formatMemoryUsage(data) {
  return `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;
}

console.log("=== Testing AnnotationManager ===");
const annotationManager = Container.resolve(AnnotationManager);
const arrowId = annotationManager.addArrow('e2', 'e4', 'green');
const circleId = annotationManager.addCircle('d4', 'blue');
console.log("Annotations added:", annotationManager.getAnnotations());

console.log("\n=== Testing GameTree Independence & Memory ===");
const tree = Container.resolve(GameTree);

console.log("Memory before GameTree deep generation:");
console.log(formatMemoryUsage(process.memoryUsage().heapUsed));

try {
    // Attempting to use GameTree as a standalone structure without ChessEngine valid moves
    for (let i = 0; i < 100000; i++) {
        tree.addMove(`fen_mock_${i}`, {
            from: 'e2', to: 'e4', piece: 'p', color: 'w', san: 'e4', captured: null, isCheck: false, isCheckmate: false, fenAfter: `fen_mock_${i}`
        });
    }
    console.log(`Standalone GameTree nodes (Main Line): ${tree.getMainLine().length}`);
    console.log("Memory after 100,000 mock moves in GameTree:");
    console.log(formatMemoryUsage(process.memoryUsage().heapUsed));
} catch (e) {
    console.error("Failed to use GameTree standalone:", e.message);
}

console.log("\n=== Testing HistoryManager Independence ===");
const historyManager = Container.resolve(HistoryManager);
try {
    console.log("Total moves in HistoryManager before undo:", historyManager.getTotalMoves());
    historyManager.undo();
    console.log("Total moves in HistoryManager after undo:", historyManager.getTotalMoves());
    console.log("Can we get move list?", historyManager.getMoveList().length);
} catch (e) {
    console.error("HistoryManager failed:", e.message);
}

console.log("\n=== Checking ChessEngine integration ===");
const engine = Container.resolve(ChessEngine);
try {
    engine.initialize();
    console.log("Engine initialized.");
    engine.attemptMove('d2', 'd4');
    console.log("Engine move attempted. FEN:", engine.getFen());
    console.log("GameTree Main Line size after engine move:", tree.getMainLine().length);
    console.log("HistoryManager total moves:", historyManager.getTotalMoves());
} catch(e) {
    console.error("Engine failed:", e.message);
}
