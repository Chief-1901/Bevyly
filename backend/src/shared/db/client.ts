import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';
import * as schema from './schema/index.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

/**
 * Build SSL configuration from config
 * 
 * For Supabase and other cloud PostgreSQL providers that use self-signed
 * or intermediate CAs, we need to explicitly disable certificate verification.
 */
function getSslConfig(): boolean | pg.ConnectionConfig['ssl'] {
  if (!config.databaseSsl) {
    return false; // SSL disabled
  }
  
  // When rejectUnauthorized is false, we completely skip certificate verification
  // This is needed for Supabase in development where the cert chain may not be trusted
  if (!config.databaseSslRejectUnauthorized) {
    // CRITICAL FIX: Set NODE_TLS_REJECT_UNAUTHORIZED globally as a last resort
    // This is needed because pg-pool might create connections before our SSL config is applied
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    // Use comprehensive SSL bypass configuration
    // This tells pg to use SSL but not verify the certificate
    return {
      rejectUnauthorized: false,
      // Bypass all certificate checks - must return undefined (not void)
      checkServerIdentity: () => undefined as any,
      // Additional TLS options to force SSL mode without verification
      requestCert: true,
      rejectUnknown: false,
    };
  }
  
  // Default: require valid certificates
  return {
    rejectUnauthorized: true,
  };
}

/**
 * Get database pool (singleton)
 */
function getPool(): pg.Pool {
  if (!pool) {
    const sslConfig = getSslConfig();
    
    pool = new Pool({
      connectionString: config.databaseUrl,
      min: config.databasePoolMin,
      max: config.databasePoolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: sslConfig,
    });

    logger.debug({
      ssl: sslConfig !== false,
      rejectUnauthorized: typeof sslConfig === 'object' ? sslConfig.rejectUnauthorized : undefined,
    }, 'Database pool configured');

    pool.on('connect', () => {
      logger.debug('New database connection established');
    });

    pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected database pool error');
    });
  }

  return pool;
}

/**
 * Get Drizzle ORM instance
 */
export function getDb() {
  return drizzle(getPool(), { schema });
}

export type Database = ReturnType<typeof getDb>;

/**
 * Close database pool
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}

/**
 * Execute raw SQL (for migrations, health checks)
 */
export async function executeRaw(sql: string, params: unknown[] = []): Promise<pg.QueryResult> {
  const p = getPool();
  return p.query(sql, params);
}

