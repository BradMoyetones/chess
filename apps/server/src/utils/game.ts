/** Classify time control into speed category */
export function classifySpeed(initial: number, increment: number): string {
    const totalTime = initial + (40 * increment);
    if (totalTime < 30) return 'ultraBullet';
    if (totalTime < 180) return 'bullet';
    if (totalTime < 480) return 'blitz';
    if (totalTime < 1500) return 'rapid';
    return 'classical';
}

/** Map termination reason to DB-friendly format */
export function mapTermination(reason: string): string {
    switch (reason) {
        case 'timeout': return 'time_forfeit';
        case 'abandonment': return 'abandoned';
        case 'resignation': return 'normal';
        case 'checkmate': return 'normal';
        case 'stalemate': return 'normal';
        case 'draw_agreement': return 'normal';
        case 'insufficient_material': return 'normal';
        case 'fifty_move': return 'normal';
        case 'threefold_repetition': return 'normal';
        default: return 'normal';
    }
}

/** Map game result to DB status */
export function mapStatus(reason: string, winner: string): string {
    if (reason === 'checkmate') return 'mate';
    if (reason === 'resignation') return 'resign';
    if (reason === 'timeout') return 'timeout';
    if (reason === 'abandonment') return 'abandoned';
    if (reason === 'stalemate') return 'stalemate';
    if (winner === 'draw') return 'draw';
    return 'started'; // fallback
}