import { Container } from '@chess-fw/core';
import { EventBus } from '@chess-fw/core';
import { StockfishAdapter } from '@chess-fw/core';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { detectOS, STOCKFISH_BINARIES } from '../constants/index.js';
import { confirm } from '@inquirer/prompts';
import { execSync } from 'child_process';

async function main() {
    console.clear();
    console.log(chalk.bgBlue.bold(' CHESS FRAMEWORK ') + chalk.bold(' Stockfish Adapter Demo \n'));

    const eventBus = Container.resolve(EventBus);
    const adapter = Container.resolve(StockfishAdapter);

    const spinner = ora('Inicializando Stockfish Engine...').start();

    // Manejo de eventos
    eventBus.on('ENGINE_ERROR', (e) => {
        spinner.fail(chalk.red(`Error fatal: ${e.error}`));
        process.exit(1);
    });

    eventBus.on('EVALUATION_UPDATED', (data) => {
        spinner.text = `Analizando profundidad ${chalk.bold.yellow(data.evaluation.depth)} | Nodos: ${data.evaluation.nodes.toLocaleString()}`;
    });

    // Interceptar la salida cruda de Stockfish para imprimirla ordenadamente
    (adapter as any).addMessageHandler((msg: string) => {
        // Solo mostrar mensajes de info que traen score para no saturar tanto la consola
        if (msg.startsWith('info') && msg.includes('score')) {
            // spinner.clear() borra la línea del loader temporalmente para imprimir arriba
            spinner.clear();
            
            const depthMatch = msg.match(/depth\s+(\d+)/);
            const scoreMatch = msg.match(/score\s+(cp|mate)\s+(-?\d+)/);
            const pvMatch = msg.match(/\bpv\s+(.+)$/);
            
            const depth = depthMatch ? depthMatch[1].padStart(2, ' ') : '??';
            const type = scoreMatch ? scoreMatch[1] : '';
            const val = scoreMatch ? scoreMatch[2] : '';
            
            let scoreStr = chalk.gray('N/A');
            if (type === 'cp') scoreStr = chalk.yellow((parseInt(val) / 100).toFixed(2).padStart(6, ' '));
            if (type === 'mate') scoreStr = chalk.red(`M${val}`.padStart(6, ' '));
            
            const pv = pvMatch ? chalk.dim(pvMatch[1].split(' ').slice(0, 5).join(' ') + '...') : '';

            console.log(`  ${chalk.blue('▶')} Profundidad: ${chalk.cyan(depth)}  |  Eval: ${scoreStr}  |  PV: ${pv}`);
        }
    });

    
    try {
        const os = detectOS();
        const sfBinary = STOCKFISH_BINARIES.find((b) => b.value === os);

        if(!sfBinary) throw new Error('Stockfish no encontrado para el sistema operativo ' + os)

        const binPath = path.resolve(__dirname, `../bin/${sfBinary.destExe}`);
        if(!fs.existsSync(binPath)){
            spinner.stop();
            const useDefaults = await confirm({
                message: `¿No se encontró Stockfish para ${chalk.yellow(os)}, deseas ejecutar el proceso de instalación ahora?`,
                default: true
            });

            if (!useDefaults) {
                console.log(chalk.dim('Instalación cancelada.'));
                process.exit(0);
            }
            execSync('npx tsx scripts/install-stockfish.ts', { stdio: 'inherit' })
            spinner.start()
        }

        await adapter.init({
            binaryPath: binPath,
            defaultDepth: 18,
            threads: 2,
            hashSize: 16
        });

        spinner.succeed('Engine inicializado correctamente.');

        const fen = '1k1r4/pp1b1R2/3q2pp/4p3/2B5/4Q3/PPP2B2/2K5 b - - 0 1';
        console.log(`\n  ${chalk.dim('Posición (FEN):')} ${chalk.italic(fen)}\n`);

        spinner.start('Comenzando análisis profundo...');

        const result = await adapter.evaluate(fen, 18);
        
        spinner.succeed('Análisis completado.');

        // Imprimir reporte final usando chalk
        console.log(`\n${chalk.blue('╭──')} ${chalk.bold('RESULTADOS DEL ANÁLISIS')} ${chalk.blue('──────────────────────')}`);
        console.log(`${chalk.blue('│')} ${chalk.bold('Mejor Jugada :')} ${chalk.bgGreen.black(` ${result.bestMove} `)}`);
        console.log(`${chalk.blue('│')} ${chalk.bold('Ponder       :')} ${chalk.yellow(result.ponder || 'N/A')}`);
        
        const finalScore = result.score > 10000 
            ? chalk.red(`Mate en ${result.mate}`)
            : chalk.yellow((result.score / 100).toFixed(2));
            
        console.log(`${chalk.blue('│')} ${chalk.bold('Evaluación   :')} ${finalScore}`);
        console.log(`${chalk.blue('│')} ${chalk.bold('Nodos        :')} ${result.nodes.toLocaleString()}`);
        console.log(`${chalk.blue('│')} ${chalk.bold('Tiempo       :')} ${result.time} ms`);
        console.log(`${chalk.blue('│')} ${chalk.bold('Línea (PV)   :')} ${chalk.dim(result.pv.join(' '))}`);
        console.log(`${chalk.blue('╰────────────────────────────────────────────────')}\n`);

    } catch (e: any) {
        spinner.fail('Operación fallida.');
        console.error(chalk.red(e.message));
    } finally {
        adapter.destroy();
        console.log(chalk.dim('Proceso finalizado.'));
    }
}

main();
