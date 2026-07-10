---
"@chess-fw/core": major
---

Massive architectural refactoring (v2.0) focused on framework independence, memory safety, and Developer Experience (DX).

### Breaking Changes
- **Core UI Removal:** `ThemeManager`, `AudioManager`, and the `ThemeConfig` type have been removed. The Core no longer has opinions on square colors, texture URLs, or sounds.
- **`SquareData` Changes:** `skinUrl` and `backgroundColor` have been removed. The UI must now rely purely on the `isLight`, `piece.type`, and `piece.color` attributes to render the board.
- **Dependency Injection Removed:** The global `Container` singleton and all decorators (`@Service`, `@Inject`, etc.) have been removed. Classes now use explicit constructor injection.

### New Features
- **New `ChessApp` Facade:** Introduced a main class to initialize the library in a single line (`const app = new ChessApp()`), replacing the cumbersome 8-line manual initialization.
- **Multiple Board Support:** Thanks to the removal of the global Singleton, it is now possible to instantiate multiple `ChessApp` instances on the same page in complete isolation, without state collisions.
- **Integrated HistoryManager:** The `HistoryManager` methods (`getMoveList()`, `getTotalMoves()`, etc.) have been directly integrated into `ChessEngine` for a flatter API.

### Bug Fixes
- **Phantom Threefold Repetition (Critical):** Fixed a bug where making "premoves" or invalid moves mutated the live `chess.js` instance, causing false draws due to threefold repetition (`isGameOver() === true`).
- **Memory Leaks Resolved:** 
  - `EventBus.on()` now returns a cleanup function (`() => void`), idiomatic for frameworks like React and Vue.
  - Implemented a teardown pattern (`destroy()`) in `InteractionManager` and `ChessApp` to purge listeners and free memory on unmounts.