import { useState, type ComponentType } from 'react';
import { motion } from 'motion/react';
import { Gauge, Infinity as InfinityIcon, LogIn, Play, Plus, Shuffle, Timer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

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
        { i: 1200, inc: 0, label: '20 min' },
        { i: 1800, inc: 0, label: '30 min' },
        { i: 3600, inc: 0, label: '60 min' },
    ],
};

const AVATARS = ['/assets/images/players/player-1.webp', '/assets/images/players/player-2.webp'];

const COLOR_OPTIONS: { key: 'w' | 'random' | 'b'; label: string }[] = [
    { key: 'w', label: 'Blancas' },
    { key: 'random', label: 'Aleatorio' },
    { key: 'b', label: 'Negras' },
];

interface LobbyPanelProps {
    playerName: string;
    setPlayerName: (v: string) => void;
    playerAvatar: string;
    setPlayerAvatar: (v: string) => void;
    selectedTimeCategory: Category;
    setSelectedTimeCategory: (v: Category) => void;
    selectedTime: { initial: number; increment: number } | null;
    setSelectedTime: (v: { initial: number; increment: number } | null) => void;
    selectedColor: 'w' | 'b' | 'random';
    setSelectedColor: (v: 'w' | 'b' | 'random') => void;
    handleCreateRoom: (color: 'w' | 'b' | 'random') => void;
    handleJoinRoom: (roomId: string) => void;
}

export function LobbyPanel({
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
}: LobbyPanelProps) {
    const [tab, setTab] = useState('create');
    const [inputRoomId, setInputRoomId] = useState('');

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

    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex w-full flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-xl"
            aria-label="Configuración de partida"
        >
            {/* Profile */}
            <div className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tu perfil</h2>
                <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                        {AVATARS.map((av) => {
                            const active = playerAvatar === av;
                            return (
                                <button
                                    key={av}
                                    type="button"
                                    onClick={() => setPlayerAvatar(av)}
                                    aria-pressed={active}
                                    aria-label="Seleccionar avatar"
                                    className={cn(
                                        'overflow-hidden rounded-lg border-2 transition-all',
                                        active
                                            ? 'border-chess ring-2 ring-chess/40'
                                            : 'border-transparent opacity-60 hover:opacity-100'
                                    )}
                                >
                                    <img src={av || '/placeholder.svg'} alt="" className="size-11 object-cover" />
                                </button>
                            );
                        })}
                    </div>
                    <Input
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Ingresa tu nombre..."
                        aria-label="Tu nombre"
                        maxLength={20}
                        className="h-11 flex-1 text-sm"
                    />
                </div>
            </div>

            <Separator />

            <Tabs value={tab} onValueChange={(v) => setTab(v as string)} className="gap-4">
                <TabsList className="w-full">
                    <TabsTrigger value="create" className="flex-1">
                        <Plus className="size-4" />
                        Nueva partida
                    </TabsTrigger>
                    <TabsTrigger value="join" className="flex-1">
                        <LogIn className="size-4" />
                        Unirse
                    </TabsTrigger>
                </TabsList>

                {/* Create */}
                <TabsContent value="create" className="flex flex-col gap-5">
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

                    <Button
                        onClick={() => handleCreateRoom(selectedColor)}
                        className="h-12 w-full bg-chess text-base font-semibold text-chess-foreground hover:bg-chess-hover"
                    >
                        <Play className="size-5 fill-current" />
                        Empezar partida
                    </Button>
                </TabsContent>

                {/* Join */}
                <TabsContent value="join" className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Código de sala
                        </h3>
                        <Input
                            value={inputRoomId}
                            onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                                    handleJoinRoom(inputRoomId);
                                }
                            }}
                            placeholder="EJ: A1B2C3"
                            aria-label="Código de sala"
                            className="h-12 text-center text-lg font-semibold uppercase tracking-[0.3em]"
                        />
                    </div>
                    <Button
                        onClick={() => handleJoinRoom(inputRoomId)}
                        disabled={!inputRoomId}
                        className="h-12 w-full bg-chess text-base font-semibold text-chess-foreground hover:bg-chess-hover"
                    >
                        <LogIn className="size-5" />
                        Conectar
                    </Button>
                    <p className="text-center text-xs text-muted-foreground text-pretty">
                        Pídele el código a tu oponente y únete a su partida.
                    </p>
                </TabsContent>
            </Tabs>
        </motion.section>
    );
}
