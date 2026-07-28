import type { Color } from '@chess-fw/core';

/**
 * Server-authoritative clock.
 * The client shows a visual countdown but the server is the ONLY source of truth.
 */
export class ClockService {
    private whiteTimeMs: number;
    private blackTimeMs: number;
    private readonly incrementMs: number;
    private lastTickTime: number | null = null;
    private activeColor: Color | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private onTimeout: ((loser: Color) => void) | null = null;

    constructor(initialMs: number, incrementMs: number) {
        this.whiteTimeMs = initialMs;
        this.blackTimeMs = initialMs;
        this.incrementMs = incrementMs;
    }

    start(startingColor: Color, onTimeout: (loser: Color) => void): void {
        this.activeColor = startingColor;
        this.onTimeout = onTimeout;
        this.lastTickTime = Date.now();
        this.scheduleTimeout();
    }

    switchTurn(): { white: number; black: number } {
        if (!this.lastTickTime || !this.activeColor) {
            return { white: this.whiteTimeMs, black: this.blackTimeMs };
        }

        const now = Date.now();
        const elapsed = now - this.lastTickTime;

        // Deduct time from the player who just moved, then add increment
        if (this.activeColor === 'w') {
            this.whiteTimeMs = Math.max(0, this.whiteTimeMs - elapsed) + this.incrementMs;
            this.activeColor = 'b';
        } else {
            this.blackTimeMs = Math.max(0, this.blackTimeMs - elapsed) + this.incrementMs;
            this.activeColor = 'w';
        }

        this.lastTickTime = now;
        this.scheduleTimeout();

        return { white: this.whiteTimeMs, black: this.blackTimeMs };
    }

    getWhiteTime(): number { return this.whiteTimeMs; }
    getBlackTime(): number { return this.blackTimeMs; }
    getActiveColor(): Color | null { return this.activeColor; }

    /** Get remaining time for the currently active player, accounting for elapsed */
    getCurrentRemainingMs(): number {
        if (!this.activeColor || !this.lastTickTime) {
            return this.activeColor === 'w' ? this.whiteTimeMs : this.blackTimeMs;
        }
        const elapsed = Date.now() - this.lastTickTime;
        const base = this.activeColor === 'w' ? this.whiteTimeMs : this.blackTimeMs;
        return Math.max(0, base - elapsed);
    }

    stop(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    private scheduleTimeout(): void {
        if (this.timer) clearTimeout(this.timer);
        if (!this.activeColor) return;

        const remaining = this.activeColor === 'w' ? this.whiteTimeMs : this.blackTimeMs;

        this.timer = setTimeout(() => {
            if (this.onTimeout && this.activeColor) {
                this.onTimeout(this.activeColor);
            }
        }, remaining);
    }
}
