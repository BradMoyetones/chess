import { EngineMode } from '../Types/mode.types';

/**
 * @function RequireMode
 * @description Decorador de método (Legacy) que previene la ejecución de un método si el motor no está en el modo requerido.
 * Útil para asegurar que acciones como 'placePiece' solo ocurran en modo 'SETUP'.
 * @param requiredMode El modo requerido ('PLAY', 'SETUP', o 'ANALYSIS')
 */
export function RequireMode(requiredMode: 'PLAY' | 'SETUP' | 'ANALYSIS') {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (this: any, ...args: any[]) {
            // Se asume que la clase tiene una propiedad 'mode' o acceso al motor.
            // En ChessEngine, la propiedad es privada pero existe. O podemos usar getMode()
            const currentMode = typeof this.getMode === 'function' ? this.getMode() : this.mode;

            if (currentMode !== requiredMode) {
                console.warn(`[RequireMode] Ejecución bloqueada en ${propertyKey}. Se requiere modo: ${requiredMode}. Modo actual: ${currentMode}`);
                return false;
            }

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
