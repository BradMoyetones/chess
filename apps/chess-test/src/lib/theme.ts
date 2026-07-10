export const coordinateColors = {
    light: "#779556",
    dark: "#EBECD0"
};

export const theme = {
    id: "theme-1",
    name: "Theme 1",
    board: {
        darkSquareColor: "#779556",
        lightSquareColor: "#EBECD0",
        backgroundImage: "/assets/images/200.png"
    },
    pieces: {
        b: { b: "/assets/images/bb.png", w: "/assets/images/wb.png" },
        k: { b: "/assets/images/bk.png", w: "/assets/images/wk.png" },
        n: { b: "/assets/images/bn.png", w: "/assets/images/wn.png" },
        p: { b: "/assets/images/bp.png", w: "/assets/images/wp.png" },
        q: { b: "/assets/images/bq.png", w: "/assets/images/wq.png" },
        r: { b: "/assets/images/br.png", w: "/assets/images/wr.png" }
    },
    sounds: {
        move: "/assets/sounds/move-self.mp3",
        capture: "/assets/sounds/capture.mp3",
        check: "/assets/sounds/move-check.mp3",
    }
};
