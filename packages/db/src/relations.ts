import { relations } from 'drizzle-orm';
import { user, session, account } from './schema/auth.schema';
import { game } from './schema/game.schema';
import { userProfile, friendship } from './schema/social.schema';

// ── Auth Relations ──

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.userId],
  }),
  gamesAsWhite: many(game, { relationName: 'whitePlayer' }),
  gamesAsBlack: many(game, { relationName: 'blackPlayer' }),
  sentFriendRequests: many(friendship, { relationName: 'requester' }),
  receivedFriendRequests: many(friendship, { relationName: 'addressee' }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// ── Game Relations ──

export const gameRelations = relations(game, ({ one }) => ({
  whitePlayer: one(user, {
    fields: [game.whiteId],
    references: [user.id],
    relationName: 'whitePlayer',
  }),
  blackPlayer: one(user, {
    fields: [game.blackId],
    references: [user.id],
    relationName: 'blackPlayer',
  }),
}));

// ── Social Relations ──

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));

export const friendshipRelations = relations(friendship, ({ one }) => ({
  requester: one(user, {
    fields: [friendship.requesterId],
    references: [user.id],
    relationName: 'requester',
  }),
  addressee: one(user, {
    fields: [friendship.addresseeId],
    references: [user.id],
    relationName: 'addressee',
  }),
}));
