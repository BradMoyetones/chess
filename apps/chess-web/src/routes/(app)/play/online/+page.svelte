<script lang="ts">
	import Chessboard from '$lib/components/chess/Chessboard.svelte';
	import BoardAnnotations from '$lib/components/chess/BoardAnnotations.svelte';
	import { theme } from '$lib/theme';
	import { ChessApp } from '@chess-fw/core';
	import type { ArrowAnnotation, HighlightAnnotation } from '@chess-fw/core';

	const app = new ChessApp();
	let snapshot = $state(app.getSnapshot());

	// Simulated player color (in real use, comes from server)
	const playerColor: 'w' | 'b' = 'w';

	/** Refresh snapshot from the core — single source of truth. */
	function refresh() {
		snapshot = app.getSnapshot();
	}

	// Listen to ALL events that change visible board state
	app.events.on('BOARD_UPDATED', refresh);
	app.events.on('SQUARE_SELECTED', refresh);
	app.events.on('SQUARE_DESELECTED', refresh);
	app.events.on('PREMOVE_QUEUED', refresh);
	app.events.on('PREMOVE_CANCELLED', refresh);
	app.events.on('PREMOVE_EXECUTED', refresh);

	// ─── Board Callbacks ───

	function handleDrop(e: { from: string; to: string }) {
		const piece = app.engine.getPieceAt(e.from);
        
		if (!piece) return;

		const isMyTurn = piece.color === app.engine.getTurn();

		if (isMyTurn) {
			// Normal move via drag
			app.engine.attemptMove(e.from, e.to);
			app.interaction.clearSelection();
		} else {
			// Off-turn drag → register premove (unified with click premove)
			app.interaction.selectSquare(e.from);     // select origin
			app.interaction.selectSquare(e.to);        // triggers premove registration
		}

		refresh();
	}

	function handleClick(e: { square: string }) {
		app.click(e.square);
		refresh();
	}

	// ─── Right-click Annotations ───

	let annotationStart: string | null = $state(null);

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
	}

	function handleBoardMouseDown(e: MouseEvent) {
		if (e.button === 0) {
			// Left click: clear annotations
			app.annotations.clearAll();
			refresh();
		} else if (e.button === 2) {
			const square = getSquareFromEvent(e);
			if (square) annotationStart = square;
		}
	}

	function handleBoardMouseUp(e: MouseEvent) {
		if (e.button !== 2 || !annotationStart) return;

		const endSquare = getSquareFromEvent(e);
		if (!endSquare) {
			annotationStart = null;
			return;
		}

		if (endSquare === annotationStart) {
			const existing = app.annotations
				.getAnnotations()
				.find(
					(a) =>
						a.type === 'highlight' && (a as HighlightAnnotation).square === endSquare
				);
			if (existing) {
				app.annotations.removeAnnotation(existing.id);
			} else {
				app.annotations.addHighlight(endSquare, '#ef4444');
			}
		} else {
			app.annotations.addArrow(annotationStart, endSquare);
		}

		annotationStart = null;
		refresh();
	}

	function toCoords(algebraic: string): { x: number; y: number } {
		return {
			x: algebraic.charCodeAt(0) - 97,
			y: 8 - parseInt(algebraic[1])
		};
	}

	function getSquareFromEvent(e: MouseEvent): string | null {
		const boardEl = (e.currentTarget as HTMLElement).querySelector('.cb-root');
		if (!boardEl) return null;

		const rect = boardEl.getBoundingClientRect();
		const sqSize = rect.width / 8;
		const rawCol = Math.floor((e.clientX - rect.left) / sqSize);
		const rawRow = Math.floor((e.clientY - rect.top) / sqSize);

		if (rawCol < 0 || rawCol > 7 || rawRow < 0 || rawRow > 7) return null;

		const isFlipped = snapshot.gameState.boardOrientation === 'b';
		const file = isFlipped ? 7 - rawCol : rawCol;
		const rank = isFlipped ? rawRow : 7 - rawRow;
		return String.fromCharCode(97 + file) + String(rank + 1);
	}

	// ─── Mapped Annotations ───

	const mappedArrows = $derived(
		snapshot.visuals.annotations
			.filter((a): a is ArrowAnnotation => a.type === 'arrow')
			.map((a) => ({
				id: a.id,
				from: toCoords(a.from),
				to: toCoords(a.to),
				color: a.color === 'green' ? undefined : a.color
			}))
	);

	const mappedHighlights = $derived(
		snapshot.visuals.annotations
			.filter((a): a is HighlightAnnotation => a.type === 'highlight')
			.map((a) => ({
				id: a.id,
				...toCoords(a.square),
				color: a.backgroundColor || a.color
			}))
	);

	const flipped = $derived(snapshot.gameState.boardOrientation === 'b');
	const isGameOver = $derived(snapshot.gameState.isGameOver);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="page-container"
	oncontextmenu={handleContextMenu}
	onmousedown={handleBoardMouseDown}
	onmouseup={handleBoardMouseUp}
>
	<div class="board-wrapper">
		<Chessboard
			{theme}
			position={snapshot.board}
			orientation={snapshot.gameState.boardOrientation}
			interactableSide={isGameOver ? 'none' : playerColor}
			activeTurn={snapshot.gameState.turn}
			enablePremoves={true}
			enableSelection={true}
			onpiecedrop={handleDrop}
			onsquareclick={handleClick}
			interactive={!isGameOver}
		/>

		<BoardAnnotations
			arrows={mappedArrows}
			highlights={mappedHighlights}
			{flipped}
		/>
	</div>

	<!-- Game info -->
	<div class="info-bar">
		<span class="turn-indicator">
			{snapshot.gameState.turn === 'w' ? '⬜' : '⬛'}
			Turno: {snapshot.gameState.turn === 'w' ? 'Blancas' : 'Negras'}
		</span>
		<span class="move-count">
			Jugada #{snapshot.gameState.moveNumber}
		</span>
		{#if snapshot.gameState.inCheck}
			<span class="status-badge check">¡Jaque!</span>
		{/if}
		{#if snapshot.gameState.isCheckmate}
			<span class="status-badge checkmate">Jaque Mate</span>
		{/if}
		{#if snapshot.gameState.isStalemate}
			<span class="status-badge stalemate">Tablas (Ahogado)</span>
		{/if}
		{#if snapshot.gameState.isDraw && !snapshot.gameState.isStalemate}
			<span class="status-badge draw">Tablas</span>
		{/if}
	</div>
</div>

<style>
	.page-container {
		max-width: 40rem;
		margin: 1.5rem auto;
		padding: 0 1rem;
	}

	.board-wrapper {
		position: relative;
		width: 100%;
	}

	.info-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.05);
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.turn-indicator {
		font-weight: 600;
	}

	.move-count {
		opacity: 0.6;
	}

	.status-badge {
		padding: 0.15rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-badge.check {
		background: rgba(234, 179, 8, 0.2);
		color: rgb(234, 179, 8);
	}

	.status-badge.checkmate {
		background: rgba(239, 68, 68, 0.2);
		color: rgb(239, 68, 68);
	}

	.status-badge.stalemate,
	.status-badge.draw {
		background: rgba(148, 163, 184, 0.2);
		color: rgb(148, 163, 184);
	}
</style>