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
