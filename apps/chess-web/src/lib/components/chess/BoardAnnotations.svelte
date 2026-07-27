<script lang="ts" module>
	export interface ArrowConfig {
		strokeWidth: number;
		startOffset: number;
		markerWidth: number;
		markerHeight: number;
		refX: number;
		color: string;
		opacity: number;
	}

	export interface AnnotationArrow {
		id: string;
		from: { x: number; y: number };
		to: { x: number; y: number };
		color?: string;
	}

	export interface AnnotationHighlight {
		id: string;
		x: number;
		y: number;
		color?: string;
	}

	export const DEFAULT_ARROW_CONFIG: ArrowConfig = {
		strokeWidth: 3,
		startOffset: 4.5,
		markerWidth: 1.5,
		markerHeight: 2.2,
		refX: 0.01,
		color: 'rgba(255, 170, 0, 0.8)',
		opacity: 0.8
	};

	/**
	 * Sanitizes a color string into a valid SVG marker ID.
	 */
	function colorToId(c: string): string {
		return c.replace(/[^a-zA-Z0-9]/g, '');
	}
</script>

<script lang="ts">
	let {
		rows = 8,
		cols = 8,
		arrows = [],
		highlights = [],
		arrowConfig = {},
		flipped = false,
		class: className = ''
	}: {
		rows?: number;
		cols?: number;
		arrows?: AnnotationArrow[];
		highlights?: AnnotationHighlight[];
		arrowConfig?: Partial<ArrowConfig>;
		flipped?: boolean;
		class?: string;
	} = $props();

	const config = $derived({ ...DEFAULT_ARROW_CONFIG, ...arrowConfig });

	const squareWidth = $derived(100 / cols);
	const squareHeight = $derived(100 / rows);

	/** All unique colors used in arrows (for SVG marker definitions) */
	const uniqueColors = $derived.by(() => {
		const set = new Set<string>([config.color]);
		for (const a of arrows) {
			if (a.color) set.add(a.color);
		}
		return Array.from(set);
	});

	/** Computed arrow paths (straight lines and knight L-shapes) */
	const arrowPaths = $derived.by(() => {
		return arrows.map((a) => {
			const aFromX = flipped ? 7 - a.from.x : a.from.x;
			const aFromY = flipped ? 7 - a.from.y : a.from.y;
			const aToX = flipped ? 7 - a.to.x : a.to.x;
			const aToY = flipped ? 7 - a.to.y : a.to.y;

			const startX = aFromX * squareWidth + squareWidth / 2;
			const startY = aFromY * squareHeight + squareHeight / 2;
			const endX = aToX * squareWidth + squareWidth / 2;
			const endY = aToY * squareHeight + squareHeight / 2;

			const dx = endX - startX;
			const dy = endY - startY;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance === 0) return null;

			const endOffset = (config.markerWidth - config.refX) * config.strokeWidth;
			const customColor = a.color || config.color;

			const isKnightMove =
				(Math.abs(aFromX - aToX) === 1 && Math.abs(aFromY - aToY) === 2) ||
				(Math.abs(aFromX - aToX) === 2 && Math.abs(aFromY - aToY) === 1);

			if (isKnightMove) {
				const moveHorizontallyFirst = Math.abs(aFromX - aToX) > Math.abs(aFromY - aToY);
				const midX = moveHorizontallyFirst ? endX : startX;
				const midY = moveHorizontallyFirst ? startY : endY;

				let finalStartX = startX;
				let finalStartY = startY;
				let finalEndX = endX;
				let finalEndY = endY;

				if (moveHorizontallyFirst) {
					finalStartX += Math.sign(endX - startX) * config.startOffset;
					finalEndY -= Math.sign(endY - midY) * endOffset;
				} else {
					finalStartY += Math.sign(endY - startY) * config.startOffset;
					finalEndX -= Math.sign(endX - midX) * endOffset;
				}

				return {
					id: a.id,
					type: 'knight' as const,
					points: `${finalStartX},${finalStartY} ${midX},${midY} ${finalEndX},${finalEndY}`,
					color: customColor,
					markerId: `arrowhead-${colorToId(customColor)}`
				};
			}

			const finalStartX = startX + (dx / distance) * config.startOffset;
			const finalStartY = startY + (dy / distance) * config.startOffset;
			const finalEndX = endX - (dx / distance) * endOffset;
			const finalEndY = endY - (dy / distance) * endOffset;

			return {
				id: a.id,
				type: 'straight' as const,
				x1: finalStartX,
				y1: finalStartY,
				x2: finalEndX,
				y2: finalEndY,
				color: customColor,
				markerId: `arrowhead-${colorToId(customColor)}`
			};
		});
	});
</script>

<div class="ba-root {className}">
	<!-- Highlight squares (lower z-index) -->
	<div class="ba-highlights-layer">
		{#each highlights as h (h.id)}
			{@const renderX = flipped ? 7 - h.x : h.x}
			{@const renderY = flipped ? 7 - h.y : h.y}
			<div
				class="ba-highlight"
				style="
					width: {squareWidth}%;
					height: {squareHeight}%;
					left: {renderX * squareWidth}%;
					top: {renderY * squareHeight}%;
					background-color: {h.color || '#ef4444'};
				"
			></div>
		{/each}
	</div>

	<!-- Arrow SVG (higher z-index, above pieces) -->
	<div class="ba-arrows-layer">
		<svg viewBox="0 0 100 100" class="ba-svg">
			<defs>
				{#each uniqueColors as color (colorToId(color))}
					<marker
						id="arrowhead-{colorToId(color)}"
						markerWidth={config.markerWidth}
						markerHeight={config.markerHeight}
						refX={config.refX}
						refY={config.markerHeight / 2}
						orient="auto"
						markerUnits="strokeWidth"
					>
						<polygon
							points="0 0, {config.markerWidth} {config.markerHeight / 2}, 0 {config.markerHeight}"
							fill={color}
						/>
					</marker>
				{/each}
			</defs>
			<g opacity={config.opacity}>
				{#each arrowPaths as path}
					{#if path}
						{#if path.type === 'knight'}
							<polyline
								points={path.points}
								fill="none"
								stroke={path.color}
								stroke-width={config.strokeWidth}
								stroke-linejoin="miter"
								marker-end="url(#{path.markerId})"
							/>
						{:else}
							<line
								x1={path.x1}
								y1={path.y1}
								x2={path.x2}
								y2={path.y2}
								stroke={path.color}
								stroke-width={config.strokeWidth}
								marker-end="url(#{path.markerId})"
							/>
						{/if}
					{/if}
				{/each}
			</g>
		</svg>
	</div>
</div>

<style>
	.ba-root {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.ba-highlights-layer {
		position: absolute;
		inset: 0;
		z-index: 2;
	}

	.ba-highlight {
		position: absolute;
		opacity: 0.6;
	}

	.ba-arrows-layer {
		position: absolute;
		inset: 0;
		z-index: 30;
	}

	.ba-svg {
		width: 100%;
		height: 100%;
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
</style>
