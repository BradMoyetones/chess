export { Board } from './components/Board';
export { BoardEffects } from './components/BoardEffects';

// Re-export existing shared components from their current location
// These will be physically moved in a future step
export { BoardHighlights } from '@/components/board/board-highlights';
export { BoardAnnotations } from '@/components/board/board-annotations';

// Hooks
export { useBoardSize } from './hooks/useBoardSize';
export { useChessAudio } from './hooks/useChessAudio';
export { useChessPieces } from './hooks/useChessPieces';
export { useMaterialAdvantage } from './hooks/useMaterialAdvantage';

// Core
export type {
    BoardController,
    BoardEffect,
    MoveResult,
    MoveData,
    Annotation,
    Premove,
    PieceData,
    SquareData,
    MoveNodeData,
} from '../core/ports/BoardController.port';

export { computeMaterialAdvantage } from '../core/usecases/ComputeMaterial.usecase';
