import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import { EventBus } from './EventBus';
import { GameTree } from './GameTree';
import type { MoveData, MoveResult } from '../Types/game-tree.types';
import type { EngineMode } from '../Types/mode.types';

export interface PieceData {
    type: PieceSymbol;
    color: Color;
}

/**
 * ChessEngine — El Gestor de Estados Multi-Contexto.
 * 
 * Ya no es un simple árbitro: orquesta el estado del juego, el Game Tree,
 * la navegación temporal, los modos de ejecución, y la comunicación
 * con todos los módulos del sistema vía EventBus.
 */
export class ChessEngine {
    private chess: Chess;
    private eventBus: EventBus;
    private gameTree: GameTree;
    private lastMove: { from: string; to: string } | null = null;
    private mode: EngineMode = 'PLAY';

    constructor(eventBus: EventBus, initialFen?: string) {
        this.chess = initialFen ? new Chess(initialFen) : new Chess();
        this.eventBus = eventBus;
        this.gameTree = new GameTree(this.chess.fen());
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
     * Intenta ejecutar un movimiento.
     * 
     * Retorna un MoveResult con información detallada sobre lo que pasó:
     * - success: true + datos del movimiento
     * - success: false + razón (illegal, wrong_turn, game_over, promotion_required)
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
                this.chess.setTurn(piece.color);
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

                // Siempre emitir que el tablero cambió
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
     * Deshace el último movimiento.
     * Navega al nodo padre en el Game Tree y restaura ese estado en chess.js.
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
     * Rehace el siguiente movimiento por la línea principal.
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

    /** Navega a un nodo específico del Game Tree por su ID */
    public goToMove(nodeId: string): boolean {
        const node = this.gameTree.goToNode(nodeId);
        if (!node) return false;

        this.chess.load(node.fen);

        if (node.move) {
            this.lastMove = { from: node.move.from, to: node.move.to };
        } else {
            this.lastMove = null;
        }

        this.eventBus.emit('NAVIGATE_TO_MOVE', { moveIndex: node.halfMoveIndex });
        this.eventBus.emit('BOARD_UPDATED', {});
        return true;
    }

    /** Salta al inicio de la partida */
    public goToStart(): void {
        this.gameTree.goToRoot();
        this.chess.load(this.gameTree.getCurrentNode().fen);
        this.lastMove = null;
        this.eventBus.emit('BOARD_UPDATED', {});
    }

    /** Salta al último movimiento de la línea principal */
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
     * Carga una posición desde una cadena FEN.
     * Reinicia el Game Tree con esta posición como root.
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
     * Carga una partida completa desde una cadena PGN.
     * Reconstruye el Game Tree con todos los movimientos.
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
        const originalTurn = this.chess.turn();
        
        if (piece.color === originalTurn) {
            return this.getLegalMovesFor(square);
        }
        
        // Cambiar temporalmente el turno para generar movimientos
        this.chess.setTurn(piece.color);
        const moves = this.getLegalMovesFor(square);
        this.chess.setTurn(originalTurn);
        
        return moves;
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

    /** Coloca una pieza en una casilla (solo en modo SETUP) */
    public placePiece(square: string, type: PieceSymbol, color: Color): boolean {
        if (this.mode !== 'SETUP') return false;

        const success = this.chess.put({ type, color }, square as Square);
        if (success) {
            this.gameTree.reset(this.chess.fen());
            this.eventBus.emit('PIECE_PLACED', { square, piece: type, color });
            this.eventBus.emit('BOARD_UPDATED', {});
        }
        return success;
    }

    /** Elimina una pieza de una casilla (solo en modo SETUP) */
    public removePiece(square: string): boolean {
        if (this.mode !== 'SETUP') return false;

        const removed = this.chess.remove(square as Square);
        if (removed) {
            this.gameTree.reset(this.chess.fen());
            this.eventBus.emit('PIECE_REMOVED', { square });
            this.eventBus.emit('BOARD_UPDATED', {});
        }
        return !!removed;
    }

    /** Limpia todo el tablero (solo en modo SETUP) */
    public clearBoard(): void {
        if (this.mode !== 'SETUP') return;
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
    //  RESET
    // ═══════════════════════════════════════════

    /** Reinicia la partida completa */
    public resetGame(fen?: string): void {
        if (fen) {
            this.chess.load(fen);
        } else {
            this.chess.reset();
        }
        this.gameTree.reset(this.chess.fen());
        this.lastMove = null;
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
            this.eventBus.emit('GAME_OVER', { winner, reason: 'checkmate' });
        } else if (this.chess.isCheck()) {
            this.eventBus.emit('CHECK', { kingColor: this.chess.turn() });
        } else if (this.chess.isStalemate()) {
            this.eventBus.emit('GAME_OVER', { winner: 'draw', reason: 'stalemate' });
        } else if (this.chess.isDraw()) {
            this.eventBus.emit('GAME_OVER', { winner: 'draw', reason: 'draw' });
        }
    }
}