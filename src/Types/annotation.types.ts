// src/Types/annotation.types.ts
// Tipos para el sistema de anotaciones visuales (flechas, círculos, highlights).
// Estas NO son parte del juego — son pintura sobre el tablero.

export type AnnotationType = 'arrow' | 'circle' | 'highlight';
export type AnnotationColor = 'green' | 'red' | 'blue' | 'yellow' | string;

/** Base para todas las anotaciones */
export interface Annotation {
    id: string;
    type: AnnotationType;
    color: AnnotationColor;
}

/** Flecha de una casilla a otra (ej: para mostrar una jugada recomendada) */
export interface ArrowAnnotation extends Annotation {
    type: 'arrow';
    from: string;       // Casilla origen (ej: 'g1')
    to: string;         // Casilla destino (ej: 'f3')
}

/** Círculo sobre una casilla (ej: para marcar una casilla clave) */
export interface CircleAnnotation extends Annotation {
    type: 'circle';
    square: string;
}

/** Highlight de fondo personalizado en una casilla */
export interface HighlightAnnotation extends Annotation {
    type: 'highlight';
    square: string;
    backgroundColor: string;
}
