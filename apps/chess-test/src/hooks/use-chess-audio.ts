import { useEffect, useRef } from 'react';
import { theme } from '@/lib/theme';

export function useChessAudio() {
    const audioCache = useRef<Record<string, HTMLAudioElement>>({});

    // 1. Precarga inicial (Se dispara al montar la app/layout)
    useEffect(() => {
        Object.entries(theme.sounds).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.preload = 'auto'; // Fuerza al navegador a descargar el archivo
            audioCache.current[key] = audio;
        });
    }, []);

    // 2. Función de reproducción sin delay y con soporte a solapamiento
    const playSound = (soundKey: keyof typeof theme.sounds) => {
        const cachedAudio = audioCache.current[soundKey];
        if (cachedAudio) {
            // Clonamos el nodo para permitir solapamiento (jugar rápido)
            const clone = cachedAudio.cloneNode() as HTMLAudioElement;
            clone.volume = 0.5; // Ajustar volumen al gusto
            clone.play().catch(e => console.warn('Audio play blocked:', e));
        }
    };

    return { playSound };
}