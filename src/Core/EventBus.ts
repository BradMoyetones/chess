import { type AppEvents } from '../Types/events.types';

type EventCallback<T> = (payload: T) => void;

export class EventBus {
    private listeners: { 
        [K in keyof AppEvents]?: EventCallback<AppEvents[K]>[] 
    } = {};

    /**
     * "on" es para SUSCRIBIRSE. 
     * Ej: audioManager.on('PIECE_CAPTURED', (data) => reproducirSonido())
     */
    public on<K extends keyof AppEvents>(event: K, callback: EventCallback<AppEvents[K]>): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event]!.push(callback);
    }

    /**
     * "emit" es para GRITAR al vacío.
     * Ej: board.emit('PIECE_MOVED', { from: 'a2', to: 'a4', piece: 'P' })
     */
    public emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
        if (!this.listeners[event]) {
            return; // Nadie está escuchando, no hacemos nada
        }
        
        // Si hay oyentes, les pasamos el payload a todos
        this.listeners[event]!.forEach(callback => callback(payload));
    }
}