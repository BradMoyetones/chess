// El contrato del BoardSnapshot: la estructura de datos definitiva
// que el HeadlessBoard entrega a cualquier framework de UI.

import type { PieceSymbol, Color } from 'chess.js';
import type { EngineMode } from './mode.types';
import type { EvaluationData } from './engine.types';
import type { Annotation } from './annotation.types';

/**
 * Resultado de una partida finalizada.
 */
export interface GameResult {
    winner: 'w' | 'b' | 'draw';
    reason: 'checkmate' | 'stalemate' | 'timeout' | 'resignation' | 'draw_agreement' | 'insufficient_material' | 'fifty_move' | 'threefold_repetition';
}

/**
 * Información de material capturado y ventaja.
 */
export interface MaterialInfo {
    capturedByWhite: PieceSymbol[];
    capturedByBlack: PieceSymbol[];
    whiteAdvantage: number;
    blackAdvantage: number;
}

/**
 * Datos de una casilla individual dentro del tablero.
 * Contiene toda la información que la UI necesita para renderizar.
 */
export interface SquareData {
    algebraic: string;              // Coordenada algebraica (ej: 'e4')
    isLight: boolean;               // true = casilla clara, false = oscura

    piece: {
        type: PieceSymbol;
        color: Color;
    } | null;

    // === Visual State Flags ===
    isLastMoveOrigin: boolean;      // ¿Es la casilla de origen del último movimiento?
    isLastMoveDestination: boolean; // ¿Es la casilla de destino del último movimiento?
    isSelected: boolean;            // ¿Está seleccionada actualmente?
    isValidDestination: boolean;    // ¿Es un destino legal para la pieza seleccionada?
    isPremoveOrigin: boolean;       // ¿Es origen de un pre-move?
    isPremoveDestination: boolean;  // ¿Es destino de un pre-move?
}

/**
 * EL SNAPSHOT DEFINITIVO.
 * Esta es la "fotografía" completa del universo del tablero.
 * React, Vue, Svelte, Vanilla JS — todos consumen esto.
 */
export interface BoardSnapshot {
    /** Estado de la partida */
    gameState: {
        turn: Color;
        inCheck: boolean;
        isCheckmate: boolean;
        isStalemate: boolean;
        isDraw: boolean;
        isGameOver: boolean;
        moveNumber: number;
        fen: string;
        mode: EngineMode;
        boardOrientation: 'w' | 'b';
        evaluation?: EvaluationData;    // Inyectado por Stockfish (Fase 5)
        result?: GameResult | null;     // Resultado de la partida
    };

    /** Cuadrícula 8x8 con metadata por casilla */
    board: SquareData[][];

    /** Capa visual (no afecta la lógica del juego) */
    visuals: {
        lastMove: { from: string; to: string } | null;
        selectedSquare: string | null;
        validDestinations: string[];
        premoves: { from: string; to: string }[];
        annotations: Annotation[];
    };

    /** Metadata del historial y navegación */
    history: {
        canUndo: boolean;
        canRedo: boolean;
        moveCount: number;
        currentIndex: number;
        hasVariations: boolean;
    };

    /** Información de material y capturas */
    material?: MaterialInfo;
}
