// src/index.ts
// API pública del Chess Framework.
// Este es el punto de entrada que los consumidores importan.

// === Core ===
export { EventBus } from './Core/EventBus';
export { ChessEngine } from './Core/ChessEngine';
export { HeadlessBoard } from './Core/HeadlessBoard';
export { GameTree } from './Core/GameTree';
export { MoveNode } from './Core/MoveNode';

// === Managers ===
export { ThemeManager } from './Managers/ThemeManager';
export { AudioManager } from './Managers/AudioManager';
export { InteractionManager } from './Managers/InteractionManager';
export { AnnotationManager } from './Managers/AnnotationManager';
export { HistoryManager } from './Managers/HistoryManager';

// === Types (re-export everything) ===
export * from './Types';