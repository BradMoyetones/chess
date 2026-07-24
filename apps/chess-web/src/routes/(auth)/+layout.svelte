<script>
	import { Background } from "$lib/components/ui/background";

	let { children } = $props();
</script>

<div class="flex justify-center items-center min-h-screen">
	<Background />
	<div class="flex flex-col max-w-96 w-full min-h-screen bg-card px-4 py-16 shadow border-4 border-t-0 rounded-b-full">
		{@render children()}
	</div>
</div>