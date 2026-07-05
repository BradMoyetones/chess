import { EventBus } from '../Core/EventBus';
import { ThemeManager } from './ThemeManager';
import { type ThemeConfig } from '../Types';
import { Service, Inject } from '../Decorators/di.decorators';

/**
 * @class AudioManager
 * @description Gestor encargado de reproducir sonidos en respuesta a los eventos del tablero.
 * Se inyecta automáticamente en el ecosistema y se suscribe a los eventos necesarios.
 */
@Service()
export class AudioManager {
    @Inject(EventBus)
    private eventBus!: EventBus;

    @Inject(ThemeManager)
    private themeManager!: ThemeManager;

    constructor() {
        // En TS 5.0 con decoradores de campo, las propiedades inicializadas mediante 
        // @Inject ya están disponibles en el momento de invocar el constructor.
        // Nos aseguramos de suscribirnos en el próximo tick del event loop para evitar posibles race conditions 
        // si el EventBus no ha terminado su registro completo, aunque aquí es seguro hacerlo directo.
        setTimeout(() => this.subscribeToEvents(), 0);
    }

    /**
     * @method subscribeToEvents
     * @description Conecta los cables del EventBus con las acciones sonoras.
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

        // Puzzles
        this.eventBus.on('PUZZLE_CORRECT_MOVE', () => {
            this.playSound('move');
        });

        this.eventBus.on('PUZZLE_FAILED', () => {
            this.playSound('check');
        });

        this.eventBus.on('PUZZLE_COMPLETED', () => {
            this.playSound('gameEnd');
        });
    }

    /**
     * @method playSound
     * @description Lógica central para reproducir un sonido.
     * Si el ThemeManager indica que no hay sonido configurado para esta acción, se ignora.
     * @param action El tipo de acción ejecutada (move, capture, etc.)
     */
    private playSound(action: keyof NonNullable<ThemeConfig['sounds']>): void {
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