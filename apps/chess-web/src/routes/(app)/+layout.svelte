<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { authClient } from '$lib/client';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Container } from '$lib/components/ui/container';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import LogOut from '@lucide/svelte/icons/log-out';
	import User from '@lucide/svelte/icons/user';

	let { data, children } = $props();

	let user = $derived(data.session?.user);
</script>

<header class="sticky top-2 z-50 w-full px-2">
	<Container>
		<div
			class="flex items-center justify-between rounded-full border bg-background/30 px-2 py-2 backdrop-blur-2xl"
		>
			<a href="/">
				<h1 class="text-2xl font-bold text-chess">Chess</h1>
			</a>
			<nav class="flex items-center gap-2">
				<Button variant="link" href="/play">Jugar</Button>
				{#if user}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							<Avatar>
								<AvatarImage src={user?.image} alt={user?.name} />
								<AvatarFallback>{user?.name?.[0]}</AvatarFallback>
							</Avatar>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Group>
								<DropdownMenu.Label>Mi Cuenta</DropdownMenu.Label>
								<DropdownMenu.Separator />
								<a href="/profile">
									<DropdownMenu.Item>
										<User />
										Perfil
									</DropdownMenu.Item>
								</a>
							</DropdownMenu.Group>
							<DropdownMenu.Separator />
							<DropdownMenu.Group>
								<DropdownMenu.Item
									variant="destructive"
									onclick={async () => {
										await authClient.signOut();
										await invalidateAll();
									}}
								>
									<LogOut />
									Cerrar Sesión
								</DropdownMenu.Item>
							</DropdownMenu.Group>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{:else}
					<Button variant="secondary" href="/login" class="group">
						Ingresar <ArrowRight
							class="transition-transform group-hover:translate-x-1"
						/>
					</Button>
				{/if}
			</nav>
		</div>
	</Container>
</header>

{@render children()}
