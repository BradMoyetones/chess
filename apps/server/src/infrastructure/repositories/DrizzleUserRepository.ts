import { eq, sql } from 'drizzle-orm';
import { userProfile } from '@chess-fw/db';
import type { UserProfile, NewUserProfile, Speed } from '@chess-fw/db';
import type { UserRepository } from '../../domain/ports/UserRepository.port';
import { db } from '../db/connection';

const RATING_COLUMN_MAP: Record<string, 'ratingBullet' | 'ratingBlitz' | 'ratingRapid' | 'ratingClassical'> = {
    ultraBullet: 'ratingBullet',
    bullet: 'ratingBullet',
    blitz: 'ratingBlitz',
    rapid: 'ratingRapid',
    classical: 'ratingClassical',
};

export class DrizzleUserRepository implements UserRepository {
    async getProfile(userId: string): Promise<UserProfile | null> {
        const result = await db.select().from(userProfile).where(eq(userProfile.userId, userId)).limit(1);
        return result[0] ?? null;
    }

    async createProfile(profile: NewUserProfile): Promise<UserProfile> {
        const [inserted] = await db.insert(userProfile).values(profile).returning();
        return inserted;
    }

    async updateRating(userId: string, speed: Speed, newRating: number, result: 'win' | 'loss' | 'draw'): Promise<void> {
        const ratingCol = RATING_COLUMN_MAP[speed];
        if (!ratingCol) return;

        const updateData: Record<string, any> = {
            [ratingCol]: newRating,
            gamesPlayed: sql`${userProfile.gamesPlayed} + 1`,
        };

        if (result === 'win') updateData.wins = sql`${userProfile.wins} + 1`;
        else if (result === 'loss') updateData.losses = sql`${userProfile.losses} + 1`;
        else updateData.draws = sql`${userProfile.draws} + 1`;

        await db.update(userProfile).set(updateData).where(eq(userProfile.userId, userId));
    }
}
