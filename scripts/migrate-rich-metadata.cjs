
const pkg = require('pg');
const { Pool } = pkg;
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function migrate() {
    try {
        console.log('🚀 Starting database migration...');

        // Check if bibliography_references exists, if not check "references"
        // Actually the app uses "references" now (I fixed it in previous turns)
        // But the schema file might still say bibliography_references

        const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

        const tableNames = tables.rows.map(r => r.tablename);
        console.log('Current tables:', tableNames);

        const targetTable = tableNames.includes('references') ? 'references' : 'bibliography_references';
        console.log(`Target table: ${targetTable}`);

        // Add metadata column if it doesn't exist
        await pool.query(`
      ALTER TABLE "${targetTable}" 
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    `);

        console.log(`✅ Added 'metadata' column to "${targetTable}" table.`);

        // Also add bibtex_type column if it doesn't exist
        await pool.query(`
      ALTER TABLE "${targetTable}" 
      ADD COLUMN IF NOT EXISTS bibtex_type VARCHAR(50) DEFAULT 'article';
    `);

        console.log(`✅ Added 'bibtex_type' column to "${targetTable}" table.`);

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
