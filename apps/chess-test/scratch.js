import { Container, ChessEngine, HeadlessBoard, EventBus, InteractionManager } from '@chess-fw/core';
console.log('Container methods:', Object.getOwnPropertyNames(Container));
console.log('Container prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(Container)));
try {
  const engine1 = Container.resolve(ChessEngine);
  const engine2 = Container.resolve(ChessEngine);
  console.log('engine1 === engine2:', engine1 === engine2);
  
  const eb = Container.resolve(EventBus);
  console.log('EventBus instance:', !!eb);

  const newEngine = new ChessEngine(eb, Container.resolve(GameTree)); // Just guessing dependencies
} catch (e) {
  console.log('Error creating directly:', e.message);
}
