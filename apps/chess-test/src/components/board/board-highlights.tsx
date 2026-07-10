import React from "react";

export interface BoardHighlightsProps {
    rows?: number;
    cols?: number;
    selectedSquare?: { x: number; y: number } | null;
    lastMove?: { from: { x: number; y: number }; to: { x: number; y: number } } | null;
    validDestinations?: Array<{ x: number; y: number; containsPiece: boolean }>;
    hoverSquare?: { x: number; y: number } | null;
    premoves?: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }>;
    flipped?: boolean;
    className?: string;
    colors?: {
        selected?: string;
        lastMove?: string;
        premove?: string;
        hoverBorder?: string;
        hoverShadow?: string;
        destinationEmpty?: string;
        destinationCapture?: string;
    };
}

const DEFAULT_COLORS = {
    selected: "rgba(255, 255, 51, 0.5)",
    lastMove: "rgba(255, 255, 51, 0.5)",
    premove: "rgba(244, 63, 94, 0.5)", // Rose-500 red with 50% opacity
    hoverBorder: "rgba(255, 255, 255, 0.7)",
    hoverShadow: "inset 0 0 10px rgba(255, 255, 255, 0)",
    destinationEmpty: "rgba(0, 0, 0, 0.14)",
    destinationCapture: "rgba(0, 0, 0, 0.14)",
};

export function BoardHighlights({
    rows = 8,
    cols = 8,
    selectedSquare,
    lastMove,
    validDestinations = [],
    hoverSquare,
    flipped = false,
    className = "",
    colors = {},
    premoves
}: BoardHighlightsProps) {
    const theme = { ...DEFAULT_COLORS, ...colors };

    const squareWidth = 100 / cols;
    const squareHeight = 100 / rows;

    const renderSquare = (x: number, y: number, children: React.ReactNode, key: string) => {
        const renderX = flipped ? 7 - x : x;
        const renderY = flipped ? 7 - y : y;
        
        return (
            <div
                key={key}
                className="absolute pointer-events-none flex items-center justify-center"
                style={{
                    top: `${renderY * squareHeight}%`,
                    left: `${renderX * squareWidth}%`,
                    width: `${squareWidth}%`,
                    height: `${squareHeight}%`,
                }}
            >
                {children}
            </div>
        );
    };

    const isOverlappingLastMoveFrom = selectedSquare && lastMove &&
        selectedSquare.x === lastMove.from.x && selectedSquare.y === lastMove.from.y;
    const isOverlappingLastMoveTo = selectedSquare && lastMove &&
        selectedSquare.x === lastMove.to.x && selectedSquare.y === lastMove.to.y;
    const shouldHighlightSelected = selectedSquare && !isOverlappingLastMoveFrom && !isOverlappingLastMoveTo;


    return (
        <div className={`absolute inset-0 pointer-events-none z-5 ${className}`}>
            {/* Last Move */}
            {lastMove && (
                <>
                    {renderSquare(
                        lastMove.from.x,
                        lastMove.from.y,
                        <div className="absolute inset-0" style={{ backgroundColor: theme.lastMove }} />,
                        "lm-from"
                    )}
                    {renderSquare(
                        lastMove.to.x,
                        lastMove.to.y,
                        <div className="absolute inset-0" style={{ backgroundColor: theme.lastMove }} />,
                        "lm-to"
                    )}
                </>
            )}

            {/* Premoves */}
            {premoves && premoves.map((pm, i) => (
                <React.Fragment key={`premove-${i}`}>
                    {renderSquare(
                        pm.from.x,
                        pm.from.y,
                        <div className="absolute inset-0" style={{ backgroundColor: theme.premove }} />,
                        `pm-from-${i}`
                    )}
                    {renderSquare(
                        pm.to.x,
                        pm.to.y,
                        <div className="absolute inset-0" style={{ backgroundColor: theme.premove }} />,
                        `pm-to-${i}`
                    )}
                </React.Fragment>
            ))}

            {/* Selected Square - Aplied Morgan's Logic */}
            {shouldHighlightSelected &&
                renderSquare(
                    selectedSquare.x,
                    selectedSquare.y,
                    <div className="absolute inset-0" style={{ backgroundColor: theme.selected }} />,
                    "selected"
                )
            }

            {/* Hover Square */}
            {hoverSquare &&
                renderSquare(
                    hoverSquare.x,
                    hoverSquare.y,
                    <div
                        className="absolute inset-0 border-5"
                        style={{ borderColor: theme.hoverBorder, boxShadow: theme.hoverShadow }}
                    />,
                    "hover"
                )}

            {/* Valid Destinations */}
            {validDestinations.map((dest, i) =>
                renderSquare(
                    dest.x,
                    dest.y,
                    dest.containsPiece ? (
                        <div
                            className="absolute inset-0 rounded-full border-[5px]"
                            style={{ borderColor: theme.destinationCapture }}
                        />
                    ) : (
                        <div
                            className="absolute rounded-full"
                            style={{ width: "32%", height: "32%", backgroundColor: theme.destinationEmpty }}
                        />
                    ),
                    `dest-${i}`
                )
            )}
        </div>
    );
}
