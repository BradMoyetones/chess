import { ChessEngine } from './src/Core/ChessEngine';
import { EventBus } from './src/Core/EventBus';

const engine = new ChessEngine(new EventBus());
engine.loadFen('6k1/8/8/8/8/8/8/K7 w - - 0 1');
console.log('Turn before:', engine.getTurn());

const legalMoves = engine.getAllLegalMoves();
console.log('Legal moves for white:', legalMoves.map(m => m.san));

const matchingMove = legalMoves.find(m => m.san === 'Ka2');
console.log('Matching move:', matchingMove);

if (matchingMove) {
    const result = engine.attemptMove(matchingMove.from, matchingMove.to, matchingMove.promotion);
    console.log('Attempt move result:', result);
}

console.log('Turn after:', engine.getTurn());
