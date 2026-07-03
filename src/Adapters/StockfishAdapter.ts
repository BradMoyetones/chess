// src/Adapters/StockfishAdapter.ts
// Proxy entre el Chess Framework y Stockfish vía UCI protocol.
// Soporta ambos entornos: Web Worker (WASM) en browser y child_process en Node.js.

import { EventBus } from '../Core/EventBus';
import type { EvaluationData, StockfishConfig } from '../Types/engine.types';

/** Detecta si estamos en un browser (con Web Workers) o en Node.js */
const isBrowser = typeof globalThis.window !== 'undefined' && typeof globalThis.Worker !== 'undefined';

type MessageHandler = (msg: string) => void;

export class StockfishAdapter {
    private eventBus: EventBus;
    private config: StockfishConfig | null = null;
    private ready: boolean = false;
    private messageHandlers: MessageHandler[] = [];

    // Abstracción de la comunicación: el adapter no sabe si es Worker o ChildProcess
    private sendFn: ((cmd: string) => void) | null = null;
    private destroyFn: (() => void) | null = null;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
    }

    // ═══════════════════════════════════════════════
    //  LIFECYCLE
    // ═══════════════════════════════════════════════

    /**
     * Inicializa el motor de Stockfish.
     * Detecta automáticamente si estamos en browser (WASM) o Node.js (binario nativo).
     */
    public async init(config: StockfishConfig): Promise<void> {
        this.config = config;

        if (isBrowser) {
            await this.initBrowser(config);
        } else {
            await this.initNode(config);
        }

        // Configurar opciones UCI
        if (config.threads) this.setOption('Threads', config.threads);
        if (config.hashSize) this.setOption('Hash', config.hashSize);
        if (config.multiPV && config.multiPV > 1) this.setOption('MultiPV', config.multiPV);

        this.ready = true;
        this.eventBus.emit('ENGINE_READY', {});
    }

    /** ¿El motor está listo para recibir comandos? */
    public isInitialized(): boolean {
        return this.ready;
    }

    /** Destruye el worker/process y libera recursos */
    public destroy(): void {
        if (this.destroyFn) {
            this.sendCommand('quit');
            this.destroyFn();
        }
        this.ready = false;
        this.sendFn = null;
        this.destroyFn = null;
        this.messageHandlers = [];
    }

    // ═══════════════════════════════════════════════
    //  ANÁLISIS
    // ═══════════════════════════════════════════════

    /**
     * Evalúa una posición FEN y retorna los datos de evaluación completos.
     */
    public async evaluate(fen: string, depth?: number): Promise<EvaluationData> {
        this.ensureReady();
        const targetDepth = depth || this.config!.defaultDepth;

        return new Promise((resolve, reject) => {
            let result: Partial<EvaluationData> = {};

            const handler = (msg: string) => {
                // Parsear líneas "info" para datos parciales
                if (msg.startsWith('info') && msg.includes('score')) {
                    result = { ...result, ...this.parseInfoLine(msg) };
                }

                // "bestmove" indica que el análisis terminó
                if (msg.startsWith('bestmove')) {
                    this.removeMessageHandler(handler);
                    const parts = msg.split(' ');
                    result.bestMove = parts[1] || '';
                    result.ponder = parts[3] || null;

                    const evaluation = this.buildEvaluationData(result);
                    this.eventBus.emit('EVALUATION_UPDATED', { evaluation });
                    this.eventBus.emit('BEST_MOVE', {
                        move: evaluation.bestMove,
                        ponder: evaluation.ponder || undefined
                    });
                    resolve(evaluation);
                }
            };

            this.addMessageHandler(handler);
            this.sendCommand(`position fen ${fen}`);
            this.sendCommand(`go depth ${targetDepth}`);
        });
    }

    /**
     * Evalúa múltiples líneas (Multi-PV).
     * Retorna un array de EvaluationData, una por cada línea evaluada.
     */
    public async evaluateMultiPV(fen: string, lines?: number): Promise<EvaluationData[]> {
        this.ensureReady();
        const numLines = lines || this.config!.multiPV || 3;
        const targetDepth = this.config!.defaultDepth;

        this.setOption('MultiPV', numLines);

        return new Promise((resolve) => {
            const results: Map<number, Partial<EvaluationData>> = new Map();

            const handler = (msg: string) => {
                if (msg.startsWith('info') && msg.includes('multipv')) {
                    const pvIndex = this.extractNumber(msg, 'multipv') || 1;
                    const parsed = this.parseInfoLine(msg);
                    results.set(pvIndex, { ...results.get(pvIndex), ...parsed });
                }

                if (msg.startsWith('bestmove')) {
                    this.removeMessageHandler(handler);
                    const evaluations: EvaluationData[] = [];
                    for (let i = 1; i <= numLines; i++) {
                        if (results.has(i)) {
                            evaluations.push(this.buildEvaluationData(results.get(i)!));
                        }
                    }
                    resolve(evaluations);
                }
            };

            this.addMessageHandler(handler);
            this.sendCommand(`position fen ${fen}`);
            this.sendCommand(`go depth ${targetDepth}`);
        });
    }

    /**
     * Atajo: solo retorna el mejor movimiento en notación UCI.
     */
    public async getBestMove(fen: string, depth?: number): Promise<string> {
        const evaluation = await this.evaluate(fen, depth);
        return evaluation.bestMove;
    }

    /** Detiene el análisis en curso */
    public stop(): void {
        if (this.ready) {
            this.sendCommand('stop');
        }
    }

    // ═══════════════════════════════════════════════
    //  CONFIGURACIÓN UCI
    // ═══════════════════════════════════════════════

    /** Configura una opción UCI del motor */
    public setOption(name: string, value: string | number): void {
        this.sendCommand(`setoption name ${name} value ${value}`);
    }

    // ═══════════════════════════════════════════════
    //  INICIALIZACIÓN POR ENTORNO (Privado)
    // ═══════════════════════════════════════════════

    /** Inicialización para browser: crea un Web Worker con Stockfish WASM */
    private async initBrowser(config: StockfishConfig): Promise<void> {
        const workerPath = config.workerPath || config.wasmPath;
        if (!workerPath) {
            throw new Error('StockfishAdapter: se requiere wasmPath o workerPath para browser');
        }

        return new Promise((resolve, reject) => {
            try {
                const worker = new Worker(workerPath);

                worker.onmessage = (e: MessageEvent) => {
                    const msg = typeof e.data === 'string' ? e.data : String(e.data);
                    this.onMessage(msg);
                };

                worker.onerror = (e: ErrorEvent) => {
                    this.eventBus.emit('ENGINE_ERROR', { error: e.message });
                    reject(new Error(e.message));
                };

                this.sendFn = (cmd: string) => worker.postMessage(cmd);
                this.destroyFn = () => worker.terminate();

                // Iniciar protocolo UCI
                this.sendCommand('uci');

                // Esperar "uciok"
                const initHandler = (msg: string) => {
                    if (msg === 'uciok') {
                        this.removeMessageHandler(initHandler);
                        this.sendCommand('isready');
                    }
                    if (msg === 'readyok') {
                        this.removeMessageHandler(initHandler);
                        resolve();
                    }
                };
                this.addMessageHandler(initHandler);
            } catch (e) {
                reject(e);
            }
        });
    }

    /** Inicialización para Node.js: spawns un child process con el binario nativo */
    private async initNode(config: StockfishConfig): Promise<void> {
        const binaryPath = config.binaryPath;
        if (!binaryPath) {
            throw new Error('StockfishAdapter: se requiere binaryPath para Node.js');
        }

        return new Promise(async (resolve, reject) => {
            try {
                // Dynamic import para no romper en browser
                const { spawn } = await import('child_process');
                const proc = spawn(binaryPath);

                let buffer = '';
                proc.stdout.on('data', (data: Buffer) => {
                    buffer += data.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Mantener línea incompleta en buffer
                    for (const line of lines) {
                        if (line.trim()) {
                            this.onMessage(line.trim());
                        }
                    }
                });

                proc.stderr.on('data', (data: Buffer) => {
                    this.eventBus.emit('ENGINE_ERROR', { error: data.toString() });
                });

                proc.on('error', (err: Error) => {
                    this.eventBus.emit('ENGINE_ERROR', { error: err.message });
                    reject(err);
                });

                this.sendFn = (cmd: string) => proc.stdin.write(cmd + '\n');
                this.destroyFn = () => proc.kill();

                // Iniciar protocolo UCI
                this.sendCommand('uci');

                const initHandler = (msg: string) => {
                    if (msg === 'uciok') {
                        this.removeMessageHandler(initHandler);
                        this.sendCommand('isready');
                    }
                    if (msg === 'readyok') {
                        this.removeMessageHandler(initHandler);
                        resolve();
                    }
                };
                this.addMessageHandler(initHandler);
            } catch (e) {
                reject(e);
            }
        });
    }

    // ═══════════════════════════════════════════════
    //  COMUNICACIÓN UCI (Privado)
    // ═══════════════════════════════════════════════

    /** Envía un comando UCI al motor */
    private sendCommand(cmd: string): void {
        if (this.sendFn) {
            this.sendFn(cmd);
        }
    }

    /** Manejo centralizado de mensajes del motor */
    private onMessage(msg: string): void {
        for (const handler of [...this.messageHandlers]) {
            handler(msg);
        }
    }

    private addMessageHandler(handler: MessageHandler): void {
        this.messageHandlers.push(handler);
    }

    private removeMessageHandler(handler: MessageHandler): void {
        this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    }

    // ═══════════════════════════════════════════════
    //  PARSING UCI (Privado)
    // ═══════════════════════════════════════════════

    /**
     * Parsea una línea "info" de UCI y extrae los datos relevantes.
     * 
     * Ejemplo de input:
     *   "info depth 18 score cp 35 nodes 1234567 time 500 pv e2e4 e7e5 g1f3"
     */
    private parseInfoLine(line: string): Partial<EvaluationData> {
        const result: Partial<EvaluationData> = {};

        result.depth = this.extractNumber(line, 'depth');
        result.nodes = this.extractNumber(line, 'nodes');
        result.time = this.extractNumber(line, 'time');

        // Score: puede ser "score cp <centipawns>" o "score mate <moves>"
        if (line.includes('score cp')) {
            result.score = this.extractNumber(line, 'cp') || 0;
            result.mate = null;
        } else if (line.includes('score mate')) {
            result.mate = this.extractNumber(line, 'mate') ?? null;
            result.score = result.mate !== null && result.mate > 0 ? 100000 : -100000;
        }

        // Principal Variation
        const pvMatch = line.match(/\bpv\s+(.+)$/);
        if (pvMatch) {
            result.pv = pvMatch[1].split(/\s+/);
        }

        return result;
    }

    /** Extrae un número después de un keyword en una línea UCI */
    private extractNumber(line: string, keyword: string): number | undefined {
        const regex = new RegExp(`\\b${keyword}\\s+(-?\\d+)`);
        const match = line.match(regex);
        return match ? parseInt(match[1], 10) : undefined;
    }

    /** Construye un EvaluationData completo a partir de datos parciales */
    private buildEvaluationData(partial: Partial<EvaluationData>): EvaluationData {
        return {
            score: partial.score || 0,
            mate: partial.mate ?? null,
            depth: partial.depth || 0,
            bestMove: partial.bestMove || '',
            ponder: partial.ponder ?? null,
            pv: partial.pv || [],
            nodes: partial.nodes || 0,
            time: partial.time || 0,
        };
    }

    /** Verifica que el motor esté inicializado antes de operar */
    private ensureReady(): void {
        if (!this.ready) {
            throw new Error('StockfishAdapter: el motor no está inicializado. Llama init() primero.');
        }
    }
}
