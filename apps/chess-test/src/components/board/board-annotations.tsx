export interface ArrowConfig {
    strokeWidth: number;
    startOffset: number;
    markerWidth: number;
    markerHeight: number;
    refX: number;
    color: string;
    opacity: number;
}

export interface BoardAnnotationsProps {
    rows?: number;
    cols?: number;
    arrows?: Array<{ id: string; from: { x: number; y: number }; to: { x: number; y: number }; color?: string }>;
    highlights?: Array<{ id: string; x: number; y: number; color?: string }>;
    arrowConfig?: Partial<ArrowConfig>;
    flipped?: boolean;
    className?: string;
}

const DEFAULT_ARROW_CONFIG: ArrowConfig = {
    strokeWidth: 3,
    startOffset: 4.5,
    markerWidth: 1.5,
    markerHeight: 2.2,
    refX: 0.01,
    color: "rgba(255, 170, 0, 0.8)",
    opacity: 0.8,
};

export function BoardAnnotations({
    rows = 8,
    cols = 8,
    arrows = [],
    highlights = [],
    arrowConfig = {},
    flipped = false,
    className = "",
}: BoardAnnotationsProps) {
    const config = { ...DEFAULT_ARROW_CONFIG, ...arrowConfig };

    const squareWidth = 100 / cols;
    const squareHeight = 100 / rows;

    const uniqueColors = Array.from(
        new Set([config.color, ...arrows.map((a) => a.color).filter(Boolean)])
    ) as string[];

    const colorToId = (c: string) => c.replace(/[^a-zA-Z0-9]/g, "");

    return (
        <div className={`absolute inset-0 pointer-events-none ${className}`}>
            {/* Highlights (Z-index menor) */}
            <div className="absolute inset-0 z-9">
                {highlights.map((h) => {
                    const renderX = flipped ? 7 - h.x : h.x;
                    const renderY = flipped ? 7 - h.y : h.y;
                    return (
                        <div
                            key={h.id}
                            className="absolute opacity-60"
                            style={{
                                width: `${squareWidth}%`,
                                height: `${squareHeight}%`,
                                left: `${renderX * squareWidth}%`,
                                top: `${renderY * squareHeight}%`,
                                backgroundColor: h.color || "#ef4444",
                            }}
                        />
                    );
                })}
            </div>

            {/* Arrows (Z-index mayor, por encima de las piezas que están en 25) */}
            <div className="absolute inset-0 z-30">
                <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 pointer-events-none">
                    <defs>
                        {uniqueColors.map((color) => (
                            <marker
                                key={`arrowhead-${colorToId(color)}`}
                                id={`arrowhead-${colorToId(color)}`}
                                markerWidth={config.markerWidth}
                                markerHeight={config.markerHeight}
                                refX={config.refX}
                                refY={config.markerHeight / 2}
                                orient="auto"
                                markerUnits="strokeWidth"
                            >
                                <polygon
                                    points={`0 0, ${config.markerWidth} ${config.markerHeight / 2}, 0 ${config.markerHeight}`}
                                    fill={color}
                                />
                            </marker>
                        ))}
                    </defs>
                    <g opacity={config.opacity}>
                        {arrows.map((a) => {
                            const aFromX = flipped ? 7 - a.from.x : a.from.x;
                            const aFromY = flipped ? 7 - a.from.y : a.from.y;
                            const aToX = flipped ? 7 - a.to.x : a.to.x;
                            const aToY = flipped ? 7 - a.to.y : a.to.y;

                            const startX = aFromX * squareWidth + squareWidth / 2;
                            const startY = aFromY * squareHeight + squareHeight / 2;
                            const endX = aToX * squareWidth + squareWidth / 2;
                            const endY = aToY * squareHeight + squareHeight / 2;

                            const dx = endX - startX;
                            const dy = endY - startY;
                            const distance = Math.sqrt(dx * dx + dy * dy);

                            if (distance === 0) return null;

                            const endOffset = (config.markerWidth - config.refX) * config.strokeWidth;
                            const customColor = a.color || config.color;

                            const isKnightMove =
                                (Math.abs(aFromX - aToX) === 1 && Math.abs(aFromY - aToY) === 2) ||
                                (Math.abs(aFromX - aToX) === 2 && Math.abs(aFromY - aToY) === 1);

                            if (isKnightMove) {
                                const moveHorizontallyFirst = Math.abs(aFromX - aToX) > Math.abs(aFromY - aToY);
                                const midX = moveHorizontallyFirst ? endX : startX;
                                const midY = moveHorizontallyFirst ? startY : endY;

                                let finalStartX = startX;
                                let finalStartY = startY;
                                let finalEndX = endX;
                                let finalEndY = endY;

                                if (moveHorizontallyFirst) {
                                    finalStartX += Math.sign(endX - startX) * config.startOffset;
                                    finalEndY -= Math.sign(endY - midY) * endOffset;
                                } else {
                                    finalStartY += Math.sign(endY - startY) * config.startOffset;
                                    finalEndX -= Math.sign(endX - midX) * endOffset;
                                }

                                return (
                                    <polyline
                                        key={a.id}
                                        points={`${finalStartX},${finalStartY} ${midX},${midY} ${finalEndX},${finalEndY}`}
                                        fill="none"
                                        stroke={customColor}
                                        strokeWidth={config.strokeWidth}
                                        strokeLinejoin="miter"
                                        markerEnd={`url(#arrowhead-${colorToId(customColor)})`}
                                    />
                                );
                            }

                            const finalStartX = startX + (dx / distance) * config.startOffset;
                            const finalStartY = startY + (dy / distance) * config.startOffset;
                            const finalEndX = endX - (dx / distance) * endOffset;
                            const finalEndY = endY - (dy / distance) * endOffset;

                            return (
                                <line
                                    key={a.id}
                                    x1={finalStartX}
                                    y1={finalStartY}
                                    x2={finalEndX}
                                    y2={finalEndY}
                                    stroke={customColor}
                                    strokeWidth={config.strokeWidth}
                                    markerEnd={`url(#arrowhead-${colorToId(customColor)})`}
                                />
                            );
                        })}
                    </g>
                </svg>
            </div>
        </div>
    );
}
