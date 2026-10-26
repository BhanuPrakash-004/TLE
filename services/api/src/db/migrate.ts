/**
 * Migration Runner
 * ================
 * Applies SQL migration files from database/migrations/ to the active backend.
 *
 * Behaviour per backend:
 *   docker  → runs all pending .sql files in sorted order (idempotent via _migrations table).
 *   supabase → skips automatic migration; logs step-by-step instructions for the dashboard.
 *
 * Supabase schema setup (one-time):
 *   1. Supabase Dashboard → SQL Editor → run database/migrations/001_initial_schema.sql
 *   2. Database → Extensions → enable "vector"
 */

import fs from 'fs';
import path from 'path';
import { pool, getDbBackend } from './pool';

export async function runMigrations(): Promise<void> {
  const backend = getDbBackend();

  // ------------------------------------------------------------------
  // Supabase: skip — schema is managed via Supabase dashboard / CLI
  // ------------------------------------------------------------------
  if (backend === 'supabase') {
    console.log('[Migrations] Backend=supabase — skipping automatic SQL migration runner.');
    console.log('[Migrations] To apply the schema on Supabase (one-time):');
    console.log('  1. Open Supabase Dashboard → SQL Editor');
    console.log('  2. Paste and run: database/migrations/001_initial_schema.sql');
    console.log('  3. Enable the "vector" extension: Database → Extensions → vector');
    return;
  }

  // ------------------------------------------------------------------
  // Docker / local Postgres: run SQL migration files
  // ------------------------------------------------------------------
  const migrationsDir = path.resolve(__dirname, '../../../../database/migrations');
  console.log(`[Migrations] Scanning ${migrationsDir}...`);

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    // Migration tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const file of files) {
      const check = await client.query('SELECT 1 FROM _migrations WHERE filename = $1', [file]);
      if (check.rows.length === 0) {
        console.log(`[Migrations] Applying ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[Migrations] Successfully applied ${file}`);
      } else {
        console.log(`[Migrations] Skipping already applied: ${file}`);
      }
    }
    console.log('[Migrations] All migrations up to date.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migrations] Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
