import type { BotConfig } from '@/types/game';

export const CHESS_BOTS: BotConfig[] = [
    {
        playerId: 'bot-600',
        name: 'Principiante',
        avatar: '/assets/images/players/bot-1.webp',
        rating: 600,
        isBot: true,
        connected: true,
        description: 'Juega casi al azar. Perfecto para aprender los movimientos básicos.',
        engineOptions: {
            skillLevel: 1,
            depth: 1,
            thinkTimeBaseMs: 1500,
        },
    },
    {
        playerId: 'bot-1000',
        name: 'Aficionado',
        avatar: '/assets/images/players/bot-2.webp',
        rating: 1000,
        isBot: true,
        connected: true,
        description: 'Conoce algunos principios de apertura pero suele cometer errores tácticos.',
        engineOptions: {
            skillLevel: 5,
            depth: 5,
            thinkTimeBaseMs: 1200,
        },
    },
    {
        playerId: 'bot-2000',
        name: 'Candidato a Maestro',
        avatar: '/assets/images/players/bot-3.webp',
        rating: 2000,
        isBot: true,
        connected: true,
        description: 'Un jugador muy fuerte. No te perdonará ninguna imprecisión.',
        engineOptions: {
            skillLevel: 12,
            depth: 12,
            thinkTimeBaseMs: 800,
        },
    },
    {
        playerId: 'bot-3200',
        name: 'Stockfish Pro',
        avatar: '/assets/images/players/bot-4.webp',
        rating: 3200,
        isBot: true,
        connected: true,
        description: 'Juega a la perfección matemática. Prácticamente invencible.',
        engineOptions: {
            skillLevel: 20,
            depth: 20,
            thinkTimeBaseMs: 300,
        },
    },
];
