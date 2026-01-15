import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const { Pool } = pg;

// Get the project root (backend/) from this file's location
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..');
const migrationsFolder = join(projectRoot, 'drizzle');

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  console.log(`📁 Migrations folder: ${migrationsFolder}`);

  // Check if migrations folder exists
  if (!existsSync(migrationsFolder)) {
    console.error('❌ Migrations folder not found. Run "npm run db:generate" first.');
    process.exit(1);
  }

  // Build SSL config from environment
  const sslConfig = config.databaseSsl
    ? {
        rejectUnauthorized: config.databaseSslRejectUnauthorized,
        // Allow any server identity when not rejecting unauthorized certs
        checkServerIdentity: config.databaseSslRejectUnauthorized
          ? undefined
          : () => undefined,
      }
    : false;

  console.log(`🔐 SSL: ${config.databaseSsl ? 'enabled' : 'disabled'}, rejectUnauthorized: ${config.databaseSslRejectUnauthorized}`);

  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: sslConfig,
  });

  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();

