import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

/**
 * Extended user profile for chess-specific data.
 * 1:1 relationship with Better Auth's `user` table.
 */
export const userProfile = sqliteTable('user_profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  username: text('username').unique(),
  bio: text('bio'),
  country: text('country'),

  // ── Ratings per speed ──
  ratingBullet: integer('rating_bullet').notNull().default(1500),
  ratingBlitz: integer('rating_blitz').notNull().default(1500),
  ratingRapid: integer('rating_rapid').notNull().default(1500),
  ratingClassical: integer('rating_classical').notNull().default(1500),

  // ── Stats ──
  gamesPlayed: integer('games_played').notNull().default(0),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  draws: integer('draws').notNull().default(0),

  // ── Activity ──
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }),
});

/**
 * Friend/follow relationships between users.
 */
export const friendship = sqliteTable(
  'friendship',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    requesterId: text('requester_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    addresseeId: text('addressee_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** pending | accepted | blocked */
    status: text('status').notNull().default('pending'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('friendship_requester_idx').on(table.requesterId),
    index('friendship_addressee_idx').on(table.addresseeId),
  ],
);
