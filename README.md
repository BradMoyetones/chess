# Javascript Chess Engine

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
- **Types**: Centralized TypeScript definitions for the entire project.

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

## Getting Started

To run the advanced console example and play a game:

1. Install dependencies:
   npm install

2. Run the TUI script:
   npm run play:tui

Or on Windows, simply execute the `play-tui.bat` file provided in the root directory.
