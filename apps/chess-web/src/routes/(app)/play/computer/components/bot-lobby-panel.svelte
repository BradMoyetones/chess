<script lang="ts" module>
	import { motion } from '@humanspeak/svelte-motion';
	import {
		Gauge,
		Infinity as InfinityIcon,
		Play,
		Shuffle,
		Timer,
		Zap,
		Bot
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { theme } from '$lib/theme';
	import { cn } from '$lib/utils';
	import { CHESS_BOTS } from '$lib/data/bots';
	import type { BotConfig, TimeControl } from '$lib/types/game';
	import type { Color } from '@chess-fw/core';
	import type { Component } from 'svelte';

	type Category = 'none' | 'bullet' | 'blitz' | 'rapid';
	type TimeOption = { i: number; inc: number; label: string };

	const CATEGORY_META: { key: Category; label: string; Icon: Component<{ class?: string }> }[] = [
		{ key: 'none', label: 'Libre', Icon: InfinityIcon },
		{ key: 'bullet', label: 'Bala', Icon: Gauge },
		{ key: 'blitz', label: 'Blitz', Icon: Zap },
		{ key: 'rapid', label: 'Rápida', Icon: Timer }
	];

	const TIME_OPTIONS: Record<Exclude<Category, 'none'>, TimeOption[]> = {
		bullet: [
			{ i: 60, inc: 0, label: '1 min' },
			{ i: 60, inc: 1, label: '1 + 1' },
			{ i: 120, inc: 1, label: '2 + 1' }
		],
		blitz: [
			{ i: 180, inc: 0, label: '3 min' },
			{ i: 180, inc: 2, label: '3 + 2' },
			{ i: 300, inc: 0, label: '5 min' }
		],
		rapid: [
			{ i: 600, inc: 0, label: '10 min' },
			{ i: 600, inc: 5, label: '10 + 5' },
			{ i: 900, inc: 10, label: '15 + 10' }
		]
	};

	type ColorOption = { key: Color | 'random'; label: string };

	const COLOR_OPTIONS: ColorOption[] = [
		{ key: 'w', label: 'Blancas' },
		{ key: 'random', label: 'Aleatorio' },
		{ key: 'b', label: 'Negras' }
	];
</script>

<script lang="ts">
	let selectedBotId = $state<string>(CHESS_BOTS[1].playerId);
	let selectedTimeCategory = $state<Category>('none');
	let selectedTimeOption = $state<TimeControl | null>(null);
	let selectedColor = $state<Color | 'random'>('random');

	const handleCategoryChange = (key: Category) => {
		selectedTimeCategory = key;
		if (key === 'none') {
			selectedTimeOption = null;
		} else {
			const first = TIME_OPTIONS[key][0];
			selectedTimeOption = { initial: first.i, increment: first.inc };
		}
	};

	const times = $derived<TimeOption[]>(
		selectedTimeCategory !== 'none' ? TIME_OPTIONS[selectedTimeCategory] : []
	);
</script>

<motion.section
	initial={{ opacity: 0, y: 12 }}
	animate={{ opacity: 1, y: 0 }}
	transition={{ duration: 0.35, ease: 'easeOut' }}
	class="flex w-full flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-xl"
	aria-label="Selección de Bot"
>
	<div class="flex flex-col gap-3">
		<h2
			class="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
		>
			<Bot class="size-4" /> Selecciona tu oponente
		</h2>
		<div class="grid grid-cols-2 gap-2">
			{#each CHESS_BOTS as bot}
				<button
					type="button"
					onclick={() => (selectedBotId = bot.playerId)}
					class={cn(
						'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
						{
							'border-chess bg-chess/10 ring-1 ring-chess/40':
								selectedBotId === bot.playerId,
							'border-border bg-background hover:border-muted-foreground/40':
								selectedBotId !== bot.playerId
						}
					)}
				>
					<img src={bot.avatar} alt="" class="size-10 rounded-md object-cover" />
					<div>
						<h3 class="text-sm leading-tight font-semibold text-foreground">
							{bot.name}
						</h3>
						<p class="text-xs font-medium text-muted-foreground">Elo: {bot.rating}</p>
					</div>
				</button>
			{/each}
		</div>
		<p class="px-1 text-xs text-balance text-muted-foreground italic">
			<!-- {selectedBot.description} -->
		</p>
	</div>

	<Separator />

	<div class="flex flex-col gap-2">
		<h3 class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
			Control de tiempo
		</h3>
		<div class="grid grid-cols-4 gap-2">
			{#each CATEGORY_META as { key, label, Icon }}
				<button
					type="button"
					onclick={() => handleCategoryChange(key)}
					class={cn(
						'flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-medium transition-all',
						{
							'border-chess bg-chess/10 text-foreground ring-1 ring-chess/40':
								selectedTimeCategory === key,
							'border-border bg-background hover:border-muted-foreground/40':
								selectedTimeCategory !== key
						}
					)}
				>
					<Icon class="size-5" />
					{label}
				</button>
			{/each}
		</div>
	</div>

	{#if selectedTimeCategory === 'none'}
		<p
			class="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground"
		>
			Partida sin límite de tiempo
		</p>
	{:else}
		<div class="grid grid-cols-3 gap-2">
			{#each times as opt}
				<button
					type="button"
					onclick={() => (selectedTimeOption = { initial: opt.i, increment: opt.inc })}
					class={cn(
						'rounded-lg border py-2.5 text-sm font-semibold tabular-nums transition-all',
						{
							'border-chess bg-chess/10 text-foreground ring-1 ring-chess/40':
								selectedTimeOption?.initial === opt.i &&
								selectedTimeOption?.increment === opt.inc,
							'border-border bg-background hover:border-muted-foreground/40':
								selectedTimeOption?.initial !== opt.i ||
								selectedTimeOption?.increment !== opt.inc
						}
					)}
				>
					{opt.label}
				</button>
			{/each}
		</div>
	{/if}

	<div class="flex flex-col gap-2">
		<h3 class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
			Juego con
		</h3>
		<div class="grid grid-cols-3 gap-2">
			{#each COLOR_OPTIONS as { key, label }}
				<button
					type="button"
					onclick={() => (selectedColor = key)}
					class={cn(
						'flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs font-medium transition-all',
						{
							'border-chess bg-chess/10 text-foreground ring-1 ring-chess/40':
								selectedColor === key,
							'border-border bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground':
								selectedColor !== key
						}
					)}
				>
					{#if key === 'random'}
						<span class="flex size-8 items-center justify-center">
							<Shuffle class="size-6" />
						</span>
					{:else}
						<img
							src={theme.pieces.k[key]}
							alt=""
							aria-hidden="true"
							class="size-8 object-contain"
						/>
					{/if}
					{label}
				</button>
			{/each}
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<div class="flex items-center justify-between rounded-lg border p-3">
			<div class="flex flex-col space-y-0.5">
				<Label class="text-sm font-semibold">Motor en la Nube</Label>
				<span class="text-[11px] text-muted-foreground">
					Stockfish local WASM (ocupa CPU local)
				</span>
			</div>
			<Switch />
		</div>
	</div>

	<Button
		onclick={() => {}}
		class="h-12 w-full bg-chess text-base font-semibold text-chess-foreground hover:bg-chess-hover"
	>
		<Play class="size-5 fill-current" />
		Jugar
	</Button>
</motion.section>
