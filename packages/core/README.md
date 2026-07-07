# @chess-fw/core

A professional, event-driven, and highly decoupled chess framework core built with TypeScript. It provides a robust architecture for building advanced chess applications, complete with time travel (Game Tree), a centralized Event Bus, dependency injection, and extensible managers for themes, audio, annotations, and analysis engines like Stockfish.

## Installation

You can install the core package using your preferred package manager:

```bash
# Using npm
npm install @chess-fw/core

# Using pnpm
pnpm add @chess-fw/core

# Using yarn
yarn add @chess-fw/core
```

## Architecture

`@chess-fw/core` is built around two primary architectural patterns:

1. **Dependency Injection (DI):** Instead of manually instantiating classes and managing their dependencies, the framework uses a centralized `Container`. As a consumer of the library, you only need to use the `Container.resolve()` method to retrieve singleton instances of the core services.
2. **Event-Driven Design:** Modules do not call each other directly. Instead, they communicate by emitting and listening to events through a centralized `EventBus`. This ensures high decoupling and makes it trivial to plug in external UI frameworks (React, Vue, or terminal TUI).

---

## 📖 Table of Contents

1. [Core Architecture](#1-core-architecture)
   - [EventBus](#eventbus)
   - [MoveNode](#movenode)
   - [GameTree](#gametree)
   - [ChessEngine](#chessengine)
   - [HeadlessBoard](#headlessboard)
2. [Managers](#2-managers)
   - [InteractionManager](#interactionmanager)
   - [AnnotationManager](#annotationmanager)
   - [ThemeManager](#thememanager)
   - [AudioManager](#audiomanager)
   - [HistoryManager](#historymanager)
   - [PuzzleValidator](#puzzlevalidator)
3. [Adapters](#3-adapters)
   - [StockfishAdapter](#stockfishadapter)
4. [Types & Interfaces](#4-types--interfaces)

---

## 1. Core Architecture

### EventBus
`EventBus` is the central publish-subscribe (PubSub) system of the framework. It is designed as an injectable service that facilitates communication between system components without direct coupling, backed by a strict typing system.

#### Public Methods
- `on(event, callback)`: Subscribes a callback to an event permanently.
- `once(event, callback)`: Subscribes a callback to an event to be executed only once.
- `off(event, callback)`: Unsubscribes a previously registered callback.
- `emit(event, payload)`: Emits a specific event, triggering the synchronous execution of its subscribed callbacks.
- `removeAllListeners(event?)`: Removes registered listeners, optionally filtered by event type.

```typescript
import { Container, EventBus } from '@chess-fw/core';

const eventBus = Container.resolve(EventBus);

const handleGameReset = (payload) => console.info('Game has been reset.', payload);
eventBus.on('GAME_RESET', handleGameReset);

eventBus.emit('MODE_CHANGED', { from: 'PLAY', to: 'ANALYSIS' });
```

### MoveNode
Represents the atomic unit within the positional tree (`GameTree`). Each instance encapsulates a specific "moment" of the game.

#### Properties
- `id`: `string`
- `fen`: `string`
- `move`: `MoveData | null`
- `parent`: `MoveNode | null`
- `children`: `MoveNode[]`
- `comment`: `string`
- `halfMoveIndex`: `number`

#### Public Methods
- `addChild(node: MoveNode)`: Incorporates a child node.
- `getMainLine()`: Returns the successor that has been consolidated as the primary path.
- `getVariations()`: Returns an array of paths excluded from the primary line.
- `isMainLine()`: Logically checks if the current context corresponds to the main line sequence.
- `hasChildren()`: Indicates the ability to navigate deeper into the sequence.

### GameTree
Operates under a "Multiverse Manager" paradigm. It retains the complete graphical mapping of the chess history, enabling topological navigation across time.

#### Public Methods
- `getCurrentNode()`: Returns the currently active operational focus.
- `getRootNode()`: Returns the pristine starting position of the series.
- `goToNext()` / `goToPrev()`: Advances or regresses one step chronologically.
- `goToRoot()` / `goToEnd()`: Transports to the extremities of the chronological line.
- `goToNode(nodeId)`: Arbitrary jump within the tree using an ID.
- `addMove(fen, move)`: Systematically implants a translation event.
- `getMainLine()`: Returns the sequence forming the main line.

```typescript
import { Container, GameTree } from '@chess-fw/core';

const tree = Container.resolve(GameTree);
if (tree.canGoBack()) {
    tree.goToPrev(); 
}
const mainLineMoves = tree.getMainLine();
console.info(`Total nodes in main line: ${mainLineMoves.length}`);
```

### ChessEngine
The primary Multi-Context State Manager of the ecosystem. It wraps strict chess rules, multi-branch analytical structuring, time travel, and transversal reactive emission.

#### Public Methods
- `initialize(initialFen?)`: Enables foundational anchoring.
- `getPieceAt(square)`: Retrieves metadata of a square (`PieceData | null`).
- `attemptMove(from, to, promotion?)`: Evaluates and executes a move. Returns a `MoveResult`.
- `undo()` / `redo()`: Navigation of past/future states.
- `setMode(mode: EngineMode)`: Modifies turn constraints ('PLAY'/'ANALYSIS'/'SETUP').
- `loadFen(fen)` / `loadPgn(pgn)`: Massive state loading.
- `getLegalMovesFor(square)`: Verifies landing viability.
- `placePiece(square, type, color)`: Asymmetrically places pieces (Requires 'SETUP' mode).

```typescript
import { Container, ChessEngine } from '@chess-fw/core';

const engine = Container.resolve(ChessEngine);
engine.setMode('ANALYSIS');

const validDestinations = engine.getLegalMovesFor('e2');
if (validDestinations.includes('e4')) {
    const resolution = engine.attemptMove('e2', 'e4');
    if (resolution.success) console.info(`FEN: ${engine.getFen()}`);
}
```

### HeadlessBoard
The bridge to materialize underlying logic with visualization models (UI Frameworks). Generates the `BoardSnapshot` (a massive snapshot consumable directly by React/Vue).

#### Public Methods
- `getBoardSnapshot(): BoardSnapshot`: Generator of passive topological, visual, and historical states.
- `handleMove(from, to, promotion?)`: Sink for Drag & Drop events.
- `handleSquareClick(square)`: Linker for click-to-move interactions.

```typescript
import { Container, ChessEngine, HeadlessBoard, InteractionManager } from '@chess-fw/core';

const engine = Container.resolve(ChessEngine);
const interactionManager = Container.resolve(InteractionManager);

const boardController = new HeadlessBoard(engine, { interactionManager });
const snapshot = boardController.getBoardSnapshot();

console.info(`Turn: ${snapshot.gameState.turn}`);
console.info(`Square e4 color: ${snapshot.board[4][4].backgroundColor}`);
boardController.handleSquareClick('e2');
```

---

## 2. Managers

### InteractionManager
Bridge between user input and engine logic. Manages square selection, legal destinations, sequential click mechanics, and pre-moves.

- `init()`: Initializes EventBus listeners.
- `selectSquare(square)`: Processes clicks or touches.
- `clearSelection()`, `clearPremoves()`: Clears states.
- `getSelectedSquare()`, `getValidDestinations()`, `getPremoves()`: Retrieves UI state.

```typescript
import { Container, InteractionManager } from '@chess-fw/core';

const interactionManager = Container.resolve(InteractionManager);
interactionManager.init();
interactionManager.selectSquare('e2');
const validDestinations = interactionManager.getValidDestinations();
```

### AnnotationManager
Provides a visual layer to draw arrows, circles, and highlights, vital for didactic tools and analysis.

- `addArrow(from, to, color?)`, `addCircle(square, color?)`, `addHighlight(square, bg)`: Adds visuals and returns an ID.
- `removeAnnotation(id)`, `clearAll()`, `clearByType(type)`: Removes visuals.
- `getAnnotations()`, `getAnnotationsForSquare(square)`: Reads visual state.

```typescript
import { Container, AnnotationManager } from '@chess-fw/core';
const annotationManager = Container.resolve(AnnotationManager);
const arrowId = annotationManager.addArrow('d3', 'h7', 'red');
```

### ThemeManager
Manages visual and acoustic presentation, providing a reactive API for dynamic texture and color changes.

- `initialize(initialTheme)`, `setTheme(newTheme)`: Defines global aesthetics.
- `getSquareColor(isLight)`, `getSquareImage(isLight)`, `getPieceSkin(type, color)`: Retrieves static visual mappings.
- `getSoundUrl(action)`: Extracts URLs of acoustic assets.

### AudioManager
Plays sounds reactively connected to the board (moves, captures, checks). Activates automatically upon resolution.

```typescript
import { Container, AudioManager } from '@chess-fw/core';
// Initialization automatically assumes EventBus subscription
const audioManager = Container.resolve(AudioManager);
```

### HistoryManager
High-level layer for the positional tree. Provides export/import functionalities and time jumps.

- `undo()`, `redo()`, `goToStart()`, `goToEnd()`, `goToMove(nodeId)`: Navigation.
- `exportPgn()`, `importPgn(pgn)`, `exportFen()`, `importFen(fen)`: Data I/O.
- `getMoveList()`, `getTotalMoves()`: Positional metadata.

### PuzzleValidator
Tactical puzzle engine to compare user attempts against structured solutions.

- `loadPuzzle(config)`: Initializes the tactical test and activates automated opponent responses.
- `validatePlayerMove(moveSan)`: Determines tactical progress.
- `isActive()`, `isComplete()`, `isFailed()`, `getProgress()`: Tactical session monitoring.

```typescript
import { Container, PuzzleValidator } from '@chess-fw/core';
const puzzleValidator = Container.resolve(PuzzleValidator);

puzzleValidator.loadPuzzle({
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
    solution: ['Nxe5', 'Nxe5', 'd4'],
    playerColor: 'w'
});
puzzleValidator.validatePlayerMove('Nxe5');
```

---

## 3. Adapters

### StockfishAdapter
Multi-environment UCI abstraction for Node.js (native Child Process) or Browsers (WASM Web Workers). Provides analytical calculations and variations.

#### Public Methods
- `init(config: StockfishConfig)`: Wakes and configures the analysis engine.
- `evaluate(fen, depth)`: Returns an `EvaluationData` resolved asynchronously.
- `evaluateMultiPV(fen, lines)`: Analyzes multiple principal variations.
- `getBestMove(fen, depth)`: Direct UCI attack extracting a single result.
- `stop()`, `destroy()`: Temporary/permanent engine halt and invalidation.

```typescript
import { Container, StockfishAdapter } from '@chess-fw/core';
import type { StockfishConfig, EvaluationData } from '@chess-fw/core';

async function runAnalysis() {
    const adapter = Container.resolve(StockfishAdapter);
    await adapter.init({ binaryPath: '/path/to/stockfish', defaultDepth: 18, threads: 2 });
    
    if (adapter.isInitialized()) {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const evaluation: EvaluationData = await adapter.evaluate(fen, 15);
        console.log(`Best move: ${evaluation.bestMove}`);
    }
}
```

---

## 4. Types & Interfaces

| Type / Interface | Key Properties |
| :--- | :--- |
| `MoveData` | `from`, `to`, `piece`, `captured`, `san`, `isCheck`, `isCheckmate`, `fenAfter` |
| `EvaluationData` | `score` (centipawns), `mate` (moves), `depth`, `pv` (string array), `bestMove` |
| `StockfishConfig`| `wasmPath`, `binaryPath`, `defaultDepth`, `multiPV`, `threads`, `hashSize` |
| `EngineMode` | `'PLAY'` (strict rules), `'ANALYSIS'` (loose rules), `'SETUP'` (board editor) |
| `BoardSnapshot` | `gameState`, `board` (2D Grid), `visuals` (overlays/premoves), `history` |
| `SquareData` | `algebraic`, `backgroundColor`, `piece`, `isSelected`, `isLastMoveOrigin` |
