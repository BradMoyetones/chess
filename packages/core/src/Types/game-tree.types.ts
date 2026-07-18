// Tipos para el Game Tree: la estructura de datos que permite
// navegar la partida como un árbol con variantes.

import type { PieceSymbol } from 'chess.js';

/**
 * Datos completos de un movimiento individual.
 * Esto es lo que se almacena en cada nodo del Game Tree.
 */
export interface MoveData {
    from: string;           // Casilla de origen (ej: 'e2')
    to: string;             // Casilla de destino (ej: 'e4')
    piece: PieceSymbol;     // Tipo de pieza que se movió
    captured?: PieceSymbol; // Pieza capturada (si hubo captura)
    promotion?: PieceSymbol;// Pieza de promoción (si hubo)
    san: string;            // Notación algebraica estándar (ej: 'Nf3')
    lan: string;            // Notación algebraica larga (ej: 'g1f3')
    fenBefore: string;      // FEN antes del movimiento
    fenAfter: string;       // FEN después del movimiento
    isCheck: boolean;
    isCheckmate: boolean;
    isCastle: boolean;
    isEnPassant: boolean;
    isPromotion: boolean;
}

/**
 * Resultado de intentar ejecutar un movimiento.
 * El motor devuelve esto para que la UI sepa exactamente qué pasó.
 */
export type MoveResult =
    | { success: true; move: MoveData }
    | { success: false; reason: 'illegal' }
    | { success: false; reason: 'wrong_turn' }
    | { success: false; reason: 'game_over' }
    | { success: false; reason: 'promotion_required'; from: string; to: string };
