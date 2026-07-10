# @chess-fw/core

A professional, event-driven, framework-agnostic chess engine core built with TypeScript. Provides a complete architecture for building chess applications — from simple PGN viewers to full platforms like chess.com or lichess.org — with time travel (Game Tree), a centralized Event Bus, annotations, puzzles, and Stockfish integration.

## Installation

```bash
# Using npm
npm install @chess-fw/core

# Using pnpm
pnpm add @chess-fw/core

# Using yarn
yarn add @chess-fw/core
```

## Quick Start

```typescript
import { ChessApp } from '@chess-fw/core';

// 1. Create a chess application (one line!)
const app = new ChessApp();

// 2. Make moves
app.move('e2', 'e4');
app.move('e7', 'e5');

// 3. Get the board state for your UI
const snapshot = app.getSnapshot();
console.log(snapshot.gameState.turn);  // 'w'
console.log(snapshot.board[6][4].piece); // { type: 'p', color: 'w' } (pawn on e2... wait, it moved!)

// 4. Undo / Redo
app.undo();
app.redo();

// 5. Handle user clicks (selection + move logic built-in)
app.click('d2'); // selects the pawn, calculates legal destinations
app.click('d4'); // moves the pawn

// 6. Clean up when done
app.destroy();
```

### Multiple Independent Boards

```typescript
// Each ChessApp is fully isolated — no shared state
const board1 = new ChessApp();
const board2 = new ChessApp({ fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2' });

board1.move('e2', 'e4');
// board2 is completely unaffected
```

## Architecture

`@chess-fw/core` is built around two principles:

1. **Standalone Instances:** Each `ChessApp` encapsulates its own `EventBus`, `ChessEngine`, `InteractionManager`, and `AnnotationManager`. No global singletons, no shared state, no collisions.
2. **Event-Driven Design:** Internal modules communicate through an `EventBus` using typed events. Your UI subscribes to events to stay reactive — framework-agnostic (React, Vue, Angular, Svelte, Vanilla JS).

---

## 📖 Table of Contents

1. [ChessApp (Facade)](#1-chessapp-facade)
2. [Core Architecture](#2-core-architecture)
   - [EventBus](#eventbus)
   - [ChessEngine](#chessengine)
   - [HeadlessBoard](#headlessboard)
   - [GameTree](#gametree)
   - [MoveNode](#movenode)
3. [Managers](#3-managers)
   - [InteractionManager](#interactionmanager)
   - [AnnotationManager](#annotationmanager)
   - [PuzzleValidator](#puzzlevalidator)
4. [Adapters](#4-adapters)
   - [StockfishAdapter](#stockfishadapter)
5. [Types & Interfaces](#5-types--interfaces)
6. [Events Reference](#6-events-reference)

---

## 1. ChessApp (Facade)

`ChessApp` is the recommended entry point. It wires all internal components for you.

```typescript
import { ChessApp } from '@chess-fw/core';

const app = new ChessApp({
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // optional
    mode: 'PLAY' // 'PLAY' | 'ANALYSIS' | 'SETUP' (optional, default: 'PLAY')
});
```

### Shortcuts

| Method | Description |
|--------|-------------|
| `getSnapshot()` | Returns the complete `BoardSnapshot` for your UI |
| `move(from, to, promotion?)` | Executes a move, returns `MoveResult` |
| `click(square)` | Handles click-to-move (selection → move → deselection) |
| `undo()` / `redo()` | Time travel |
| `destroy()` | Cleans up all event subscriptions and state |

### Accessing Internal Components

For advanced use cases, you can access the underlying components directly:

```typescript
app.engine       // ChessEngine instance
app.board        // HeadlessBoard instance
app.events       // EventBus instance
app.interaction  // InteractionManager instance
app.annotations  // AnnotationManager instance
```

---

## 2. Core Architecture

### EventBus

Central publish-subscribe system with typed events.

```typescript
const app = new ChessApp();

// Subscribe — returns a cleanup function!
const unsubscribe = app.events.on('PIECE_MOVED', (payload) => {
    console.log(`Moved ${payload.piece} from ${payload.from} to ${payload.to}`);
});

// Unsubscribe (idiomatic for React useEffect / Vue onUnmounted)
unsubscribe();

// Or use once() for one-shot listeners
app.events.once('GAME_OVER', (payload) => {
    console.log('Game ended!', payload.result);
});
```

#### Methods
| Method | Returns | Description |
|--------|---------|-------------|
| `on(event, callback)` | `() => void` | Subscribe. Returns cleanup function |
| `once(event, callback)` | `() => void` | Subscribe for one event only |
| `off(event, callback)` | `void` | Unsubscribe by reference |
| `emit(event, payload)` | `void` | Emit an event |
| `removeAllListeners(event?)` | `void` | Remove all listeners (optionally for specific event) |

### ChessEngine

The core state manager. Wraps `chess.js` rules, manages the Game Tree, and emits events.

```typescript
const app = new ChessApp();
const engine = app.engine;

// Make moves
const result = engine.attemptMove('e2', 'e4');
if (result.success) {
    console.log(`FEN: ${engine.getFen()}`);
    console.log(`Move: ${result.move.san}`); // "e4"
}

// Query state
engine.getTurn();         // 'w' | 'b'
engine.isCheck();         // boolean
engine.isGameOver();      // boolean
engine.getLegalMovesFor('d2'); // ['d3', 'd4']

// Modes
engine.setMode('ANALYSIS'); // Both colors can move freely
engine.setMode('SETUP');    // Place/remove pieces
engine.setMode('PLAY');     // Normal rules

// SETUP mode
engine.setMode('SETUP');
engine.placePiece('e4', 'q', 'w');  // Place white queen on e4
engine.removePiece('e4');            // Remove it
engine.clearBoard();                 // Empty board

// Time travel
engine.undo();
engine.redo();
engine.goToStart();
engine.goToEnd();
engine.goToMove(nodeId);

// Serialization
engine.loadFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
engine.loadPgn('1. e4 e5 2. Nf3 Nc6');
engine.getFen();
engine.getPgn();

// History (migrated from the old HistoryManager)
engine.getMoveHistory();       // MoveData[]
engine.getMoveList();          // MoveData[] (main line)
engine.getCurrentMoveIndex();  // number
engine.getTotalMoves();        // number
```

### HeadlessBoard

Generates the `BoardSnapshot` — a complete, framework-agnostic representation of the board state that any UI can consume.

```typescript
const app = new ChessApp();
const snapshot = app.getSnapshot(); // or app.board.getBoardSnapshot()

// Structure:
snapshot.gameState.turn        // 'w' | 'b'
snapshot.gameState.fen         // current FEN
snapshot.gameState.isCheck     // boolean
snapshot.gameState.isGameOver  // boolean
snapshot.gameState.mode        // 'PLAY' | 'ANALYSIS' | 'SETUP'

snapshot.board[0][0]           // SquareData for a8
snapshot.board[7][7]           // SquareData for h1

// Each SquareData:
// {
//   algebraic: 'e2',
//   isLight: true,
//   piece: { type: 'p', color: 'w' } | null,
//   isSelected: false,
//   isValidDestination: false,
//   isLastMoveOrigin: false,
//   isLastMoveDestination: false,
//   isPremoveOrigin: false,
//   isPremoveDestination: false,
// }

snapshot.visuals.lastMove          // { from, to } | null
snapshot.visuals.selectedSquare    // string | null
snapshot.visuals.validDestinations // string[]
snapshot.visuals.premoves          // Premove[]
snapshot.visuals.annotations       // Annotation[]

snapshot.history.canUndo       // boolean
snapshot.history.canRedo       // boolean
snapshot.history.moveCount     // number
snapshot.history.currentIndex  // number
snapshot.history.hasVariations // boolean
```

> **Note:** `SquareData` does not include `backgroundColor` or `skinUrl`. The UI is responsible for styling — use the `isLight` boolean to determine square colors, and `piece.type` + `piece.color` to map your own piece images.

### GameTree

N-ary tree structure that stores the complete move history with support for variations (branches).

```typescript
const tree = app.engine.getGameTree();

tree.getCurrentNode();   // MoveNode
tree.getMainLine();      // MoveNode[] (root to leaf)
tree.hasVariations();    // boolean
tree.goToNext();         // advance one move
tree.goToPrev();         // go back one move
tree.goToRoot();         // jump to start
tree.goToEnd();          // jump to end
```

### MoveNode

Represents a single position in the Game Tree.

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier (`node_1`, `node_2`, ...) |
| `fen` | `string` | Board position at this node |
| `move` | `MoveData \| null` | The move that led to this position |
| `parent` | `MoveNode \| null` | Parent node |
| `children` | `MoveNode[]` | Child nodes (variations) |
| `comment` | `string` | User annotation |
| `halfMoveIndex` | `number` | Position in the timeline |

---

## 3. Managers

### InteractionManager

Handles user input logic: click-to-move, piece selection, legal destination calculation, and pre-moves.

```typescript
const app = new ChessApp();

// Access via the facade
app.click('e2'); // Selects the pawn

// Or directly
app.interaction.selectSquare('e2');
app.interaction.getSelectedSquare();    // 'e2'
app.interaction.getValidDestinations(); // ['e3', 'e4']
app.interaction.clearSelection();

// Pre-moves (click on out-of-turn pieces in PLAY mode)
app.interaction.getPremoves();  // Premove[]
app.interaction.clearPremoves();

// Memory cleanup
app.interaction.destroy(); // Unsubscribes all EventBus listeners
```

### AnnotationManager

Visual annotation layer for arrows, circles, and highlights.

```typescript
const app = new ChessApp();

// Add annotations
const arrowId = app.annotations.addArrow('d3', 'h7', 'red');
const circleId = app.annotations.addCircle('e4', 'green');
const highlightId = app.annotations.addHighlight('f5', '#ff000044');

// Toggle (add if missing, remove if present)
app.annotations.toggleArrow('e2', 'e4', 'blue');
app.annotations.toggleCircle('d4', 'yellow');

// Query
app.annotations.getAnnotations();             // Annotation[]
app.annotations.getAnnotationsForSquare('e4'); // Annotation[]

// Remove
app.annotations.removeAnnotation(arrowId);
app.annotations.clearAll();
app.annotations.clearByType('arrow');
```

### PuzzleValidator

Puzzle engine for tactical training with automatic opponent responses.

```typescript
import { ChessApp, PuzzleValidator } from '@chess-fw/core';

const app = new ChessApp();
const puzzle = new PuzzleValidator(app.engine, app.events);

puzzle.loadPuzzle({
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
    solution: ['Nxe5', 'Nxe5', 'd4'],
    playerColor: 'w'
});

// Events fired: PUZZLE_STARTED

const result = puzzle.validatePlayerMove('Nxe5');
// result: 'correct' → fires PUZZLE_CORRECT_MOVE
// Opponent auto-responds with 'Nxe5'

puzzle.getProgress(); // { current: 1, total: 2 }
puzzle.isActive();    // true
puzzle.isComplete();  // false

// On wrong move:
puzzle.validatePlayerMove('Bc4'); // 'incorrect' → fires PUZZLE_FAILED
puzzle.reset(); // Retry the same puzzle
```

---

## 4. Adapters

### StockfishAdapter

Multi-environment UCI engine adapter (Node.js child process or Browser WASM Web Workers).

```typescript
import { StockfishAdapter, EventBus } from '@chess-fw/core';
import type { StockfishConfig, EvaluationData } from '@chess-fw/core';

const eventBus = new EventBus();
const stockfish = new StockfishAdapter(eventBus);

// Initialize
await stockfish.init({
    binaryPath: '/path/to/stockfish',  // Node.js
    // wasmPath: '/stockfish.wasm',    // Browser
    defaultDepth: 18,
    threads: 2,
    hashSize: 128,
    multiPV: 3
});

// Evaluate a position
const evaluation: EvaluationData = await stockfish.evaluate(
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    15  // depth
);
console.log(`Best move: ${evaluation.bestMove}`);
console.log(`Score: ${evaluation.score} centipawns`);

// Multi-PV analysis
const lines = await stockfish.evaluateMultiPV(fen, 3);

// Quick best move
const best = await stockfish.getBestMove(fen);

// Cleanup
stockfish.stop();    // Stop current analysis
stockfish.destroy(); // Terminate engine process/worker
```

---

## 5. Types & Interfaces

| Type / Interface | Key Properties |
|:---|:---|
| `ChessAppConfig` | `fen?`, `mode?` |
| `MoveData` | `from`, `to`, `piece`, `captured`, `san`, `lan`, `fenBefore`, `fenAfter`, `isCheck`, `isCheckmate`, `isCastle`, `isEnPassant`, `isPromotion` |
| `MoveResult` | `{ success: true, move: MoveData }` \| `{ success: false, reason: string }` |
| `BoardSnapshot` | `gameState`, `board` (8×8 `SquareData[][]`), `visuals`, `history` |
| `SquareData` | `algebraic`, `isLight`, `piece`, `isSelected`, `isValidDestination`, `isLastMoveOrigin`, `isLastMoveDestination`, `isPremoveOrigin`, `isPremoveDestination` |
| `EvaluationData` | `score`, `mate`, `depth`, `bestMove`, `ponder`, `pv`, `nodes`, `time` |
| `StockfishConfig` | `wasmPath`, `binaryPath`, `defaultDepth`, `multiPV`, `threads`, `hashSize` |
| `EngineMode` | `'PLAY'` \| `'ANALYSIS'` \| `'SETUP'` |
| `PuzzleConfig` | `id?`, `fen`, `solution[]`, `playerColor`, `rating?`, `themes?` |
| `Annotation` | `ArrowAnnotation` \| `CircleAnnotation` \| `HighlightAnnotation` |
| `Premove` | `{ from: string, to: string }` |

---

## 6. Events Reference

The `EventBus` emits typed events. Subscribe with `events.on(eventName, callback)`.

| Event | Payload | When |
|:---|:---|:---|
| `BOARD_UPDATED` | `{}` | After any board state change |
| `PIECE_MOVED` | `MovePayload` | Non-capture move executed |
| `PIECE_CAPTURED` | `CapturePayload` | Capture move executed |
| `CHECK` | `{ color }` | King is in check |
| `GAME_OVER` | `{ result, winner? }` | Game ends (checkmate, draw, stalemate) |
| `CASTLED` | `{ color, side }` | Castling executed |
| `PROMOTED` | `{ color, piece, square }` | Pawn promotion |
| `PROMOTION_REQUIRED` | `{ from, to, color }` | Pawn reaches last rank without promotion piece |
| `MODE_CHANGED` | `{ from, to }` | Engine mode switched |
| `SQUARE_SELECTED` | `{ square, legalMoves }` | User clicks a piece |
| `SQUARE_DESELECTED` | `{}` | Selection cleared |
| `PREMOVE_QUEUED` | `{ from, to }` | Pre-move added to queue |
| `PREMOVE_EXECUTED` | `{ from, to }` | Pre-move successfully executed |
| `PREMOVE_CANCELLED` | `{}` | Pre-move queue cleared |
| `NAVIGATE_TO_MOVE` | `{ nodeId }` | Jumped to specific move in tree |
| `POSITION_LOADED` | `{ fen }` | FEN or PGN loaded |
| `GAME_RESET` | `{}` | Board reset to initial position |
| `VARIATION_CREATED` | `{ parentNodeId, variationNodeId }` | New branch in Game Tree |
| `ANNOTATION_ADDED` | `Annotation` | Annotation created |
| `ANNOTATION_REMOVED` | `{ id }` | Annotation deleted |
| `ANNOTATIONS_CLEARED` | `{}` | All annotations removed |
| `PUZZLE_STARTED` | `PuzzleConfig` | Puzzle loaded |
| `PUZZLE_CORRECT_MOVE` | `{ move, progress }` | Correct puzzle move |
| `PUZZLE_FAILED` | `{ expectedMove, actualMove }` | Wrong puzzle move |
| `PUZZLE_COMPLETED` | `{ totalMoves }` | Puzzle solved |
| `ENGINE_READY` | `{}` | Stockfish initialized |
| `EVALUATION_UPDATED` | `EvaluationData` | New evaluation from Stockfish |
| `BEST_MOVE` | `{ move }` | Stockfish's best move |

---

## License

MIT
