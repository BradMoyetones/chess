<script lang="ts" module>
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLDivElement> & {
		light: string;
		dark: string;
		flipped?: boolean;
	};
</script>

<script lang="ts">
	let { light, dark, flipped = false, class: className, ...props }: Props = $props();
	const ranks = $derived(
		flipped
			? ['1', '2', '3', '4', '5', '6', '7', '8']
			: ['8', '7', '6', '5', '4', '3', '2', '1']
	);
	const files = $derived(
		flipped
			? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']
			: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
	);
</script>

<div class={cn('select-none', className)} {...props}>
	<svg viewBox="0 0 100 100" class="coordinates" aria-hidden="true">
		{#each ranks as rank, i}
			<text
				x="0.75"
				y={`${3.5 + i * 12.5}`}
				font-size="2.8"
				class={`font-semibold ${i % 2 === 0 ? 'coordinate-light' : 'coordinate-dark'}`}
				style="fill: {i % 2 === 0 ? light : dark}"
			>
				{rank}
			</text>
		{/each}
		{#each files as file, i}
			<text
				x={`${10 + i * 12.5}`}
				y="99"
				font-size="2.8"
				class={`font-semibold ${i % 2 === 1 ? 'coordinate-light' : 'coordinate-dark'}`}
				style="fill: {i % 2 === 1 ? light : dark}"
			>
				{file}
			</text>
		{/each}
	</svg>
</div>
