<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	import Crown from '@lucide/svelte/icons/crown';
	import LobbyBoard from '$lib/components/chess/computer/lobby-board.svelte';
	import BotLobbyPanel from './components/bot-lobby-panel.svelte';
</script>

<div class="min-h-screen w-full bg-background">
	<div class="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 md:py-10">
		<header class="flex items-center gap-3">
			<span
				class="flex size-10 items-center justify-center rounded-xl bg-chess/15 text-chess"
			>
				<Crown class="size-6" />
			</span>
			<div class="leading-tight">
				<h1 class="text-xl font-extrabold tracking-tight text-balance">
					Jugar contra Ordenador
				</h1>
				<p class="text-sm text-muted-foreground">Desafía a nuestros bots de ajedrez</p>
			</div>
		</header>
		<main
			class="grid flex-1 items-center gap-6 md:grid-cols-[minmax(0,1fr)_380px] lg:grid-cols-[minmax(0,1fr)_400px]"
		>
			<div class="hidden justify-center md:flex">
				<div class="w-full max-w-135">
					<LobbyBoard />
				</div>
			</div>
			<BotLobbyPanel />
		</main>
	</div>
</div>
