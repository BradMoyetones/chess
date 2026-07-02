// src/Types/events.types.ts

export interface MovePayload {
    from: string;  // ej: 'e2'
    to: string;    // ej: 'e4'
    piece: string; // ej: 'P'
}

export interface CapturePayload extends MovePayload {
    capturedPiece: string; // Qué pieza fue devorada
}

// Diccionario de eventos
// La llave es el nombre del evento, el valor es lo que transmite.
export type AppEvents = {
    'PIECE_MOVED': MovePayload;
    'PIECE_CAPTURED': CapturePayload;
    'CHECK': { kingColor: 'w' | 'b' };
    'GAME_OVER': { winner: 'w' | 'b' | 'draw' };
    'THEME_CHANGED': { themeId: string; themeName: string };
};