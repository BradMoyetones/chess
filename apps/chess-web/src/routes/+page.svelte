<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
</script>

<section
	class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-20 pb-16 text-center"
>
	<!-- Background Radial Gradient Glow -->
	<div
		class="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-150 w-200 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chess/30 blur-[120px]"
	></div>

	<div class="z-10 flex max-w-4xl flex-col items-center gap-8">
		<!-- Version Badge -->
		<Badge variant="secondary" class="border border-border p-4 text-sm font-semibold">
			@chess-fw/core@latest
		</Badge>

		<!-- Main Heading -->
		<h1
			class="flex flex-col gap-2 text-5xl font-extrabold tracking-tight sm:text-6xl md:text-4xl lg:text-6xl"
		>
			<span
				class="bg-linear-to-l from-chess via-chess-foreground via-70% to-chess-foreground bg-clip-text pb-2 text-transparent"
			>
				Juega al ajedrez con la
			</span>
			<span
				class="bg-linear-to-r from-chess via-chess-foreground via-60% to-chess-foreground bg-clip-text pb-2 text-transparent"
			>
				computadora o con jugadores de todo el mundo
			</span>
		</h1>

		<!-- Subtitle -->
		<p class="max-w-2xl text-lg text-muted-foreground sm:text-xl">
			Esta página usa @chess-fw/core para manejar la lógica del ajedrez. Esta lib abstrae todo lo
			necesario para tener un juego de ajedrez funcional. Esta página imita el look de Chess.com.
		</p>

		<!-- CTA Buttons -->
		<div class="mt-4 flex flex-col items-center gap-4 sm:flex-row">
			<a href="/play/computer">
				<Button>Jugar contra la computadora</Button>
			</a>
			<a href="/play/online">
				<Button variant={'outline'}>Jugar online</Button>
			</a>
		</div>
	</div>
</section>
