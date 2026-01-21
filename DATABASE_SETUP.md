# RefCheck Database Setup Guide

## 🎯 Overview
This guide will help you set up the PostgreSQL database on Neon for the RefCheck application.

## 📋 Prerequisites
- Neon account (free tier available at https://neon.tech)
- Node.js installed
- Access to your project's `.env` file

## 🚀 Step-by-Step Setup

### Step 1: Create a Neon Database

1. **Sign up/Login to Neon**
   - Go to https://neon.tech
   - Create a free account or login

2. **Create a New Project**
   - Click "Create Project"
   - Name it: `refcheck-db` (or your preferred name)
   - Select a region close to your users
   - Choose PostgreSQL version 15 or 16

3. **Get Connection String**
   - After creation, Neon will show your connection string
   - It looks like: `postgresql://[user]:[password]@[host]/[database]?sslmode=require`
   - **Save this connection string** - you'll need it!

### Step 2: Configure Environment Variables

1. **Update your `.env` file**
   ```env
   # Add this line with your Neon connection string
   DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
   ```

   Example:
   ```env
   DATABASE_URL=postgresql://alex:AbC123xyz@ep-cool-darkness-123456.us-east-2.aws.neon.tech/refcheck?sslmode=require
   ```

### Step 3: Run the Database Schema

**Option A: Using Neon SQL Editor (Recommended)**

1. Go to your Neon dashboard
2. Click on your project
3. Navigate to "SQL Editor" tab
4. Copy the entire contents of `database-schema.sql`
5. Paste into the SQL Editor
6. Click "Run" button
7. You should see: "Success! 9 tables created"

**Option B: Using psql Command Line**

```bash
# Install PostgreSQL client if needed
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql

# Run the schema
psql "postgresql://[your-connection-string]" -f database-schema.sql
```

### Step 4: Install Required Dependencies

```bash
npm install pg @types/pg
```

### Step 5: Verify Database Connection

Create a test file to verify connection:

```bash
node -e "import('./db-connection.ts').then(db => db.query('SELECT NOW()')).then(() => console.log('✅ Database connected!')).catch(err => console.error('❌ Error:', err))"
```

Or use this simple test script:

```javascript
// test-db.js
import { query } from './db-connection.js';

async function testConnection() {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ Database connected successfully!');
    console.log('📅 Server time:', result.rows[0].now);
    
    // Test tables
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📊 Tables created:', tables.rows.length);
    tables.rows.forEach(t => console.log('  -', t.table_name));
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
  process.exit(0);
}

testConnection();
```

Run it:
```bash
node test-db.js
```

## 📊 Database Schema Overview

### Tables Created:

1. **users** - User accounts and authentication
   - Stores email, password hash, subscription info
   - Includes email verification and password reset tokens

2. **jobs** - Bibliography check sessions
   - Each file upload creates a job
   - Tracks progress and status

3. **references** - Individual references
   - Original, canonical, and corrected data
   - Verification results and external links
   - Duplicate tracking

4. **verification_sources** - Which APIs verified each reference
   - OpenAlex, Crossref, Semantic Scholar

5. **reference_issues** - Warnings and errors
   - Tracks problems found with each reference

6. **export_history** - Download tracking
   - Logs all bibliography exports

7. **activity_log** - Audit trail
   - All user actions for security and analytics

### Key Features:
- ✅ UUID primary keys
- ✅ Foreign key constraints with CASCADE
- ✅ Indexes for performance
- ✅ Auto-updating timestamps
- ✅ Materialized view for job summaries
- ✅ Transaction support

## 🔧 Usage Examples

### Create a User
```typescript
import { createUser } from './db-queries';

const user = await createUser(
  'user@example.com',
  'hashed_password_here',
  'John Doe'
);
```

### Create a Job
```typescript
import { createJob } from './db-queries';

const job = await createJob(
  userId,
  'my-bibliography.bib',
  'bib',
  25 // total references
);
```

### Save Reference
```typescript
import { createReference } from './db-queries';

const reference = await createReference(jobId, {
  bibtex_key: 'Smith2024',
  original_title: 'Original Title',
  original_authors: 'John Smith',
  original_year: 2024,
  canonical_title: 'Corrected Title',
  canonical_authors: 'John Smith, Jane Doe',
  canonical_year: 2024,
  status: 'verified',
  confidence_score: 95,
  venue: 'Nature',
  doi: '10.1038/s41586-024-07146-0',
  google_scholar_url: 'https://scholar.google.com/...',
  // ... other fields
});
```

### Get Job with All References
```typescript
import { getJobById, getJobReferences } from './db-queries';

const job = await getJobById(jobId);
const references = await getJobReferences(jobId);

console.log(`Job: ${job.file_name}`);
console.log(`References: ${references.length}`);
```

## 🔐 Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use environment variables** - Never hardcode credentials
3. **Enable SSL** - Always use `sslmode=require` in connection string
4. **Rotate passwords** - Change database password periodically
5. **Use connection pooling** - Already configured in `db-connection.ts`

## 📈 Monitoring

### View Database Stats in Neon Dashboard:
- Storage usage
- Query performance
- Connection count
- Active queries

### Useful Queries:

**Check job completion rates:**
```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM jobs
GROUP BY status;
```

**Most active users:**
```sql
SELECT 
  u.email,
  COUNT(j.id) as total_jobs,
  MAX(j.upload_time) as last_upload
FROM users u
JOIN jobs j ON u.id = j.user_id
GROUP BY u.id, u.email
ORDER BY total_jobs DESC
LIMIT 10;
```

**References needing review:**
```sql
SELECT 
  r.original_title,
  r.status,
  r.confidence_score,
  COUNT(ri.id) as issue_count
FROM references r
LEFT JOIN reference_issues ri ON r.id = ri.reference_id
WHERE r.user_decision IS NULL
  AND r.status IN ('warning', 'error')
GROUP BY r.id, r.original_title, r.status, r.confidence_score
ORDER BY issue_count DESC, r.confidence_score ASC
LIMIT 20;
```

## 🐛 Troubleshooting

### Error: "Connection timeout"
- Check your internet connection
- Verify DATABASE_URL is correct
- Check Neon dashboard for service status

### Error: "SSL connection required"
- Ensure connection string includes `?sslmode=require`
- Check SSL settings in `db-connection.ts`

### Error: "Too many connections"
- Reduce pool size in `db-connection.ts`
- Check for connection leaks in your code
- Upgrade Neon plan if needed

### Error: "Table does not exist"
- Run `database-schema.sql` again
- Check which tables exist: `\dt` in psql

## 📚 Next Steps

1. ✅ Database schema created
2. ✅ Connection configured
3. 🔄 Migrate from in-memory to database (next)
4. 🔄 Update API endpoints to use queries
5. 🔄 Add authentication
6. 🔄 Deploy to production

## 📞 Support

- Neon Documentation: https://neon.tech/docs
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- RefCheck Issues: [Your GitHub/Support]

---

**Created:** January 2026
**Version:** 1.0
**Database:** PostgreSQL 15+ on Neon
