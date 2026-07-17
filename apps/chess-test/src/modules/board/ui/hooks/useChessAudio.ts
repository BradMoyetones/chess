import { useEffect, useRef, useCallback } from 'react';
import type { BoardController } from '@/modules/board/core/ports/BoardController.port';

type SoundKey = 'moveSelf' | 'capture' | 'castle' | 'moveCheck' | 'promote';

const SOUND_URLS: Record<SoundKey, string> = {
    capture: '/assets/sounds/capture.mp3',
    castle: '/assets/sounds/castle.mp3',
    moveCheck: '/assets/sounds/move-check.mp3',
    moveSelf: '/assets/sounds/move-self.mp3',
    promote: '/assets/sounds/promote.mp3',
};

/**
 * Determines which sound to play for a given move.
 */
function getSoundForMove(san: string): SoundKey {
    if (san.includes('+') || san.includes('#')) return 'moveCheck';
    if (san.includes('x')) return 'capture';
    if (san === 'O-O' || san === 'O-O-O') return 'castle';
    if (san.includes('=')) return 'promote';
    return 'moveSelf';
}

/**
 * Shared audio hook that auto-plays chess sounds when board changes.
 * Previously duplicated in OnlineMatch and ComputerMatch pages.
 * 
 * @param controller - The board controller to watch for changes
 * @param enabled - Whether audio is active (false during lobby state etc.)
 */
export function useChessAudio(controller: BoardController | null, enabled: boolean = true) {
    const audioCache = useRef<Record<string, HTMLAudioElement>>({});
    const lastNodeId = useRef<string | null>(null);

    // Preload all sound files on mount
    useEffect(() => {
        Object.entries(SOUND_URLS).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.preload = 'auto';
            audioCache.current[key] = audio;
        });
    }, []);

    const playSound = useCallback((soundKey: SoundKey) => {
        const cachedAudio = audioCache.current[soundKey];
        if (cachedAudio) {
            const clone = cachedAudio.cloneNode() as HTMLAudioElement;
            clone.volume = 0.5;
            clone.play().catch((e) => console.warn('Audio play blocked:', e));
        }
    }, []);

    // Auto-play sounds when the current node changes
    useEffect(() => {
        if (!controller || !enabled) return;

        const currentNodeId = controller.getCurrentNodeId();
        if (currentNodeId !== lastNodeId.current) {
            lastNodeId.current = currentNodeId;
            
            // Get the current move's SAN from the main line
            const mainLine = controller.getMainLine();
            const currentNode = mainLine.find((n) => n.id === currentNodeId);
            if (currentNode?.move?.san) {
                playSound(getSoundForMove(currentNode.move.san));
            }
        }
    }, [controller, enabled, playSound]);

    return { playSound };
}
