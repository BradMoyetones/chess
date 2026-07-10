import { Container, ChessEngine, HeadlessBoard, InteractionManager, EventBus } from '@chess-fw/core';
import process from 'node:process';

function formatMemoryUsage(mem) {
    return `${Math.round(mem / 1024 / 1024 * 100) / 100} MB`;
}

function printMemory(label) {
    global.gc && global.gc(); // force GC if exposed
    const mem = process.memoryUsage();
    console.log(`[Memory] ${label} - Heap Used: ${formatMemoryUsage(mem.heapUsed)}`);
}

async function runDITest() {
    console.log("=== Dependency Injection Cost Test ===");
    const ITERATIONS = 10000;
    const startDI = performance.now();
    
    for (let i = 0; i < ITERATIONS; i++) {
        Container.clear();
        Container.resolve(ChessEngine);
        Container.resolve(InteractionManager);
    }
    
    const endDI = performance.now();
    console.log(`DI instantiation cost for ${ITERATIONS} cycles: ${Math.round(endDI - startDI)} ms`);
    console.log(`Average cost per cycle: ${((endDI - startDI) / ITERATIONS).toFixed(4)} ms`);
}

async function runMemoryLeakTest() {
    console.log("\n=== Memory Leak Test (HeadlessBoard & EventBus) ===");
    Container.clear();
    const ITERATIONS = 10000;
    
    // We instantiate singleton dependencies
    const engine = Container.resolve(ChessEngine);
    const interactionManager = Container.resolve(InteractionManager);
    const eventBus = Container.resolve(EventBus);
    
    printMemory("Before loop");
    
    // Save initial listeners count if possible, EventBus might expose something or we can check its size.
    // EventBus implementation is opaque, let's see if we can read its private fields or just rely on memory.
    
    let boards = [];
    for (let i = 0; i < ITERATIONS; i++) {
        const board = new HeadlessBoard(engine, { interactionManager });
        // Simulating usage
        board.handleSquareClick('e2');
        // Not calling board.destroy() or eventBus.off() 
        // to check if event listeners keep it in memory
        boards.push(board);
    }
    
    printMemory("After instantiating 10k boards (held in array)");
    
    // Release the array to allow garbage collection
    boards = null;
    
    printMemory("After releasing array (checking for GC leaks via EventBus)");
    
    // Let's also check eventBus listeners if it exposes them
    console.log(`EventBus property names:`, Object.getOwnPropertyNames(eventBus));
    console.log(`EventBus listeners (if accessible):`, eventBus.listeners ? eventBus.listeners.size : 'Private/Not accessible');
}

async function main() {
    await runDITest();
    await runMemoryLeakTest();
}

main().catch(console.error);
