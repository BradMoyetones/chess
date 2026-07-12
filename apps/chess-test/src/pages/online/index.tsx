import { Crown } from 'lucide-react';
import { useOnlineMatch } from '@/hooks/use-online-match';
import { LobbyBoard } from './components/lobby-board';
import { LobbyPanel } from './components/lobby-panel';

export default function OnlineLobby() {
    const {
        playerName,
        setPlayerName,
        playerAvatar,
        setPlayerAvatar,
        selectedTimeCategory,
        setSelectedTimeCategory,
        selectedTime,
        setSelectedTime,
        selectedColor,
        setSelectedColor,
        handleCreateRoom,
        handleJoinRoom,
    } = useOnlineMatch();

    return (
        <div className="min-h-screen w-full bg-background">
            <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 md:py-10">
                <header className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-chess/15 text-chess">
                        <Crown className="size-6" />
                    </span>
                    <div className="leading-tight">
                        <h1 className="text-xl font-extrabold tracking-tight text-balance">Chess Online</h1>
                        <p className="text-sm text-muted-foreground">Crea una sala o únete y juega en tiempo real</p>
                    </div>
                </header>

                <main className="grid flex-1 items-center gap-6 md:grid-cols-[minmax(0,1fr)_380px] lg:grid-cols-[minmax(0,1fr)_400px]">
                    <div className="hidden justify-center md:flex">
                        <div className="w-full max-w-[540px]">
                            <LobbyBoard />
                        </div>
                    </div>

                    <LobbyPanel
                        playerName={playerName}
                        setPlayerName={setPlayerName}
                        playerAvatar={playerAvatar}
                        setPlayerAvatar={setPlayerAvatar}
                        selectedTimeCategory={selectedTimeCategory}
                        setSelectedTimeCategory={setSelectedTimeCategory}
                        selectedTime={selectedTime}
                        setSelectedTime={setSelectedTime}
                        selectedColor={selectedColor}
                        setSelectedColor={setSelectedColor}
                        handleCreateRoom={handleCreateRoom}
                        handleJoinRoom={handleJoinRoom}
                    />
                </main>
            </div>
        </div>
    );
}
