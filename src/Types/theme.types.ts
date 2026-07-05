import { BISHOP, KING, KNIGHT, PAWN, QUEEN, ROOK, BLACK, WHITE } from "chess.js";

/**
 * @interface ThemeConfig
 * @description Configuración principal del tema visual y sonoro del tablero.
 * Esta interfaz es altamente flexible; todos sus nodos principales son opcionales,
 * lo que permite desde cambiar un solo color hasta reemplazar toda la UI gráfica.
 */
export interface ThemeConfig {
    /** Identificador único del tema (ej. 'classic', 'neon-nights') */
    id: string;
    /** Nombre legible para el usuario (ej. 'Clásico', 'Noches de Neón') */
    name: string;
    
    /** 
     * Configuración visual del tablero.
     * Puedes proveer solo colores, texturas por casilla o una gran imagen de fondo.
     */
    board?: {
        /** Color hexadecimal o CSS para las casillas claras */
        lightSquareColor?: string;
        /** Color hexadecimal o CSS para las casillas oscuras */
        darkSquareColor?: string;
        /** URL o path de imagen para la textura de las casillas claras */
        lightSquareImage?: string;
        /** URL o path de imagen para la textura de las casillas oscuras */
        darkSquareImage?: string;
        /** URL o path de imagen para abarcar el tablero completo como fondo */
        backgroundImage?: string;
    };
    
    /** 
     * Configuración de las URLs o rutas de las imágenes de las piezas.
     */
    pieces?: {
        [PAWN]?: { [WHITE]?: string; [BLACK]?: string; };
        [KING]?: { [WHITE]?: string; [BLACK]?: string; };
        [QUEEN]?: { [WHITE]?: string; [BLACK]?: string; };
        [ROOK]?: { [WHITE]?: string; [BLACK]?: string; };
        [KNIGHT]?: { [WHITE]?: string; [BLACK]?: string; };
        [BISHOP]?: { [WHITE]?: string; [BLACK]?: string; };
    };
    
    /** 
     * URLs o rutas de los efectos de sonido a reproducir durante eventos del juego.
     */
    sounds?: {
        /** Sonido al mover una pieza de forma normal */
        move?: string;
        /** Sonido al capturar una pieza enemiga */
        capture?: string;
        /** Sonido cuando un rey entra en jaque */
        check?: string;
        /** Sonido cuando la partida termina (jaque mate, empate, etc.) */
        gameEnd?: string;
    };
}