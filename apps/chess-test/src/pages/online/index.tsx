import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOnlineMatch } from '@/hooks/use-online-match';

export default function OnlineLobby() {
    const [inputRoomId, setInputRoomId] = useState('');
    
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
        handleJoinRoom
    } = useOnlineMatch();

    const avatars = ['/assets/images/players/player-1.webp', '/assets/images/players/player-2.webp'];

    const timeOptions = {
        bullet: [{ i: 60, inc: 0, label: '1 min' }, { i: 60, inc: 1, label: '1+1' }, { i: 120, inc: 1, label: '2+1' }],
        blitz: [{ i: 180, inc: 2, label: '3+2' }, { i: 300, inc: 0, label: '5 min' }, { i: 300, inc: 5, label: '5+5' }],
        rapid: [{ i: 600, inc: 0, label: '10 min' }, { i: 900, inc: 10, label: '15+10' }, { i: 1800, inc: 0, label: '30 min' }, { i: 600, inc: 5, label: '10+5' }, { i: 1200, inc: 0, label: '20 min' }, { i: 3600, inc: 0, label: '60 min' }]
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-lg shadow-lg border-primary/20">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-extrabold tracking-tight">Chess Online</CardTitle>
                    <CardDescription>Configura tu perfil y crea o únete a una sala</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">

                    {/* Perfil */}
                    <div className="flex flex-col gap-3 p-4 bg-secondary/30 rounded-lg border">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Tu Perfil</h3>
                        <div className="flex gap-4 items-center">
                            <div className="flex gap-2">
                                {avatars.map((av) => (
                                    <img
                                        key={av} src={av} alt="Avatar"
                                        className={`w-12 h-12 rounded-md cursor-pointer border-2 ${playerAvatar === av ? 'border-primary' : 'border-transparent opacity-50'}`}
                                        onClick={() => setPlayerAvatar(av)}
                                    />
                                ))}
                            </div>
                            <input
                                type="text"
                                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="Ingresa tu nombre..."
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Crear Sala */}
                    <div className="flex flex-col gap-4 p-4 bg-secondary/30 rounded-lg border">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Crear Sala</h3>

                        <div className="flex gap-2">
                            {(['none', 'bullet', 'blitz', 'rapid'] as const).map(cat => (
                                <Button
                                    key={cat}
                                    variant={selectedTimeCategory === cat ? 'default' : 'outline'}
                                    onClick={() => setSelectedTimeCategory(cat)}
                                    className="flex-1 text-xs"
                                >
                                    {cat === 'none' ? 'Sin Tiempo' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </Button>
                            ))}
                        </div>

                        {selectedTimeCategory !== 'none' && (
                            <div className="grid grid-cols-3 gap-2">
                                {timeOptions[selectedTimeCategory as keyof typeof timeOptions].map(opt => {
                                    const isSelected = selectedTime?.initial === opt.i && selectedTime?.increment === opt.inc;
                                    return (
                                        <Button
                                            key={opt.label}
                                            variant={isSelected ? 'default' : 'secondary'}
                                            onClick={() => setSelectedTime({ initial: opt.i, increment: opt.inc })}
                                            className="text-xs"
                                        >
                                            {opt.label}
                                        </Button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 mt-2">
                            <Button variant={selectedColor === 'w' ? 'default' : 'outline'} onClick={() => setSelectedColor('w')} className="bg-white text-black hover:bg-gray-200">Blancas</Button>
                            <Button variant={selectedColor === 'random' ? 'default' : 'outline'} onClick={() => setSelectedColor('random')}>Aleatorio</Button>
                            <Button variant={selectedColor === 'b' ? 'default' : 'outline'} onClick={() => setSelectedColor('b')} className="bg-black text-white hover:bg-zinc-800">Negras</Button>
                        </div>

                        <Button className="w-full mt-2" onClick={() => handleCreateRoom(selectedColor)}>Crear y Jugar</Button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-muted-foreground/20" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-medium">O</span></div>
                    </div>

                    {/* Unirse */}
                    <div className="flex flex-col gap-3 p-4 bg-secondary/30 rounded-lg border">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Unirse a Sala</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm uppercase"
                                placeholder="Código de Sala"
                                value={inputRoomId}
                                onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                            />
                            <Button onClick={() => handleJoinRoom(inputRoomId)}>Conectar</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
