# RefCheck - Real Bibliography Verification System

Complete refactor with **real file analysis**, **Neon PostgreSQL**, and **Vercel deployment ready**.

## 🎯 What's New

✅ **Real File Parsing**: Extracts bibliography from BibTeX, PDF, .tex files  
✅ **Database Integration**: Neon PostgreSQL with full schema (users, jobs, references, caching)  
✅ **AI Analysis**: OpenAI GPT-4 real-time verification insights  
✅ **OpenAlex Registry**: Validates references against authoritative academic database  
✅ **Error Handling**: Returns user-friendly errors for files without bibliography  
✅ **Vercel Compatible**: Serverless API routes, no long-running processes  
✅ **Caching**: Redis-like PostgreSQL caching for OpenAlex responses  

## 📦 Database Schema

**Tables:**
- `users` - User accounts with subscription info
- `analysis_jobs` - File upload sessions and status
- `bibliography_references` - Parsed and verified references
- `openalex_cache` - Cached API responses (30-day expiry)

**Indexes:** Optimized for fast queries on user_id, job_id, status

## 🚀 Setup Instructions

### 1. Environment Variables (`.env`)

```dotenv
# Neon PostgreSQL
DATABASE_URL=postgresql://neondb_owner:npg_PyvuJBj72VcI@ep-solitary-surf-ah9sipdm-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
VITE_DATABASE_URL=postgresql://neondb_owner:npg_PyvuJBj72VcI@ep-solitary-surf-ah9sipdm-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# OpenAI (Get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-api-key-here
VITE_OPENAI_API_KEY=sk-your-api-key-here

# Resend Email (optional)
RESEND_API_KEY=re_BsuJrREp_Hi9Jn69qR6nzE1mznwpZVkqm
VITE_RESEND_API_KEY=re_BsuJrREp_Hi9Jn69qR6nzE1mznwpZVkqm

# OpenAlex (already provided)
OPENALEX_API_KEY=Mg58OkzFTg3vrh3nEZpz7C
VITE_OPENALEX_API_KEY=Mg58OkzFTg3vrh3nEZpz7C
```

### 2. Initialize Database

The database tables are created automatically on first API call via `initializeDatabase()`.

Or manually in Neon console:
```sql
-- Run db-schema.ts SQL content in Neon web console
```

### 3. Install Dependencies

```bash
npm install
# Optional for PDF support: npm install pdf-parse
```

### 4. Run Locally

```bash
npm run dev
# Open http://localhost:3001
```

## 📋 File Upload Flow

1. **User uploads file** (.bib, .pdf, .tex, .docx)
2. **Frontend sends to `/api/analyze`** with file + userId
3. **API parses file** and extracts bibliography
   - ✅ Found references → Create job, start async analysis
   - ❌ No bibliography → Return error to user
4. **Backend async analysis**:
   - Verifies each reference with OpenAlex API (with caching)
   - Gets AI insights from OpenAI
   - Saves results to `bibliography_references` table
5. **Frontend polls `/api/results?jobId=xxx`** for status
6. **Display results** with confidence scores, flags, AI insights

## 🔧 API Endpoints

### POST `/api/analyze`
Upload and start analysis.

**Request:**
```
Content-Type: multipart/form-data

file: File
userId: string
fileName: string
```

**Response:**
```json
{
  "success": true,
  "jobId": "uuid",
  "references": 42,
  "message": "Analysis started for 42 references"
}
```

### GET `/api/results?jobId=xxx`
Retrieve analysis results.

**Response:**
```json
{
  "success": true,
  "jobId": "uuid",
  "references": [
    {
      "id": "uuid",
      "title": "Example Paper",
      "authors": "Smith, J.",
      "year": 2021,
      "status": "verified|issue|retracted|pending",
      "confidence_score": 95,
      "issues": ["TITLE MISMATCH", "YEAR DISCREPANCY"],
      "is_retracted": false,
      "ai_insight": "This is a valid paper but the title needs correction..."
    }
  ]
}
```

## 🧪 Testing Locally

```bash
# Start dev server
npm run dev

# In browser, go to http://localhost:3001
# Upload a .bib file with references
# Wait for analysis to complete
# View results with AI insights
```

**Test BibTeX file:**
```bibtex
@article{smith2021,
  title={Quantum Effects in Computing},
  author={Smith, John and Doe, Jane},
  year={2021},
  journal={Nature},
  doi={10.1038/s41586-021-03819-2}
}

@article{johnson2019,
  title={Machine Learning for Biology},
  author={Johnson, B. et al.},
  year={2019},
  journal={Science}
}
```

## 🚢 Deploying to Vercel

### 1. Push to Git
```bash
git add .
git commit -m "Add real analysis, Neon DB, OpenAI integration"
git push origin main
```

### 2. Connect to Vercel
```bash
vercel login
vercel link
```

### 3. Add Environment Variables in Vercel Dashboard

Go to **Settings → Environment Variables** and add:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENALEX_API_KEY`
- `RESEND_API_KEY`

### 4. Deploy
```bash
vercel deploy --prod
```

### 5. Database Migrations

Neon automatically initializes on first API call.

## 🔒 Security Notes

- **API Keys**: Never commit `.env` to git (use `.env.local` for local dev)
- **Database**: Neon uses SSL by default ✅
- **File Size**: Limited to 50MB per upload (configurable)
- **User ID**: Validate `userId` matches authenticated user in production

## 🐛 Troubleshooting

**"No bibliography found"**
- File must have extractable BibTeX entries with title, author, year fields
- PDF parsing requires `pdf-parse` library

**"OpenAI API error"**
- Check `OPENAI_API_KEY` in `.env`
- Verify API key has credits on https://platform.openai.com/account/billing

**"Database connection failed"**
- Verify `DATABASE_URL` is correct
- Check Neon console for connection pooler endpoint

**Timeout on Vercel**
- Analysis is asynchronous - results populate as processing completes
- Check `/api/results` endpoint status periodically

## 📚 File Format Support

| Format | Status | Notes |
|--------|--------|-------|
| `.bib` | ✅ Full support | BibTeX format |
| `.pdf` | ⚠️ Requires pdf-parse | Extract text then parse BibTeX |
| `.tex` | ✅ Full support | Extract thebibliography environment |
| `.docx` | 🔄 Planned | Requires xml/zip parsing |
| `.zip` | 🔄 Planned | Extract and process nested files |

## 🎓 Academic Integration

- **OpenAlex Registry**: Over 250M academic works indexed
- **DOI Validation**: Automatic DOI lookup and verification
- **Retraction Detection**: Real-time check for retracted papers
- **AI Diagnostics**: Natural language explanations of discrepancies

## 📞 Support

For issues or questions:
1. Check Neon dashboard for database errors
2. Review OpenAI API logs
3. Check browser console for client-side errors
4. Review Vercel deployment logs: `vercel logs`

---

**Made with ❤️ for academic integrity**
