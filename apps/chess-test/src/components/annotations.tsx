import { useEffect, useState } from "react";
import type { ChessApp } from "@chess-fw/core";

// Configuración visual de las flechas (Porcentajes relativos al tablero 0-100)
// Puedes modificar estos valores libremente, se ajustarán a cualquier tamaño de pantalla.
const ARROW_CONFIG = {
    strokeWidth: 3,       // Grosor del palo de la flecha
    startOffset: 4.5,       // Qué tan despegada del centro inicia (mayor = más al borde)
    markerWidth: 1.5,       // Ancho de la punta de la flecha
    markerHeight: 2.2,      // Largo de la punta de la flecha
    refX: 0.01,              // Qué tanto se superpone la línea con la punta para evitar huecos
    color: "rgba(255, 170, 0, 0.8)",       // Color base de la flecha
    opacity: 0.8            // Transparencia global
};

export default function Annotations({ app }: { app: ChessApp }) {
    const [_version, setVersion] = useState(0);

    useEffect(() => {
        const trigger = () => setVersion(v => v + 1);
        const u1 = app.events.on("ANNOTATION_ADDED", trigger);
        const u2 = app.events.on("ANNOTATION_REMOVED", trigger);
        const u3 = app.events.on("ANNOTATIONS_CLEARED", trigger);
        return () => {
            u1();
            u2();
            u3();
        }
    }, [app]);

    const annotations = app.annotations.getAnnotations();
    const highlights = annotations.filter((a: any) => a.type === 'highlight');
    const arrows = annotations.filter((a: any) => a.type === 'arrow');

    const getSquareCoords = (sq: string) => {
        const x = sq.charCodeAt(0) - 'a'.charCodeAt(0);
        const y = 8 - parseInt(sq[1]);
        return { x, y };
    };

    return (
        <>
            {highlights.map((h: any) => {
                const { x, y } = getSquareCoords(h.square);
                return (
                    <div
                        key={h.id}
                        className="absolute w-[12.5%] h-[12.5%] opacity-60 z-9"
                        style={{
                            left: `${x * 12.5}%`,
                            top: `${y * 12.5}%`,
                            backgroundColor: h.backgroundColor || h.color || '#ef4444'
                        }}
                    />
                );
            })}
            <div className="absolute inset-0 pointer-events-none z-20">
                <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 pointer-events-none">
                    <defs>
                        <marker id="arrowhead" markerWidth={ARROW_CONFIG.markerWidth} markerHeight={ARROW_CONFIG.markerHeight} refX={ARROW_CONFIG.refX} refY={ARROW_CONFIG.markerHeight / 2} orient="auto" markerUnits="strokeWidth">
                            <polygon points={`0 0, ${ARROW_CONFIG.markerWidth} ${ARROW_CONFIG.markerHeight / 2}, 0 ${ARROW_CONFIG.markerHeight}`} fill={ARROW_CONFIG.color} />
                        </marker>
                    </defs>
                    <g opacity={ARROW_CONFIG.opacity}>
                        {arrows.map((a: any) => {
                            const from = getSquareCoords(a.from);
                            const to = getSquareCoords(a.to);

                            const startX = from.x * 12.5 + 6.25;
                            const startY = from.y * 12.5 + 6.25;
                            const endX = to.x * 12.5 + 6.25;
                            const endY = to.y * 12.5 + 6.25;

                            const dx = endX - startX;
                            const dy = endY - startY;
                            const distance = Math.sqrt(dx * dx + dy * dy);

                            // La punta se desplaza matemáticamente dependiendo de los config
                            const endOffset = (ARROW_CONFIG.markerWidth - ARROW_CONFIG.refX) * ARROW_CONFIG.strokeWidth;

                            const isKnightMove = (Math.abs(from.x - to.x) === 1 && Math.abs(from.y - to.y) === 2) ||
                                (Math.abs(from.x - to.x) === 2 && Math.abs(from.y - to.y) === 1);

                            if (isKnightMove) {
                                const moveHorizontallyFirst = Math.abs(from.x - to.x) > Math.abs(from.y - to.y);
                                const midX = moveHorizontallyFirst ? endX : startX;
                                const midY = moveHorizontallyFirst ? startY : endY;

                                let finalStartX = startX;
                                let finalStartY = startY;
                                let finalEndX = endX;
                                let finalEndY = endY;

                                if (moveHorizontallyFirst) {
                                    finalStartX += Math.sign(endX - startX) * ARROW_CONFIG.startOffset;
                                    finalEndY -= Math.sign(endY - midY) * endOffset;
                                } else {
                                    finalStartY += Math.sign(endY - startY) * ARROW_CONFIG.startOffset;
                                    finalEndX -= Math.sign(endX - midX) * endOffset;
                                }

                                return (
                                    <polyline
                                        key={a.id}
                                        points={`${finalStartX},${finalStartY} ${midX},${midY} ${finalEndX},${finalEndY}`}
                                        fill="none"
                                        stroke={ARROW_CONFIG.color}
                                        strokeWidth={ARROW_CONFIG.strokeWidth}
                                        strokeLinejoin="miter"
                                        markerEnd="url(#arrowhead)"
                                    />
                                )
                            }

                            const finalStartX = startX + (dx / distance) * ARROW_CONFIG.startOffset;
                            const finalStartY = startY + (dy / distance) * ARROW_CONFIG.startOffset;
                            const finalEndX = endX - (dx / distance) * endOffset;
                            const finalEndY = endY - (dy / distance) * endOffset;

                            return (
                                <line
                                    key={a.id}
                                    x1={finalStartX} y1={finalStartY}
                                    x2={finalEndX} y2={finalEndY}
                                    stroke={ARROW_CONFIG.color}
                                    strokeWidth={ARROW_CONFIG.strokeWidth}
                                    markerEnd="url(#arrowhead)"
                                />
                            );
                        })}
                    </g>
                </svg>
            </div>
        </>
    );
}
