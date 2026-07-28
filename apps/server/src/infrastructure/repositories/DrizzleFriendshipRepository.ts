import { eq, or, and, desc } from 'drizzle-orm';
import { friendship, user, userProfile } from '@chess-fw/db';
import type { Friendship, NewFriendship, FriendshipStatus } from '@chess-fw/db';
import { db } from '../db/connection';
import crypto from 'crypto';

export class DrizzleFriendshipRepository {
    async sendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
        // Check if friendship already exists
        const existing = await db.select().from(friendship)
            .where(
                or(
                    and(eq(friendship.requesterId, requesterId), eq(friendship.addresseeId, addresseeId)),
                    and(eq(friendship.requesterId, addresseeId), eq(friendship.addresseeId, requesterId))
                )
            )
            .limit(1);

        if (existing[0]) {
            throw new Error('Friendship request already exists');
        }

        const [inserted] = await db.insert(friendship).values({
            id: crypto.randomUUID(),
            requesterId,
            addresseeId,
            status: 'pending',
        }).returning();

        return inserted;
    }

    async acceptRequest(friendshipId: string, userId: string): Promise<Friendship> {
        // Only the addressee can accept
        const [existing] = await db.select().from(friendship)
            .where(and(eq(friendship.id, friendshipId), eq(friendship.addresseeId, userId)))
            .limit(1);

        if (!existing) throw new Error('Friendship request not found');
        if (existing.status !== 'pending') throw new Error('Request is not pending');

        const [updated] = await db.update(friendship)
            .set({ status: 'accepted' })
            .where(eq(friendship.id, friendshipId))
            .returning();

        return updated;
    }

    async declineRequest(friendshipId: string, userId: string): Promise<void> {
        // Either party can decline/cancel
        const [existing] = await db.select().from(friendship)
            .where(
                and(
                    eq(friendship.id, friendshipId),
                    or(eq(friendship.requesterId, userId), eq(friendship.addresseeId, userId))
                )
            )
            .limit(1);

        if (!existing) throw new Error('Friendship request not found');

        await db.delete(friendship).where(eq(friendship.id, friendshipId));
    }

    async getFriends(userId: string): Promise<Friendship[]> {
        return db.select().from(friendship)
            .where(
                and(
                    or(eq(friendship.requesterId, userId), eq(friendship.addresseeId, userId)),
                    eq(friendship.status, 'accepted')
                )
            )
            .orderBy(desc(friendship.createdAt));
    }

    async getPendingRequests(userId: string): Promise<Friendship[]> {
        return db.select().from(friendship)
            .where(
                and(
                    eq(friendship.addresseeId, userId),
                    eq(friendship.status, 'pending')
                )
            )
            .orderBy(desc(friendship.createdAt));
    }

    async removeFriend(friendshipId: string, userId: string): Promise<void> {
        const [existing] = await db.select().from(friendship)
            .where(
                and(
                    eq(friendship.id, friendshipId),
                    or(eq(friendship.requesterId, userId), eq(friendship.addresseeId, userId))
                )
            )
            .limit(1);

        if (!existing) throw new Error('Friendship not found');

        await db.delete(friendship).where(eq(friendship.id, friendshipId));
    }
}
