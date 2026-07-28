import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@chess-fw/db';
import { env } from '../../config/env';

const client = new Database(env.DATABASE_URL);

// Enable WAL mode for better concurrent read/write performance
client.pragma('journal_mode = WAL');

export const db = drizzle(client, { schema });

console.log('[*] Base de datos SQLite conectada:', env.DATABASE_URL);
