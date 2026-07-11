type Color = 'w' | 'b';
type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q';

interface SpriteData {
    bgX: string;
    bgY: string;
    w: string;
    h: string;
}

const SPRITE_MAP: Record<Color, Record<PieceSymbol, SpriteData[]>> = {
    w: {
        p: [
            { bgX: '-36rem', bgY: '-59.4rem', w: '1.3rem', h: '1.7rem' },
            { bgX: '-36rem', bgY: '-56.9rem', w: '2.0rem', h: '1.7rem' },
            { bgX: '-36rem', bgY: '-54.4rem', w: '2.7rem', h: '1.7rem' },
            { bgX: '-36rem', bgY: '-51.9rem', w: '3.4rem', h: '1.7rem' },
            { bgX: '-36rem', bgY: '-49.4rem', w: '4.1rem', h: '1.7rem' },
            { bgX: '-36rem', bgY: '-46.9rem', w: '4.8rem', h: '1.7rem' },
            { bgX: '-36rem', bgY: '-44.4rem', w: '5.5rem', h: '1.7rem' },
            { bgX: '-36rem', bgY: '-41.9rem', w: '6.2rem', h: '1.7rem' },
        ],
        n: [
            { bgX: '-45.4rem', bgY: '-44.2rem', w: '1.6rem', h: '1.9rem' },
            { bgX: '-45.4rem', bgY: '-41.7rem', w: '2.3rem', h: '1.9rem' },
        ],
        b: [
            { bgX: '-42.7rem', bgY: '-44.3rem', w: '1.5rem', h: '1.8rem' },
            { bgX: '-42.7rem', bgY: '-41.7rem', w: '2.3rem', h: '1.9rem' },
        ],
        r: [
            { bgX: '-48rem', bgY: '-44.4rem', w: '1.5rem', h: '1.7rem' },
            { bgX: '-48rem', bgY: '-41.9rem', w: '2.3rem', h: '1.7rem' },
        ],
        q: [
            { bgX: '-50.4rem', bgY: '-41.7rem', w: '2.3rem', h: '1.9rem' },
        ]
    },
    b: {
        p: [
            { bgX: '0', bgY: '-59.4rem', w: '1.3rem', h: '1.7rem' },
            { bgX: '0', bgY: '-56.9rem', w: '2.0rem', h: '1.7rem' },
            { bgX: '0', bgY: '-54.4rem', w: '2.7rem', h: '1.7rem' },
            { bgX: '0', bgY: '-51.9rem', w: '3.4rem', h: '1.7rem' },
            { bgX: '0', bgY: '-49.4rem', w: '4.1rem', h: '1.7rem' },
            { bgX: '0', bgY: '-46.9rem', w: '4.8rem', h: '1.7rem' },
            { bgX: '0', bgY: '-44.4rem', w: '5.5rem', h: '1.7rem' },
            { bgX: '0', bgY: '-41.9rem', w: '6.2rem', h: '1.7rem' },
        ],
        n: [
            { bgX: '-9.5rem', bgY: '-44.2rem', w: '1.6rem', h: '1.9rem' },
            { bgX: '-9.5rem', bgY: '-41.7rem', w: '2.3rem', h: '1.9rem' },
        ],
        b: [
            { bgX: '-6.7rem', bgY: '-44.3rem', w: '1.5rem', h: '1.8rem' },
            { bgX: '-6.7rem', bgY: '-41.7rem', w: '2.3rem', h: '1.9rem' },
        ],
        r: [
            { bgX: '-12rem', bgY: '-44.4rem', w: '1.5rem', h: '1.7rem' },
            { bgX: '-12rem', bgY: '-41.9rem', w: '2.3rem', h: '1.7rem' },
        ],
        q: [
            { bgX: '-14.5rem', bgY: '-41.7rem', w: '2.3rem', h: '1.9rem' },
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

    const counts: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    pieces.forEach(p => {
        if (counts[p as PieceSymbol] !== undefined) {
            counts[p as PieceSymbol]++;
        }
    });

    const order: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q'];

    return (
        <div className="flex items-center gap-1 scale-[0.85] origin-left min-h-[20px]">
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
                                backgroundSize: "68.3rem 61.1rem"
                            }}
                        />
                    );
                    remaining -= toDraw;
                }

                return elements;
            })}
            
            {score > 0 && (
                <span className="text-base font-bold text-muted-foreground ml-1">
                    +{score}
                </span>
            )}
        </div>
    );
}
