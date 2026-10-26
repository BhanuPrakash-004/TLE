/**
 * Database Pool Factory
 * =====================
 * Reads DB_BACKEND from .env to select the connection target:
 *   DB_BACKEND=docker   → local Docker Postgres+pgvector (default)
 *   DB_BACKEND=supabase → Supabase cloud Postgres
 *
 * Connection string priority:
 *   docker  : DATABASE_URL > individual DB_HOST/PORT/USER/PASS/NAME > hard-coded fallback
 *   supabase: SUPABASE_DB_URL (required — must replace [YOUR-PASSWORD] in .env)
 */

import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ---------------------------------------------------------------------------
// Backend resolution
// ---------------------------------------------------------------------------

export type DbBackend = 'docker' | 'supabase';

export function getDbBackend(): DbBackend {
  const raw = (process.env.DB_BACKEND || 'docker').toLowerCase().trim();
  return raw === 'supabase' ? 'supabase' : 'docker';
}

function buildConnectionString(): string {
  const backend = getDbBackend();

  if (backend === 'supabase') {
    const url = process.env.SUPABASE_DB_URL || '';
    if (!url || url.includes('[YOUR-PASSWORD]')) {
      throw new Error(
        '[DB] DB_BACKEND=supabase requires SUPABASE_DB_URL to be set in .env. ' +
          'Replace [YOUR-PASSWORD] with your actual Supabase database password ' +
          '(found in Supabase Dashboard → Settings → Database → Connection string → URI).'
      );
    }
    console.log('[DB] Backend: Supabase (cloud Postgres)');
    return url;
  }

  // Docker / local Postgres
  const url =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgrespassword'}` +
      `@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}` +
      `/${process.env.DB_NAME || 'ragnarok_db'}`;

  console.log('[DB] Backend: Docker Postgres+pgvector');
  return url;
}

// ---------------------------------------------------------------------------
// Pool configuration
// ---------------------------------------------------------------------------

function buildPoolConfig(): PoolConfig {
  const backend = getDbBackend();
  const connectionString = buildConnectionString();

  const config: PoolConfig = {
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  if (backend === 'supabase') {
    // Supabase requires SSL; transaction pooler has a lower connection limit
    config.ssl = { rejectUnauthorized: false };
    config.max = 10;
  }

  return config;
}

export const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
  console.error('[Database Pool Error]:', err.message);
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export interface DatabaseHealth {
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  backend: DbBackend;
  pgvectorAvailable: boolean;
  latencyMs: number;
  supabaseUrl?: string;
  error?: string;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const backend = getDbBackend();
  const start = Date.now();

  try {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT
          1 AS connected,
          EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS has_pgvector
      `);
      const row = res.rows[0];
      return {
        status: 'CONNECTED',
        backend,
        pgvectorAvailable: Boolean(row?.has_pgvector),
        latencyMs: Date.now() - start,
        ...(backend === 'supabase' && { supabaseUrl: process.env.SUPABASE_URL }),
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      status: 'DISCONNECTED',
      backend,
      pgvectorAvailable: false,
      latencyMs: Date.now() - start,
      error: err.message || 'Database connection failed',
    };
  }
}

// ---------------------------------------------------------------------------
// Utility: resolve the effective DATABASE_URL for child processes (e.g. Python)
// ---------------------------------------------------------------------------

export function getEffectiveDatabaseUrl(): string {
  return buildConnectionString();
}
