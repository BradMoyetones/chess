<script lang="ts">
	import { motion } from '@humanspeak/svelte-motion';
	import { coordinateColors, theme } from '$lib/theme';
	import { cn } from '$lib/utils';
	import type { Color, PieceSymbol } from '@chess-fw/core';
	import Coordinates from '../coordinates.svelte';
	type Piece = { type: PieceSymbol; color: Color } | null;

	// Starting position, rank 8 (top) down to rank 1 (bottom).
	const START_ROWS: Piece[][] = (() => {
		const back = (color: Color): Piece[] =>
			(['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'] as PieceSymbol[]).map((type) => ({ type, color }));
		const pawns = (color: Color): Piece[] =>
			Array.from({ length: 8 }, () => ({ type: 'p' as PieceSymbol, color }));
		const empty = (): Piece[] => Array.from({ length: 8 }, () => null);

		return [back('b'), pawns('b'), empty(), empty(), empty(), empty(), pawns('w'), back('w')];
	})();

	// Flattened once so pieces get stable keys and a subtle staggered entrance.
	const START_PIECES = START_ROWS.flatMap((row, rowIndex) =>
		row.map((piece, colIndex) =>
			piece ? { piece, rowIndex, colIndex, key: `${rowIndex}-${colIndex}` } : null
		)
	).filter((v): v is NonNullable<typeof v> => v !== null);

	let { class: className }: { class?: string } = $props();
</script>

<motion.div
	initial={{ opacity: 0, scale: 0.98 }}
	animate={{ opacity: 1, scale: 1 }}
	transition={{ duration: 0.4, ease: 'easeOut' }}
	class={cn(
		'relative aspect-square w-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-border select-none',
		className
	)}
>
	<div
		class="absolute inset-0 bg-cover bg-center"
		style="background-image: url({theme.board.backgroundImage})"
		aria-hidden="true"
	></div>

	<Coordinates
		class="pointer-events-none absolute inset-0 z-10 [&>svg]:h-full [&>svg]:w-full"
		light={coordinateColors.light}
		dark={coordinateColors.dark}
	/>

	{#each START_PIECES as { piece, rowIndex, colIndex }, i}
		<motion.img
			src={theme.pieces[piece.type][piece.color]}
			alt=""
			aria-hidden="true"
			draggable={false}
			initial={{ opacity: 0, y: piece.color === 'b' ? -8 : 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, delay: 0.15 + i * 0.01, ease: 'easeOut' }}
			class="absolute z-20 object-contain drop-shadow-md"
			style={`
				width: 12.5%;
				height: 12.5%;
				top: ${rowIndex * 12.5}%;
				left: ${colIndex * 12.5}%;
			`}
		/>
	{/each}
</motion.div>
