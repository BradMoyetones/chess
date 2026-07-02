// src/Core/GameTree.ts
// El Gestor del Multiverso.
// Mantiene el árbol completo de la partida y permite navegar entre
// posiciones, crear variantes, y serializar/deserializar.

import { MoveNode, resetNodeCounter } from './MoveNode';
import type { MoveData } from '../Types/game-tree.types';

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export class GameTree {
    private root: MoveNode;
    private currentNode: MoveNode;

    constructor(initialFen: string = DEFAULT_FEN) {
        this.root = new MoveNode(initialFen, null, null);
        this.currentNode = this.root;
    }

    // ═══════════════════════════════════════════
    //  CONSULTAS
    // ═══════════════════════════════════════════

    /** Retorna el nodo actual (donde está el "puntero" del usuario) */
    getCurrentNode(): MoveNode {
        return this.currentNode;
    }

    /** Retorna el nodo raíz (posición inicial) */
    getRootNode(): MoveNode {
        return this.root;
    }

    /** ¿Se puede avanzar? (¿El nodo actual tiene hijos?) */
    canGoForward(): boolean {
        return this.currentNode.hasChildren();
    }

    /** ¿Se puede retroceder? (¿El nodo actual tiene padre?) */
    canGoBack(): boolean {
        return this.currentNode.parent !== null;
    }

    // ═══════════════════════════════════════════
    //  NAVEGACIÓN
    // ═══════════════════════════════════════════

    /** Avanza al siguiente movimiento por la línea principal */
    goToNext(): MoveNode | null {
        const next = this.currentNode.getMainLine();
        if (next) {
            this.currentNode = next;
        }
        return next;
    }

    /** Retrocede al movimiento anterior (nodo padre) */
    goToPrev(): MoveNode | null {
        if (!this.currentNode.parent) return null;
        this.currentNode = this.currentNode.parent;
        return this.currentNode;
    }

    /** Salta directamente al inicio de la partida */
    goToRoot(): MoveNode {
        this.currentNode = this.root;
        return this.root;
    }

    /** Salta directamente al último movimiento de la línea principal */
    goToEnd(): MoveNode {
        while (this.currentNode.hasChildren()) {
            this.currentNode = this.currentNode.getMainLine()!;
        }
        return this.currentNode;
    }

    /** Salta a un nodo específico por su ID */
    goToNode(nodeId: string): MoveNode | null {
        const node = this.findNode(nodeId);
        if (node) {
            this.currentNode = node;
        }
        return node;
    }

    // ═══════════════════════════════════════════
    //  MUTACIÓN
    // ═══════════════════════════════════════════

    /**
     * Agrega un movimiento al nodo actual.
     * 
     * Comportamiento inteligente:
     * - Si el nodo actual ya tiene un hijo con el MISMO movimiento → navega ahí (no duplica).
     * - Si no existe → crea un nuevo hijo.
     * - Si ya existen otros hijos con OTROS movimientos → crea una VARIANTE.
     * 
     * @returns El nodo al que se navegó (existente o nuevo)
     */
    addMove(fen: string, move: MoveData): MoveNode {
        // ¿Este movimiento ya existe como hijo?
        const existing = this.currentNode.findChildByMove(move.from, move.to, move.promotion);
        if (existing) {
            this.currentNode = existing;
            return existing;
        }

        // Crear nuevo nodo
        const newNode = new MoveNode(fen, move, this.currentNode);
        this.currentNode.addChild(newNode);
        this.currentNode = newNode;
        return newNode;
    }

    // ═══════════════════════════════════════════
    //  SERIALIZACIÓN
    // ═══════════════════════════════════════════

    /** 
     * Retorna la secuencia de nodos de la línea principal (root → último movimiento).
     */
    getMainLine(): MoveNode[] {
        const line: MoveNode[] = [this.root];
        let current = this.root;
        while (current.hasChildren()) {
            current = current.getMainLine()!;
            line.push(current);
        }
        return line;
    }

    /** 
     * Retorna el camino desde el root hasta el nodo actual.
     * Útil para saber en qué variante estamos.
     */
    getPathToCurrent(): MoveNode[] {
        const path: MoveNode[] = [];
        let current: MoveNode | null = this.currentNode;
        while (current) {
            path.unshift(current);
            current = current.parent;
        }
        return path;
    }

    /**
     * Retorna las variantes disponibles en un nodo específico.
     */
    getVariationsAt(nodeId: string): MoveNode[] {
        const node = this.findNode(nodeId);
        if (!node) return [];
        return node.getVariations();
    }

    /**
     * ¿Existe alguna variante en todo el árbol?
     */
    hasVariations(): boolean {
        return this.hasVariationsRecursive(this.root);
    }

    // ═══════════════════════════════════════════
    //  RESET
    // ═══════════════════════════════════════════

    /** Reinicia el árbol con una nueva posición inicial */
    reset(initialFen: string = DEFAULT_FEN): void {
        this.root = new MoveNode(initialFen, null, null);
        this.currentNode = this.root;
    }

    // ═══════════════════════════════════════════
    //  HELPERS PRIVADOS
    // ═══════════════════════════════════════════

    /** Busca un nodo por ID en todo el árbol (DFS) */
    private findNode(nodeId: string): MoveNode | null {
        return this.findNodeRecursive(this.root, nodeId);
    }

    private findNodeRecursive(node: MoveNode, nodeId: string): MoveNode | null {
        if (node.id === nodeId) return node;
        for (const child of node.children) {
            const found = this.findNodeRecursive(child, nodeId);
            if (found) return found;
        }
        return null;
    }

    /** Verifica recursivamente si algún nodo tiene más de un hijo */
    private hasVariationsRecursive(node: MoveNode): boolean {
        if (node.children.length > 1) return true;
        for (const child of node.children) {
            if (this.hasVariationsRecursive(child)) return true;
        }
        return false;
    }
}
