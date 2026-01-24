import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool for Neon database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 120000, // Keep idle clients for 2 minutes (was 30s)
  connectionTimeoutMillis: 30000, // Wait 30s for connection (was 10s)
  keepAlive: true, // Enable TCP keepalive
  keepAliveInitialDelayMillis: 10000, // Start keepalive after 10s
});

// Event listeners for pool errors
pool.on('error', (err, client) => {
  console.error('⚠️ Pool error (non-fatal):', err.message);
  // Don't exit - let pool recover
});

pool.on('connect', () => {
  console.log('✅ Connected to Neon PostgreSQL database');
});

// Query helper with logging and retry logic
export async function query(text, params, retries = 3) {
  const start = Date.now();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`📊 Query executed in ${duration}ms:`, { text: text.substring(0, 100), rows: res.rowCount });
      return res;
    } catch (error) {
      const isConnectionError = error.message?.includes('Connection') || 
                                error.message?.includes('timeout') ||
                                error.code === 'ECONNRESET';
      
      if (isConnectionError && attempt < retries) {
        console.warn(`⚠️ Connection error, retrying (${attempt}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        continue;
      }
      
      console.error('❌ Database query error:', error.message);
      throw error;
    }
  }
}

// Transaction helper
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Graceful shutdown
export async function closePool() {
  await pool.end();
  console.log('🔌 Database connection pool closed');
}

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

export { pool };
