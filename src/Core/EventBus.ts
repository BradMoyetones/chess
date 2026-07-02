import { type AppEvents } from '../Types/events.types';

type EventCallback<T> = (payload: T) => void;

export class EventBus {
    private listeners: { 
        [K in keyof AppEvents]?: EventCallback<AppEvents[K]>[] 
    } = {};

    /**
     * "on" es para SUSCRIBIRSE permanentemente.
     * Ej: audioManager.on('PIECE_CAPTURED', (data) => reproducirSonido())
     */
    public on<K extends keyof AppEvents>(event: K, callback: EventCallback<AppEvents[K]>): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event]!.push(callback);
    }

    /**
     * "once" es para suscribirse UNA SOLA VEZ.
     * El listener se auto-elimina tras la primera invocación.
     * Útil para esperar un evento específico (ej: PROMOTION_REQUIRED).
     */
    public once<K extends keyof AppEvents>(event: K, callback: EventCallback<AppEvents[K]>): void {
        const wrapper = ((payload: AppEvents[K]) => {
            this.off(event, wrapper);
            callback(payload);
        }) as EventCallback<AppEvents[K]>;
        this.on(event, wrapper);
    }

    /**
     * "off" es para DESUSCRIBIRSE.
     * Previene memory leaks al destruir componentes.
     */
    public off<K extends keyof AppEvents>(event: K, callback: EventCallback<AppEvents[K]>): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event]!.filter(cb => cb !== callback);
    }

    /**
     * "emit" es para GRITAR al vacío.
     * Ej: board.emit('PIECE_MOVED', { from: 'a2', to: 'a4', piece: 'P' })
     */
    public emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
        if (!this.listeners[event]) {
            return;
        }
        
        // Copiamos el array antes de iterar por si un callback se auto-elimina (once)
        const callbacks = [...this.listeners[event]!];
        callbacks.forEach(callback => callback(payload));
    }

    /**
     * Elimina todos los listeners de un evento específico, o TODOS si no se pasa evento.
     * Útil para teardown/cleanup completo.
     */
    public removeAllListeners<K extends keyof AppEvents>(event?: K): void {
        if (event) {
            delete this.listeners[event];
        } else {
            this.listeners = {};
        }
    }
}