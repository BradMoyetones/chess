<script lang="ts" module>
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Container } from '$lib/components/ui/container';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Users from '@lucide/svelte/icons/users';
	import Plus from '@lucide/svelte/icons/plus';
	import Minus from '@lucide/svelte/icons/minus';
	import * as Table from '$lib/components/ui/table/index.js';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { authClient, defaultCallbackURL, ERROR_MESSAGES } from '$lib/client.js';
	import { AVAILABLE_PROVIDERS } from "$lib/client.js";
	import { DiscordLogo, GoogleLogo } from '$lib/components/icons/index.js';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
</script>

<script lang="ts">
	let { data } = $props();

	let user = $derived(data.session?.user ?? null);

	let profileData = $derived(data.profileResponse);

	let games = $derived(data.gamesResponse.games);
	let pagination = $derived(data.gamesResponse.pagination);

	let hasNextPage = $derived(pagination.offset + pagination.limit < pagination.count);
	let hasPrevPage = $derived(pagination.offset > 0);
	let nextOffset = $derived(pagination.offset + pagination.limit);
	let prevOffset = $derived(Math.max(0, pagination.offset - pagination.limit));

	let linkedAccounts = $derived(data.linkedAccounts);

	$effect(() => {
		const errorCode = page.url.searchParams.get('error')
		if (errorCode) {
			const mensaje = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['default'];
			
			toast.error('Error de vinculación', { description: mensaje })
			const cleanUrl = page.url.pathname;
			goto(cleanUrl, { replaceState: true, noScroll: true });
		}
	})
	
</script>

<Container class="mt-4 px-2">
	<div class="flex flex-col justify-between gap-4 rounded-lg border p-4 md:flex-row">
		<div class="flex flex-col gap-4 md:flex-row">
			<Avatar class="size-16 md:size-24">
				<AvatarImage src={user?.image} class="rounded-lg" />
				<AvatarFallback>{user?.name?.slice(0, 2)}</AvatarFallback>
			</Avatar>
			<div class="flex flex-col gap-1">
				<div class="flex items-center gap-2">
					<h1 class="text-xl font-bold">{profileData.profile?.username}</h1>
					<ul class="f32">
						<li class="flag ve"></li>
					</ul>
				</div>
				<div class="flex items-center gap-10 text-sm">
					<p class="text-muted-foreground">{user?.name}</p>
					<div class="flex items-center gap-1 text-muted-foreground/70">
						<MapPin class="size-3 shrink-0" />
						<span class="text-muted-foreground">Venezuela</span>
					</div>
				</div>
				<div class="flex-1"></div>
				<div class="flex items-center gap-4 md:gap-8">
					<div class="flex items-center gap-1">
						<Calendar class="size-3 shrink-0" />
						<p class="text-sm text-muted-foreground">
							Se unió el {
								profileData.user.createdAt &&
								new Date(profileData.user.createdAt).toLocaleDateString("es-CO", {
									year: "numeric",
									month: "long",
									day: "numeric"
								})
							}
						</p>
					</div>
					<div class="flex items-center gap-1">
						<Users class="size-3 shrink-0" />
						<p class="text-sm text-muted-foreground">100 amigos</p>
					</div>
					<div class="flex items-center gap-1">
						<p class="text-sm text-muted-foreground">En linea</p>
					</div>
				</div>
			</div>
		</div>
		<div>
			<Button variant="secondary" size="lg">
				<UserPlus />
				Añadir amigo
			</Button>
		</div>
	</div>

	<div class="mt-4 rounded-lg border p-4 space-y-2">
		<h1 class="text-md font-bold">Conecta tus cuentas sociales</h1>
		<div class="space-x-2 flex flex-wrap">
			{#each AVAILABLE_PROVIDERS as provider}
				<Button 
					variant={"outline"}
					onclick={async () => {
						if (linkedAccounts.data?.some((account) => account.providerId === provider.id)) {
							await authClient.unlinkAccount({
								providerId: provider.id,
							})
							await invalidateAll()
						} else {
							await authClient.linkSocial({
								provider: provider.id,
								callbackURL: defaultCallbackURL,
								errorCallbackURL: defaultCallbackURL
							})
							await invalidateAll()
						}
					}}
				>
					{#if provider.id === 'google'}
						<GoogleLogo class="size-4" />
					{/if}
					{#if provider.id === 'discord'}
						<DiscordLogo class="size-4" />
					{/if}
					{#if 
						linkedAccounts.data?.some((account) => account.providerId === provider.id)
					}
						Unlink {provider.name}
					{:else}
						Link {provider.name}
					{/if}
				</Button>
			{/each}
		</div>
	</div>

	<div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
		<div class="lg:col-span-1">
			<div class="rounded-lg border p-4">
				<h2 class="text-lg font-semibold">Estadísticas</h2>
				<ul class="grid grid-cols-2 gap-2 mt-2">
					<li class="border-b text-muted-foreground">Blitz</li>
					<li class="border-b">{profileData.profile?.ratingBlitz}</li>
					<li class="border-b text-muted-foreground">Bullet</li>
					<li class="border-b">{profileData.profile?.ratingBullet}</li>
					<li class="border-b text-muted-foreground">Rapid</li>
					<li class="border-b">{profileData.profile?.ratingRapid}</li>
					<li class="border-b text-muted-foreground">Classical</li>
					<li class="border-b">{profileData.profile?.ratingClassical}</li>
					<li class="border-b text-muted-foreground">Games Played</li>
					<li class="border-b">{profileData.profile?.gamesPlayed}</li>
					<li class="border-b text-muted-foreground">Wins</li>
					<li class="border-b">{profileData.profile?.wins}</li>
					<li class="border-b text-muted-foreground">Losses</li>
					<li class="border-b">{profileData.profile?.losses}</li>
					<li class="border-b text-muted-foreground">Draws</li>
					<li class="border-b">{profileData.profile?.draws}</li>
					<li class="text-muted-foreground">Last Seen At</li>
					<li>{profileData.profile?.lastSeenAt ?? "--"}</li>
				</ul>
			</div>
		</div>
		<div class="lg:col-span-3">
			<div class="rounded-lg border">
				<div class="border-b px-4 py-2">
					<h2 class="text-lg font-semibold">Historial de juego</h2>
				</div>
				<Table.Root>
					<Table.Header class="bg-card">
						<Table.Row>
							<Table.Head>Jugadores</Table.Head>
							<Table.Head>Resultado</Table.Head>
							<Table.Head>Movimientos</Table.Head>
							<Table.Head class="text-end">Fecha</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if games.length === 0}
							<Table.Row>
								<Table.Cell colspan={4} class="text-center">
									<p class="text-muted-foreground">No games</p>
								</Table.Cell>
							</Table.Row>
						{/if}
						{#each games as game}
							<Table.Row>
								<Table.Cell class="font-medium">
									<div class="grid">
										<div class="flex items-center gap-2">
											<h1 class="text-md font-bold">
												{game.whiteId} <span
													class="font-normal text-muted-foreground"
													>(2500)</span
												>
											</h1>
											<ul class="f16">
												<li class="flag ve"></li>
											</ul>
										</div>
										<div class="flex items-center gap-2">
											<h1 class="text-md font-bold">
												{game.blackId} <span
													class="font-normal text-muted-foreground"
													>(2700)</span
												>
											</h1>
											<ul class="f16">
												<li class="flag ne"></li>
											</ul>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="grid w-fit grid-cols-2 items-center">
										<div class="grid">
											{#if game.winner === "w"}
												<span class="text-muted-foreground">1</span>
												<span class="text-muted-foreground">0</span>
											{/if}
											{#if game.winner === "b"}
												<span class="text-muted-foreground">0</span>
												<span class="text-muted-foreground">1</span>
											{/if}
											{#if game.winner === "draw"}
												<span class="text-muted-foreground">1/2</span>
												<span class="text-muted-foreground">1/2</span>
											{/if}
										</div>
										<div>
											{#if game.winner === "w"}
												<div class="rounded border bg-chess/20 text-chess">
													<Plus class="size-4" />
												</div>
											{/if}
											{#if game.winner === "b"}
												<div
													class="rounded border bg-destructive/20 text-destructive"
												>
													<Minus class="size-4" />
												</div>
											{/if}
											{#if game.winner === "draw"}
												<div
													class="rounded border bg-destructive/20 text-destructive"
												>
													<Minus class="size-4" />
												</div>
											{/if}
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									{game.halfMoves / 2}
								</Table.Cell>
								<Table.Cell class="text-end">
									{new Date(game.createdAt).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
										year: "numeric"
									})}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
			<div class="flex justify-end gap-2 py-2">
				<Button
					variant="secondary"
					size="icon"
					disabled={!hasPrevPage}
					href={`?limit=${pagination.limit}&offset=${prevOffset}`}
				>
					<ChevronLeft />
				</Button>
				<Button
					variant="secondary"
					size="icon"
					disabled={!hasNextPage}
					href={`?limit=${pagination.limit}&offset=${nextOffset}`}
				>
					<ChevronRight />
				</Button>
			</div>
		</div>
	</div>
</Container>
