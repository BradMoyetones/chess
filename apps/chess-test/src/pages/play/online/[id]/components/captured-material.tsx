import type { Color, PieceSymbol } from '@chess-fw/core';

interface SpriteData {
    bgX: string;
    bgY: string;
    w: string;
    h: string;
}

type PieceSymbolOmitKing = Exclude<PieceSymbol, 'k'>;

const SPRITE_MAP: Record<Color, Record<PieceSymbolOmitKing, SpriteData[]>> = {
    w: {
        p: [
            { bgX: '-36em', bgY: '-59.4em', w: '1.3em', h: '1.7em' },
            { bgX: '-36em', bgY: '-56.9em', w: '2.0em', h: '1.7em' },
            { bgX: '-36em', bgY: '-54.4em', w: '2.7em', h: '1.7em' },
            { bgX: '-36em', bgY: '-51.9em', w: '3.4em', h: '1.7em' },
            { bgX: '-36em', bgY: '-49.4em', w: '4.1em', h: '1.7em' },
            { bgX: '-36em', bgY: '-46.9em', w: '4.8em', h: '1.7em' },
            { bgX: '-36em', bgY: '-44.4em', w: '5.5em', h: '1.7em' },
            { bgX: '-36em', bgY: '-41.9em', w: '6.2em', h: '1.7em' },
        ],
        n: [
            { bgX: '-45.4em', bgY: '-44.2em', w: '1.6em', h: '1.9em' },
            { bgX: '-45.4em', bgY: '-41.7em', w: '2.3em', h: '1.9em' },
        ],
        b: [
            { bgX: '-42.7em', bgY: '-44.2em', w: '1.5em', h: '1.9em' },
            { bgX: '-42.7em', bgY: '-41.7em', w: '2.3em', h: '1.9em' },
        ],
        r: [
            { bgX: '-48em', bgY: '-44.4em', w: '1.5em', h: '1.7em' },
            { bgX: '-48em', bgY: '-41.9em', w: '2.3em', h: '1.7em' },
        ],
        q: [
            { bgX: '-50.4em', bgY: '-41.7em', w: '2.3em', h: '1.9em' },
        ]
    },
    b: {
        p: [
            { bgX: '0', bgY: '-59.4em', w: '1.3em', h: '1.7em' },
            { bgX: '0', bgY: '-56.9em', w: '2.0em', h: '1.7em' },
            { bgX: '0', bgY: '-54.4em', w: '2.7em', h: '1.7em' },
            { bgX: '0', bgY: '-51.9em', w: '3.4em', h: '1.7em' },
            { bgX: '0', bgY: '-49.4em', w: '4.1em', h: '1.7em' },
            { bgX: '0', bgY: '-46.9em', w: '4.8em', h: '1.7em' },
            { bgX: '0', bgY: '-44.4em', w: '5.5em', h: '1.7em' },
            { bgX: '0', bgY: '-41.9em', w: '6.2em', h: '1.7em' },
        ],
        n: [
            { bgX: '-9.5em', bgY: '-44.2em', w: '1.6em', h: '1.9em' },
            { bgX: '-9.5em', bgY: '-41.7em', w: '2.3em', h: '1.9em' },
        ],
        b: [
            { bgX: '-6.7em', bgY: '-44.2em', w: '1.5em', h: '1.9em' },
            { bgX: '-6.7em', bgY: '-41.7em', w: '2.3em', h: '1.9em' },
        ],
        r: [
            { bgX: '-12em', bgY: '-44.4em', w: '1.5em', h: '1.7em' },
            { bgX: '-12em', bgY: '-41.9em', w: '2.3em', h: '1.7em' },
        ],
        q: [
            { bgX: '-14.5em', bgY: '-41.7em', w: '2.3em', h: '1.9em' },
        ]
    }
};

interface CapturedMaterialProps {
    pieces: string[];
    color: Color; // Color of the CAPTURED pieces
    score: number;
}

export function CapturedMaterial({ pieces, color, score }: CapturedMaterialProps) {
    if (pieces.length === 0) return <div className="h-[20px]" />;

    const counts: Record<PieceSymbolOmitKing, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    pieces.forEach(p => {
        if (counts[p as PieceSymbolOmitKing] !== undefined) {
            counts[p as PieceSymbolOmitKing]++;
        }
    });

    const order: PieceSymbolOmitKing[] = ['p', 'n', 'b', 'r', 'q'];

    return (
        <div className="flex items-end gap-1 min-h-[20px]" style={{ fontSize: '10px' }}>
            {order.map(pieceType => {
                const count = counts[pieceType];
                if (count === 0) return null;

                const sprites = SPRITE_MAP[color][pieceType];
                const maxSpriteCount = sprites.length;
                
                const elements = [];
                let remaining = count;
                
                while (remaining > 0) {
                    const toDraw = Math.min(remaining, maxSpriteCount);
                    const sprite = sprites[toDraw - 1];
                    elements.push(
                        <div
                            key={`${pieceType}-${remaining}`}
                            className="bg-[url('/assets/images/captured-pieces.png')] inline-block"
                            style={{
                                backgroundPosition: `${sprite.bgX} ${sprite.bgY}`,
                                width: sprite.w,
                                height: sprite.h,
                                backgroundRepeat: "no-repeat",
                                backgroundSize: "68.3em 61.1em"
                            }}
                        />
                    );
                    remaining -= toDraw;
                }

                return elements;
            })}
            
            {score > 0 && (
                <span className="text-xs font-bold text-muted-foreground ml-1">
                    +{score}
                </span>
            )}
        </div>
    );
}
