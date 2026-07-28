import type { user, session, account, verification } from './schema/auth.schema';
import type { game } from './schema/game.schema';
import type { userProfile, friendship } from './schema/social.schema';

// ── Auth Types ──
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Verification = typeof verification.$inferSelect;

// ── Game Types ──
export type Game = typeof game.$inferSelect;
export type NewGame = typeof game.$inferInsert;

/** Possible game statuses */
export type GameStatus = 'created' | 'started' | 'mate' | 'resign' | 'stalemate' | 'timeout' | 'draw' | 'aborted' | 'abandoned';

/** Possible game termination reasons */
export type GameTermination = 'normal' | 'time_forfeit' | 'abandoned' | 'rules_infraction';

/** Speed classification */
export type Speed = 'ultraBullet' | 'bullet' | 'blitz' | 'rapid' | 'classical';

/** Game source */
export type GameSource = 'lobby' | 'friend' | 'ai' | 'rematch';

/** Winner value */
export type Winner = 'w' | 'b' | null;

// ── Social Types ──
export type UserProfile = typeof userProfile.$inferSelect;
export type NewUserProfile = typeof userProfile.$inferInsert;
export type Friendship = typeof friendship.$inferSelect;
export type NewFriendship = typeof friendship.$inferInsert;

/** Friendship status */
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';
