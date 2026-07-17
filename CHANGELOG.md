# @chess-fw/core — Changelog

## v2.1.0 — Enterprise Refactor (2026-07-17)

> **Tipo de cambio**: `minor` — Nuevas funcionalidades, backward compatible con v2.0.0

### ✨ Nuevas funcionalidades

#### Orientación del tablero
- `ChessApp.flipBoard()` — Alterna orientación entre `'w'` y `'b'`
- `ChessApp.setBoardOrientation(color)` — Establece orientación directa
- `ChessApp.getBoardOrientation()` — Getter de orientación actual
- Incluida en `BoardSnapshot.gameState.boardOrientation`

#### Piezas capturadas y ventaja material
- `ChessEngine.getCapturedPieces()` → `{ w: PieceSymbol[], b: PieceSymbol[] }`
  - `w` = piezas capturadas POR blancas (piezas negras tomadas)
  - `b` = piezas capturadas POR negras (piezas blancas tomadas)
- `ChessEngine.getMaterialAdvantage()` → `{ w: number, b: number }`
  - Valores estándar: p=1, n=3, b=3, r=5, q=9
- Incluido en `BoardSnapshot.material`

#### Resultado de partida
- **Tipo exportado**: `GameResult = { winner: 'w' | 'b' | 'draw', reason: string }`
  - Razones: `checkmate`, `stalemate`, `timeout`, `resignation`, `draw_agreement`, `insufficient_material`, `fifty_move`, `threefold_repetition`
- `ChessEngine.getResult()` → `GameResult | null`
- `ChessEngine.setResult(result)` — Para resultados externos (timeout, resign)
- Auto-set cuando se detecta `GAME_OVER` en `attemptMove()`

#### Protocolo de draw/resign
- `ChessEngine.resign(color)` — Establece resultado y emite `GAME_OVER`
- `ChessEngine.offerDraw()` — Emite `DRAW_OFFERED`
- `ChessEngine.acceptDraw()` — Resultado draw por acuerdo + `GAME_OVER`
- `ChessEngine.declineDraw()` — Emite `DRAW_DECLINED`
- Nuevos eventos: `DRAW_OFFERED`, `DRAW_DECLINED`

#### Reset de partida
- `ChessApp.resetGame(fen?)` — Limpia engine + annotations + interaction

### 🐛 Bugfixes

#### Premoves inteligentes estilo chess.com
- `getPremoveDestinationsFor()` reescrito con algoritmo de **alcanzabilidad del rival**:
  - Peones: capturas diagonales a casillas vacías **solo si** el rival puede mover una pieza allí en su turno
  - Algoritmo: `chess.moves()` del rival → `Set<casillas alcanzables>` → filtra diagonales
  - Rendimiento: O(1 clone + ~30 comparaciones) — insignificante
  - **Elimina falsos positivos**: e.g., c2 ya NO muestra b3/d3 en apertura
  - Si el premove resulta ilegal al ejecutarse, se cancela automáticamente
- Antes: agregaba diagonales vacías incondicionalmente (v2.1.0-alpha)

#### Cancelación de premoves en InteractionManager
- `selectSquare()` caso 2: seleccionar pieza propia en turno ahora limpia premoves pendientes
- `selectSquare()` caso 3: click en casilla vacía ahora limpia premoves pendientes
- Comportamiento consistente con chess.com/lichess

#### `nodeCounter` global compartido
- Antes: variable `let nodeCounter = 0` a nivel de módulo, compartida entre TODAS las instancias de `ChessApp`
- Ahora: cada `GameTree` gestiona su propio contador con `nextNodeId()`
- `resetNodeCounter()` mantenido como no-op para backward compat

#### Evento `VARIATION_SELECTED`
- Ahora se emite correctamente en `goToMove()` cuando se navega fuera de la línea principal

### 🖥️ Frontend (chess-test)

#### Fix crítico: Reactividad Zustand ↔ Board.tsx
- `Board.tsx` ahora lee `selectedSquare`, `validDestinations` y `premoves` del **Zustand store** (no directamente del controller)
- Se agregaron `SQUARE_SELECTED` y `SQUARE_DESELECTED` a `onBoardChange()` en los 3 adapters (Online, Bot, Analysis)
- `useBoardStore.syncFromController()` usa `controller.getValidDestinations()` (InteractionManager) en vez de `controller.getLegalDestinations()`
- Esto corrige: destinos no visibles al click, highlights fantasma, y la aparente falta de emisión de movimientos online

#### Cancelación de premoves desde UI
- Left click en el tablero limpia premoves activos
- Right click en el tablero limpia premoves activos (ya existente)

### 📦 Exports nuevos
- `GameResult` (tipo)
- Todos los nuevos métodos accesibles vía API pública

### ⚠️ Notas de migración desde v2.0.0
- **No breaking changes** — todos los métodos nuevos son adiciones
- `BoardSnapshot` ahora incluye `material` y `boardOrientation` (campos opcionales)
- `resetNodeCounter()` sigue exportado pero es no-op

