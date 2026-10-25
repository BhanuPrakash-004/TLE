import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/ragnarok_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const pool = new Pool(dbConfig);

pool.on('error', (err) => {
  console.error('[Database Pool Error]:', err.message);
});

export interface DatabaseHealth {
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  pgvectorAvailable: boolean;
  latencyMs: number;
  error?: string;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT 
          1 as connected,
          EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_pgvector
      `);
      const latency = Date.now() - start;
      const row = res.rows[0];
      return {
        status: 'CONNECTED',
        pgvectorAvailable: Boolean(row?.has_pgvector),
        latencyMs: latency,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      status: 'DISCONNECTED',
      pgvectorAvailable: false,
      latencyMs: Date.now() - start,
      error: err.message || 'Database connection failed',
    };
  }
}
