<script lang="ts">
	import { authClient, defaultCallbackURL } from '$lib/client';
	import { GoogleLogo } from '$lib/components/icons';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, ...props }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class={cn('m-auto h-fit w-full p-4 md:p-6', className)} {...props}>
	<form>
		<div class="flex flex-col gap-4">
			<div>
				<h1 class="gap-2 text-2xl font-bold">Chess</h1>
				<h1 class="mt-4 mb-1 text-xl font-semibold">Crear una Cuenta</h1>

				<p>Bienvenido a ChessFW</p>
			</div>
			<div class="flex w-full items-center gap-8">
				<div class="h-px w-full border-b"></div>
				OR
				<div class="h-px w-full border-b"></div>
			</div>
			<div class="flex items-center justify-center">
				<Button
					class="w-full"
					onclick={async () => {
						await authClient.signIn.social({
							provider: 'google',
							callbackURL: defaultCallbackURL
						});
					}}
				>
					<GoogleLogo />
					Registrate con Google
				</Button>
			</div>
			<p class="text-center text-sm">
				¿Ya tienes una Cuenta?
				<Button variant="link" class="px-2" type="button" href="/login">
					Inicia Sesión
				</Button>
			</p>
		</div>
	</form>
</div>
