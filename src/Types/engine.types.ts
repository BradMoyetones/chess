// src/Types/engine.types.ts
// Tipos para integración con motores de análisis (Stockfish, Fase 5).
// Definidos desde ahora para que el snapshot los conozca.

/**
 * Resultado de una evaluación de posición por un motor de análisis.
 * Esto es lo que Stockfish (o cualquier motor UCI) devuelve.
 */
export interface EvaluationData {
    score: number;              // En centipawns (positivo = ventaja blancas)
    mate: number | null;        // Mate en N jugadas (null si no hay mate forzado)
    depth: number;              // Profundidad del análisis
    bestMove: string;           // Mejor movimiento en notación UCI
    ponder: string | null;      // Respuesta esperada del oponente
    pv: string[];               // Principal Variation (secuencia de mejores movimientos)
    nodes: number;              // Cantidad de nodos evaluados
    time: number;               // Tiempo de cálculo en milisegundos
}

/**
 * Configuración para inicializar un adaptador de motor.
 * Soporta tanto WASM (browser) como nativo (Node.js).
 */
export interface StockfishConfig {
    wasmPath?: string;          // Ruta al archivo .wasm (browser)
    workerPath?: string;        // Ruta al worker.js (browser)
    binaryPath?: string;        // Ruta al binario nativo (Node.js)
    defaultDepth: number;       // Profundidad por defecto (ej: 18)
    multiPV?: number;           // Número de líneas a evaluar simultáneamente
    threads?: number;           // Hilos de ejecución (WASM multithreaded)
    hashSize?: number;          // Megabytes para la hash table
}
