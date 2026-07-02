import { EventBus } from '../Core/EventBus';
import { ThemeManager } from './ThemeManager';
import { type ThemeConfig } from '../Types';

export class AudioManager {
    private eventBus: EventBus;
    private themeManager: ThemeManager;

    constructor(eventBus: EventBus, themeManager: ThemeManager) {
        this.eventBus = eventBus;
        this.themeManager = themeManager;
        
        this.subscribeToEvents();
    }

    /**
     * Aquí conectamos los cables del EventBus con nuestras acciones.
     * Expandido para cubrir todos los eventos sonoros del framework.
     */
    private subscribeToEvents(): void {
        // Movimiento normal
        this.eventBus.on('PIECE_MOVED', () => {
            this.playSound('move');
        });

        // Captura
        this.eventBus.on('PIECE_CAPTURED', () => {
            this.playSound('capture');
        });

        // Jaque
        this.eventBus.on('CHECK', () => {
            this.playSound('check');
        });

        // Fin de partida
        this.eventBus.on('GAME_OVER', () => {
            this.playSound('gameEnd');
        });

        // Enroque — usa el sonido de movimiento por defecto
        this.eventBus.on('CASTLED', () => {
            this.playSound('move');
        });

        // Promoción — usa el sonido de movimiento por defecto
        this.eventBus.on('PROMOTED', () => {
            this.playSound('move');
        });
    }

    /**
     * Lógica central para reproducir un sonido
     */
    private playSound(action: keyof ThemeConfig['sounds']): void {
        // 1. Le pedimos al director de arte (ThemeManager) la URL del sonido actual
        const soundUrl = this.themeManager.getSoundUrl(action);
        
        if (!soundUrl) return; // Si el tema actual no tiene ese sonido, no hacemos nada

        // 2. Usamos la API nativa del navegador para reproducir el audio
        try {
            const audio = new Audio(soundUrl);
            // El catch es importante porque los navegadores a veces bloquean audios 
            // si el usuario no ha interactuado con la página primero
            audio.play().catch(err => {
                console.warn(`Silencio forzado por el navegador al intentar reproducir ${action}:`, err);
            });
        } catch (error) {
            console.error("Error al instanciar el audio", error);
        }
    }
}