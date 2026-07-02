import { BISHOP, KING, KNIGHT, PAWN, QUEEN, ROOK, BLACK, WHITE } from "chess.js";

export interface ThemeConfig {
    id: string;
    name: string;
    board: {
        lightSquareColor: string;
        darkSquareColor: string;
        // Opcional: Si en lugar de colores sólidos usan texturas
        lightSquareImage?: string;
        darkSquareImage?: string;
    };
    // Tanto negras como blancas
    pieces: {
        [PAWN]: {
            [WHITE]: string;
            [BLACK]: string;
        };
        [KING]: {
            [WHITE]: string;
            [BLACK]: string;
        };
        [QUEEN]: {
            [WHITE]: string;
            [BLACK]: string;
        };
        [ROOK]: {
            [WHITE]: string;
            [BLACK]: string;
        };
        [KNIGHT]: {
            [WHITE]: string;
            [BLACK]: string;
        };
        [BISHOP]: {
            [WHITE]: string;
            [BLACK]: string;
        };
    };
    sounds: {
        move: string;
        capture: string;
        check: string;
        gameEnd: string;
    };
}