import { useState, type ComponentType } from 'react';
import { motion } from 'motion/react';
import { Gauge, Infinity as InfinityIcon, Play, Shuffle, Timer, Zap, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CHESS_BOTS } from '@/data/bots';
import type { BotConfig, TimeControl } from '@/types/game';

type Category = 'none' | 'bullet' | 'blitz' | 'rapid';
type TimeOption = { i: number; inc: number; label: string };

const CATEGORY_META: { key: Category; label: string; Icon: ComponentType<{ className?: string }> }[] = [
    { key: 'none', label: 'Libre', Icon: InfinityIcon },
    { key: 'bullet', label: 'Bala', Icon: Gauge },
    { key: 'blitz', label: 'Blitz', Icon: Zap },
    { key: 'rapid', label: 'Rápida', Icon: Timer },
];

const TIME_OPTIONS: Record<Exclude<Category, 'none'>, TimeOption[]> = {
    bullet: [
        { i: 60, inc: 0, label: '1 min' },
        { i: 60, inc: 1, label: '1 + 1' },
        { i: 120, inc: 1, label: '2 + 1' },
    ],
    blitz: [
        { i: 180, inc: 0, label: '3 min' },
        { i: 180, inc: 2, label: '3 + 2' },
        { i: 300, inc: 0, label: '5 min' },
    ],
    rapid: [
        { i: 600, inc: 0, label: '10 min' },
        { i: 600, inc: 5, label: '10 + 5' },
        { i: 900, inc: 10, label: '15 + 10' },
    ],
};

const COLOR_OPTIONS: { key: 'w' | 'random' | 'b'; label: string }[] = [
    { key: 'w', label: 'Blancas' },
    { key: 'random', label: 'Aleatorio' },
    { key: 'b', label: 'Negras' },
];

interface BotLobbyPanelProps {
    onPlay: (color: 'w' | 'b' | 'random', bot: BotConfig, timeControl: TimeControl | null, engineMode: 'server' | 'local') => void;
}

export function BotLobbyPanel({ onPlay }: BotLobbyPanelProps) {
    const [selectedBotId, setSelectedBotId] = useState<string>(CHESS_BOTS[1].playerId); // Default: Aficionado
    const [selectedTimeCategory, setSelectedTimeCategory] = useState<Category>('none');
    const [selectedTime, setSelectedTime] = useState<TimeControl | null>(null);
    const [selectedColor, setSelectedColor] = useState<'w' | 'b' | 'random'>('random');
    const [engineMode, setEngineMode] = useState<'server' | 'local'>('server');

    const handleEngineModeToggle = (checked: boolean) => {
        if (!checked) {
            // Local Mode
            const hasWasm = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
            if (!hasWasm) {
                toast.error('WebAssembly no está disponible en tu navegador.');
                return;
            }
            setEngineMode('local');
        } else {
            // Server Mode
            setEngineMode('server');
        }
    };

    const handleCategoryChange = (category: Category) => {
        setSelectedTimeCategory(category);
        if (category === 'none') {
            setSelectedTime(null);
        } else {
            const first = TIME_OPTIONS[category][0];
            setSelectedTime({ initial: first.i, increment: first.inc });
        }
    };

    const times = selectedTimeCategory !== 'none' ? TIME_OPTIONS[selectedTimeCategory] : [];
    const selectedBot = CHESS_BOTS.find(b => b.playerId === selectedBotId)!;

    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex w-full flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-xl"
            aria-label="Selección de Bot"
        >
            <div className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Bot className="size-4" /> Selecciona tu oponente
                </h2>
                <div className="grid grid-cols-2 gap-2">
                    {CHESS_BOTS.map((bot) => {
                        const active = selectedBotId === bot.playerId;
                        return (
                            <button
                                key={bot.playerId}
                                type="button"
                                onClick={() => setSelectedBotId(bot.playerId)}
                                aria-pressed={active}
                                className={cn(
                                    'flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                                    active
                                        ? 'border-chess bg-chess/10 ring-1 ring-chess/40'
                                        : 'border-border bg-background hover:border-muted-foreground/40'
                                )}
                            >
                                <img src={bot.avatar} alt="" className="size-10 object-cover rounded-md" />
                                <div>
                                    <h3 className="font-semibold text-sm leading-tight text-foreground">{bot.name}</h3>
                                    <p className="text-xs font-medium text-muted-foreground">Elo: {bot.rating}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-muted-foreground italic px-1 text-balance">
                    {selectedBot.description}
                </p>
            </div>

            <Separator />

            {/* Time category */}
            <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Control de tiempo
                </h3>
                <div className="grid grid-cols-4 gap-2">
                    {CATEGORY_META.map(({ key, label, Icon }) => {
                        const active = selectedTimeCategory === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleCategoryChange(key)}
                                aria-pressed={active}
                                className={cn(
                                    'flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-medium transition-all',
                                    active
                                        ? 'border-chess bg-chess/10 text-foreground'
                                        : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
                                )}
                            >
                                <Icon className={cn('size-5', active && 'text-chess')} />
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time presets */}
            {selectedTimeCategory === 'none' ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                    Partida sin límite de tiempo
                </p>
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    {times.map((opt) => {
                        const active = selectedTime?.initial === opt.i && selectedTime?.increment === opt.inc;
                        return (
                            <button
                                key={opt.label}
                                type="button"
                                onClick={() => setSelectedTime({ initial: opt.i, increment: opt.inc })}
                                aria-pressed={active}
                                className={cn(
                                    'rounded-lg border py-2.5 text-sm font-semibold tabular-nums transition-all',
                                    active
                                        ? 'border-chess bg-chess/10 text-foreground ring-1 ring-chess/40'
                                        : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
                                )}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Color */}
            <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Juego con
                </h3>
                <div className="grid grid-cols-3 gap-2">
                    {COLOR_OPTIONS.map(({ key, label }) => {
                        const active = selectedColor === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedColor(key)}
                                aria-pressed={active}
                                className={cn(
                                    'flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs font-medium transition-all',
                                    active
                                        ? 'border-chess bg-chess/10 text-foreground ring-1 ring-chess/40'
                                        : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
                                )}
                            >
                                {key === 'random' ? (
                                    <span className="flex size-8 items-center justify-center">
                                        <Shuffle className="size-6" />
                                    </span>
                                ) : (
                                    <img
                                        src={theme.pieces.k[key] || '/placeholder.svg'}
                                        alt=""
                                        aria-hidden="true"
                                        className="size-8 object-contain"
                                    />
                                )}
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Engine Mode Toggle */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex flex-col space-y-0.5">
                        <Label className="text-sm font-semibold">Motor en la Nube</Label>
                        <span className="text-[11px] text-muted-foreground">
                            {engineMode === 'server' ? 'Stockfish remoto (requiere conexión)' : 'Stockfish local WASM (ocupa CPU local)'}
                        </span>
                    </div>
                    <Switch
                        checked={engineMode === 'server'}
                        onCheckedChange={handleEngineModeToggle}
                    />
                </div>
            </div>

            <Button
                onClick={() => onPlay(selectedColor, selectedBot, selectedTime, engineMode)}
                className="h-12 w-full bg-chess text-base font-semibold text-chess-foreground hover:bg-chess-hover"
            >
                <Play className="size-5 fill-current" />
                Jugar
            </Button>
        </motion.section>
    );
}
