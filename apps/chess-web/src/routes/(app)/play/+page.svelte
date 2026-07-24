<script lang="ts">
	import LobbyBoard from '$lib/components/chess/computer/lobby-board.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Container } from '$lib/components/ui/container';

</script>

<Container class="mt-4 px-2">
    <div class="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-2 min-h-[calc(100vh-4.5rem)] w-full">
        <!-- Tablero -->
        <div class="border rounded-md p-4 bg-muted hidden md:flex flex-col h-fit">
            <div class="flex-1 flex items-center justify-center">
				<LobbyBoard />
            </div>
        </div>

        <!-- Sidebar de Chat/Ajustes -->
        <div class="border rounded-md p-4 bg-card flex flex-col h-fit md:h-full">
            <div class="flex items-center gap-4 border-b pb-4 mb-4">
                <div class="flex-1">
                    <h2 class="text-xl font-semibold">Jugar Ajedrez</h2>
                </div>
            </div>

            <!-- Aquí puedes agregar los tabs o el contenido del sidebar -->
            <div class="flex-1 flex flex-col gap-2">
                <Button 
                    class="h-14 text-base"
                    variant="outline"
                    href="/play/online"
                >
                    Jugar Online
                </Button>
                <Button 
                    class="h-14 text-base"
                    variant="outline"
                    href="/play/computer"
                >
                    Jugar contra Ordenador
                </Button>
            </div>
        </div>
    </div>
</Container>
