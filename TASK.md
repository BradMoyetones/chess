# Tareas Pendientes del Plan Original

- [x] **Fase 4: PuzzleValidator** (Alta Prioridad)
  - [x] Crear `src/Managers/PuzzleValidator.ts`.
  - [x] Implementar validación de movimientos del jugador.
  - [x] Implementar auto-respuesta del oponente ("fantasma").
  - [x] Pruebas unitarias para mates en 1, mates en 2, colores, y reinicios.
  - [x] Integrar eventos de éxito y fallo.

- [x] **Fase 5: StockfishAdapter** (Alta Prioridad)
  - [x] Corregir errores de tipado en `src/Adapters/StockfishAdapter.ts`.
  - [x] Implementar pruebas unitarias para parseo del protocolo UCI y respuestas a bestmove.

- [x] **Fase 2.5: Pre-Moves** (Media Prioridad)
  - [x] Añadir lógica a `InteractionManager.ts` para encolar movimientos.
  - [x] Añadir método `getPremoveDestinationsFor` en `ChessEngine.ts`.
  - [x] Reflejar pre-moves en `BoardSnapshot` a través de `HeadlessBoard.ts`.

- [x] **Integración Final**
  - [x] Actualizar `src/index.ts` para exportar `PuzzleValidator` y `StockfishAdapter`.
  - [x] Modificar `chess-console.ts` para instanciar e incluir comandos `puzzle <id>` y `eval`.
  - [x] Conectar eventos de puzzles (`PUZZLE_CORRECT_MOVE`, `PUZZLE_FAILED`, `PUZZLE_COMPLETED`) en `AudioManager.ts`.
