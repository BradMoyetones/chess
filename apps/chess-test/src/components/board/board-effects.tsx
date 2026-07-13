import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

// SVGs adaptados del usuario
const CheckmateIconWhite = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        className={cn('w-full h-full drop-shadow-md', props.className)}
        viewBox="0 0 18 19"
    >
        <path
            d="m 8.91922,5.86598 c 0.27141,0 0.5622,0.28866 0.96931,0.70103 0.19387,0.20619 0.40707,0.41237 0.65917,0.63918 0,0.12371 -0.0194,0.26804 -0.0194,0.41237 H 8.70598 C 8.47334,7.30928 8.33764,6.95876 8.33764,6.60825 c 0,-0.37114 0.15509,-0.74227 0.58158,-0.74227 z m 0,6.26802 c -0.42649,0 -0.58158,-0.3711 -0.58158,-0.7422 0,-0.3506 0.1357,-0.7011 0.36834,-1.0104 h 1.82232 c 0,0.1444 0.0194,0.2887 0.0194,0.4124 -0.2521,0.2268 -0.4653,0.433 -0.65917,0.6392 -0.40711,0.4124 -0.6979,0.701 -0.96931,0.701 z M 11.3748,4.52577 C 10.6769,3.7835 9.95961,3 8.79645,3 7.14863,3 5.96607,4.23711 5.96607,5.92784 c 0,0.82474 0.17448,1.50515 0.32957,1.91752 L 5.73344,7.96907 V 7.02062 H 5.40388 4.27948 3.96931 V 8.05155 H 3.31018 3 V 8.40206 9.5979 9.9485 h 0.31018 0.65913 v 1.0309 h 0.31017 1.1244 0.32956 v -0.9485 l 0.54281,0.1237 c -0.1357,0.4124 -0.31018,1.0928 -0.31018,1.9176 0,1.6907 1.18256,2.9278 2.83038,2.9278 1.16316,0 1.88045,-0.7835 2.57835,-1.5258 0.3683,-0.3711 0.7367,-0.7629 1.1632,-1.0515 0.1357,0.4536 0.3683,0.7422 0.6979,0.9072 0.3683,0.2062 0.8142,0.2062 1.3182,0.2062 H 14.6704 15 V 13.1856 L 14.9935,4.81443 V 4.46392 H 14.664 14.5477 c -0.5041,0 -0.95,0 -1.3183,0.20618 C 12.8998,4.83505 12.6672,5.12371 12.5315,5.57732 12.105,5.28866 11.7367,4.89691 11.3683,4.52577 Z"
            fill="currentColor"
        />
    </svg>
);

const CheckmateIconBlack = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        className={cn('w-full h-full drop-shadow-md', props.className)}
        viewBox="0 0 18 19"
    >
        <path
            d="m 9.9742023,6.6728298 2.42e-5,-2.42e-5 -0.00213,-0.00204 C 9.7700909,6.4784115 9.5898002,6.3078138 9.4249699,6.1860933 9.2615451,6.0654149 9.0947034,5.9782259 8.9192108,5.9782259 c -0.25168,0 -0.4344667,0.1056058 -0.549814,0.2695152 -0.1111793,0.1579967 -0.1529321,0.3598302 -0.1529321,0.5495475 0,0.3631985 0.1493457,0.7186669 0.3948949,1.0255973 l 0.036373,0.045485 h 0.058231 1.8222934 0.121163 V 7.7472074 c 0,-0.062738 0.0045,-0.1263489 0.0094,-0.192189 l 6.79e-4,-0.00921 c 0.0046,-0.061284 0.0093,-0.1257673 0.0093,-0.1863246 V 7.30329 l -0.04289,-0.0363 C 10.37581,7.055366 10.165155,6.8638071 9.9742023,6.6728298 Z M 8.7059637,10.223781 h -0.058231 l -0.036373,0.04546 c -0.2455492,0.306954 -0.3948949,0.662399 -0.3948949,1.025621 0,0.189718 0.041753,0.391551 0.1529321,0.549524 0.1153473,0.163909 0.298134,0.269539 0.549814,0.269539 0.1754926,0 0.3423343,-0.08719 0.5057591,-0.207867 0.1648303,-0.121721 0.345121,-0.292319 0.5471241,-0.484677 l 2.43e-5,2.4e-5 0.00208,-0.0021 c 0.1909566,-0.19096 0.4016116,-0.382519 0.6517156,-0.594143 l 0.04289,-0.0363 v -0.0562 c 0,-0.06056 -0.0048,-0.125041 -0.0093,-0.186349 l -6.79e-4,-0.0092 c -0.0049,-0.06584 -0.0094,-0.12945 -0.0094,-0.192188 V 10.223781 H 10.528257 Z M 14.663966,4.902295 h 0.208401 v 0.2084006 9.93e-5 l 0.0065,7.8706591 v 9.7e-5 0.208304 H 14.670436 14.55412 c -0.512351,0 -0.925154,-0.0027 -1.261842,-0.179928 l -0.0024,-0.0013 -0.0024,-0.0011 c -0.294717,-0.138683 -0.506995,-0.38084 -0.634046,-0.780096 l -0.04771,-0.149976 -0.132794,0.0845 c -0.389055,0.247585 -0.730662,0.573344 -1.056979,0.884515 -0.04173,0.03979 -0.08319,0.07931 -0.124459,0.118425 l -2.4e-5,-2.4e-5 -0.0023,0.0023 -0.02246,0.02249 c -0.696009,0.69613 -1.3763643,1.376606 -2.4702007,1.376606 -1.5837231,0 -2.7092072,-1.111695 -2.7092072,-2.631662 0,-0.757682 0.1705492,-1.383417 0.3033682,-1.762875 L 6.435997,10.042013 6.3016271,10.013224 5.7588163,9.8969076 5.6122817,9.8655021 v 0.1498789 0.770597 H 5.4038811 4.2794826 4.0904681 V 9.9378365 9.8166734 H 3.969305 3.3101776 3.1211632 V 9.6082728 8.4838791 8.2754786 H 3.3101776 3.969305 4.0904681 V 8.1543154 7.3061736 H 4.2794826 5.4038811 5.6122817 V 8.076771 8.2255594 L 5.7579924,8.195414 6.3201893,8.0790974 6.4618774,8.0498001 6.4081295,7.9154545 C 6.2579357,7.5399458 6.0872411,6.9154711 6.0872411,6.1575473 c 0,-1.5199695 1.1254841,-2.6316648 2.7092072,-2.6316648 0.9968332,0 1.6502897,0.5651455 2.2851117,1.1922446 h -0.0173 l 0.220735,0.2091227 c 0.04129,0.039104 0.08276,0.078642 0.124459,0.1184175 0.326317,0.3111784 0.667924,0.6369448 1.057003,0.8845295 l 0.13277,0.084499 0.04774,-0.1499757 C 12.773991,5.465466 12.986269,5.2233118 13.280986,5.0846237 l 0.0024,-0.00115 0.0024,-0.00126 C 13.622521,4.9050091 14.035323,4.902295 14.547649,4.902295 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.242326"
        />
    </svg>
);

const WinnerIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        className={cn('w-full h-full drop-shadow-md', props.className)}
        viewBox="0 0 18 19"
    >
        <path
            d="m 24.4334,39.6517 c 15.9034,0 22.8584,-4.7017 22.8584,-4.7017 l 0.975,-23.6167 c 0,-2.16663 -1.495,-2.79497 -3.25,-1.4083 L 34.1834,17.53 26.6868,2.66667 C 26.0151,0.911667 25.1484,0.5 24.5201,0.5 23.8918,0.5 22.9384,0.955 22.3534,2.66667 L 14.6834,17.53 3.85008,9.925 C 2.09508,8.53833 0.513416,9.16667 0.600083,11.3333 L 1.57508,34.95 c 0,0 6.955,4.55 22.85832,4.7017 z"
            fill="white"
            transform="matrix(0.25173118,0,0,0.25173118,2.8497971,2.8741344)"
        />
    </svg>
);

interface BoardEffectsProps {
    app: any;
    boardSnapshot: any;
    flipped: boolean;
}

export function BoardEffects({ app, boardSnapshot, flipped }: BoardEffectsProps) {
    const isCheckmate = app.engine.isCheckmate();
    if (!isCheckmate || !boardSnapshot) return null;

    const turn = app.engine.getTurn(); // The side that lost
    let matedKingAlg: string | null = null;
    let winnerKingAlg: string | null = null;

    boardSnapshot.board.flat().forEach((square: any) => {
        if (square.piece?.type === 'k') {
            if (square.piece.color === turn) {
                matedKingAlg = square.algebraic;
            } else {
                winnerKingAlg = square.algebraic;
            }
        }
    });

    const toCoords = (algebraic: string | null) => {
        if (!algebraic) return null;
        const x = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
        const y = 8 - parseInt(algebraic[1]);
        return { x, y };
    };

    const matedKingSquare = toCoords(matedKingAlg);
    const winnerKingSquare = toCoords(winnerKingAlg);

    return (
        <div className="absolute inset-0 z-30 pointer-events-none">
            {/* Mate effect */}
            {matedKingSquare && (
                <AnimatedSquareEffect
                    x={flipped ? 7 - matedKingSquare.x : matedKingSquare.x}
                    y={flipped ? 7 - matedKingSquare.y : matedKingSquare.y}
                    type={turn === 'w' ? 'mate-white' : 'mate-black'}
                />
            )}
            {/* Winner effect */}
            {winnerKingSquare && (
                <AnimatedSquareEffect
                    x={flipped ? 7 - winnerKingSquare.x : winnerKingSquare.x}
                    y={flipped ? 7 - winnerKingSquare.y : winnerKingSquare.y}
                    type="winner"
                />
            )}
        </div>
    );
}

function AnimatedSquareEffect({ x, y, type }: { x: number; y: number; type: 'mate-white' | 'mate-black' | 'winner' }) {
    const squareSize = 100 / 8; // 12.5%
    const bgColor = type === 'winner' ? '#83b84f' : '#e02828';

    // Position variants
    const parentVariants = {
        initial: {},
        animate: {},
    };

    const bgVariants = {
        initial: { opacity: 0.8 },
        animate: {
            opacity: 0,
            transition: { delay: 0.7, duration: 0.3, ease: 'easeOut' as const },
        },
    };

    const iconVariants = {
        initial: {
            width: '70%',
            height: '70%',
            x: '-50%',
            y: '-50%',
            top: '50%',
            left: '50%',
            backgroundColor: 'rgba(0,0,0,0)',
        },
        animate: {
            width: '24%',
            height: '24%',
            x: '0%',
            y: '0%',
            top: '2%',
            left: '74%',
            backgroundColor: bgColor,
            transition: { delay: 0.7, duration: 0.4, ease: 'easeInOut' as const },
        },
    };

    return (
        <motion.div
            key={type}
            variants={parentVariants}
            initial="initial"
            animate="animate"
            className="absolute"
            style={{
                width: `${squareSize}%`,
                height: `${squareSize}%`,
                left: `${x * squareSize}%`,
                top: `${y * squareSize}%`,
            }}
        >
            {/* Fondo que se desvanece */}
            <motion.div className="absolute inset-0" style={{ backgroundColor: bgColor }} variants={bgVariants} />

            {/* Icono animado */}
            <motion.div
                className={cn('absolute flex items-center justify-center z-10 rounded-full', {
                    'text-white': type === 'mate-white' || type === 'winner',
                    'text-black': type === 'mate-black',
                })}
                variants={iconVariants}
            >
                {type === 'winner' && <WinnerIcon />}
                {type === 'mate-white' && <CheckmateIconWhite />}
                {type === 'mate-black' && <CheckmateIconBlack />}
            </motion.div>
        </motion.div>
    );
}
