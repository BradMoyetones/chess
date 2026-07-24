<script>
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

	let { data } = $props();

	let user = $derived(data.session?.user ?? null);
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
					<h1 class="text-xl font-bold">BradfieldM</h1>
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
						<p class="text-sm text-muted-foreground">Se unió el de julio de 2026</p>
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

	<div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
		<div class="lg:col-span-1">
			<div class="rounded-lg border p-4">
				<h2>Estadísticas</h2>
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
						<Table.Row>
							<Table.Cell class="font-medium">
								<div class="grid">
									<div class="flex items-center gap-2">
										<h1 class="text-md font-bold">
											BradfieldM <span class="text-muted-foreground font-normal"
												>(2500)</span
											>
										</h1>
										<ul class="f16">
											<li class="flag ve"></li>
										</ul>
									</div>
									<div class="flex items-center gap-2">
										<h1 class="text-md font-bold">
											Anish Giri <span class="text-muted-foreground font-normal"
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
								<div class="grid grid-cols-2 items-center w-fit">
									<div class="grid">
										<span class="text-muted-foreground">1</span>
										<span class="text-muted-foreground">0</span>
									</div>
                                    <div>
                                        <div class="rounded border text-chess bg-chess/20">
                                            <Plus class="size-4" />
                                        </div>
                                        <div class="rounded border text-destructive bg-destructive/20">
                                            <Minus class="size-4" />
                                        </div>
                                    </div>
								</div>
							</Table.Cell>
							<Table.Cell>20</Table.Cell>
							<Table.Cell class="text-end">Feb 15, 2026</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Root>
			</div>
		</div>
	</div>
</Container>
