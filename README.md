# Javascript Chess Framework

A purely Object-Oriented Chess Engine and Framework written in TypeScript. This project provides a fully decoupled, extensible architecture to build chess applications, interfaces, and analysis tools without being tied to a specific UI framework.

## Architecture

The framework is highly modular and organized into the following core directories inside `src`:

- **Core**: Contains the central business logic. 
  - `ChessEngine`: The main facade and orchestrator for game rules, move generation, and state management (backed by chess.js).
  - `GameTree` & `MoveNode`: Implements a tree structure for move history, enabling advanced features like variations, branching, and PGN generation.
  - `EventBus`: A pub/sub system that decouples the engine's events from the consumers.
  - `HeadlessBoard`: An abstract representation of the board state that calculates visuals, highlights, and legal moves for the UI to consume.
- **Managers**: Dedicated classes that handle specific domains of a chess application.
  - `InteractionManager`: Handles user interactions (clicks, selections, drag-and-drop logic).
  - `HistoryManager`: Manages Undo/Redo logic and navigation through the `GameTree`.
  - `ThemeManager` & `AudioManager`: Handle the configuration of visual styles and sound effects.
  - `PuzzleValidator`: Specialized logic for puzzle-solving modes.
- **Adapters**: Connectors for external services.
  - `StockfishAdapter`: Enables communication with the Stockfish engine for analysis and playing against the computer.
- **Decorators**: Infrastructure for Dependency Injection (`@Service`, `@Inject`) and logic utilities (`@RequireMode`, `@EmitEvent`).
- **Types**: Centralized TypeScript definitions for the entire project.

### Dependency Injection (DI)

The framework utilizes a modern **Dependency Injection** system. Instead of manually initializing and instantiating every manager, the `Container` automatically resolves and provides the dependencies using the `@Service()` and `@Inject()` decorators. This offers a clean, scalable, and highly decoupled Developer Experience (DX).

## Advanced Console Example (TUI)

To demonstrate the full potential and decoupling of this engine, an advanced Terminal User Interface (TUI) example has been built inside `src/play/chess-advanced-console.ts`. 

This console application fully integrates with the `ChessEngine` and `HistoryManager` to allow users to play a complete game of chess directly from their terminal using standard algebraic notation (SAN) commands (e.g., `e4`, `Nf3`). It features:

- Complete game history and PGN tracking.
- Undo/Redo commands to navigate the move tree.
- Dynamic calculation of captured material.
- An interactive prompt menu to change the visual theme and size of the board in real time.

### Inspiration and Assets

The visual design of the advanced console example is heavily inspired by the `chess-tui` project written in Rust. To achieve the same level of visual fidelity, the ASCII art definitions and color themes (`default_skins.json`) were extracted directly from their repository. 

You can find the original project that inspired this UI here:
https://github.com/thomas-mauran/chess-tui

## Getting Started & Available Commands

To run the project, the following package scripts are provided:

| Command | Description |
| :--- | :--- |
| `pnpm run dev` | Runs the entrypoint (`src/index.ts`) in watch mode. |
| `pnpm run build` | Compiles the TypeScript project into the `dist/` folder. |
| `pnpm run test` | Runs the complete unit test suite using Vitest. |
| `pnpm run test:watch` | Runs Vitest in watch mode. |
| `pnpm run stockfish:install`| Opens the interactive installer to download the Stockfish binary. |
| `pnpm run play:stockfish` | Runs the Stockfish analysis demo (checking for a Mate in 3 in console). |
| `pnpm run play:tui` | Launches the complete chess game directly in your interactive terminal (TUI). |

*(You can also use `npm run <command>` or `yarn <command>` according to your preferred package manager).*

To run the advanced console example and play a game:

1. Install dependencies:
```bash
pnpm install
```

2. Run the TUI script:
```bash
pnpm run play:tui
```
*(Or on Windows, simply execute the `play-tui.bat` file provided in the root directory).*

## External Engines (Stockfish)

To perform position analysis and play against the computer, this framework includes a `StockfishAdapter`. However, the **Stockfish binary executable is not included by default** due to its large size and OS-specific architecture.

To make developers' lives easier, we have created an automated installer script. Just run:

```bash
pnpm run stockfish:install
```

This interactive script (featuring a clean console UI) will:
1. Detect your Operating System (Windows, macOS Intel/M1, Linux Ubuntu).
2. Download the latest official Stockfish 18 release directly from GitHub.
3. Extract the binary using your system's native `tar` command.
4. Move the executable to the `/bin` folder and grant it execution permissions.

### Manual Installation (Alternative)
If you prefer not to use the script, you can download Stockfish manually from [its official repository](https://github.com/official-stockfish/Stockfish/releases) and extract the executable into the `bin/` folder of the project.

## Using the Stockfish Adapter

Normally, communicating with Stockfish implies writing highly verbose code to handle the raw UCI (Universal Chess Interface) text protocol, managing asynchronous workers, and parsing data with complex Regular Expressions.

This framework abstracts **all that pain** into a simple, asynchronous interface:

```typescript
import { Container } from './Decorators/di.decorators';
import { StockfishAdapter } from './Adapters/StockfishAdapter';

const adapter = Container.resolve(StockfishAdapter);

// 1. Initialize the engine providing the binary path
await adapter.init({
    binaryPath: 'bin/stockfish.exe', // Or the corresponding path for your OS
    defaultDepth: 15
});

// 2. Analyze a position (Clean Async Promise)
const result = await adapter.evaluate('1k1r4/pp1b1R2/3q2pp/4p3/2B5/4Q3/PPP2B2/2K5 b - - 0 1', 18);

console.log(result.bestMove); // e.g. "d6d1"
console.log(result.score);    // Evaluation in centipawns
console.log(result.mate);     // e.g. 3 (Mate in 3)
```
