export interface Player {
    socketId?: string; // Optional since bots won't have it
    playerId: string;
    name: string;
    avatar: string;
    timeRemaining?: number;
    connected: boolean;
    isBot?: boolean;
    rating?: number;
}

export interface TimeControl {
    initial: number;
    increment: number;
}

export interface BotConfig extends Player {
    description: string;
    engineOptions: {
        skillLevel: number;
        depth?: number;
        thinkTimeBaseMs?: number;
    };
}

export interface EvaluationData {
    score: number;
    mate: number | null;
    depth: number;
    bestMove: string;
    ponder: string | null;
    pv: string[];
    nodes: number;
    time: number;
}
