import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  dialect: 'sqlite',
  schema: '../../packages/db/src/schema/*.ts',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'local.db',
  },
});
