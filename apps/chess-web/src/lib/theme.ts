import type { PieceSymbol, Color } from '@chess-fw/core';

// ═══════════════════════════════════════════
//  Theme Type Definitions
// ═══════════════════════════════════════════

export interface HighlightColors {
    selected: string;
    lastMove: string;
    premove: string;
    hoverBorder: string;
    hoverShadow: string;
    destinationEmpty: string;
    destinationCapture: string;
}

export interface BoardTheme {
    id: string;
    name: string;
    board: {
        /** The background image renders the full 8x8 grid — no square colors needed. */
        backgroundImage: string;
    };
    coordinates: {
        light: string;
        dark: string;
    };
    highlights: HighlightColors;
    pieces: Record<PieceSymbol, Record<Color, string>>;
    sounds: {
        capture: string;
        castle: string;
        moveCheck: string;
        moveSelf: string;
        promote: string;
    };
}

// ═══════════════════════════════════════════
//  Default Highlight Colors
// ═══════════════════════════════════════════

export const DEFAULT_HIGHLIGHTS: HighlightColors = {
    selected: "rgba(255, 255, 51, 0.5)",
    lastMove: "rgba(255, 255, 51, 0.5)",
    premove: "rgba(244, 63, 94, 0.5)",
    hoverBorder: "rgba(255, 255, 255, 0.7)",
    hoverShadow: "inset 0 0 10px rgba(255, 255, 255, 0)",
    destinationEmpty: "rgba(0, 0, 0, 0.14)",
    destinationCapture: "rgba(0, 0, 0, 0.14)"
};

// ═══════════════════════════════════════════
//  Default Theme
// ═══════════════════════════════════════════

export const theme: BoardTheme = {
    id: "theme-1",
    name: "Theme 1",
    board: {
        backgroundImage: "/assets/images/200.png"
    },
    coordinates: {
        light: "#779556",
        dark: "#EBECD0"
    },
    highlights: { ...DEFAULT_HIGHLIGHTS },
    pieces: {
        b: { b: "/assets/images/bb.png", w: "/assets/images/wb.png" },
        k: { b: "/assets/images/bk.png", w: "/assets/images/wk.png" },
        n: { b: "/assets/images/bn.png", w: "/assets/images/wn.png" },
        p: { b: "/assets/images/bp.png", w: "/assets/images/wp.png" },
        q: { b: "/assets/images/bq.png", w: "/assets/images/wq.png" },
        r: { b: "/assets/images/br.png", w: "/assets/images/wr.png" }
    },
    sounds: {
        capture: "/assets/sounds/capture.mp3",
        castle: "/assets/sounds/castle.mp3",
        moveCheck: "/assets/sounds/move-check.mp3",
        moveSelf: "/assets/sounds/move-self.mp3",
        promote: "/assets/sounds/promote.mp3",
    }
};
