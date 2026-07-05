import { type AppEvents } from '../Types/events.types';
import { Service } from '../Decorators/di.decorators';

type EventCallback<T> = (payload: T) => void;

/**
 * @class EventBus
 * @description Sistema de publicación/suscripción (PubSub) central del framework.
 * Es un servicio inyectable que permite a los componentes comunicarse sin acoplamiento directo.
 */
@Service()
export class EventBus {
    private listeners: { 
        [K in keyof AppEvents]?: EventCallback<AppEvents[K]>[] 
    } = {};

    /**
     * @method on
     * @description Suscribe un callback a un evento de forma permanente.
     * @param event El nombre del evento a escuchar (tipado estrictamente por AppEvents)
     * @param callback Función a ejecutar cuando el evento ocurra
     */
    public on<K extends keyof AppEvents>(event: K, callback: EventCallback<AppEvents[K]>): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event]!.push(callback);
    }

    /**
     * @method once
     * @description Suscribe un callback a un evento que se ejecutará UNA SOLA VEZ.
     * El listener se auto-elimina tras su primera invocación.
     * @param event El nombre del evento a escuchar
     * @param callback Función a ejecutar cuando el evento ocurra
     */
    public once<K extends keyof AppEvents>(event: K, callback: EventCallback<AppEvents[K]>): void {
        const wrapper = ((payload: AppEvents[K]) => {
            this.off(event, wrapper);
            callback(payload);
        }) as EventCallback<AppEvents[K]>;
        this.on(event, wrapper);
    }

    /**
     * @method off
     * @description Desuscribe un callback previamente registrado para un evento,
     * previniendo fugas de memoria al destruir componentes.
     * @param event El nombre del evento
     * @param callback La función original que se usó para suscribirse
     */
    public off<K extends keyof AppEvents>(event: K, callback: EventCallback<AppEvents[K]>): void {
        const list = this.listeners[event];
        if (!list) return;
        (this.listeners[event] as EventCallback<AppEvents[K]>[]) = list.filter(cb => cb !== callback);
    }

    /**
     * @method emit
     * @description Emite un evento, ejecutando todos los callbacks suscritos a él.
     * @param event El evento a emitir
     * @param payload Los datos asociados al evento (fuertemente tipados)
     */
    public emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
        if (!this.listeners[event]) {
            return;
        }
        
        // Copiamos el array antes de iterar para prevenir bugs si un callback se auto-elimina (como en once)
        const callbacks = [...this.listeners[event]!];
        callbacks.forEach(callback => callback(payload));
    }

    /**
     * @method removeAllListeners
     * @description Elimina todos los listeners de un evento específico. Si no se provee evento, elimina TODOS.
     * Es útil para hacer cleanup completo al reiniciar el motor.
     * @param event (Opcional) El nombre del evento a limpiar
     */
    public removeAllListeners<K extends keyof AppEvents>(event?: K): void {
        if (event) {
            delete this.listeners[event];
        } else {
            this.listeners = {};
        }
    }
}