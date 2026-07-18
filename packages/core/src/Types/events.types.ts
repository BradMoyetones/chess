// Diccionario COMPLETO de eventos del sistema.
// Cada módulo emite y escucha estos eventos a través del EventBus.

import type { PieceSymbol, Color } from 'chess.js';
import type { EngineMode } from './mode.types';
import type { Annotation } from './annotation.types';
import type { EvaluationData } from './engine.types';

// === Payloads básicos ===

export interface MovePayload {
    from: string;
    to: string;
    piece: string;
}

export interface CapturePayload extends MovePayload {
    capturedPiece: string;
}

// === Mapa Maestro de Eventos ===

export type AppEvents = {
    // ─── Movimientos (existentes, compatibles) ───
    'PIECE_MOVED': MovePayload;
    'PIECE_CAPTURED': CapturePayload;
    'CHECK': { kingColor: Color };
    'GAME_OVER': { winner: Color | 'draw'; reason: string };


    // ─── Fase 1: Time Travel ───
    'MOVE_UNDONE': { move: MovePayload };
    'MOVE_REDONE': { move: MovePayload };
    'POSITION_LOADED': { fen: string; source: 'fen' | 'pgn' };
    'GAME_RESET': {};
    'NAVIGATE_TO_MOVE': { moveIndex: number };

    // ─── Fase 1: Castling & Promotion ───
    'CASTLED': { side: 'kingside' | 'queenside'; color: Color };
    'PROMOTION_REQUIRED': { from: string; to: string; color: Color };
    'PROMOTED': { square: string; piece: PieceSymbol };

    // ─── Fase 2: Interaction ───
    'SQUARE_SELECTED': { square: string; legalMoves: string[] };
    'SQUARE_DESELECTED': {};

    // ─── Fase 2.5: Pre-Moves (futuro) ───
    'PREMOVE_QUEUED': { from: string; to: string };
    'PREMOVE_EXECUTED': { from: string; to: string };
    'PREMOVE_CANCELLED': {};

    // ─── Fase 3: Annotations ───
    'ANNOTATION_ADDED': { annotation: Annotation };
    'ANNOTATION_REMOVED': { id: string };
    'ANNOTATIONS_CLEARED': {};

    // ─── Fase 4: Modes & Puzzles ───
    'MODE_CHANGED': { from: EngineMode; to: EngineMode };
    'PIECE_PLACED': { square: string; piece: PieceSymbol; color: Color };
    'PIECE_REMOVED': { square: string };
    'PUZZLE_STARTED': { fen: string; movesRequired: number };
    'PUZZLE_CORRECT_MOVE': { move: string; remaining: number };
    'PUZZLE_FAILED': { expected: string; actual: string };
    'PUZZLE_COMPLETED': { totalMoves: number };

    // ─── Fase 5: Engine Analysis ───
    'EVALUATION_UPDATED': { evaluation: EvaluationData };
    'BEST_MOVE': { move: string; ponder?: string };
    'ENGINE_READY': {};
    'ENGINE_ERROR': { error: string };

    // ─── Game Tree ───
    'VARIATION_CREATED': { parentNodeId: string; moveIndex: number };
    'VARIATION_SELECTED': { nodeId: string };

    // ─── Draw/Resign Protocol ───
    'DRAW_OFFERED': {};
    'DRAW_DECLINED': {};

    // ─── General ───
    'BOARD_UPDATED': {};
};