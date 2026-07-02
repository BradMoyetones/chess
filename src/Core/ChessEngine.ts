import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import { EventBus } from './EventBus';

export interface PieceData {
    type: PieceSymbol;
    color: Color;
}

export class ChessEngine {
    private chess: Chess;
    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.chess = new Chess();
        this.eventBus = eventBus;
    }

    /**
     * Devuelve la información de la pieza en una casilla, o null si está vacía.
     * Esto es usado por el HeadlessBoard para armar su Snapshot.
     */
    public getPieceAt(square: string): PieceData | null {
        // chess.js devuelve { type, color } o false/null
        const piece = this.chess.get(square as Square);
        if (!piece) return null;
        
        return {
            type: piece.type,
            color: piece.color
        };
    }

    /**
     * Intenta ejecutar un movimiento.
     * Si es legal, actualiza el estado interno y emite los eventos globales.
     */
    public attemptMove(from: string, to: string): boolean {
        try {
            // chess.js lanza un error o devuelve null si el movimiento es ilegal
            // Añadimos promotion: 'q' por defecto para que los peones coronen a reina 
            // automáticamente en esta versión simplificada.
            const move = this.chess.move({
                from: from as Square,
                to: to as Square,
                promotion: 'q'
            });

            if (move) {
                // ¡El movimiento fue válido! Analizamos qué pasó para gritarlo al sistema.
                this.analyzeAndEmitEvents(move);
                return true;
            }
        } catch (e) {
            // Movimiento ilegal capturado (chess.js a veces lanza excepciones en versiones nuevas)
            return false;
        }
        return false;
    }

    /**
     * Devuelve los movimientos legales para una casilla.
     * Útil por si en tu UI quieres iluminar los puntitos verdes donde puede aterrizar la pieza.
     */
    public getLegalMovesFor(square: string): string[] {
        const moves = this.chess.moves({ square: square as Square, verbose: true });
        // Mapeamos para devolver solo los destinos (ej: ['e3', 'e4'])
        return (moves as any[]).map(m => m.to);
    }

    /**
     * Lógica privada para determinar qué eventos emitir tras un movimiento válido
     */
    private analyzeAndEmitEvents(move: Move): void {
        // 1. ¿Hubo captura?
        if (move.captured) {
            this.eventBus.emit('PIECE_CAPTURED', {
                from: move.from,
                to: move.to,
                piece: move.piece,
                capturedPiece: move.captured
            });
        } else {
            // Fue un movimiento normal
            this.eventBus.emit('PIECE_MOVED', {
                from: move.from,
                to: move.to,
                piece: move.piece
            });
        }

        // 2. ¿Hubo Jaque o Jaque Mate?
        if (this.chess.isCheckmate()) {
            // Si hay mate, el ganador es el color opuesto al que le toca mover
            const winner = this.chess.turn() === 'w' ? 'b' : 'w';
            this.eventBus.emit('GAME_OVER', { winner });
        } else if (this.chess.isCheck()) {
            // Avisamos qué rey está en jaque
            this.eventBus.emit('CHECK', { kingColor: this.chess.turn() });
        } else if (this.chess.isDraw() || this.chess.isStalemate()) {
            this.eventBus.emit('GAME_OVER', { winner: 'draw' });
        }
    }

    public resetGame(): void {
        this.chess.reset();
    }

    public getFen(): string {
        return this.chess.fen();
    }
}