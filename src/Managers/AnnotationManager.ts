// src/Managers/AnnotationManager.ts
// Capa de "pintura" sobre el tablero.
// Gestiona flechas, círculos y highlights que NO son parte del juego.
// Totalmente independiente de la lógica de ajedrez.

import { EventBus } from '../Core/EventBus';
import type {
    Annotation,
    AnnotationColor,
    AnnotationType,
    ArrowAnnotation,
    CircleAnnotation,
    HighlightAnnotation
} from '../Types/annotation.types';

let annotationCounter = 0;

export class AnnotationManager {
    private annotations: Map<string, Annotation> = new Map();
    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
    }

    // ═══════════════════════════════════════════
    //  CREAR ANOTACIONES
    // ═══════════════════════════════════════════

    /** Dibuja una flecha de una casilla a otra */
    public addArrow(from: string, to: string, color: AnnotationColor = 'green'): string {
        const id = `ann_${++annotationCounter}`;
        const annotation: ArrowAnnotation = { id, type: 'arrow', color, from, to };
        this.annotations.set(id, annotation);
        this.eventBus.emit('ANNOTATION_ADDED', { annotation });
        return id;
    }

    /** Dibuja un círculo sobre una casilla */
    public addCircle(square: string, color: AnnotationColor = 'red'): string {
        const id = `ann_${++annotationCounter}`;
        const annotation: CircleAnnotation = { id, type: 'circle', color, square };
        this.annotations.set(id, annotation);
        this.eventBus.emit('ANNOTATION_ADDED', { annotation });
        return id;
    }

    /** Pinta el fondo de una casilla con un color custom */
    public addHighlight(square: string, backgroundColor: string): string {
        const id = `ann_${++annotationCounter}`;
        const annotation: HighlightAnnotation = {
            id, type: 'highlight', color: backgroundColor, square, backgroundColor
        };
        this.annotations.set(id, annotation);
        this.eventBus.emit('ANNOTATION_ADDED', { annotation });
        return id;
    }

    // ═══════════════════════════════════════════
    //  ELIMINAR ANOTACIONES
    // ═══════════════════════════════════════════

    /** Elimina una anotación por su ID */
    public removeAnnotation(id: string): boolean {
        const removed = this.annotations.delete(id);
        if (removed) {
            this.eventBus.emit('ANNOTATION_REMOVED', { id });
        }
        return removed;
    }

    /** Elimina TODAS las anotaciones */
    public clearAll(): void {
        this.annotations.clear();
        this.eventBus.emit('ANNOTATIONS_CLEARED', {});
    }

    /** Elimina todas las anotaciones de un tipo específico */
    public clearByType(type: AnnotationType): void {
        for (const [id, annotation] of this.annotations) {
            if (annotation.type === type) {
                this.annotations.delete(id);
            }
        }
    }

    // ═══════════════════════════════════════════
    //  TOGGLES (estilo chess.com clic derecho)
    // ═══════════════════════════════════════════

    /** Toggle: si existe la flecha A->B la quita; si no, la crea */
    public toggleArrow(from: string, to: string, color: AnnotationColor = 'green'): void {
        const existing = this.findArrow(from, to);
        if (existing) {
            this.removeAnnotation(existing.id);
        } else {
            this.addArrow(from, to, color);
        }
    }

    /** Toggle: si existe un círculo en la casilla lo quita; si no, lo crea */
    public toggleCircle(square: string, color: AnnotationColor = 'red'): void {
        const existing = this.findCircle(square);
        if (existing) {
            this.removeAnnotation(existing.id);
        } else {
            this.addCircle(square, color);
        }
    }

    // ═══════════════════════════════════════════
    //  CONSULTAS
    // ═══════════════════════════════════════════

    /** Retorna todas las anotaciones activas */
    public getAnnotations(): Annotation[] {
        return Array.from(this.annotations.values());
    }

    /** Retorna las anotaciones que involucran una casilla específica */
    public getAnnotationsForSquare(square: string): Annotation[] {
        return this.getAnnotations().filter(a => {
            if (a.type === 'arrow') {
                const arrow = a as ArrowAnnotation;
                return arrow.from === square || arrow.to === square;
            }
            if (a.type === 'circle') return (a as CircleAnnotation).square === square;
            if (a.type === 'highlight') return (a as HighlightAnnotation).square === square;
            return false;
        });
    }

    // ═══════════════════════════════════════════
    //  BÚSQUEDA PRIVADA
    // ═══════════════════════════════════════════

    private findArrow(from: string, to: string): ArrowAnnotation | null {
        for (const annotation of this.annotations.values()) {
            if (annotation.type === 'arrow') {
                const arrow = annotation as ArrowAnnotation;
                if (arrow.from === from && arrow.to === to) return arrow;
            }
        }
        return null;
    }

    private findCircle(square: string): CircleAnnotation | null {
        for (const annotation of this.annotations.values()) {
            if (annotation.type === 'circle') {
                const circle = annotation as CircleAnnotation;
                if (circle.square === square) return circle;
            }
        }
        return null;
    }
}
