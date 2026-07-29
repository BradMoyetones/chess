import type { Color } from '@chess-fw/core';
import type { TimeControl, PlayerInfo } from '../entities/RoomEntity';

export interface MatchRequest {
    userId: string;
    socketId: string;
    name: string;
    avatar: string;
    rating: number;
    timeControl: TimeControl;
    speed: string;
    preferredColor: Color | 'random';
    timestamp: number;
}

export interface MatchResult {
    player1: MatchRequest;
    player2: MatchRequest;
}

/** Speed classification */
function classifySpeed(initial: number, increment: number): string {
    const totalTime = initial + (40 * increment);
    if (totalTime < 30) return 'ultraBullet';
    if (totalTime < 180) return 'bullet';
    if (totalTime < 480) return 'blitz';
    if (totalTime < 1500) return 'rapid';
    return 'classical';
}

export class MatchmakingService {
    /** Queue grouped by speed+timeControl key */
    private queues = new Map<string, MatchRequest[]>();
    /** Track which users are in queue */
    private userInQueue = new Map<string, string>(); // userId -> queueKey

    /** Generate a queue key from time control */
    private getQueueKey(tc: TimeControl): string {
        return `${tc.initial}+${tc.increment}`;
    }

    /**
     * Add a player to the matchmaking queue.
     * Returns a match if a suitable opponent is found, null otherwise.
     */
    enqueue(request: MatchRequest): MatchResult | null {
        // Prevent duplicate queue entries
        if (this.userInQueue.has(request.userId)) {
            this.dequeue(request.userId);
        }

        const key = this.getQueueKey(request.timeControl);
        const queue = this.queues.get(key) || [];

        // Try to find a match with expanding rating range
        const elapsedMs = Date.now() - request.timestamp;
        const baseRange = 100;
        const expansion = Math.floor(elapsedMs / 5000) * 50; // +50 every 5s
        const ratingRange = baseRange + expansion;

        // Search existing queue for compatible opponent
        const matchIndex = queue.findIndex(r =>
            r.userId !== request.userId &&
            Math.abs(r.rating - request.rating) <= Math.max(
                ratingRange,
                100 + Math.floor((Date.now() - r.timestamp) / 5000) * 50
            )
        );

        if (matchIndex !== -1) {
            const opponent = queue.splice(matchIndex, 1)[0];
            this.queues.set(key, queue);
            this.userInQueue.delete(opponent.userId);
            // Don't add requester to queue since we found a match
            return { player1: opponent, player2: request };
        }

        // No match found, add to queue
        queue.push(request);
        this.queues.set(key, queue);
        this.userInQueue.set(request.userId, key);
        return null;
    }

    /** Remove a player from the matchmaking queue */
    dequeue(userId: string): boolean {
        const key = this.userInQueue.get(userId);
        if (!key) return false;

        const queue = this.queues.get(key);
        if (queue) {
            const idx = queue.findIndex(r => r.userId === userId);
            if (idx !== -1) {
                queue.splice(idx, 1);
                this.queues.set(key, queue);
            }
        }
        this.userInQueue.delete(userId);
        return true;
    }

    /** Check if a user is in any queue */
    isInQueue(userId: string): boolean {
        return this.userInQueue.has(userId);
    }

    /** Get queue stats (for debugging/monitoring) */
    getStats(): Record<string, number> {
        const stats: Record<string, number> = {};
        for (const [key, queue] of this.queues) {
            stats[key] = queue.length;
        }
        return stats;
    }

    /** Remove disconnected user from queue by socketId */
    dequeueBySocketId(socketId: string): string | null {
        for (const [key, queue] of this.queues) {
            const idx = queue.findIndex(r => r.socketId === socketId);
            if (idx !== -1) {
                const removed = queue.splice(idx, 1)[0];
                this.queues.set(key, queue);
                this.userInQueue.delete(removed.userId);
                return removed.userId;
            }
        }
        return null;
    }
}
