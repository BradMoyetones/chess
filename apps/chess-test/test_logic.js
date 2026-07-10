import { Container, ChessEngine, InteractionManager } from './node_modules/@chess-fw/core/dist/index.js';

const engine = Container.resolve(ChessEngine);
const interactionManager = Container.resolve(InteractionManager);
interactionManager.init();

engine.attemptMove('d2', 'd4');
interactionManager.selectSquare('e2');
interactionManager.selectSquare('e2');
interactionManager.selectSquare('e4');

console.log("History:", engine.chess.history({ verbose: true }));
