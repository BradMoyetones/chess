// src/Types/puzzle.types.ts
// Tipos para el sistema de puzzles (Fase 4).
// Definidos desde ahora para que el sistema de eventos los conozca.

import type { Color } from 'chess.js';

/**
 * Configuración de un puzzle individual.
 * Un puzzle se define por una posición inicial (FEN) y una secuencia de movimientos correctos.
 */
export interface PuzzleConfig {
    id: string;
    fen: string;                    // Posición inicial del puzzle
    solution: string[];             // Movimientos correctos en SAN ['Qh7+', 'Kf8', 'Qh8#']
    playerColor: Color;             // ¿Qué color juega el humano?
    rating?: number;                // Dificultad (ELO rating del puzzle)
    themes?: string[];              // Temas tácticos ['mate-in-2', 'sacrifice', 'pin']
}

/**
 * Estado actual de un puzzle en ejecución.
 */
export interface PuzzleState {
    status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
    currentStepIndex: number;       // Posición actual en el array solution
    playerMoves: string[];          // Movimientos que el humano ha jugado
    opponentAutoMoves: string[];    // Respuestas automáticas del "oponente fantasma"
}
