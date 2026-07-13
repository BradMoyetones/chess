import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';

const CheckmateIconWhite = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={cn('w-full h-full drop-shadow-md', props.className)} viewBox="0 0 18 19">
        <path d="m 8.91922,5.86598 c 0.27141,0 0.5622,0.28866 0.96931,0.70103 0.19387,0.20619 0.40707,0.41237 0.65917,0.63918 0,0.12371 -0.0194,0.26804 -0.0194,0.41237 H 8.70598 C 8.47334,7.30928 8.33764,6.95876 8.33764,6.60825 c 0,-0.37114 0.15509,-0.74227 0.58158,-0.74227 z m 0,6.26802 c -0.42649,0 -0.58158,-0.3711 -0.58158,-0.7422 0,-0.3506 0.1357,-0.7011 0.36834,-1.0104 h 1.82232 c 0,0.1444 0.0194,0.2887 0.0194,0.4124 -0.2521,0.2268 -0.4653,0.433 -0.65917,0.6392 -0.40711,0.4124 -0.6979,0.701 -0.96931,0.701 z M 11.3748,4.52577 C 10.6769,3.7835 9.95961,3 8.79645,3 7.14863,3 5.96607,4.23711 5.96607,5.92784 c 0,0.82474 0.17448,1.50515 0.32957,1.91752 L 5.73344,7.96907 V 7.02062 H 5.40388 4.27948 3.96931 V 8.05155 H 3.31018 3 V 8.40206 9.5979 9.9485 h 0.31018 0.65913 v 1.0309 h 0.31017 1.1244 0.32956 v -0.9485 l 0.54281,0.1237 c -0.1357,0.4124 -0.31018,1.0928 -0.31018,1.9176 0,1.6907 1.18256,2.9278 2.83038,2.9278 1.16316,0 1.88045,-0.7835 2.57835,-1.5258 0.3683,-0.3711 0.7367,-0.7629 1.1632,-1.0515 0.1357,0.4536 0.3683,0.7422 0.6979,0.9072 0.3683,0.2062 0.8142,0.2062 1.3182,0.2062 H 14.6704 15 V 13.1856 L 14.9935,4.81443 V 4.46392 H 14.664 14.5477 c -0.5041,0 -0.95,0 -1.3183,0.20618 C 12.8998,4.83505 12.6672,5.12371 12.5315,5.57732 12.105,5.28866 11.7367,4.89691 11.3683,4.52577 Z" fill="currentColor" />
    </svg>
);

const CheckmateIconBlack = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={cn('w-full h-full drop-shadow-md', props.className)} viewBox="0 0 18 19">
        <path d="m 9.9742023,6.6728298 2.42e-5,-2.42e-5 -0.00213,-0.00204 C 9.7700909,6.4784115 9.5898002,6.3078138 9.4249699,6.1860933 9.2615451,6.0654149 9.0947034,5.9782259 8.9192108,5.9782259 c -0.25168,0 -0.4344667,0.1056058 -0.549814,0.2695152 -0.1111793,0.1579967 -0.1529321,0.3598302 -0.1529321,0.5495475 0,0.3631985 0.1493457,0.7186669 0.3948949,1.0255973 l 0.036373,0.045485 h 0.058231 1.8222934 0.121163 V 7.7472074 c 0,-0.062738 0.0045,-0.1263489 0.0094,-0.192189 l 6.79e-4,-0.00921 c 0.0046,-0.061284 0.0093,-0.1257673 0.0093,-0.1863246 V 7.30329 l -0.04289,-0.0363 C 10.37581,7.055366 10.165155,6.8638071 9.9742023,6.6728298 Z M 8.7059637,10.223781 h -0.058231 l -0.036373,0.04546 c -0.2455492,0.306954 -0.3948949,0.662399 -0.3948949,1.025621 0,0.189718 0.041753,0.391551 0.1529321,0.549524 0.1153473,0.163909 0.298134,0.269539 0.549814,0.269539 0.1754926,0 0.3423343,-0.08719 0.5057591,-0.207867 0.1648303,-0.121721 0.345121,-0.292319 0.5471241,-0.484677 l 2.43e-5,2.4e-5 0.00208,-0.0021 c 0.1909566,-0.19096 0.4016116,-0.382519 0.6517156,-0.594143 l 0.04289,-0.0363 v -0.0562 c 0,-0.06056 -0.0048,-0.125041 -0.0093,-0.186349 l -6.79e-4,-0.0092 c -0.0049,-0.06584 -0.0094,-0.12945 -0.0094,-0.192188 V 10.223781 H 10.528257 Z M 14.663966,4.902295 h 0.208401 v 0.2084006 9.93e-5 l 0.0065,7.8706591 v 9.7e-5 0.208304 H 14.670436 14.55412 c -0.512351,0 -0.925154,-0.0027 -1.261842,-0.179928 l -0.0024,-0.0013 -0.0024,-0.0011 c -0.294717,-0.138683 -0.506995,-0.38084 -0.634046,-0.780096 l -0.04771,-0.149976 -0.132794,0.0845 c -0.389055,0.247585 -0.730662,0.573344 -1.056979,0.884515 -0.04173,0.03979 -0.08319,0.07931 -0.124459,0.118425 l -2.4e-5,-2.4e-5 -0.0023,0.0023 -0.02246,0.02249 c -0.696009,0.69613 -1.3763643,1.376606 -2.4702007,1.376606 -1.5837231,0 -2.7092072,-1.111695 -2.7092072,-2.631662 0,-0.757682 0.1705492,-1.383417 0.3033682,-1.762875 L 6.435997,10.042013 6.3016271,10.013224 5.7588163,9.8969076 5.6122817,9.8655021 v 0.1498789 0.770597 H 5.4038811 4.2794826 4.0904681 V 9.9378365 9.8166734 H 3.969305 3.3101776 3.1211632 V 9.6082728 8.4838791 8.2754786 H 3.3101776 3.969305 4.0904681 V 8.1543154 7.3061736 H 4.2794826 5.4038811 5.6122817 V 8.076771 8.2255594 L 5.7579924,8.195414 6.3201893,8.0790974 6.4618774,8.0498001 6.4081295,7.9154545 C 6.2579357,7.5399458 6.0872411,6.9154711 6.0872411,6.1575473 c 0,-1.5199695 1.1254841,-2.6316648 2.7092072,-2.6316648 0.9968332,0 1.6502897,0.5651455 2.2851117,1.1922446 h -0.0173 l 0.220735,0.2091227 c 0.04129,0.039104 0.08276,0.078642 0.124459,0.1184175 0.326317,0.3111784 0.667924,0.6369448 1.057003,0.8845295 l 0.13277,0.084499 0.04774,-0.1499757 C 12.773991,5.465466 12.986269,5.2233118 13.280986,5.0846237 l 0.0024,-0.00115 0.0024,-0.00126 C 13.622521,4.9050091 14.035323,4.902295 14.547649,4.902295 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.242326" />
    </svg>
);

const WinnerIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={cn('w-full h-full drop-shadow-md', props.className)} viewBox="0 0 18 19">
        <path d="m 24.4334,39.6517 c 15.9034,0 22.8584,-4.7017 22.8584,-4.7017 l 0.975,-23.6167 c 0,-2.16663 -1.495,-2.79497 -3.25,-1.4083 L 34.1834,17.53 26.6868,2.66667 C 26.0151,0.911667 25.1484,0.5 24.5201,0.5 23.8918,0.5 22.9384,0.955 22.3534,2.66667 L 14.6834,17.53 3.85008,9.925 C 2.09508,8.53833 0.513416,9.16667 0.600083,11.3333 L 1.57508,34.95 c 0,0 6.955,4.55 22.85832,4.7017 z" fill="white" transform="matrix(0.25173118,0,0,0.25173118,2.8497971,2.8741344)" />
    </svg>
);

const TimeoutIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" className={cn('w-full h-full drop-shadow-md', props.className)} viewBox="0 0 18 19">
        <g id="timeout">
            <path d="M 14.53306,6.65985 C 14.23406,5.94735 13.79936,5.29981 13.25316,4.75326 12.70156,4.20841 12.05256,3.77198 11.33986,3.46665 10.60046,3.15154 9.8037904,2.99267 9.0000004,3 8.1941504,2.99365 7.3955404,3.15247 6.65343,3.46665 5.94521,3.77288 5.30075,4.2093 4.75351,4.75326 4.2073,5.29981 3.77259,5.94735 3.47357,6.65985 3.15336,7.39796 2.99209,8.19521 3.00026,8.99975 c -0.00817,0.80451 0.1531,1.60181 0.47331,2.33991 0.29902,0.7125 0.73373,1.36 1.27994,1.9066 0.54921,0.5446 1.19599,0.9811 1.90659,1.2866 0.7400404,0.3133 1.5362904,0.4721 2.3399004,0.4666 0.80154,0.0064 1.5958596,-0.1524 2.3332596,-0.4666 0.7126,-0.3053 1.3616,-0.7418 1.9132,-1.2866 0.5462,-0.5466 0.981,-1.1941 1.28,-1.9066 0.317,-0.7391 0.4781,-1.5357 0.4733,-2.33991 0.0069,-0.80376 -0.1519,-1.60031 -0.4667,-2.3399 z m -1.6599,3.99981 c -0.4273,1.0054 -1.2278,1.806 -2.2332,2.2333 -0.5154,0.2234 -1.0716196,0.3369 -1.6332896,0.3333 -0.5659,0.0028 -1.12634,-0.1107 -1.6466,-0.3333 C 6.35339,12.45616 5.55527,11.64606 5.1335,10.63296 4.91346,10.11656 4.80003,9.56106 4.80003,8.99975 c 0,-0.56133 0.11343,-1.11687 0.33347,-1.63327 0.42744,-1.00301 1.22484,-1.8028 2.2265704,-2.23324 0.5182,-0.22176 1.07628,-0.33519 1.63993,-0.33331 0.5616,-0.00287 1.1176596,0.11062 1.6332596,0.33331 1.0054,0.42728 1.806,1.22782 2.2332,2.23324 0.2201,0.5164 0.3335,1.07194 0.3335,1.63327 0,0.56131 -0.1134,1.11681 -0.3335,1.63321 z" fill="white" />
            <path d="M 11.03326,10.50636 9.5666404,9.03975 V 6.70651 c 0.0025,-0.07769 -0.01099,-0.15507 -0.03966,-0.22732 -0.02867,-0.07225 -0.0719,-0.13783 -0.127,-0.19266 -0.05063,-0.05599 -0.11231,-0.10089 -0.18115,-0.13187 -0.06884,-0.03098 -0.14335,-0.04737 -0.21883,-0.04812 h -0.59998 c -0.07966,-9.1e-4 -0.15866,0.0146 -0.23206,0.04557 -0.07341,0.03096 -0.13964,0.07672 -0.19458,0.13442 -0.05599,0.0545 -0.10024,0.11987 -0.13005,0.19209 -0.0298,0.07222 -0.04453,0.14977 -0.04328,0.22789 v 2.82655 c -6.3e-4,0.079 0.01435,0.1574 0.0441,0.2306 0.02974,0.0732 0.07366,0.1398 0.12923,0.196 l 1.81325,1.82 c 0.05533,0.0572 0.12162,0.1028 0.19492,0.1339 0.07331,0.0311 0.1521096,0.0471 0.2317096,0.0471 0.0796,0 0.1585,-0.016 0.2317,-0.0471 0.0733,-0.0311 0.1396,-0.0767 0.195,-0.1339 l 0.42,-0.42 c 0.0572,-0.0553 0.1027,-0.1216 0.1338,-0.1949 0.0311,-0.0733 0.0472,-0.1521 0.0472,-0.2318 0,-0.0796 -0.0161,-0.1584 -0.0472,-0.2317 -0.0311,-0.0733 -0.0766,-0.1396 -0.1338,-0.1949 z" fill="white" />
        </g>
    </svg>
);


interface BoardEffectsProps {
    app: any;
    boardSnapshot: any;
    flipped: boolean;
    whiteTime?: number | null;
    blackTime?: number | null;
}

export function BoardEffects({ app, boardSnapshot, flipped, whiteTime, blackTime }: BoardEffectsProps) {
    if (!boardSnapshot) return null;

    const isCheckmate = app.engine.isCheckmate();
    const isWhiteTimeout = whiteTime != null && whiteTime <= 0;
    const isBlackTimeout = blackTime != null && blackTime <= 0;
    const isGameOver = app.engine.isGameOver() || isWhiteTimeout || isBlackTimeout;

    if (!isGameOver) return null;

    // Prioritize checkmate over timeout visually if both somehow happen
    let turn = app.engine.getTurn(); // The side that lost / is to move
    let timeoutSide: 'w' | 'b' | null = null;

    if (!isCheckmate) {
        if (isWhiteTimeout) timeoutSide = 'w';
        else if (isBlackTimeout) timeoutSide = 'b';
        else return null; // Game over by draw or resign, no effect needed
    }

    let affectedKingAlg: string | null = null;
    let winnerKingAlg: string | null = null;

    const loserColor = timeoutSide ?? turn;

    boardSnapshot.board.flat().forEach((square: any) => {
        if (square.piece?.type === 'k') {
            if (square.piece.color === loserColor) {
                affectedKingAlg = square.algebraic;
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

    const affectedKingSquare = toCoords(affectedKingAlg);
    const winnerKingSquare = toCoords(winnerKingAlg);

    const typeAffected = timeoutSide 
        ? (timeoutSide === 'w' ? 'timeout-white' : 'timeout-black')
        : (loserColor === 'w' ? 'mate-white' : 'mate-black');

    return (
        <div className="absolute inset-0 z-30 pointer-events-none">
            {/* Loser effect (Mate or Timeout) */}
            {affectedKingSquare && (
                <AnimatedSquareEffect
                    x={flipped ? 7 - affectedKingSquare.x : affectedKingSquare.x}
                    y={flipped ? 7 - affectedKingSquare.y : affectedKingSquare.y}
                    type={typeAffected}
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

function AnimatedSquareEffect({ x, y, type }: { x: number; y: number; type: 'mate-white' | 'mate-black' | 'winner' | 'timeout-white' | 'timeout-black' }) {
    const [phase, setPhase] = useState<'initial' | 'merged'>('initial');

    useEffect(() => {
        const t = setTimeout(() => setPhase('merged'), 700);
        return () => clearTimeout(t);
    }, []);

    const squareSize = 100 / 8; // 12.5%
    const bgColor = type === 'winner' ? '#83b84f' : '#e02828';
    const isTimeout = type.startsWith('timeout');

    const targetX = x === 7 ? "-100%" : "-50%";
    const targetY = y === 0 ? "0%" : "-50%";
    const targetLeft = x === 7 ? "100%" : "100%";
    const targetTop = y === 0 ? "0%" : "0%";

    const getLabel = () => {
        if (type === 'winner') return 'Winner';
        if (isTimeout) return 'Timeout';
        return 'Checkmate';
    };

    return (
        <div
            className="absolute"
            style={{
                width: `${squareSize}%`,
                height: `${squareSize}%`,
                left: `${x * squareSize}%`,
                top: `${y * squareSize}%`,
            }}
        >
            {/* Fondo translúcido */}
            {phase === 'initial' && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0" 
                    style={{ backgroundColor: bgColor }} 
                />
            )}

            {phase === 'initial' ? (
                <>
                    {/* Badge Initial State */}
                    <motion.div 
                        layoutId={`badge-${type}`}
                        initial={{ opacity: 0, y: `calc(${targetY} + 15px)`, x: targetX }}
                        animate={{ opacity: 1, y: targetY, x: targetX }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="absolute z-10 flex items-center shadow-lg px-2 overflow-hidden"
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '9999px',
                            top: targetTop,
                            left: targetLeft,
                            height: '32px'
                        }}
                    >
                        <span className={cn('text-lg font-bold uppercase whitespace-nowrap', {
                            'text-[#83b84f]': type === 'winner',
                            'text-[#e02828]': type !== 'winner',
                        })}>
                            {getLabel()}
                        </span>
                    </motion.div>

                    {/* SVG Initial State */}
                    <motion.div
                        layoutId={`icon-${type}`}
                        initial={{ scale: 0, x: "-50%", y: "-50%" }}
                        animate={{ scale: 1, x: "-50%", y: "-50%" }}
                        transition={{ type: 'spring', bounce: 0.4 }}
                        className={cn('absolute flex items-center justify-center z-20', {
                            'text-white': type === 'mate-white' || type === 'winner' || type === 'timeout-white' || type === 'timeout-black',
                            'text-black': type === 'mate-black',
                        })}
                        style={{
                            width: '65%',
                            height: '65%',
                            top: '50%',
                            left: '50%'
                        }}
                    >
                        {type === 'winner' && <WinnerIcon />}
                        {type === 'mate-white' && <CheckmateIconWhite />}
                        {type === 'mate-black' && <CheckmateIconBlack />}
                        {isTimeout && <TimeoutIcon />}
                    </motion.div>
                </>
            ) : (
                /* Merged State (Siblings to prevent nested layout scale distortion) */
                <>
                    <motion.div
                        layoutId={`badge-${type}`}
                        className="absolute z-30 shadow-md"
                        initial={{ x: targetX, y: targetY }}
                        animate={{ x: targetX, y: targetY }}
                        style={{
                            backgroundColor: bgColor,
                            borderRadius: '9999px',
                            top: targetTop,
                            left: targetLeft,
                            width: '40%',
                            height: '40%'
                        }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                    
                    <motion.div
                        layoutId={`icon-${type}`}
                        className={cn('absolute flex items-center justify-center z-40', {
                            'text-white': type === 'mate-white' || type === 'winner' || type === 'timeout-white' || type === 'timeout-black',
                            'text-black': type === 'mate-black',
                        })}
                        initial={{ x: targetX, y: targetY }}
                        animate={{ x: targetX, y: targetY }}
                        style={{
                            top: targetTop,
                            left: targetLeft,
                            width: '40%',
                            height: '40%'
                        }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    >
                        {type === 'winner' && <WinnerIcon />}
                        {type === 'mate-white' && <CheckmateIconWhite />}
                        {type === 'mate-black' && <CheckmateIconBlack />}
                        {isTimeout && <TimeoutIcon />}
                    </motion.div>
                </>
            )}
        </div>
    );
}
