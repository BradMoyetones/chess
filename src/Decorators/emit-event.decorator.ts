/**
 * @function EmitEvent
 * @description Decorador de método que emite un evento automáticamente a través del EventBus 
 * si la ejecución del método es exitosa (no retorna false ni lanza excepciones).
 * Asume que la clase tiene una propiedad `eventBus` inyectada.
 * @param eventName El nombre del evento a emitir (ej. 'BOARD_UPDATED')
 * @param payload Datos opcionales a enviar con el evento (por defecto un objeto vacío)
 */
export function EmitEvent(eventName: string, payload: any = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (this: any, ...args: any[]) {
            // Ejecutamos el método original
            const result = originalMethod.apply(this, args);
            
            // Si la operación fue exitosa (asumiendo que false significa fallo en esta librería)
            if (result !== false) {
                // Buscamos el EventBus inyectado en la instancia
                const eventBus = this.eventBus || (this.engine && this.engine.eventBus);
                
                if (eventBus && typeof eventBus.emit === 'function') {
                    eventBus.emit(eventName, payload);
                } else {
                    console.warn(`[EmitEvent Decorator] No se encontró EventBus en la clase ${this.constructor.name}`);
                }
            }
            
            return result;
        };

        return descriptor;
    };
}
