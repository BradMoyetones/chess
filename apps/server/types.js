/**
 * Shared type definitions for the chess game server.
 * These are JSDoc typedefs used across the server for editor intellisense and documentation.
 *
 * @module types
 */

// ─── Player ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} PlayerData
 * @property {string} socketId
 * @property {string} playerId - Unique persistent ID (stored in localStorage on client)
 * @property {string} name
 * @property {string} avatar - URL to avatar image
 * @property {number|null} timeRemaining - Remaining time in ms, null if no time control
 * @property {boolean} connected - Whether the player is currently connected
 * @property {boolean} [isBot] - Whether this is a bot player
 * @property {number} [rating] - Player's rating (default 1500)
 */

// ─── Time Control ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TimeControl
 * @property {number} initial - Initial time in seconds
 * @property {number} increment - Increment per move in seconds
 */

// ─── Game Result ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} GameResult
 * @property {'w'|'b'|'draw'} winner
 * @property {'checkmate'|'stalemate'|'timeout'|'resignation'|'draw_agreement'|'insufficient_material'|'fifty_move'|'threefold_repetition'|'abandonment'} reason
 * @property {number} timestamp - When the game ended
 */

// ─── Game Record ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} GameRecord
 * @property {string} id - Room ID
 * @property {PlayerData} host
 * @property {PlayerData|null} guest
 * @property {'w'|'b'} hostColor
 * @property {TimeControl|null} timeControl
 * @property {string} fen - Current FEN
 * @property {string} pgn - PGN notation
 * @property {'w'|'b'} turn - Whose turn it is
 * @property {number|null} lastMoveTime - Timestamp of last move
 * @property {number} createdAt
 * @property {number} lastActivity
 * @property {GameResult|null} result - Game result (null if ongoing)
 * @property {'waiting'|'playing'|'finished'} status
 * @property {number} moveCount
 * @property {string|null} rematchRequested - playerId of the player who requested rematch
 */

export {};
