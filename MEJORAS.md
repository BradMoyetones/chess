# 🏗️ Chess-Test Enterprise Refactor — Walkthrough

## Resumen

Refactor completo del proyecto chess-test para llevarlo a nivel empresarial. Se reestructuró la arquitectura frontend con el patrón **Ports & Adapters**, se migró estado a **Zustand**, se corrigieron **memory leaks críticos**, se mejoró la librería core, y se refactorizó el servidor.

---

## 🏛️ Arquitectura: BoardController Port + Adapters

### El Problema
Antes, `GameBoard` (el componente del tablero) estaba fuertemente acoplado a la lógica de juego online. Recibía `app`, `boardSnapshot`, `setBoardSnapshot`, `playerColor`, `emitMove`, etc. como props directos, haciendo imposible reutilizarlo para otros modos (bot, análisis).

### La Solución: Port & Adapters
```
┌──────────────────┐     ┌─────────────────────┐
│  Board.tsx        │────▶│  BoardController     │  ◀── PORT (interfaz)
│  (UI pura)        │     │  (port)              │
└──────────────────┘     └─────────────────────┘
                                    ▲
                    ┌───────────────┼───────────────┐
                    │               │               │
            ┌───────┴──────┐ ┌─────┴──────┐ ┌─────┴──────┐
            │ OnlineBoard  │ │ BotBoard   │ │ Analysis   │  ◀── ADAPTERS
            │ Controller   │ │ Controller │ │ Board Ctrl │
            └──────────────┘ └────────────┘ └────────────┘
```

### Archivos Creados

#### Port (interfaz)
- [BoardController.port.ts](./apps/chess-test/src/modules/board/core/ports/BoardController.port.ts) — Interfaz central con 25+ métodos: orientación, estado, movimiento, selección, anotaciones, efectos, navegación, eventos

#### Adapters
- [OnlineBoardController.ts](./apps/chess-test/src/modules/game/online/adapters/OnlineBoardController.ts) — Solo mueve piezas del color del jugador, emite movimientos por socket, maneja premoves
- [BotBoardController.ts](./apps/chess-test/src/modules/game/computer/adapters/BotBoardController.ts) — Sin socket, undo/redo libre, timeout tracking
- [AnalysisBoardController.ts](./apps/chess-test/src/modules/game/analysis/adapters/AnalysisBoardController.ts) — Ambos colores mueven, sin game over, variaciones permitidas

#### Bridge Hooks
- [useOnlineBoardController.ts](./apps/chess-test/src/modules/game/online/hooks/useOnlineBoardController.ts) — Crea y mantiene instancia estable del controller
- [useBotBoardController.ts](./apps/chess-test/src/modules/game/computer/hooks/useBotBoardController.ts)

---

## 🔧 Hooks Compartidos (antes duplicados)

| Hook | Qué eliminó | Archivo |
|------|-------------|---------|
| `useBoardSize` | ResizeObserver duplicado en Online + Computer | [useBoardSize.ts](./apps/chess-test/src/modules/board/ui/hooks/useBoardSize.ts) |
| `useChessAudio` | Audio sync duplicado (22 líneas × 2) | [useChessAudio.ts](./apps/chess-test/src/modules/board/ui/hooks/useChessAudio.ts) |
| `useChessPieces` | Reconciliación de piezas (stable IDs) | [useChessPieces.ts](./apps/chess-test/src/modules/board/ui/hooks/useChessPieces.ts) |
| `computeMaterialAdvantage` | Cálculo de ventaja material (3 copias) | [ComputeMaterial.usecase.ts](./apps/chess-test/src/modules/board/core/usecases/ComputeMaterial.usecase.ts) |

---

## 🐛 Memory Leaks Corregidos

### 1. `botSocket` global (CRÍTICO)
```diff
-const botSocket = io(import.meta.env.VITE_WS_URL); // ❌ Módulo-level, NUNCA se cierra
+const botSocketRef = useRef<Socket | null>(null);    // ✅ Component-scoped
+useEffect(() => { return () => botSocketRef.current?.close(); }, []);
```

### 2. `localAdapterInstance` global (CRÍTICO)
```diff
-let localAdapterInstance: StockfishAdapter | null = null; // ❌ Survives unmount, leaks WebWorker
+const localAdapterRef = useRef<StockfishAdapter | null>(null); // ✅ Cleaned on unmount
+useEffect(() => { return () => localAdapterRef.current?.destroy?.(); }, []);
```

---

## ⚡ Performance: Zustand Store

### El Problema
El Board se re-renderizaba completo (64 casillas + piezas) cada vez que cambiaba cualquier parte del estado.

### La Solución
- [useBoardStore.ts](./apps/chess-test/src/modules/board/ui/store/useBoardStore.ts) — Store con `subscribeWithSelector`
- **Granular selectors**: `useBoardGrid()`, `useIsGameOver()`, `useBoardAnnotations()`, etc.
- **Diff-based updates**: `syncFromController()` solo actualiza campos que realmente cambiaron
- **Drag sin re-renders**: hover square usa `useRef`, DOM directo

### Otras optimizaciones ya implementadas
- `InteractionGrid` memo'd — 64 divs invisibles que solo cambian con flip
- `useChessPieces` — reconciliación estable que mantiene `key` IDs entre renders
- Refs para drag position — `activePiece.current.style.left` directo, cero setState

---

## 📦 Core Library (`@chess-fw/core`)

Mejoras implementadas por subagente (build + 100/100 tests ✅):

| Mejora | Método |
|--------|--------|
| Orientación del tablero | `flipBoard()`, `setBoardOrientation()`, `getBoardOrientation()` |
| Piezas capturadas | `getCapturedPieces()` → `{ w: PieceSymbol[], b: PieceSymbol[] }` |
| Ventaja material | `getMaterialAdvantage()` → puntuación estándar (p=1, n/b=3, r=5, q=9) |
| Resultado de partida | `getResult()`, `setResult()`, tipo `GameResult` exportado |
| Protocolo draw/resign | `resign()`, `offerDraw()`, `acceptDraw()`, `declineDraw()` |
| Reset | `ChessApp.resetGame()` — limpia engine + annotations + interaction |
| Fix nodeCounter | Movido de global a per-GameTree |
| Fix VARIATION_SELECTED | Emitido en `goToMove()` cuando navega fuera de mainline |

---

## 🖥️ Server Refactor

Mejoras implementadas por subagente (syntax check ✅):

- **`types.js`** — JSDoc typedefs para `PlayerData`, `TimeControl`, `GameResult`, `GameRecord`
- **Rematch** — `request_rematch`, `accept_rematch`, `decline_rematch` endpoints
- **`game_over`** — Almacena resultado, notifica oponente
- **Move validation** — Verifica que el socket es jugador del room + turno correcto
- **Auto-forfeit** — 30s disconnect timer con limpieza
- **Helpers extraídos** — `createRoom()`, `createPlayer()`, `getPlayerRole()`, etc.

---

## ✅ Verificación

| Check | Resultado |
|-------|-----------|
| `tsc -b` (frontend) | ✅ Sin errores |
| `vite build` (producción) | ✅ 704KB bundle |
| `vitest run` (core) | ✅ 100/100 tests, 9 files |
| `node --check index.js` (server) | ✅ Sin errores de sintaxis |

---

## 📁 Estructura Final de Módulos

```
src/modules/
├── board/
│   ├── core/
│   │   ├── ports/
│   │   │   └── BoardController.port.ts      ← Interfaz central
│   │   └── usecases/
│   │       └── ComputeMaterial.usecase.ts    ← Lógica de negocio pura
│   └── ui/
│       ├── components/
│       │   ├── Board.tsx                     ← UI agnóstica
│       │   ├── BoardEffects.tsx              ← Sistema de efectos declarativo
│       │   ├── GameHistoryPanel.tsx           ← Panel de historial
│       │   ├── PGNNavigation.tsx             ← Botones de navegación
│       │   └── PlayerInfoBar.tsx             ← Barra de jugador
│       ├── hooks/
│       │   ├── useBoardSize.ts
│       │   ├── useChessAudio.ts
│       │   ├── useChessPieces.ts
│       │   └── useMaterialAdvantage.ts
│       ├── store/
│       │   └── useBoardStore.ts              ← Zustand store
│       └── index.ts                          ← Barrel export
├── game/
│   ├── online/
│   │   ├── adapters/
│   │   │   └── OnlineBoardController.ts
│   │   └── hooks/
│   │       └── useOnlineBoardController.ts
│   ├── computer/
│   │   ├── adapters/
│   │   │   └── BotBoardController.ts
│   │   └── hooks/
│   │       └── useBotBoardController.ts
│   └── analysis/
│       └── adapters/
│           └── AnalysisBoardController.ts
└── shared/
    └── utils/
        └── coordinates.ts                    ← Utilidades centralizadas
```

---

# 🐛 Bug Fix Sprint — Walkthrough

## Resumen

Se corrigieron 4 categorías de bugs reportados, con 1 causa raíz que explicaba la mayoría de los síntomas visibles.

---

## Fix 2A: Zustand Re-render (CAUSA RAÍZ) 

### El problema
`Board.tsx` leía `selectedSquare`, `validDestinations`, y `premoves` **directamente del controller** (imperativo) pero solo se re-renderizaba cuando campos del Zustand store cambiaban (`orientation`, `isGameOver`, `isInteractive`). Al seleccionar una pieza, ninguno de esos campos cambiaba → **React nunca re-renderizaba** → destinos no aparecían → movimientos no se podían completar.

### La solución (3 partes)

#### 1. Agregar eventos de selección al `onBoardChange`

```diff
 // En los 3 adapters: Online, Bot, Analysis
 onBoardChange(callback: () => void): () => void {
     const unsubs = [
         this.app.events.on('BOARD_UPDATED', callback),
         this.app.events.on('PREMOVE_CANCELLED', callback),
         this.app.events.on('PREMOVE_QUEUED', callback),
+        this.app.events.on('SQUARE_SELECTED', callback),
+        this.app.events.on('SQUARE_DESELECTED', callback),
     ];
     return () => unsubs.forEach((unsub) => unsub());
 }
```

#### 2. Zustand store: usar `getValidDestinations()` del InteractionManager

```diff
 // useBoardStore.ts
- const newLegal = newSelected ? controller.getLegalDestinations(newSelected) : [];
- const newPremoveMoves = newSelected ? controller.getPremoveDestinations(newSelected) : [];
+ const newValidDests = newSelected ? controller.getValidDestinations() : [];
```

Esto garantiza que el store contenga **premove destinations** cuando no es tu turno.

#### 3. Board.tsx: leer del store, no del controller

```diff
 // Board.tsx — subscriptions
+ const selectedSquareAlg = useBoardStore((s) => s.selectedSquare);
+ const storeValidDests = useBoardStore((s) => s.validDestinations);
+ const storePremoves = useBoardStore((s) => s.premoves);

 // Derived state — ahora reactivo
- const selectedSquareAlg = controller.getSelectedSquare();
- const validDestinations = ... controller.getValidDestinations() ...
+ const validDestinations = ... storeValidDests.map(...) ...
```

### Archivos modificados
- [OnlineBoardController.ts](./apps/chess-test/src/modules/game/online/adapters/OnlineBoardController.ts)
- [BotBoardController.ts](./apps/chess-test/src/modules/game/computer/adapters/BotBoardController.ts)
- [AnalysisBoardController.ts](./apps/chess-test/src/modules/game/analysis/adapters/AnalysisBoardController.ts)
- [useBoardStore.ts](./apps/chess-test/src/modules/board/ui/store/useBoardStore.ts)
- [Board.tsx](./apps/chess-test/src/modules/board/ui/components/Board.tsx)

---

## Fix 2B/2C: Premove Cancellation

### El problema
- Click en casilla vacía no cancelaba premoves
- Seleccionar otra pieza propia no cancelaba premoves
- Left click en el tablero no limpiaba premoves

### La solución

#### InteractionManager.ts — 2 cambios en `selectSquare()`

```diff
 // Caso 2: Seleccionar pieza propia en turno
 if (mode !== 'PLAY' || piece.color === turn) {
+    if (this.premoveQueue.length > 0) {
+        this.clearPremoves();
+    }
     this.selectedSquare = square;

 // Caso 3: Click en vacío
+if (this.premoveQueue.length > 0) {
+    this.clearPremoves();
+}
 this.clearSelection();
```

#### Board.tsx — `handleBoardMouseDown` left click

```diff
 if (e.button === 0) {
     controller.clearAnnotations();
+    controller.clearPremoves();
     syncBoard();
 }
```

### Archivos modificados
- [InteractionManager.ts](./packages/core/src/Managers/InteractionManager.ts)
- [Board.tsx](./apps/chess-test/src/modules/board/ui/components/Board.tsx)

---

## Fix 1: Smart Premove Destinations

### El problema
`getPremoveDestinationsFor` agregaba capturas diagonales de peón a casillas vacías **incondicionalmente**, causando falsos positivos (e.g., c2→b3/d3 al inicio cuando ninguna pieza rival puede llegar allí).

### La solución: Filtrado por alcanzabilidad del rival

```
Para cada diagonal vacía del peón:
  1. Calcular movimientos legales del rival (chess.moves())
  2. Construir Set de casillas alcanzables
  3. Solo agregar diagonal si rivalReachable.has(diag) === true
```

**Rendimiento**: O(1 clone + ~30 comparaciones) — insignificante.

### Archivos modificados
- [ChessEngine.ts](./packages/core/src/Core/ChessEngine.ts) — método `getPremoveDestinationsFor()`

---

## Fix 3: Online Sockets

### Diagnóstico
El subagente de investigación confirmó que **la cadena de sockets es correcta**:
- Asignación de colores: servidor asigna `hostColor` y `guestColor = opuesto(hostColor)` ✅
- Emisión: `handleSquareClick → onMoveEmit → socket.emit('move')` ✅
- Recepción: `socket.on('move_received') → attemptMove → BOARD_UPDATED → syncBoard` ✅

**El problema visible era consecuencia del Fix 2A**: sin re-render, el usuario no podía ver destinos → no podía completar click-to-move → parecía que los movimientos no se emitían.

---

## Verificación

| Test | Resultado |
|------|-----------|
| `pnpm --filter @chess-fw/core test` | 100/100 ✅ |
| `npx tsc -b` (frontend) | 0 errores ✅ |
