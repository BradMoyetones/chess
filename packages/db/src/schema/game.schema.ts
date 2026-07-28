import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

/**
 * Chess game record.
 * Stores all data needed to reconstruct a full FIDE-standard PGN.
 * Inspired by Lichess's game model.
 */
export const game = sqliteTable(
  'game',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // ── Players ──
    whiteId: text('white_id')
      .notNull()
      .references(() => user.id),
    blackId: text('black_id')
      .notNull()
      .references(() => user.id),

    // ── Game Status ──
    /** created | started | mate | resign | stalemate | timeout | draw | aborted | abandoned */
    status: text('status').notNull().default('created'),
    /** 'w' | 'b' | null (draw or ongoing) */
    winner: text('winner'),
    /** normal | time_forfeit | abandoned | rules_infraction */
    termination: text('termination'),

    // ── Time Control ──
    /** Base time in seconds */
    timeInitial: integer('time_initial'),
    /** Increment in seconds */
    timeIncrement: integer('time_increment'),
    /** ultraBullet | bullet | blitz | rapid | classical */
    speed: text('speed'),

    // ── Game Data ──
    initialFen: text('initial_fen')
      .notNull()
      .default('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
    /** UCI moves space-separated: "e2e4 e7e5 g1f3" */
    moves: text('moves').notNull().default(''),
    /** Full PGN with headers, generated at game end */
    pgn: text('pgn').notNull().default(''),
    /** Total half-moves (plies) */
    halfMoves: integer('half_moves').notNull().default(0),

    // ── Opening Classification ──
    /** ECO code: 'B20', 'C42', etc. */
    eco: text('eco'),
    /** Human-readable opening name */
    openingName: text('opening_name'),

    // ── Ratings (snapshot at game time) ──
    whiteRating: integer('white_rating'),
    blackRating: integer('black_rating'),
    /** Rating change after game: +12 or -8 */
    whiteRatingDiff: integer('white_rating_diff'),
    blackRatingDiff: integer('black_rating_diff'),

    // ── Clock Data ──
    /** Remaining centiseconds after each move, space-separated.
     *  e.g., "18000 18000 17942 17856 ..." for PGN {[%clk]} reconstruction */
    clocks: text('clocks'),

    // ── Metadata ──
    rated: integer('rated', { mode: 'boolean' }).notNull().default(true),
    /** standard | chess960 */
    variant: text('variant').notNull().default('standard'),
    /** lobby | friend | ai | rematch */
    source: text('source').notNull().default('lobby'),

    // ── Timestamps ──
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('game_white_id_idx').on(table.whiteId),
    index('game_black_id_idx').on(table.blackId),
    index('game_status_idx').on(table.status),
    index('game_created_at_idx').on(table.createdAt),
  ],
);
