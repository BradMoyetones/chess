import type { NewGame, Game } from '@chess-fw/db';

export interface GameRepository {
    save(game: NewGame): Promise<Game>;
    findById(id: string): Promise<Game | null>;
    findByUserId(userId: string, limit?: number, offset?: number): Promise<Game[]>;
}
