<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	// Supports weights 100-900
	import '@fontsource-variable/outfit/wght.css';
	import './layout.css';
	import { onNavigate } from '$app/navigation';
	import { Toaster } from '$lib/components/ui/sonner/index.js';

	let { children } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link
		rel="stylesheet"
		type="text/css"
		href="https://github.com/lafeber/world-flags-sprite/blob/master/stylesheets/flags32-both.css"
	/>
</svelte:head>
<Toaster />
<ModeWatcher defaultTheme="dark" />
{@render children()}
