<script lang="ts" module>
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { WithElementRef } from '$lib/utils';
	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>>;
</script>

<script lang="ts">
	let { children, class: className, ...props }: Props = $props();
</script>

<div class={cn('max-w-6xl w-full mx-auto', className)} {...props}>{@render children?.()}</div>