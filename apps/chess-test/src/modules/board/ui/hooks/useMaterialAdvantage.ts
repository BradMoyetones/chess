import { useCallback } from 'react';
import { computeMaterialAdvantage, type MaterialAdvantage } from '@/modules/board/core/usecases/ComputeMaterial.usecase';
import type { BoardController } from '@/modules/board/core/ports/BoardController.port';

/**
 * Hook that computes material advantage from a BoardController.
 * Replaces the 3 duplicated implementations across hooks.
 */
export function useMaterialAdvantage(controller: BoardController): () => MaterialAdvantage {
    return useCallback(() => {
        const board = controller.getBoardGrid();
        return computeMaterialAdvantage(board);
    }, [controller]);
}
