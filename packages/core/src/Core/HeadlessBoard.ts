// El puente entre el motor headless y cualquier framework de UI.
// Genera el BoardSnapshot definitivo: la fotografía completa del universo
// del tablero que React, Vue, Svelte, o Vanilla JS consumen para renderizar.


import { ChessEngine } from './ChessEngine';
import type { InteractionManager } from '../Managers';
import type { AnnotationManager } from '../Managers';
import type { BoardSnapshot, SquareData } from '../Types';
import type { PieceSymbol } from 'chess.js';

export class HeadlessBoard {

    private engine: ChessEngine;
    private interactionManager: InteractionManager | null;
    private annotationManager: AnnotationManager | null;
    private getOrientation: (() => 'w' | 'b') | null;

    private readonly FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    private readonly RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

    /**
     * Constructor flexible: solo el engine es obligatorio.
     * InteractionManager y AnnotationManager son opcionales.
     * Esto permite usar el HeadlessBoard en server-side,
     * o sin interacción (ej: solo para exportar snapshots estáticos).
     */
    constructor(
        engine: ChessEngine,
        options?: {
            interactionManager?: InteractionManager;
            annotationManager?: AnnotationManager;
            getOrientation?: () => 'w' | 'b';
        }
    ) {
        this.engine = engine;
        this.interactionManager = options?.interactionManager || null;
        this.annotationManager = options?.annotationManager || null;
        this.getOrientation = options?.getOrientation || null;
    }

    // ═══════════════════════════════════════════
    //  EL SNAPSHOT DEFINITIVO
    // ═══════════════════════════════════════════

    /**
     * MAGIA PURA v2: Devuelve la fotografía completa del universo del tablero.
     * Incluye: estado del juego, cuadrícula con metadata visual, capa de
     * anotaciones, y metadata del historial.
     */
    public getBoardSnapshot(): BoardSnapshot {
        const lastMove = this.engine.getLastMove();
        const selectedSquare = this.interactionManager?.getSelectedSquare() || null;
        const validDestinations = this.interactionManager?.getValidDestinations() || [];
        const annotations = this.annotationManager?.getAnnotations() || [];
        const gameTree = this.engine.getGameTree();
        const captured = this.engine.getCapturedPieces();
        const materialAdv = this.engine.getMaterialAdvantage();

        return {
            gameState: {
                turn: this.engine.getTurn(),
                inCheck: this.engine.isCheck(),
                isCheckmate: this.engine.isCheckmate(),
                isStalemate: this.engine.isStalemate(),
                isDraw: this.engine.isDraw(),
                isGameOver: this.engine.isGameOver(),
                moveNumber: this.engine.getMoveNumber(),
                fen: this.engine.getFen(),
                mode: this.engine.getMode(),
                boardOrientation: this.getOrientation ? this.getOrientation() : 'w',
                result: this.engine.getResult(),
            },
            board: this.buildBoardGrid(lastMove, selectedSquare, validDestinations),
            visuals: {
                lastMove,
                selectedSquare,
                validDestinations,
                premoves: this.interactionManager?.getPremoves() || [],
                annotations,
            },
            history: {
                canUndo: this.engine.canUndo(),
                canRedo: this.engine.canRedo(),
                moveCount: gameTree.getMainLine().length - 1,
                currentIndex: gameTree.getCurrentNode().halfMoveIndex,
                hasVariations: gameTree.hasVariations(),
            },
            material: {
                capturedByWhite: captured.w,
                capturedByBlack: captured.b,
                whiteAdvantage: materialAdv.w,
                blackAdvantage: materialAdv.b,
            },
        };
    }

    // ═══════════════════════════════════════════
    //  INTERACCIÓN DESDE LA UI
    // ═══════════════════════════════════════════

    /**
     * Punto de entrada para drag & drop: la UI manda origen y destino.
     */
    public handleMove(from: string, to: string, promotion?: string): ReturnType<ChessEngine['attemptMove']> {
        return this.engine.attemptMove(from, to, promotion as PieceSymbol | undefined);
    }

    /**
     * Punto de entrada para click-to-move: la UI manda una casilla.
     * El InteractionManager resuelve si es selección, movimiento o deselección.
     */
    public handleSquareClick(square: string): void {
        this.interactionManager?.selectSquare(square);
    }

    // ═══════════════════════════════════════════
    //  CONSTRUCCIÓN DE LA CUADRÍCULA (Privado)
    // ═══════════════════════════════════════════

    private buildBoardGrid(
        lastMove: { from: string; to: string } | null,
        selectedSquare: string | null,
        validDestinations: string[]
    ): SquareData[][] {
        const grid: SquareData[][] = [];
        const premoves = this.interactionManager?.getPremoves() || [];

        for (let r = 0; r < 8; r++) {
            const row: SquareData[] = [];
            for (let f = 0; f < 8; f++) {
                const algebraic = `${this.FILES[f]}${this.RANKS[r]}`;
                const isLight = (r + f) % 2 === 0;
                const pieceData = this.engine.getPieceAt(algebraic);

                let piece: SquareData['piece'] = null;
                if (pieceData) {
                    piece = {
                        type: pieceData.type,
                        color: pieceData.color,
                    };
                }

                row.push({
                    algebraic,
                    isLight,
                    piece,
                    // === Visual State Flags ===
                    isLastMoveOrigin: lastMove?.from === algebraic,
                    isLastMoveDestination: lastMove?.to === algebraic,
                    isSelected: selectedSquare === algebraic,
                    isValidDestination: validDestinations.includes(algebraic),
                    isPremoveOrigin: premoves.some(p => p.from === algebraic),
                    isPremoveDestination: premoves.some(p => p.to === algebraic),
                });
            }
            grid.push(row);
        }

        return grid;
    }
}