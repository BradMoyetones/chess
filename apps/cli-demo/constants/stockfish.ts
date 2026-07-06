export const STOCKFISH_BINARIES = [
    {
        name: 'Windows x86-64',
        value: 'windows',
        file: 'stockfish-windows-x86-64.zip',
        isZip: true,
        exePath: 'stockfish/stockfish-windows-x86-64.exe',
        destExe: 'stockfish.exe'
    },
    {
        name: 'macOS M1/M2/M3 (Apple Silicon)',
        value: 'mac-m1',
        file: 'stockfish-macos-m1-apple-silicon.tar',
        isZip: false,
        exePath: 'stockfish/stockfish-macos-m1-apple-silicon',
        destExe: 'stockfish'
    },
    {
        name: 'macOS Intel',
        value: 'mac-intel',
        file: 'stockfish-macos-x86-64.tar',
        isZip: false,
        exePath: 'stockfish/stockfish-macos-x86-64',
        destExe: 'stockfish'
    },
    {
        name: 'Linux Ubuntu x86-64',
        value: 'linux',
        file: 'stockfish-ubuntu-x86-64.tar',
        isZip: false,
        exePath: 'stockfish/stockfish-ubuntu-x86-64',
        destExe: 'stockfish'
    }
];