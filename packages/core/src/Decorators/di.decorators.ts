/**
 * @file di.decorators.ts
 * @description Sistema de Inyección de Dependencias (DI) ligero utilizando decoradores estándar de TS 5.0.
 * Evita la necesidad de dependencias pesadas como `reflect-metadata`.
 */

type Constructor<T = any> = new (...args: any[]) => T;

/**
 * @class Container
 * @description Contenedor de Inversión de Control (IoC) ultraligero que almacena e instancia servicios.
 */
export class Container {
    private static services = new Map<Constructor, Constructor>();
    private static instances = new Map<Constructor, any>();

    /**
     * @method register
     * @description Registra un servicio en el contenedor.
     * @param token La clase base o identificador
     * @param implementation La implementación real a instanciar
     */
    static register<T>(token: Constructor<T>, implementation: Constructor<T> = token): void {
        this.services.set(token, implementation);
    }

    /**
     * @method resolve
     * @description Resuelve y devuelve la instancia Singleton de un servicio.
     * Si no existe, la crea.
     * @param token El constructor de la clase a resolver
     * @returns La instancia única del servicio
     */
    static resolve<T>(token: Constructor<T>): T {
        if (!this.instances.has(token)) {
            const Impl = this.services.get(token) || token;
            // Instanciamos el servicio (las dependencias internas se resolverán solas vía @Inject)
            const instance = new Impl();
            this.instances.set(token, instance);
        }
        return this.instances.get(token);
    }

    /**
     * @method clear
     * @description Limpia todas las instancias (útil para testing o resetar el framework)
     */
    static clear(): void {
        this.instances.clear();
    }
}

/**
 * @function Service
 * @description Decorador de clase (Legacy) que registra la clase en el Contenedor DI como Singleton.
 * Se debe usar en todas las clases que actuarán como servicios (Managers, Core, etc.).
 */
export function Service() {
    return function (target: Function) {
        Container.register(target as Constructor);
    };
}

/**
 * @function Inject
 * @description Decorador de propiedad (Legacy) para inyectar un servicio automáticamente.
 * @param token La clase que se desea inyectar (ej. EventBus, ChessEngine)
 */
export function Inject<T>(token: Constructor<T>) {
    return function (target: any, propertyKey: string | symbol) {
        // En legacy decorators, definimos un getter dinámico para la propiedad
        // de modo que cuando se acceda a ella, se resuelva el servicio en el Container.
        Object.defineProperty(target, propertyKey, {
            get: function () {
                return Container.resolve(token);
            },
            enumerable: true,
            configurable: true
        });
    };
}
