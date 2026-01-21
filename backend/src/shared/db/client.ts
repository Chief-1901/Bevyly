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
 * For Supabase and other cloud PostgreSQL providers, we use proper SSL configuration.
 *
 * SECURITY NOTE: In production, always use rejectUnauthorized: true with proper CA certificates.
 * The rejectUnauthorized: false option should ONLY be used in development environments
 * after understanding the security implications (vulnerability to MITM attacks).
 */
function getSslConfig(): boolean | pg.ConnectionConfig['ssl'] {
  if (!config.databaseSsl) {
    return false; // SSL disabled
  }

  // When rejectUnauthorized is false, we skip certificate verification
  // WARNING: This makes the connection vulnerable to MITM attacks
  // Only use in development with trusted networks
  if (!config.databaseSslRejectUnauthorized) {
    if (config.nodeEnv === 'production') {
      logger.warn(
        'DATABASE_SSL_REJECT_UNAUTHORIZED=false in production is a security risk. ' +
        'Consider configuring proper CA certificates.'
      );
    }

    // Use SSL with relaxed certificate verification for development
    // NOTE: Removed global NODE_TLS_REJECT_UNAUTHORIZED override for security
    return {
      rejectUnauthorized: false,
    };
  }

  // Production: require valid certificates
  // For Supabase, you can download the CA certificate from the dashboard
  // and set it via DATABASE_CA_CERT environment variable
  const caCert = process.env.DATABASE_CA_CERT;
  if (caCert) {
    return {
      rejectUnauthorized: true,
      ca: caCert,
    };
  }

  // Default: require valid certificates from system CA store
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

