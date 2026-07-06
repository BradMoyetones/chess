// Modos de ejecución del motor: controlan qué reglas aplican.

/**
 * Los tres modos de operación del motor.
 * 
 * PLAY     → Ajedrez estricto. Turnos enforced, reglas completas.
 * ANALYSIS → Reglas aplican pero sin restricción de turno. Permite variantes.
 * SETUP    → chess.js bypassed. Colocación libre de piezas para armar posiciones.
 */
export type EngineMode = 'PLAY' | 'ANALYSIS' | 'SETUP';
