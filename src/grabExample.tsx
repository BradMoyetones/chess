import { useRef, useState } from 'react';

export default function GrabExample() {
    const chessboardRef = useRef<HTMLDivElement>(null);
    const [grabPosition, setGrabPosition] = useState<any>(null);
    const [activePiece, setActivePiece] = useState<HTMLElement | null>(null);

    const GRID_SIZE = 80;
    function grabPiece(e: React.MouseEvent) {
        const element = e.target as HTMLElement;
        const chessboard = chessboardRef.current;
        if (element.classList.contains('chess-piece') && chessboard) {
            const grabX = Math.floor((e.clientX - chessboard.offsetLeft) / GRID_SIZE);
            const grabY = Math.abs(Math.ceil((e.clientY - chessboard.offsetTop - 800) / GRID_SIZE));
            setGrabPosition({ x: grabX, y: grabY });

            const x = e.clientX - GRID_SIZE / 2;
            const y = e.clientY - GRID_SIZE / 2;
            element.style.position = 'absolute';
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;

            setActivePiece(element);
        }
    }

    return (
        <>
            {/* Background (https://bg.ibelick.com/) */}
            <div className="absolute inset-0 bg-background bg-[radial-gradient(var(--muted)_1px,var(--background)_1px)] bg-size-[20px_20px]" />
            <div className="relative flex min-h-screen w-screen items-center justify-center p-4">
                <div
                    ref={chessboardRef}
                    onMouseDown={grabPiece}
                    className="chessboard"
                >
                    <div className="chess-piece bg-accent rounded-lg border bg-[url('/assets/images/knight_w.png')] size-[80px] bg-cover bg-center" id="a7"></div>
                </div>
            </div>
        </>
    );
}
