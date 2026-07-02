// tests/core/GameTree.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GameTree } from '../../src/Core/GameTree';
import type { MoveData } from '../../src/Types/game-tree.types';

// Helper para crear MoveData de prueba
function mockMove(from: string, to: string, san: string): MoveData {
    return {
        from, to,
        piece: 'p',
        san,
        lan: `${from}${to}`,
        fenBefore: 'mock-fen-before',
        fenAfter: `mock-fen-${san}`,
        isCheck: false,
        isCheckmate: false,
        isCastle: false,
        isEnPassant: false,
        isPromotion: false,
    };
}

describe('GameTree', () => {
    let tree: GameTree;

    beforeEach(() => {
        tree = new GameTree();
    });

    it('should start with root node at initial position', () => {
        const root = tree.getRootNode();
        expect(root).toBeDefined();
        expect(root.move).toBeNull();
        expect(root.parent).toBeNull();
        expect(root.fen).toContain('rnbqkbnr');
    });

    it('should add moves and navigate the main line', () => {
        tree.addMove('fen-after-e4', mockMove('e2', 'e4', 'e4'));
        tree.addMove('fen-after-e5', mockMove('e7', 'e5', 'e5'));

        const mainLine = tree.getMainLine();
        expect(mainLine).toHaveLength(3); // root + 2 moves
        expect(mainLine[1].move?.san).toBe('e4');
        expect(mainLine[2].move?.san).toBe('e5');
    });

    it('should navigate back and forward', () => {
        tree.addMove('fen-e4', mockMove('e2', 'e4', 'e4'));
        tree.addMove('fen-e5', mockMove('e7', 'e5', 'e5'));

        // Go back to e4
        const prev = tree.goToPrev();
        expect(prev).not.toBeNull();
        expect(prev!.move?.san).toBe('e4');

        // Go forward to e5
        const next = tree.goToNext();
        expect(next).not.toBeNull();
        expect(next!.move?.san).toBe('e5');
    });

    it('should go to root and end', () => {
        tree.addMove('fen-e4', mockMove('e2', 'e4', 'e4'));
        tree.addMove('fen-e5', mockMove('e7', 'e5', 'e5'));
        tree.addMove('fen-Nf3', mockMove('g1', 'f3', 'Nf3'));

        tree.goToRoot();
        expect(tree.getCurrentNode().move).toBeNull();

        tree.goToEnd();
        expect(tree.getCurrentNode().move?.san).toBe('Nf3');
    });

    it('should create variations when branching', () => {
        tree.addMove('fen-e4', mockMove('e2', 'e4', 'e4'));

        // Go back to root
        tree.goToPrev();

        // Create alternative: d4 instead of e4
        tree.addMove('fen-d4', mockMove('d2', 'd4', 'd4'));

        const root = tree.getRootNode();
        expect(root.children).toHaveLength(2);
        expect(root.children[0].move?.san).toBe('e4'); // Línea principal
        expect(root.children[1].move?.san).toBe('d4'); // Variante

        expect(tree.hasVariations()).toBe(true);
    });

    it('should not duplicate existing moves', () => {
        tree.addMove('fen-e4', mockMove('e2', 'e4', 'e4'));
        tree.goToPrev(); // Back to root

        // Try to add the same move again
        tree.addMove('fen-e4', mockMove('e2', 'e4', 'e4'));

        const root = tree.getRootNode();
        expect(root.children).toHaveLength(1); // No duplicate
    });

    it('should report canGoForward and canGoBack correctly', () => {
        expect(tree.canGoBack()).toBe(false);
        expect(tree.canGoForward()).toBe(false);

        tree.addMove('fen-e4', mockMove('e2', 'e4', 'e4'));
        expect(tree.canGoBack()).toBe(true);
        expect(tree.canGoForward()).toBe(false);

        tree.goToPrev();
        expect(tree.canGoBack()).toBe(false);
        expect(tree.canGoForward()).toBe(true);
    });

    it('should find and navigate to a specific node by ID', () => {
        tree.addMove('fen-e4', mockMove('e2', 'e4', 'e4'));
        const e5Node = tree.addMove('fen-e5', mockMove('e7', 'e5', 'e5'));

        tree.goToRoot();
        const found = tree.goToNode(e5Node.id);

        expect(found).not.toBeNull();
        expect(found!.move?.san).toBe('e5');
        expect(tree.getCurrentNode().id).toBe(e5Node.id);
    });

    it('should return null when navigating to non-existent node', () => {
        const result = tree.goToNode('non-existent-id');
        expect(result).toBeNull();
    });

    it('should reset the tree', () => {
        tree.addMove('fen-e4', mockMove('e2', 'e4', 'e4'));
        tree.addMove('fen-e5', mockMove('e7', 'e5', 'e5'));

        const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
        tree.reset(customFen);

        expect(tree.getRootNode().fen).toBe(customFen);
        expect(tree.getRootNode().children).toHaveLength(0);
        expect(tree.canGoBack()).toBe(false);
    });

    it('should get path to current node', () => {
        tree.addMove('fen-e4', mockMove('e2', 'e4', 'e4'));
        tree.addMove('fen-e5', mockMove('e7', 'e5', 'e5'));
        tree.addMove('fen-Nf3', mockMove('g1', 'f3', 'Nf3'));

        const path = tree.getPathToCurrent();
        expect(path).toHaveLength(4); // root + 3 moves
        expect(path[0].move).toBeNull(); // root
        expect(path[3].move?.san).toBe('Nf3');
    });
});
