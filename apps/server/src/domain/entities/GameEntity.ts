import { ChessEngine, EventBus } from '@chess-fw/core';
import type { MoveResult, MoveData, GameResult, Color, PieceSymbol } from '@chess-fw/core';

/**
 * Server-authoritative game entity.
 * Wraps ChessEngine from @chess-fw/core to validate all moves server-side.
 * The FEN/PGN from this entity is the ONLY source of truth.
 */
export class GameEntity {
    private engine: ChessEngine;
    private clockSnapshots: number[] = [];
    private uciMoves: string[] = [];

    constructor(initialFen?: string) {
        const eventBus = new EventBus();
        this.engine = new ChessEngine(eventBus, initialFen);
    }

    attemptMove(from: string, to: string, promotion?: PieceSymbol): MoveResult {
        const result = this.engine.attemptMove(from, to, promotion);
        if (result.success) {
            // Track UCI move for compact storage
            this.uciMoves.push(`${from}${to}${promotion || ''}`);
        }
        return result;
    }

    getFen(): string { return this.engine.getFen(); }
    getPgn(): string { return this.engine.getPgn(); }
    getTurn(): Color { return this.engine.getTurn(); }
    isGameOver(): boolean { return this.engine.isGameOver(); }
    isCheckmate(): boolean { return this.engine.isCheckmate(); }
    isStalemate(): boolean { return this.engine.isStalemate(); }
    isDraw(): boolean { return this.engine.isDraw(); }
    getResult(): GameResult | null { return this.engine.getResult(); }
    setResult(result: GameResult): void { this.engine.setResult(result); }
    getMoveHistory(): MoveData[] { return this.engine.getMoveHistory(); }
    getHalfMoves(): number { return this.engine.getTotalMoves(); }

    /** Record a clock snapshot (centiseconds remaining) after each move */
    recordClockSnapshot(remainingCentiseconds: number): void {
        this.clockSnapshots.push(remainingCentiseconds);
    }

    /** Get clock data as space-separated centiseconds string for DB storage */
    getClocksString(): string {
        return this.clockSnapshots.join(' ');
    }

    /** Get UCI moves as space-separated string for compact DB storage */
    getMovesUci(): string {
        return this.uciMoves.join(' ');
    }

    resetGame(fen?: string): void {
        this.engine.resetGame(fen);
        this.clockSnapshots = [];
        this.uciMoves = [];
    }
}
