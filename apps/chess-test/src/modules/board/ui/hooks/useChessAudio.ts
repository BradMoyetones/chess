import { useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';
import type { BoardController } from '@/modules/board/core/ports/BoardController.port';
import { useBoardStore } from '@/modules/board/ui/store/useBoardStore';

// ─── Sound Definitions ───────────────────────────────────────────────────────

type SoundKey = 'moveSelf' | 'capture' | 'castle' | 'moveCheck' | 'promote' | 'gameStart' | 'gameEnd';

/**
 * Singleton audio manager using Howler.js.
 *
 * Howler automatically handles:
 * - Web Audio API unlock on first user interaction (iOS/Safari)
 * - Audio context suspension/resume
 * - Format fallback (webm → mp3)
 * - Internal pooling (no cloneNode hacks)
 *
 * We use individual Howl instances per sound (not sprites) because
 * each file is tiny (<50KB) and this avoids sprite offset drift.
 */
const sounds: Record<SoundKey, Howl> = {
    moveSelf: new Howl({ src: ['/assets/sounds/move-self.mp3'], volume: 0.5, preload: true }),
    capture: new Howl({ src: ['/assets/sounds/capture.mp3'], volume: 0.5, preload: true }),
    castle: new Howl({ src: ['/assets/sounds/castle.mp3'], volume: 0.5, preload: true }),
    moveCheck: new Howl({ src: ['/assets/sounds/move-check.mp3'], volume: 0.6, preload: true }),
    promote: new Howl({ src: ['/assets/sounds/promote.mp3'], volume: 0.5, preload: true }),
    gameStart: new Howl({ src: ['/assets/sounds/move-self.mp3'], volume: 0.4, preload: true }),
    gameEnd: new Howl({ src: ['/assets/sounds/move-check.mp3'], volume: 0.6, preload: true }),
};

// ─── Sound Selection ─────────────────────────────────────────────────────────

/**
 * Determines which sound to play for a given move SAN notation.
 */
function getSoundForMove(san: string): SoundKey {
    if (san.includes('#')) return 'gameEnd';
    if (san.includes('+')) return 'moveCheck';
    if (san.includes('x')) return 'capture';
    if (san === 'O-O' || san === 'O-O-O') return 'castle';
    if (san.includes('=')) return 'promote';
    return 'moveSelf';
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Shared audio hook that auto-plays chess sounds when board changes.
 * Uses Howler.js for reliable cross-platform audio (including iOS first-play).
 *
 * Subscribes to `currentNodeId` from the Zustand store so it reacts
 * to every move and history navigation.
 *
 * @param controller - The board controller (unused directly, kept for API compat)
 * @param enabled - Whether audio is active (false during lobby state etc.)
 */
export function useChessAudio(controller: BoardController | null, enabled: boolean = true) {
    const lastNodeId = useRef<string | null>(null);

    // Read currentNodeId and mainLine from store (reactive subscriptions)
    const currentNodeId = useBoardStore((s) => s.currentNodeId);
    const mainLine = useBoardStore((s) => s.mainLine);

    const playSound = useCallback((soundKey: SoundKey) => {
        if (!enabled) return;
        sounds[soundKey].play();
    }, [enabled]);

    // Auto-play sounds when the current node changes
    useEffect(() => {
        if (!controller || !enabled) return;

        if (currentNodeId && currentNodeId !== lastNodeId.current) {
            lastNodeId.current = currentNodeId;

            // Find the current move's SAN from the main line
            const currentNode = mainLine.find((n) => n.id === currentNodeId);
            if (currentNode?.move?.san) {
                playSound(getSoundForMove(currentNode.move.san));
            }
        }
    }, [controller, enabled, playSound, currentNodeId, mainLine]);

    return { playSound };
}
