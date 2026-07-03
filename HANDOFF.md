# 🤝 Chess Framework — Handoff para Continuación

> **Contexto:** Este documento contiene TODO lo que necesitas para continuar el desarrollo del Chess Framework. Lee este documento COMPLETO antes de escribir una sola línea de código.

---

## 🎯 Objetivo del Proyecto

Transformar un motor de ajedrez TypeScript headless en un **Framework Multi-Contexto** de nivel plataforma. El framework es **agnóstico de UI** — genera un `BoardSnapshot` que cualquier frontend (React, Vue, Svelte, Vanilla JS) consume para renderizar.

## 📋 Estado Actual — QUÉ YA ESTÁ HECHO

### Fases Completadas ✅

| Fase | Descripción | Estado |
|---|---|---|
| **Fase 0** | Infraestructura (EventBus upgrade, tipos, Vitest) | ✅ 100% |
| **Fase 1** | Máquina del Tiempo (Game Tree, undo/redo, FEN/PGN, castling, promotion) | ✅ 100% |
| **Fase 2** | Capa Visual (InteractionManager, AnnotationManager, HeadlessBoard v2) | ✅ 100% |
| **Fase 3** | Annotations — ya incluido en Fase 2 (AnnotationManager) | ✅ 100% |

### Verificación
- **54 tests pasando** (Vitest) — 0 fallos
- **0 errores TypeScript** — `npx tsc --noEmit` limpio
- **Demo funcional** — `npx tsx src/chess-console.ts`

---

## 📁 Arquitectura de Archivos

```
/Users/itsbrad/Documents/Javascript/chess/
├── src/
│   ├── Core/
│   │   ├── ChessEngine.ts          ← Orquestador central (541 líneas)
│   │   ├── EventBus.ts             ← Bus de eventos tipado con on/off/once
│   │   ├── GameTree.ts             ← Árbol de nodos para variantes
│   │   ├── HeadlessBoard.ts        ← Generador del BoardSnapshot
│   │   └── MoveNode.ts             ← Nodo atómico del Game Tree
│   ├── Managers/
│   │   ├── AnnotationManager.ts    ← Flechas, círculos, highlights
│   │   ├── AudioManager.ts         ← Sonidos por evento
│   │   ├── HistoryManager.ts       ← API de Time Travel
│   │   ├── InteractionManager.ts   ← Click-to-move, selección
│   │   └── ThemeManager.ts         ← Director de arte
│   ├── Types/
│   │   ├── annotation.types.ts     ← Arrow, Circle, Highlight
│   │   ├── board.types.ts          ← BoardSnapshot, SquareData
│   │   ├── engine.types.ts         ← EvaluationData, StockfishConfig (listo)
│   │   ├── events.types.ts         ← 34 tipos de eventos
│   │   ├── game-tree.types.ts      ← MoveData, MoveResult
│   │   ├── index.ts                ← Barrel exports
│   │   ├── mode.types.ts           ← EngineMode
│   │   ├── puzzle.types.ts         ← PuzzleConfig, PuzzleState (listo)
│   │   └── theme.types.ts          ← ThemeConfig
│   ├── index.ts                    ← API pública del framework
│   └── chess-console.ts            ← Demo interactivo en terminal
├── tests/
│   ├── core/
│   │   ├── ChessEngine.test.ts     ← 27 tests
│   │   ├── EventBus.test.ts        ← 7 tests
│   │   └── GameTree.test.ts        ← 11 tests
│   └── managers/
│       └── AnnotationManager.test.ts ← 9 tests
├── vitest.config.ts
├── tsconfig.json
├── package.json                    ← scripts: test, test:watch, play, dev
└── pnpm-lock.yaml
```

---

## 🔧 Convenciones del Proyecto

### Estilo de Código
- **Idioma del código**: TypeScript estricto (`strict: true`)
- **Comentarios**: En español (el autor es hispanohablante)
- **Secciones**: Separadas con barras `═══` estilo box-drawing
- **Documentación**: JSDoc en cada método público
- **Pattern**: Event-Driven + Headless + Dependency Injection

### Dependencias
- `chess.js` — Motor de reglas de ajedrez
- `chalk` — Colores en terminal (solo para el demo)
- `tsx` — Ejecución TypeScript
- `vitest` — Testing

### Tipos Clave Ya Definidos (usar estos, NO crear nuevos)

**`EngineMode`** = `'PLAY' | 'ANALYSIS' | 'SETUP'`

**`MoveResult`** = Union discriminada:
```typescript
| { success: true; move: MoveData }
| { success: false; reason: 'illegal' | 'wrong_turn' | 'game_over' }
| { success: false; reason: 'promotion_required'; from: string; to: string }
```

**`BoardSnapshot`** = El contrato principal del framework. Tiene 4 capas:
- `gameState` — turno, check, mate, FEN, modo, evaluación
- `board` — SquareData[][] con flags visuales
- `visuals` — lastMove, selectedSquare, validDestinations, premoves, annotations
- `history` — canUndo, canRedo, moveCount, currentIndex, hasVariations

### Eventos Ya Definidos (en events.types.ts)
Los eventos para puzzles y stockfish YA están tipados:
- `PUZZLE_STARTED`, `PUZZLE_CORRECT_MOVE`, `PUZZLE_FAILED`, `PUZZLE_COMPLETED`
- `EVALUATION_UPDATED`, `BEST_MOVE`, `ENGINE_READY`, `ENGINE_ERROR`

### ChessEngine — API Pública Existente
```typescript
// Movimientos
attemptMove(from, to, promotion?): MoveResult
isPromotionMove(from, to): boolean
getPieceAt(square): PieceData | null
getLegalMovesFor(square): string[]
getAllLegalMoves(): Move[]

// Navegación
undo(): boolean
redo(): boolean
goToStart(): void
goToEnd(): void
goToMove(nodeId): boolean

// FEN/PGN
loadFen(fen): boolean
loadPgn(pgn): boolean
getFen(): string
getPgn(): string

// Modos
setMode(mode: EngineMode): void
getMode(): EngineMode

// SETUP mode
placePiece(square, type, color): boolean
removePiece(square): boolean
clearBoard(): void

// Estado
getTurn(), getMoveNumber(), isCheck(), isCheckmate(), isStalemate(), isDraw(), isGameOver()
canUndo(), canRedo()
getLastMove(): { from, to } | null
getGameTree(): GameTree
resetGame(fen?): void
```

---

## 🚧 FASES PENDIENTES — QUÉ FALTA POR IMPLEMENTAR

### Fase 2.5: Pre-Moves (Prioridad: Media)

Pre-moves son movimientos que el jugador hace ANTES de que sea su turno. Se encolan y se ejecutan automáticamente cuando llega el turno.

**Archivos a modificar:**
- `src/Managers/InteractionManager.ts` — Agregar cola de pre-moves
- `src/Core/ChessEngine.ts` — Detectar turno y ejecutar pre-move pendiente

**Lógica:**
1. Si el jugador intenta mover una pieza cuando NO es su turno → encolar como pre-move
2. Cuando llega su turno (evento `BOARD_UPDATED` + turno correcto) → intentar ejecutar el pre-move
3. Si el pre-move es ilegal en la nueva posición → cancelar y emitir `PREMOVE_CANCELLED`
4. Si es legal → ejecutar y emitir `PREMOVE_EXECUTED`

**Eventos ya definidos:** `PREMOVE_QUEUED`, `PREMOVE_EXECUTED`, `PREMOVE_CANCELLED`

**Campos del BoardSnapshot ya preparados:** `visuals.premoves`, `SquareData.isPremoveOrigin`, `SquareData.isPremoveDestination`

---

### Fase 4: PuzzleValidator (Prioridad: Alta)

**Archivo a crear:** `src/Managers/PuzzleValidator.ts`

**Tipos ya definidos en** `src/Types/puzzle.types.ts`:
```typescript
interface PuzzleConfig {
    id: string;
    fen: string;
    solution: string[];        // ['Qh7+', 'Kf8', 'Qh8#']
    playerColor: Color;
    rating?: number;
    themes?: string[];
}

interface PuzzleState {
    status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
    currentStepIndex: number;
    playerMoves: string[];
    opponentAutoMoves: string[];
}
```

**Implementación requerida:**

```typescript
export class PuzzleValidator {
    private config: PuzzleConfig | null = null;
    private state: PuzzleState;
    private engine: ChessEngine;
    private eventBus: EventBus;

    constructor(engine: ChessEngine, eventBus: EventBus) { ... }

    // Carga un puzzle: configura el FEN, cambia a modo PLAY, emite PUZZLE_STARTED
    loadPuzzle(config: PuzzleConfig): void;

    // Intercepta el movimiento del jugador y lo compara con solution[currentStep]
    // Si es correcto → incrementa step, ejecuta respuesta automática del "oponente fantasma"
    // Si todo el solution se completó → emite PUZZLE_COMPLETED
    // Si es incorrecto → emite PUZZLE_FAILED
    validatePlayerMove(moveSan: string): 'correct' | 'incorrect';

    // Retorna el próximo movimiento automático del "oponente" (solution[step+1])
    // Retorna null si es turno del jugador o puzzle terminó
    getOpponentResponse(): string | null;

    // Ejecuta la respuesta del oponente automáticamente con un delay
    private executeOpponentMove(): void;

    isActive(): boolean;
    isComplete(): boolean;
    getProgress(): { current: number; total: number };
    reset(): void;
}
```

**Flujo del puzzle:**
1. `loadPuzzle(config)` → carga FEN, emite `PUZZLE_STARTED`
2. Si `playerColor` es negro, el oponente (blancas) mueve primero automáticamente desde `solution[0]`
3. Jugador mueve → `validatePlayerMove()` compara con `solution[currentStep]`
4. Si correcto → oponente responde automáticamente con `solution[currentStep+1]`
5. Si todos los movimientos del solution se completaron → `PUZZLE_COMPLETED`
6. Si incorrecto → `PUZZLE_FAILED`, el jugador puede reintentar con `reset()`

**Tests a crear:** `tests/managers/PuzzleValidator.test.ts`
- Puzzle de mate en 1: 1 movimiento correcto → COMPLETED
- Puzzle de mate en 2: secuencia correcta de 3 movimientos (player, opponent, player) → COMPLETED
- Movimiento incorrecto → FAILED
- Reset y reintentar
- Verificar que emite los eventos correctos

---

### Fase 5: StockfishAdapter (Prioridad: Alta)

**Archivo a crear:** `src/Adapters/StockfishAdapter.ts`

**Tipos ya definidos en** `src/Types/engine.types.ts`:
```typescript
interface EvaluationData {
    score: number;          // Centipawns
    mate: number | null;
    depth: number;
    bestMove: string;
    ponder: string | null;
    pv: string[];
    nodes: number;
    time: number;
}

interface StockfishConfig {
    wasmPath?: string;      // Browser
    workerPath?: string;    // Browser
    binaryPath?: string;    // Node.js
    defaultDepth: number;
    multiPV?: number;
    threads?: number;
    hashSize?: number;
}
```

**Implementación requerida:**

```typescript
export class StockfishAdapter {
    private worker: Worker | null = null;
    private process: ChildProcess | null = null;  // Node.js
    private isReady: boolean = false;
    private eventBus: EventBus;
    private config: StockfishConfig;
    private messageBuffer: string = '';

    constructor(eventBus: EventBus) { ... }

    // Detecta entorno (browser vs Node) e inicializa el motor
    async init(config: StockfishConfig): Promise<void>;

    // Para browser: crea Web Worker con stockfish.wasm
    private initBrowser(config: StockfishConfig): Promise<void>;

    // Para Node.js: spawns child_process con el binario
    private initNode(config: StockfishConfig): Promise<void>;

    // Evalúa una posición FEN y retorna EvaluationData
    async evaluate(fen: string, depth?: number): Promise<EvaluationData>;

    // Evalúa múltiples líneas (Multi-PV)
    async evaluateMultiPV(fen: string, lines?: number): Promise<EvaluationData[]>;

    // Solo retorna el mejor movimiento
    async getBestMove(fen: string, depth?: number): Promise<string>;

    // Detiene el análisis en curso
    stop(): void;

    // Configura opciones UCI
    setOption(name: string, value: string | number): void;

    // Destruye el worker/process
    destroy(): void;

    isInitialized(): boolean;

    // Envía comando UCI raw
    private sendCommand(cmd: string): void;

    // Parser de output UCI → EvaluationData
    private parseUCIOutput(output: string): Partial<EvaluationData>;

    // Manejo de mensajes del worker
    private onWorkerMessage(msg: string): void;
}
```

**UCI Protocol reference (comandos que envía el adapter):**
```
uci                          → Iniciar protocolo UCI
isready                      → Verificar que el motor está listo
setoption name Hash value 64 → Configurar hash table
position fen <fen>           → Establecer posición
go depth 18                  → Analizar a profundidad 18
go depth 18 multipv 3        → Analizar 3 líneas a profundidad 18
stop                         → Detener análisis
quit                         → Cerrar motor
```

**UCI Output a parsear:**
```
info depth 18 score cp 35 nodes 1234567 time 500 pv e2e4 e7e5 g1f3
bestmove e2e4 ponder e7e5
```

**Decisión ya tomada:** El adapter debe soportar AMBOS entornos (WASM en browser, binario nativo en Node.js). Usar detección de entorno:
```typescript
const isBrowser = typeof window !== 'undefined' && typeof Worker !== 'undefined';
```

**Tests:** Los tests de StockfishAdapter deben usar un mock del Worker/process ya que no podemos tener Stockfish real en tests. Crear `tests/adapters/StockfishAdapter.test.ts` con:
- Parsing de output UCI
- Emisión de eventos correctos
- Manejo de errores
- Lifecycle (init, destroy)

---

### Integración Final

Una vez implementados PuzzleValidator y StockfishAdapter:

1. **Actualizar `src/index.ts`** — Agregar exports:
   ```typescript
   export { PuzzleValidator } from './Managers/PuzzleValidator';
   export { StockfishAdapter } from './Adapters/StockfishAdapter';
   ```

2. **Actualizar `chess-console.ts`** — Agregar comandos:
   - `puzzle <id>` — Cargar y resolver un puzzle
   - `eval` — Evaluar posición actual con Stockfish (si está disponible)

3. **Actualizar `AudioManager.ts`** — Suscribir a eventos de puzzle:
   ```typescript
   eventBus.on('PUZZLE_CORRECT_MOVE', () => playSound('move'));
   eventBus.on('PUZZLE_FAILED', () => playSound('check'));
   eventBus.on('PUZZLE_COMPLETED', () => playSound('gameEnd'));
   ```

4. **BoardSnapshot** — `gameState.evaluation` ya está preparado para recibir `EvaluationData` de Stockfish

---

## 🧪 Comandos de Desarrollo

```bash
# Instalar dependencias
pnpm install     # o: CI=true pnpm install (si hay error de store)

# Correr tests
npm test                          # Todos los tests
npx vitest run --reporter=verbose # Con detalle
npx vitest --watch                # Modo watch

# Type check
npx tsc --noEmit

# Demo interactivo
npx tsx src/chess-console.ts

# Comandos del demo:
# e2 e4          → Mover pieza
# e7 e8 q        → Mover con promoción
# undo / redo    → Time travel
# start / end    → Ir al inicio/final
# fen <string>   → Cargar FEN
# mode play/analysis/setup → Cambiar modo
```

---

## ⚠️ Decisiones de Diseño Ya Tomadas (NO cambiar)

1. **Paquete único** — No monorepo. Extractable en el futuro.
2. **Vitest** desde día 1 — Ya configurado y funcionando.
3. **Pre-Moves pospuestos** a Fase 2.5 — La Fase 2 core (highlights + selection) ya está completa.
4. **StockfishAdapter dual** — Soporta WASM (browser) Y nativo (Node.js).
5. **Breaking change aceptado** — El SquareMetadata viejo fue reemplazado por BoardSnapshot.
6. **EngineMode integrado en ChessEngine** — No se creó ModeManager separado, el engine maneja los modos internamente. Esto fue intencional: reduce indirección.
7. **chess.js como dependencia** — No se reescribió la validación de movimientos. chess.js se usa internamente, el framework lo wrappea.

---

## 🎯 Orden de Implementación Sugerido

1. **PuzzleValidator** (más valor inmediato, tipos ya listos)
2. **Tests de PuzzleValidator**
3. **StockfishAdapter** (más complejo, requiere UCI parsing)
4. **Tests de StockfishAdapter** (con mocks)
5. **Pre-Moves** (extensión del InteractionManager existente)
6. **Integración** (index.ts, console demo, AudioManager)
7. **Tests de integración E2E**

---

> **Nota final:** El proyecto está en `/Users/itsbrad/Documents/Javascript/chess`. Todo compila, todo pasa tests. Solo falta implementar las 3 fases descritas arriba. ¡Éxito! 🚀
