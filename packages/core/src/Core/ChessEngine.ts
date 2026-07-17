import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import { EventBus } from './EventBus';
import { GameTree } from './GameTree';
import type { MoveData, MoveResult, GameResult } from '../Types';
import type { EngineMode } from '../Types';

export interface PieceData {
    type: PieceSymbol;
    color: Color;
}

/**
 * @class ChessEngine
 * @description El Gestor de Estados Multi-Contexto.
 * Orquesta el estado del juego, el Game Tree, la navegación temporal,
 * y la comunicación con todos los módulos vía EventBus.
 */
export class ChessEngine {
    private chess: Chess;
    private eventBus: EventBus;
    private gameTree: GameTree;
    private lastMove: { from: string; to: string } | null = null;
    private mode: EngineMode = 'PLAY';
    private gameResult: GameResult | null = null;

    /** Standard piece values for material calculation */
    private static readonly PIECE_VALUES: Record<PieceSymbol, number> = {
        p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
    };

    /** Starting material in a standard chess game */
    private static readonly STARTING_MATERIAL: Record<PieceSymbol, number> = {
        p: 8, n: 2, b: 2, r: 2, q: 1, k: 1
    };

    constructor(eventBus: EventBus, initialFen?: string) {
        this.eventBus = eventBus;
        this.gameTree = new GameTree(initialFen);
        this.chess = initialFen ? new Chess(initialFen) : new Chess();
        this.mode = 'PLAY';
        this.lastMove = null;
    }

    // ═══════════════════════════════════════════
    //  CONSULTAS DE PIEZAS
    // ═══════════════════════════════════════════

    /**
     * Devuelve la información de la pieza en una casilla, o null si está vacía.
     * Usado por el HeadlessBoard para armar su Snapshot.
     */
    public getPieceAt(square: string): PieceData | null {
        const piece = this.chess.get(square as Square);
        if (!piece) return null;
        return { type: piece.type, color: piece.color };
    }

    // ═══════════════════════════════════════════
    //  EJECUCIÓN DE MOVIMIENTOS
    // ═══════════════════════════════════════════

    /**
     * Detecta si un movimiento requiere promoción de peón.
     * La UI puede usar esto para mostrar el popup de selección ANTES de intentar el move.
     */
    public isPromotionMove(from: string, to: string): boolean {
        const piece = this.chess.get(from as Square);
        if (!piece || piece.type !== 'p') return false;
        const targetRank = piece.color === 'w' ? '8' : '1';
        return to.endsWith(targetRank);
    }

    /**
     * @method attemptMove
     * @description Intenta ejecutar un movimiento y emite 'BOARD_UPDATED' si es exitoso.
     */
    public attemptMove(from: string, to: string, promotion?: PieceSymbol): MoveResult {
        // En modo PLAY, verificar si el juego terminó
        if (this.mode === 'PLAY' && this.chess.isGameOver()) {
            return { success: false, reason: 'game_over' };
        }

        // En modo PLAY, verificar el turno
        if (this.mode === 'PLAY') {
            const piece = this.chess.get(from as Square);
            if (piece && piece.color !== this.chess.turn()) {
                return { success: false, reason: 'wrong_turn' };
            }
        }

        // En modo ANALYSIS, permitir mover piezas de ambos colores
        if (this.mode === 'ANALYSIS') {
            const piece = this.chess.get(from as Square);
            if (piece && piece.color !== this.chess.turn()) {
                // Reconstruct FEN with correct turn without using setTurn
                const fen = this.chess.fen();
                const parts = fen.split(' ');
                parts[1] = piece.color;
                this.chess.load(parts.join(' '));
            }
        }

        // Verificar si se necesita promoción pero no se proporcionó
        if (this.isPromotionMove(from, to) && !promotion) {
            this.eventBus.emit('PROMOTION_REQUIRED', {
                from, to, color: this.chess.turn()
            });
            return { success: false, reason: 'promotion_required', from, to };
        }

        try {
            const move = this.chess.move({
                from: from as Square,
                to: to as Square,
                promotion: promotion
            });

            if (move) {
                // Actualizar tracking del último movimiento
                this.lastMove = { from: move.from, to: move.to };

                // Construir MoveData enriquecido
                const moveData: MoveData = {
                    from: move.from,
                    to: move.to,
                    piece: move.piece,
                    captured: move.captured,
                    promotion: move.promotion,
                    san: move.san,
                    lan: move.lan,
                    fenBefore: move.before,
                    fenAfter: move.after,
                    isCheck: this.chess.isCheck(),
                    isCheckmate: this.chess.isCheckmate(),
                    isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
                    isEnPassant: move.isEnPassant(),
                    isPromotion: move.isPromotion(),
                };

                // Agregar al Game Tree
                const node = this.gameTree.addMove(move.after, moveData);

                // Detectar si se creó una variante
                if (node.parent && node.parent.children.length > 1 && !node.isMainLine()) {
                    this.eventBus.emit('VARIATION_CREATED', {
                        parentNodeId: node.parent.id,
                        moveIndex: node.halfMoveIndex
                    });
                }

                // Analizar y emitir eventos
                this.analyzeAndEmitEvents(move);

                this.eventBus.emit('BOARD_UPDATED', {});
                return { success: true, move: moveData };
            }
        } catch (e) {
            // Movimiento ilegal capturado
        }
        return { success: false, reason: 'illegal' };
    }

    // ═══════════════════════════════════════════
    //  NAVEGACIÓN TEMPORAL (Time Travel)
    // ═══════════════════════════════════════════

    /**
     * @method undo
     * @description Deshace el último movimiento y actualiza la UI.
     */
    public undo(): boolean {
        const prevNode = this.gameTree.goToPrev();
        if (!prevNode) return false;

        this.chess.load(prevNode.fen);

        if (prevNode.move) {
            this.lastMove = { from: prevNode.move.from, to: prevNode.move.to };
        } else {
            this.lastMove = null;
        }

        this.eventBus.emit('MOVE_UNDONE', {
            move: {
                from: prevNode.move?.from || '',
                to: prevNode.move?.to || '',
                piece: prevNode.move?.piece || ''
            }
        });
        this.eventBus.emit('BOARD_UPDATED', {});
        return true;
    }

    /**
     * @method redo
     * @description Rehace el siguiente movimiento por la línea principal.
     */
    public redo(): boolean {
        const nextNode = this.gameTree.goToNext();
        if (!nextNode) return false;

        this.chess.load(nextNode.fen);

        if (nextNode.move) {
            this.lastMove = { from: nextNode.move.from, to: nextNode.move.to };
        }

        this.eventBus.emit('MOVE_REDONE', {
            move: {
                from: nextNode.move?.from || '',
                to: nextNode.move?.to || '',
                piece: nextNode.move?.piece || ''
            }
        });
        this.eventBus.emit('BOARD_UPDATED', {});
        return true;
    }

    /**
     * @method goToMove
     * @description Navega a un nodo específico del Game Tree por su ID 
     */
    public goToMove(nodeId: string): boolean {
        const node = this.gameTree.goToNode(nodeId);
        if (!node) return false;

        this.chess.load(node.fen);

        if (node.move) {
            this.lastMove = { from: node.move.from, to: node.move.to };
        } else {
            this.lastMove = null;
        }

        // Emit VARIATION_SELECTED if the node is not on the main line
        if (!node.isMainLine()) {
            this.eventBus.emit('VARIATION_SELECTED', { nodeId: node.id });
        }

        this.eventBus.emit('NAVIGATE_TO_MOVE', { moveIndex: node.halfMoveIndex });
        this.eventBus.emit('BOARD_UPDATED', {});
        return true;
    }

    /** 
     * @method goToStart
     * @description Salta al inicio de la partida 
     */
    public goToStart(): void {
        this.gameTree.goToRoot();
        this.chess.load(this.gameTree.getCurrentNode().fen);
        this.lastMove = null;
        this.eventBus.emit('BOARD_UPDATED', {});
    }

    /** 
     * @method goToEnd
     * @description Salta al último movimiento de la línea principal 
     */
    public goToEnd(): void {
        this.gameTree.goToEnd();
        const node = this.gameTree.getCurrentNode();
        this.chess.load(node.fen);
        if (node.move) {
            this.lastMove = { from: node.move.from, to: node.move.to };
        }
        this.eventBus.emit('BOARD_UPDATED', {});
    }

    // ═══════════════════════════════════════════
    //  FEN & PGN
    // ═══════════════════════════════════════════

    /**
     * @method loadFen
     * @description Carga una posición desde FEN.
     */
    public loadFen(fen: string): boolean {
        try {
            this.chess.load(fen);
            this.gameTree.reset(fen);
            this.lastMove = null;
            this.eventBus.emit('POSITION_LOADED', { fen, source: 'fen' });
            this.eventBus.emit('BOARD_UPDATED', {});
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @method loadPgn
     * @description Carga una partida completa desde una cadena PGN.
     */
    public loadPgn(pgn: string): boolean {
        try {
            const tempChess = new Chess();
            tempChess.loadPgn(pgn);

            const history = tempChess.history({ verbose: true }) as Move[];
            const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

            this.gameTree.reset(startFen);
            this.chess.load(startFen);

            // Replay de todos los movimientos en el Game Tree
            for (const move of history) {
                this.chess.move({ from: move.from, to: move.to, promotion: move.promotion });

                const moveData: MoveData = {
                    from: move.from,
                    to: move.to,
                    piece: move.piece,
                    captured: move.captured,
                    promotion: move.promotion,
                    san: move.san,
                    lan: move.lan,
                    fenBefore: move.before,
                    fenAfter: move.after,
                    isCheck: this.chess.isCheck(),
                    isCheckmate: this.chess.isCheckmate(),
                    isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
                    isEnPassant: move.isEnPassant(),
                    isPromotion: move.isPromotion(),
                };

                this.gameTree.addMove(move.after, moveData);
            }

            // Actualizar lastMove
            if (history.length > 0) {
                const last = history[history.length - 1];
                this.lastMove = { from: last.from, to: last.to };
            } else {
                this.lastMove = null;
            }

            this.eventBus.emit('POSITION_LOADED', { fen: this.chess.fen(), source: 'pgn' });
            this.eventBus.emit('BOARD_UPDATED', {});
            return true;
        } catch {
            return false;
        }
    }

    /** Retorna el FEN de la posición actual */
    public getFen(): string {
        return this.chess.fen();
    }

    /** Retorna el PGN de la línea principal */
    public getPgn(): string {
        const mainLine = this.gameTree.getMainLine();
        const moves = mainLine
            .filter(node => node.move !== null)
            .map(node => node.move!);

        if (moves.length === 0) return '';

        let pgn = '';
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            const moveNum = Math.floor(i / 2) + 1;
            if (i % 2 === 0) {
                pgn += `${moveNum}. `;
            }
            pgn += move.san + ' ';
        }

        return pgn.trim();
    }

    // ═══════════════════════════════════════════
    //  CONSULTAS DE ESTADO
    // ═══════════════════════════════════════════

    public getTurn(): Color {
        return this.chess.turn();
    }

    public getMoveNumber(): number {
        return this.chess.moveNumber();
    }

    public isCheck(): boolean {
        return this.chess.isCheck();
    }

    public isCheckmate(): boolean {
        return this.chess.isCheckmate();
    }

    public isStalemate(): boolean {
        return this.chess.isStalemate();
    }

    public isDraw(): boolean {
        return this.chess.isDraw();
    }

    public isGameOver(): boolean {
        return this.chess.isGameOver();
    }

    /**
     * Retorna los destinos legales para una pieza en una casilla.
     * Para pintar los "puntitos" de destinos válidos.
     */
    public getLegalMovesFor(square: string): string[] {
        const moves = this.chess.moves({ square: square as Square, verbose: true });
        return (moves as Move[]).map(m => m.to);
    }

    /**
     * Retorna destinos de pre-move (pseudo-legales asumiendo que fuera su turno).
     */
    public getPremoveDestinationsFor(square: string): string[] {
        const piece = this.chess.get(square as Square);
        if (!piece) return [];
        
        if (piece.color === this.chess.turn()) {
            return this.getLegalMovesFor(square);
        }
        
        // Clone chess instance to avoid corrupting the live game history
        const tempChess = new Chess(this.chess.fen());
        tempChess.setTurn(piece.color);
        const moves = tempChess.moves({ square: square as Square, verbose: true });
        return (moves as Move[]).map(m => m.to);
    }

    /** Retorna TODOS los movimientos legales con datos completos */
    public getAllLegalMoves(): Move[] {
        return this.chess.moves({ verbose: true }) as Move[];
    }

    /** Retorna el último movimiento (para highlights) */
    public getLastMove(): { from: string; to: string } | null {
        return this.lastMove;
    }

    // ═══════════════════════════════════════════
    //  GESTIÓN DE MODOS
    // ═══════════════════════════════════════════

    /** Cambia el modo de ejecución del motor */
    public setMode(mode: EngineMode): void {
        const previousMode = this.mode;
        this.mode = mode;
        this.eventBus.emit('MODE_CHANGED', { from: previousMode, to: mode });
    }

    /** Retorna el modo de ejecución actual */
    public getMode(): EngineMode {
        return this.mode;
    }

    // ═══════════════════════════════════════════
    //  OPERACIONES MODO SETUP
    // ═══════════════════════════════════════════

    /**
     * @method placePiece
     * @description Coloca una pieza en una casilla (solo en modo SETUP) 
     */
    public placePiece(square: string, type: PieceSymbol, color: Color): boolean {
        if (this.mode !== 'SETUP') {
            console.warn('[placePiece] Requires SETUP mode');
            return false;
        }
        const success = this.chess.put({ type, color }, square as Square);
        if (success) {
            this.gameTree.reset(this.chess.fen());
            this.eventBus.emit('PIECE_PLACED', { square, piece: type, color });
            this.eventBus.emit('BOARD_UPDATED', {});
        }
        return success;
    }

    /**
     * @method removePiece
     * @description Elimina una pieza de una casilla (solo en modo SETUP) 
     */
    public removePiece(square: string): boolean {
        if (this.mode !== 'SETUP') {
            console.warn('[removePiece] Requires SETUP mode');
            return false;
        }
        const removed = this.chess.remove(square as Square);
        if (removed) {
            this.gameTree.reset(this.chess.fen());
            this.eventBus.emit('PIECE_REMOVED', { square });
            this.eventBus.emit('BOARD_UPDATED', {});
        }
        return !!removed;
    }

    /**
     * @method clearBoard
     * @description Limpia todo el tablero (solo en modo SETUP) 
     */
    public clearBoard(): void {
        if (this.mode !== 'SETUP') {
            console.warn('[clearBoard] Requires SETUP mode');
            return;
        }
        this.chess.clear();
        this.gameTree.reset(this.chess.fen());
        this.eventBus.emit('BOARD_UPDATED', {});
    }

    // ═══════════════════════════════════════════
    //  ACCESO AL GAME TREE
    // ═══════════════════════════════════════════

    /** Expone el Game Tree para consultas avanzadas */
    public getGameTree(): GameTree {
        return this.gameTree;
    }

    /** Se puede deshacer? */
    public canUndo(): boolean {
        return this.gameTree.canGoBack();
    }

    /** Se puede rehacer? */
    public canRedo(): boolean {
        return this.gameTree.canGoForward();
    }

    // ═══════════════════════════════════════════
    //  HISTORIAL (migrado desde HistoryManager)
    // ═══════════════════════════════════════════

    /** Retorna la lista de movimientos de la línea principal */
    public getMoveList(): MoveData[] {
        return this.gameTree.getMainLine()
            .filter(node => node.move !== null)
            .map(node => node.move!);
    }

    /** Retorna el índice del movimiento actual */
    public getCurrentMoveIndex(): number {
        return this.gameTree.getCurrentNode().halfMoveIndex;
    }

    /** Retorna el total de movimientos en la línea principal */
    public getTotalMoves(): number {
        return this.gameTree.getMainLine().length - 1;
    }

    /** Alias para getMoveList() — compatibilidad */
    public getMoveHistory(): MoveData[] {
        return this.getMoveList();
    }

    // ═══════════════════════════════════════════
    //  RESET
    // ═══════════════════════════════════════════

    /**
     * @method resetGame
     * @description Reinicia la partida completa 
     */
    public resetGame(fen?: string): void {
        if (fen) {
            this.chess.load(fen);
        } else {
            this.chess.reset();
        }
        this.gameTree.reset(this.chess.fen());
        this.lastMove = null;
        this.gameResult = null;
        this.eventBus.emit('GAME_RESET', {});
        this.eventBus.emit('BOARD_UPDATED', {});
    }

    // ═══════════════════════════════════════════
    //  ANÁLISIS Y EMISIÓN DE EVENTOS (Privado)
    // ═══════════════════════════════════════════

    /**
     * Lógica privada para determinar qué eventos emitir tras un movimiento válido.
     * Detecta: captura, enroque, promoción, jaque, mate, tablas.
     */
    private analyzeAndEmitEvents(move: Move): void {
        // 1. Enroque
        if (move.isKingsideCastle() || move.isQueensideCastle()) {
            this.eventBus.emit('CASTLED', {
                side: move.isKingsideCastle() ? 'kingside' : 'queenside',
                color: move.color
            });
        }

        // 2. Promoción
        if (move.isPromotion() && move.promotion) {
            this.eventBus.emit('PROMOTED', {
                square: move.to,
                piece: move.promotion
            });
        }

        // 3. Captura vs movimiento normal
        if (move.captured) {
            this.eventBus.emit('PIECE_CAPTURED', {
                from: move.from,
                to: move.to,
                piece: move.piece,
                capturedPiece: move.captured
            });
        } else {
            this.eventBus.emit('PIECE_MOVED', {
                from: move.from,
                to: move.to,
                piece: move.piece
            });
        }

        // 4. Estado post-movimiento
        if (this.chess.isCheckmate()) {
            const winner = this.chess.turn() === 'w' ? 'b' : 'w';
            this.gameResult = { winner, reason: 'checkmate' };
            this.eventBus.emit('GAME_OVER', { winner, reason: 'checkmate' });
        } else if (this.chess.isCheck()) {
            this.eventBus.emit('CHECK', { kingColor: this.chess.turn() });
        } else if (this.chess.isStalemate()) {
            this.gameResult = { winner: 'draw', reason: 'stalemate' };
            this.eventBus.emit('GAME_OVER', { winner: 'draw', reason: 'stalemate' });
        } else if (this.chess.isInsufficientMaterial()) {
            this.gameResult = { winner: 'draw', reason: 'insufficient_material' };
            this.eventBus.emit('GAME_OVER', { winner: 'draw', reason: 'insufficient_material' });
        } else if (this.chess.isThreefoldRepetition()) {
            this.gameResult = { winner: 'draw', reason: 'threefold_repetition' };
            this.eventBus.emit('GAME_OVER', { winner: 'draw', reason: 'threefold_repetition' });
        } else if (this.chess.isDraw()) {
            this.gameResult = { winner: 'draw', reason: 'fifty_move' };
            this.eventBus.emit('GAME_OVER', { winner: 'draw', reason: 'fifty_move' });
        }
    }

    // ═══════════════════════════════════════════
    //  MATERIAL Y CAPTURAS
    // ═══════════════════════════════════════════

    /**
     * Returns pieces captured by each side.
     * `w` = pieces captured BY white (black pieces that were taken)
     * `b` = pieces captured BY black (white pieces that were taken)
     */
    public getCapturedPieces(): { w: PieceSymbol[]; b: PieceSymbol[] } {
        const currentWhite: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
        const currentBlack: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

        // Count pieces on the board
        const board = this.chess.board();
        for (const row of board) {
            for (const square of row) {
                if (square) {
                    if (square.color === 'w') {
                        currentWhite[square.type]++;
                    } else {
                        currentBlack[square.type]++;
                    }
                }
            }
        }

        // Calculate captured pieces (starting - current)
        const capturedByWhite: PieceSymbol[] = []; // black pieces taken
        const capturedByBlack: PieceSymbol[] = []; // white pieces taken

        const pieceTypes: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p'];
        for (const piece of pieceTypes) {
            const missingBlack = ChessEngine.STARTING_MATERIAL[piece] - currentBlack[piece];
            const missingWhite = ChessEngine.STARTING_MATERIAL[piece] - currentWhite[piece];
            for (let i = 0; i < missingBlack; i++) capturedByWhite.push(piece);
            for (let i = 0; i < missingWhite; i++) capturedByBlack.push(piece);
        }

        return { w: capturedByWhite, b: capturedByBlack };
    }

    /**
     * Returns the material advantage for each side using standard piece values.
     * (p=1, n=3, b=3, r=5, q=9)
     */
    public getMaterialAdvantage(): { w: number; b: number } {
        const captured = this.getCapturedPieces();
        let whiteScore = 0;
        let blackScore = 0;

        for (const piece of captured.w) {
            whiteScore += ChessEngine.PIECE_VALUES[piece];
        }
        for (const piece of captured.b) {
            blackScore += ChessEngine.PIECE_VALUES[piece];
        }

        const diff = whiteScore - blackScore;
        return {
            w: diff > 0 ? diff : 0,
            b: diff < 0 ? -diff : 0
        };
    }

    // ═══════════════════════════════════════════
    //  RESULTADO DE LA PARTIDA
    // ═══════════════════════════════════════════

    /** Returns the game result, or null if the game is still in progress */
    public getResult(): GameResult | null {
        return this.gameResult;
    }

    /** Sets the game result externally (e.g., timeout, resignation) */
    public setResult(result: GameResult): void {
        this.gameResult = result;
    }

    // ═══════════════════════════════════════════
    //  DRAW / RESIGN PROTOCOL
    // ═══════════════════════════════════════════

    /** One side resigns. Sets result and emits GAME_OVER. */
    public resign(color: 'w' | 'b'): void {
        const winner = color === 'w' ? 'b' : 'w';
        this.gameResult = { winner, reason: 'resignation' };
        this.eventBus.emit('GAME_OVER', { winner, reason: 'resignation' });
    }

    /** Emits DRAW_OFFERED event */
    public offerDraw(): void {
        this.eventBus.emit('DRAW_OFFERED', {});
    }

    /** Accepts a draw offer. Sets result and emits GAME_OVER. */
    public acceptDraw(): void {
        this.gameResult = { winner: 'draw', reason: 'draw_agreement' };
        this.eventBus.emit('GAME_OVER', { winner: 'draw', reason: 'draw_agreement' });
    }

    /** Declines a draw offer. Emits DRAW_DECLINED. */
    public declineDraw(): void {
        this.eventBus.emit('DRAW_DECLINED', {});
    }
}