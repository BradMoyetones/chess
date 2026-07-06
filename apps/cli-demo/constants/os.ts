import os from "os";

export function detectOS() {
    const platform = os.platform();
    const arch = os.arch();

    if (platform === 'win32') return 'windows';
    if (platform === 'darwin') {
        return arch === 'arm64' ? 'mac-m1' : 'mac-intel';
    }
    return 'linux';
}