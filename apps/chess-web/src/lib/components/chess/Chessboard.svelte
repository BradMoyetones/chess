<script lang="ts" module>
	import type { Color, PieceSymbol, SquareData } from '@chess-fw/core';
	import type { BoardTheme } from '$lib/theme';

	export type InteractableSide = 'w' | 'b' | 'both' | 'none';

	export type ChessboardProps = {
		/** 8x8 grid from BoardSnapshot.board */
		position: SquareData[][];
		/** Which color sits at the bottom */
		orientation?: Color;
		/** Visual theme for board, pieces, coordinates */
		theme: BoardTheme;
		/** Enable drag & drop and click interaction */
		interactive?: boolean;
		/** Which side the user can grab/interact with */
		interactableSide?: InteractableSide;
		/** Current turn — valid destinations only show when piece color matches */
		activeTurn?: Color;
		/** Enable premove registration (off-turn interactions) */
		enablePremoves?: boolean;
		/** Enable visual selection highlight */
		enableSelection?: boolean;
		/** CSS class for the root container */
		class?: string;

		// ─── Agnostic Callbacks ───
		/** Fired when a piece is dropped on a different square */
		onpiecedrop?: (detail: { from: string; to: string }) => void;
		/** Fired when a square is clicked (no drag) */
		onsquareclick?: (detail: { square: string }) => void;
		/** Fired when a drag begins */
		ondragstart?: (detail: { square: string; piece: { type: string; color: string } }) => void;
		/** Fired when a drag ends (completed or cancelled) */
		ondragend?: () => void;
	};

	/**
	 * Converts a board-grid coordinate (row, col) to algebraic notation,
	 * accounting for board orientation.
	 */
	function toAlgebraic(row: number, col: number, flipped: boolean): string {
		const file = flipped ? 7 - col : col;
		const rank = flipped ? row : 7 - row;
		return String.fromCharCode(97 + file) + String(rank + 1);
	}

	// ═══════════════════════════════════════════
	//  Stable Piece Identity
	// ═══════════════════════════════════════════

	interface StablePiece {
		id: string;
		algebraic: string;
		type: PieceSymbol;
		color: Color;
		visualRow: number;
		visualCol: number;
	}

	/**
	 * Reconciles piece identities across position changes so that the same
	 * DOM element persists when a piece moves — enabling CSS transitions.
	 *
	 * Algorithm (mirrors the React useChessPieces):
	 *  Pass 1: Pieces that stayed in place keep their old ID.
	 *  Pass 2: Moved pieces are matched by type+color from the pool of
	 *          unmatched old pieces (handles promotions too).
	 *  Pass 3: Truly new pieces get a fresh ID.
	 */
	function reconcilePieces(
		position: SquareData[][],
		flipped: boolean,
		prevMap: Map<string, { id: string; type: PieceSymbol; color: Color }>
	): { pieces: StablePiece[]; nextMap: Map<string, { id: string; type: PieceSymbol; color: Color }> } {
		const nextMap = new Map<string, { id: string; type: PieceSymbol; color: Color }>();
		const unassigned: { algebraic: string; type: PieceSymbol; color: Color; vr: number; vc: number }[] = [];
		const available = Array.from(prevMap.values());
		const result: StablePiece[] = [];

		// Pass 1: pieces that stayed in place
		for (let r = 0; r < 8; r++) {
			for (let c = 0; c < 8; c++) {
				const sq = position[r][c];
				if (!sq.piece) continue;

				const old = prevMap.get(sq.algebraic);
				const vr = flipped ? 7 - r : r;
				const vc = flipped ? 7 - c : c;

				if (old && old.type === sq.piece.type && old.color === sq.piece.color) {
					nextMap.set(sq.algebraic, old);
					result.push({ id: old.id, algebraic: sq.algebraic, type: sq.piece.type, color: sq.piece.color, visualRow: vr, visualCol: vc });
					const idx = available.findIndex((p) => p.id === old.id);
					if (idx !== -1) available.splice(idx, 1);
				} else {
					unassigned.push({ algebraic: sq.algebraic, type: sq.piece.type, color: sq.piece.color as Color, vr, vc });
				}
			}
		}

		// Pass 2: match moved pieces by type+color
		for (const np of unassigned) {
			let matchIdx = available.findIndex((p) => p.type === np.type && p.color === np.color);

			// Handle promotion: pawn became another piece
			if (matchIdx === -1) {
				matchIdx = available.findIndex((p) => p.type === 'p' && p.color === np.color);
			}

			if (matchIdx !== -1) {
				const matched = available.splice(matchIdx, 1)[0];
				const entry = { id: matched.id, type: np.type, color: np.color };
				nextMap.set(np.algebraic, entry);
				result.push({ id: matched.id, algebraic: np.algebraic, type: np.type, color: np.color, visualRow: np.vr, visualCol: np.vc });
			} else {
				// Pass 3: truly new piece
				const id = `${np.color}${np.type}-${np.algebraic}-${Math.random().toString(36).substring(2, 9)}`;
				const entry = { id, type: np.type, color: np.color };
				nextMap.set(np.algebraic, entry);
				result.push({ id, algebraic: np.algebraic, type: np.type, color: np.color, visualRow: np.vr, visualCol: np.vc });
			}
		}

		return { pieces: result.sort((a, b) => a.id.localeCompare(b.id)), nextMap };
	}
</script>

<script lang="ts">
	import Coordinates from './coordinates.svelte';

	let {
		position,
		orientation = 'w',
		theme: boardTheme,
		interactive = true,
		interactableSide = 'both',
		activeTurn = 'w',
		enablePremoves = false,
		enableSelection = true,
		class: className,
		onpiecedrop,
		onsquareclick,
		ondragstart,
		ondragend
	}: ChessboardProps = $props();

	// ═══════════════════════════════════════════
	//  Derived State
	// ═══════════════════════════════════════════

	const flipped = $derived(orientation === 'b');

	// ─── Stable Piece Reconciliation ───
	let prevPieceMap = new Map<string, { id: string; type: PieceSymbol; color: Color }>();

	const pieces: StablePiece[] = $derived.by(() => {
		const { pieces: reconciled, nextMap } = reconcilePieces(position, flipped, prevPieceMap);
		prevPieceMap = nextMap;
		return reconciled;
	});

	/**
	 * Visual highlight squares (last move, selected, valid destinations, premoves).
	 * Respects enableSelection flag — if false, 'selected' highlights are suppressed.
	 */
	const highlights = $derived.by(() => {
		const result: Array<{
			algebraic: string;
			visualRow: number;
			visualCol: number;
			kind: 'last-move' | 'selected' | 'valid-destination' | 'valid-capture' | 'premove';
		}> = [];

		for (let r = 0; r < 8; r++) {
			for (let c = 0; c < 8; c++) {
				const sq = position[r][c];
				const visualRow = flipped ? 7 - r : r;
				const visualCol = flipped ? 7 - c : c;

				if (sq.isLastMoveOrigin || sq.isLastMoveDestination) {
					result.push({ algebraic: sq.algebraic, visualRow, visualCol, kind: 'last-move' });
				}
				if (enableSelection && sq.isSelected) {
					result.push({ algebraic: sq.algebraic, visualRow, visualCol, kind: 'selected' });
				}
				if (sq.isValidDestination) {
					const kind = sq.piece ? 'valid-capture' : 'valid-destination';
					result.push({ algebraic: sq.algebraic, visualRow, visualCol, kind });
				}
				if (enablePremoves && (sq.isPremoveOrigin || sq.isPremoveDestination)) {
					result.push({ algebraic: sq.algebraic, visualRow, visualCol, kind: 'premove' });
				}
			}
		}
		return result;
	});

	// ═══════════════════════════════════════════
	//  Drag & Drop State (local, transient)
	// ═══════════════════════════════════════════

	let boardEl: HTMLDivElement | undefined = $state();

	let drag = $state<{
		active: boolean;
		originAlgebraic: string;
		pieceType: string;
		pieceColor: string;
		x: number;
		y: number;
		boardRect: DOMRect | null;
		squareSize: number;
	}>({
		active: false,
		originAlgebraic: '',
		pieceType: '',
		pieceColor: '',
		x: 0,
		y: 0,
		boardRect: null,
		squareSize: 0
	});

	let hoverSquare: string | null = $state(null);

	// ─── Click vs Drag detection ───
	let isClick = $state(true);
	let pointerStartX = 0;
	let pointerStartY = 0;
	const CLICK_THRESHOLD = 4;

	// ─── Click-to-Move Animation ───
	// true ONLY when a click on a valid destination is about to trigger a move.
	// Cleared by the DOM transitionend event after the piece finishes sliding.
	let isAnimating = $state(false);

	function handleTransitionEnd() {
		isAnimating = false;
	}

	// ═══════════════════════════════════════════
	//  Interaction Guards
	// ═══════════════════════════════════════════

	/**
	 * Returns true if the user is allowed to grab/interact with a piece of this color.
	 */
	function canInteract(pieceColor: string): boolean {
		if (!interactive) return false;
		if (interactableSide === 'none') return false;
		if (interactableSide === 'both') return true;
		return interactableSide === pieceColor;
	}

	/**
	 * Checks if a square is flagged as a valid destination in the current position.
	 * This is the ONLY gate that enables the click-to-move animation.
	 */
	function isSquareValidDest(square: string): boolean {
		for (let r = 0; r < 8; r++) {
			for (let c = 0; c < 8; c++) {
				if (position[r][c].algebraic === square && position[r][c].isValidDestination) {
					return true;
				}
			}
		}
		return false;
	}

	// ═══════════════════════════════════════════
	//  Pointer Event Handlers
	// ═══════════════════════════════════════════

	function handlePiecePointerDown(e: PointerEvent, algebraic: string, pieceType: string, pieceColor: string) {
		if (!canInteract(pieceColor)) return;
		if (e.button !== 0) return;
		e.preventDefault();

		const rect = boardEl?.getBoundingClientRect();
		if (!rect) return;

		const sqSize = rect.width / 8;
		const x = e.clientX - rect.left - sqSize / 2;
		const y = e.clientY - rect.top - sqSize / 2;

		drag = {
			active: true,
			originAlgebraic: algebraic,
			pieceType,
			pieceColor,
			x,
			y,
			boardRect: rect,
			squareSize: sqSize
		};
		hoverSquare = algebraic;
		isClick = true;
		pointerStartX = e.clientX;
		pointerStartY = e.clientY;

		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		ondragstart?.({ square: algebraic, piece: { type: pieceType, color: pieceColor } });
	}

	function handlePointerMove(e: PointerEvent) {
		if (!drag.active || !drag.boardRect) return;

		const rect = drag.boardRect;
		const sqSize = drag.squareSize;

		if (isClick) {
			const dx = Math.abs(e.clientX - pointerStartX);
			const dy = Math.abs(e.clientY - pointerStartY);
			if (dx > CLICK_THRESHOLD || dy > CLICK_THRESHOLD) {
				isClick = false;
			}
		}

		let x = e.clientX - rect.left - sqSize / 2;
		let y = e.clientY - rect.top - sqSize / 2;
		const maxX = rect.width - sqSize;
		const maxY = rect.height - sqSize;
		x = Math.max(0, Math.min(x, maxX));
		y = Math.max(0, Math.min(y, maxY));

		drag.x = x;
		drag.y = y;

		const rawCol = Math.floor((e.clientX - rect.left) / sqSize);
		const rawRow = Math.floor((e.clientY - rect.top) / sqSize);

		if (rawCol >= 0 && rawCol <= 7 && rawRow >= 0 && rawRow <= 7) {
			hoverSquare = toAlgebraic(rawRow, rawCol, flipped);
		} else {
			hoverSquare = null;
		}
	}

	function handlePointerUp(_e: PointerEvent) {
		if (!drag.active) return;

		const from = drag.originAlgebraic;

		if (isClick) {
			if (isSquareValidDest(from)) {
				isAnimating = true;
			}
			onsquareclick?.({ square: from });
		} else if (hoverSquare && hoverSquare !== from) {
			onpiecedrop?.({ from, to: hoverSquare });
		}

		drag = {
			active: false,
			originAlgebraic: '',
			pieceType: '',
			pieceColor: '',
			x: 0,
			y: 0,
			boardRect: null,
			squareSize: 0
		};
		hoverSquare = null;
		isClick = true;

		ondragend?.();
	}

	/**
	 * Handle pointer down on the board root (event delegation).
	 * Catches clicks on empty squares — pieces have their own handler.
	 */
	function handleBoardPointerDown(e: PointerEvent) {
		if (!interactive) return;
		if (e.button !== 0) return;

		// If the click landed on a piece element, skip — piece handler will fire
		if ((e.target as HTMLElement).closest('.cb-piece')) return;

		const rect = boardEl?.getBoundingClientRect();
		if (!rect) return;

		const sqSize = rect.width / 8;
		const rawCol = Math.floor((e.clientX - rect.left) / sqSize);
		const rawRow = Math.floor((e.clientY - rect.top) / sqSize);

		if (rawCol >= 0 && rawCol <= 7 && rawRow >= 0 && rawRow <= 7) {
			const square = toAlgebraic(rawRow, rawCol, flipped);
			if (isSquareValidDest(square)) {
				isAnimating = true;
			}
			onsquareclick?.({ square });
		}
	}
</script>

<!-- Global listeners for drag (always mounted; handlers guard with drag.active) -->
<svelte:window
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
/>

<!-- ═══════════════════════════════════════════ -->
<!--  THE BOARD                                 -->
<!-- ═══════════════════════════════════════════ -->
<div
	bind:this={boardEl}
	class="cb-root {className ?? ''}"
	style:--hl-selected={boardTheme.highlights.selected}
	style:--hl-last-move={boardTheme.highlights.lastMove}
	style:--hl-premove={boardTheme.highlights.premove}
	style:--hl-hover-border={boardTheme.highlights.hoverBorder}
	style:--hl-hover-shadow={boardTheme.highlights.hoverShadow}
	style:--hl-dest-empty={boardTheme.highlights.destinationEmpty}
	style:--hl-dest-capture={boardTheme.highlights.destinationCapture}
	role="img"
	aria-label="Chess board"
	onpointerdown={handleBoardPointerDown}
>
	<!-- Layer 0: Board texture -->
	<div
		class="cb-texture"
		style="background-image: url({boardTheme.board.backgroundImage})"
		aria-hidden="true"
	></div>

	<!-- Layer 1: Coordinates -->
	<Coordinates
		class="cb-coordinates"
		light={boardTheme.coordinates.light}
		dark={boardTheme.coordinates.dark}
		{flipped}
	/>

	<!-- Layer 2: Highlights -->
	{#each highlights as hl (hl.algebraic + '-' + hl.kind)}
		<div
			class="cb-highlight cb-highlight--{hl.kind}"
			style="top: {hl.visualRow * 12.5}%; left: {hl.visualCol * 12.5}%"
			aria-hidden="true"
		>
			{#if hl.kind === 'valid-destination'}
				<div class="cb-dot"></div>
			{:else if hl.kind === 'valid-capture'}
				<div class="cb-ring"></div>
			{/if}
		</div>
	{/each}

	<!-- Layer 2.5: Hover indicator during drag -->
	{#if drag.active && hoverSquare}
		{@const hoverData = (() => {
			for (let r = 0; r < 8; r++) {
				for (let c = 0; c < 8; c++) {
					if (position[r][c].algebraic === hoverSquare) {
						return { row: flipped ? 7 - r : r, col: flipped ? 7 - c : c };
					}
				}
			}
			return null;
		})()}
		{#if hoverData}
			<div
				class="cb-highlight cb-highlight--hover"
				style="top: {hoverData.row * 12.5}%; left: {hoverData.col * 12.5}%"
				aria-hidden="true"
			></div>
		{/if}
	{/if}

	<!-- Layer 3: Pieces (keyed by stable ID for animation continuity) -->
	{#each pieces as p (p.id)}
		{@const isDragging = drag.active && drag.originAlgebraic === p.algebraic}
		{@const isGrabbable = canInteract(p.color)}
		<img
			src={boardTheme.pieces[p.type][p.color]}
			alt="{p.color === 'w' ? 'White' : 'Black'} {p.type}"
			draggable={false}
			class="cb-piece
				{isDragging ? 'cb-piece--dragging' : ''}
				{!isGrabbable ? 'cb-piece--inert' : ''}"
			style={isDragging
				? `left: ${drag.x}px; top: ${drag.y}px; width: ${drag.squareSize}px; height: ${drag.squareSize}px;`
				: `top: ${p.visualRow * 12.5}%; left: ${p.visualCol * 12.5}%;${isAnimating ? ' transition: top 0.15s ease-out, left 0.15s ease-out;' : ''}`}
			ontransitionend={handleTransitionEnd}
			onpointerdown={(e) => handlePiecePointerDown(e, p.algebraic, p.type, p.color)}
		/>
	{/each}
</div>

<style>
	/* ═══════════════════════════════════════════
	   Root Container
	   ═══════════════════════════════════════════ */
	.cb-root {
		position: relative;
		aspect-ratio: 1;
		width: 100%;
		overflow: hidden;
		border-radius: 0.75rem;
		user-select: none;
		touch-action: none;
		-webkit-touch-callout: none;
	}

	/* ═══════════════════════════════════════════
	   Board Texture
	   ═══════════════════════════════════════════ */
	.cb-texture {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
	}

	/* ═══════════════════════════════════════════
	   Coordinates Overlay
	   ═══════════════════════════════════════════ */
	.cb-coordinates {
		pointer-events: none;
		position: absolute;
		inset: 0;
		z-index: 1;
	}

	.cb-coordinates :global(svg) {
		width: 100%;
		height: 100%;
	}

	/* ═══════════════════════════════════════════
	   Highlights (driven by CSS custom properties from theme)
	   ═══════════════════════════════════════════ */
	.cb-highlight {
		position: absolute;
		width: 12.5%;
		height: 12.5%;
		z-index: 2;
		pointer-events: none;
	}

	.cb-highlight--last-move {
		background-color: var(--hl-last-move);
	}

	.cb-highlight--selected {
		background-color: var(--hl-selected);
	}

	.cb-highlight--premove {
		background-color: var(--hl-premove);
	}

	.cb-highlight--hover {
		border: 4px solid var(--hl-hover-border);
		box-shadow: var(--hl-hover-shadow);
		box-sizing: border-box;
	}

	/* Dot indicator for valid empty-square destinations */
	.cb-dot {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 30%;
		height: 30%;
		border-radius: 50%;
		background-color: var(--hl-dest-empty);
		transform: translate(-50%, -50%);
	}

	/* Ring indicator for valid capture destinations */
	.cb-ring {
		position: absolute;
		inset: 4%;
		border-radius: 50%;
		border: 6px solid var(--hl-dest-capture);
		box-sizing: border-box;
	}

	/* ═══════════════════════════════════════════
	   Pieces
	   ═══════════════════════════════════════════ */
	.cb-piece {
		position: absolute;
		width: 12.5%;
		height: 12.5%;
		z-index: 3;
		object-fit: contain;
		cursor: grab;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
		/* NO transition — injected via inline style ONLY during click-to-move */
	}

	.cb-piece:active {
		cursor: grabbing;
	}

	.cb-piece--inert {
		cursor: default;
	}

	.cb-piece--dragging {
		z-index: 50;
		cursor: grabbing;
		filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.35));
	}
</style>
