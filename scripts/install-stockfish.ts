import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { STOCKFISH_BINARIES, detectOS } from '../constants';

const SF_VERSION = 'sf_18';
const BASE_URL = `https://github.com/official-stockfish/Stockfish/releases/download/${SF_VERSION}`;

async function downloadFile(url: string, dest: string, spinner: any) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    // Convertir a buffer directamente (archivos de 30-70MB entran sin problema en memoria)
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(dest, buffer);
}

async function main() {
    console.clear();
    console.log(chalk.bgBlue.bold(' CHESS FRAMEWORK ') + chalk.bold(' Stockfish Installer \n'));

    const binDir = path.resolve(__dirname, '../bin');
    if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
    }

    const detected = detectOS();
    const recommended = STOCKFISH_BINARIES.find(b => b.value === detected) || STOCKFISH_BINARIES[0];

    const answer = await select({
        message: 'Selecciona el sistema operativo y arquitectura destino:',
        choices: STOCKFISH_BINARIES.map(b => ({
            name: b.value === recommended.value ? `${b.name} ${chalk.green('(Detectado)')}` : b.name,
            value: b.value
        })),
        default: recommended.value
    });

    const target = STOCKFISH_BINARIES.find(b => b.value === answer)!;

    const useDefaults = await confirm({
        message: `¿Descargar Stockfish 18 para ${chalk.yellow(target.name)} en la carpeta /bin?`,
        default: true
    });

    if (!useDefaults) {
        console.log(chalk.dim('Instalación cancelada.'));
        process.exit(0);
    }

    const downloadUrl = `${BASE_URL}/${target.file}`;
    const archivePath = path.join(binDir, target.file);
    const extractDir = path.join(binDir, 'sf_temp');

    const spinner = ora(`Descargando ${chalk.cyan(target.file)}...`).start();

    try {
        // 1. Descargar
        await downloadFile(downloadUrl, archivePath, spinner);
        spinner.succeed(`Descarga completada: ${chalk.green(target.file)}`);
        
        // 2. Extraer
        spinner.start(`Extrayendo archivo con comando nativo ${chalk.yellow('tar')}...`);
        if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir);

        if (target.isZip) {
            // El comando nativo en Windows 10+ puede extraer zip
            execSync(`tar -xf "${archivePath}" -C "${extractDir}"`);
        } else {
            // Tar nativo en Linux/Mac
            execSync(`tar -xf "${archivePath}" -C "${extractDir}"`);
        }
        spinner.succeed('Archivo extraído.');

        // 3. Mover ejecutable
        spinner.start('Configurando el ejecutable...');
        const sourceExe = path.join(extractDir, target.exePath);
        const finalExe = path.join(binDir, target.destExe);

        // Borrar el existente si lo hubiera
        if (fs.existsSync(finalExe)) {
            fs.unlinkSync(finalExe);
        }

        fs.renameSync(sourceExe, finalExe);

        // Otorgar permisos de ejecución en sistemas Unix
        if (os.platform() !== 'win32') {
            fs.chmodSync(finalExe, 0o755);
        }
        spinner.succeed('Ejecutable listo en la carpeta /bin');

        // 4. Limpieza
        spinner.start('Limpiando archivos temporales...');
        fs.unlinkSync(archivePath);
        fs.rmSync(extractDir, { recursive: true, force: true });
        spinner.succeed('Limpieza completada.');

        console.log(`\n${chalk.bgGreen.black(' ÉXITO ')} ¡Stockfish se ha instalado correctamente!`);
        console.log(`${chalk.dim('Puedes probarlo corriendo:')} ${chalk.cyan('pnpm play:stockfish')}\n`);

    } catch (e: any) {
        spinner.fail('Error durante la instalación.');
        console.error(chalk.red(e.message));
        
        // Intento de limpieza
        if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
        if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
        
        process.exit(1);
    }
}

main();
