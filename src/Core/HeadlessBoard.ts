import { ThemeManager } from '../Managers/ThemeManager';
import { ChessEngine } from './ChessEngine';

// Este es el contrato que se le entrada a React o Vainilla, etc.
export interface SquareMetadata {
    algebraic: string;       // ej: 'e4'
    isLight: boolean;        // Para lógicas externas
    backgroundColor: string; // Entregado por el ThemeManager
    piece: {
        type: string;        // 'P', 'k', etc.
        color: 'w' | 'b';
        skinUrl: string;     // La imagen final ya procesada por el tema
    } | null;                // Null si la casilla está vacía
}

export class HeadlessBoard {
    private themeManager: ThemeManager;
    private engine: ChessEngine;

    // Las columnas y filas estándar
    private readonly FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    private readonly RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

    constructor(themeManager: ThemeManager, engine: ChessEngine) {
        this.themeManager = themeManager;
        this.engine = engine;
    }

    /**
     * MAGIA PURA: Devuelve la cuadrícula completa con metadatos absolutos
     * Lista para que cualquier framework la itere.
     */
    public getBoardSnapshot(): SquareMetadata[][] {
        const snapshot: SquareMetadata[][] = [];

        // Generamos la matriz basada en la lógica, no en la UI
        for (let r = 0; r < 8; r++) {
            const row: SquareMetadata[] = [];
            for (let f = 0; f < 8; f++) {
                const algebraic = `${this.FILES[f]}${this.RANKS[r]}`;
                const isLight = (r + f) % 2 === 0;
                
                // Le preguntamos al motor de ajedrez si hay una pieza aquí
                const pieceData = this.engine.getPieceAt(algebraic);
                
                let pieceMeta = null;
                if (pieceData) {
                    pieceMeta = {
                        type: pieceData.type,
                        color: pieceData.color,
                        // El motor resuelve la URL exacta de la imagen basado en el tema
                        skinUrl: this.themeManager.getPieceSkin(pieceData.type, pieceData.color)
                    };
                }

                row.push({
                    algebraic,
                    isLight,
                    backgroundColor: this.themeManager.getSquareColor(isLight),
                    piece: pieceMeta
                });
            }
            snapshot.push(row);
        }

        return snapshot;
    }

    /**
     * El punto de entrada para que las UIs externas interactúen
     */
    public handleExternalInteraction(from: string, to: string): boolean {
        // La UI capturó un drag & drop y nos manda las coordenadas
        return this.engine.attemptMove(from, to);
    }
}