import { eq, desc, or } from 'drizzle-orm';
import { game } from '@chess-fw/db';
import type { NewGame, Game } from '@chess-fw/db';
import type { GameRepository } from '../../domain/ports/GameRepository.port';
import { db } from '../db/connection';

export class DrizzleGameRepository implements GameRepository {
    async save(newGame: NewGame): Promise<Game> {
        const [inserted] = await db.insert(game).values(newGame).returning();
        return inserted;
    }

    async findById(id: string): Promise<Game | null> {
        const result = await db.select().from(game).where(eq(game.id, id)).limit(1);
        return result[0] ?? null;
    }

    async findByUserId(userId: string, limit = 20, offset = 0): Promise<Game[]> {
        return db
            .select()
            .from(game)
            .where(or(eq(game.whiteId, userId), eq(game.blackId, userId)))
            .orderBy(desc(game.createdAt))
            .limit(limit)
            .offset(offset);
    }
}
