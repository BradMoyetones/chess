// La unidad atómica del Game Tree.
// Cada nodo es un "momento" completo de la partida: almacena el FEN
// (fotografía del estado), el movimiento que llevó aquí, y referencias
// a su padre y sus hijos (variantes).

import type { MoveData } from '../Types';

/**
 * Resetea el contador de nodos.
 * @deprecated No-op. Each GameTree now manages its own counter.
 * Kept for backward compatibility.
 */
export function resetNodeCounter(): void {
    // No-op: node IDs are now managed per-GameTree instance
}

export class MoveNode {
    /** Identificador único del nodo */
    readonly id: string;

    /** Fotografía exacta del tablero DESPUÉS de este movimiento */
    readonly fen: string;

    /** El movimiento que creó este nodo (null solo para el root) */
    readonly move: MoveData | null;

    /** Referencia al nodo padre (null solo para el root) */
    readonly parent: MoveNode | null;

    /** Hijos de este nodo. children[0] = línea principal, children[1..n] = variantes */
    readonly children: MoveNode[] = [];

    /** Anotación textual del usuario (ej: "Sacrificio brillante!") */
    comment: string = '';

    /** Índice en semijugadas desde el root (root = 0, primer movimiento = 1, etc.) */
    readonly halfMoveIndex: number;

    constructor(id: string, fen: string, move: MoveData | null, parent: MoveNode | null) {
        this.id = id;
        this.fen = fen;
        this.move = move;
        this.parent = parent;
        this.halfMoveIndex = parent ? parent.halfMoveIndex + 1 : 0;
    }

    /**
     * Agrega un nodo hijo (nueva jugada o variante).
     */
    addChild(node: MoveNode): void {
        this.children.push(node);
    }

    /**
     * Retorna el primer hijo (línea principal).
     * null si no hay hijos (final de línea).
     */
    getMainLine(): MoveNode | null {
        return this.children[0] || null;
    }

    /**
     * Retorna las variantes (todo excepto la línea principal).
     */
    getVariations(): MoveNode[] {
        return this.children.slice(1);
    }

    /**
     * ¿Este nodo pertenece a la línea principal?
     * true si es el root o si es el primer hijo de su padre.
     */
    isMainLine(): boolean {
        if (!this.parent) return true;
        return this.parent.children[0] === this;
    }

    /**
     * ¿Tiene hijos? (¿Se puede avanzar desde aquí?)
     */
    hasChildren(): boolean {
        return this.children.length > 0;
    }

    /**
     * Busca entre los hijos uno que coincida con un movimiento específico.
     * Evita crear nodos duplicados cuando el usuario repite un movimiento existente.
     */
    findChildByMove(from: string, to: string, promotion?: string): MoveNode | null {
        return this.children.find(child =>
            child.move !== null &&
            child.move.from === from &&
            child.move.to === to &&
            (!promotion || child.move.promotion === promotion)
        ) || null;
    }
}
