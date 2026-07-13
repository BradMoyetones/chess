import { Clock } from 'lucide-react';
import { CapturedMaterial } from './captured-material';
import { cn } from '@/lib/utils';

interface PlayerInfoBarProps {
    player: any;
    color: 'w' | 'b';
    isTurn: boolean;
    timeRemaining: number | null;
    material: { score: number; pieces: string[] };
    timeControl: any;
}

export function PlayerInfoBar({ player, color, isTurn, timeRemaining, material, timeControl }: PlayerInfoBarProps) {
    if (!player) return null;

    const formatTime = (timeMs: number | null) => {
        if (timeMs === null) return '--:--';
        const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="flex justify-between w-full">
            <div className="flex gap-4 items-center">
                <div className="relative">
                    <img className="rounded-sm" src={player.avatar || '/assets/images/players/player-1.webp'} alt="Avatar" height="40" width="40" />
                    {!player.connected && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-black" title="Desconectado" />
                    )}
                </div>
                <div className="flex flex-col justify-center leading-tight">
                    <div className="flex items-center gap-2">
                        <h1 className="font-semibold text-md">{player.name || 'Jugador'}</h1>
                        {!player.connected && <span className="text-xs text-red-500 font-bold animate-pulse">Reconectando...</span>}
                    </div>

                    <CapturedMaterial pieces={material.pieces} color={color === 'w' ? 'b' : 'w'} score={material.score} />

                </div>
            </div>

            {timeControl && (
                <div className={cn("flex items-center gap-3 px-4 rounded-md transition-colors", {
                    'bg-primary text-primary-foreground shadow-md': isTurn,
                    'bg-background text-secondary-foreground opacity-50': !isTurn
                })}>
                    <Clock className="w-4 h-4" />
                    <div className="font-bold text-lg font-mono">{formatTime(timeRemaining)}</div>
                </div>
            )}
        </div>
    );
}
