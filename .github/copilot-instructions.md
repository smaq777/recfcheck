# RefCheck - AI Agent Instructions

## ⚠️ CRITICAL: Read Before Any Implementation

### Documentation First
**ALWAYS read `docs/00-MASTER-PRD.md` before implementing any feature.**
This is the single source of truth for all requirements.

### File Organization Rules
1. **NEVER create `.md` files in root directory** - All docs go in `docs/` subdirectory
2. **NEVER create loose files without proper categorization**
3. **Follow the folder structure below strictly**

### Folder Structure
```
docs/                          # ALL documentation
├── 00-MASTER-PRD.md          # Master requirements (READ THIS FIRST)
├── 01-product/               # Product specs
├── 02-technical/             # Architecture
├── 03-design/                # Design tokens, components
├── 04-requirements/          # Detailed requirements
├── 05-api/                   # API documentation
├── 06-database/              # Schema docs
├── 07-integrations/          # External APIs
├── 08-implementation/        # Priorities, guides
└── 09-adr/                   # Architecture decisions

pages/                         # React page components
src/lib/                       # Business logic (create if needed)
├── parsers/                  # File parsers
├── resolvers/                # API integrations
├── validators/               # Validation logic
└── exporters/                # Export generators
```

### Before Creating Any File
Ask yourself:
1. Is this documentation? → `docs/[category]/`
2. Is this a React component? → `pages/` or `components/`
3. Is this business logic? → `src/lib/[category]/`
4. Is this a test? → `tests/[unit|integration|e2e]/`

---

## Project Overview
RefCheck is a bibliography verification tool that parses academic documents, extracts references, and validates them against academic APIs (OpenAlex, Crossref, Semantic Scholar). It features user authentication, subscription tiers, and detailed reporting through a React+Vite frontend with Neon PostgreSQL backend.

## Architecture

### Frontend (React + Vite)
- **App.tsx**: Main routing component managing `AppView` enum states (LANDING, NEW_CHECK, RESULTS, HISTORY, etc.)
- **Pages directory**: Page components for each view (LandingPage, DashboardProgress, HistoryLog, etc.)
- **Local state management**: useState hooks; no Redux/Context API currently in use

### Backend Architecture
**Dual deployment strategy:**
1. **Local dev server** (`dev-server.js`): Node.js HTTP server on port 3001 (use `npm run dev:api`)
2. **Vercel serverless** (`_vercel_api/`): Production endpoints for Vercel deployment

**Key backend files:**
- `db-service.ts`: Neon PostgreSQL connection via REST API (Vercel-compatible, avoids long connections)
- `file-parser.ts`: Extracts references from BibTeX, PDF, and LaTeX formats
- `services.ts`: External API integrations (OpenAI, OpenAlex, Resend email)
- `neon-auth.ts`: User authentication layer using Neon database

### Data Flow
1. User uploads document → `_vercel_api/analyze.ts` → File parser
2. Parsed references → Cross-validate against OpenAlex API
3. Results cached in `openalex_cache` table (30-day TTL)
4. Job results stored in `analysis_jobs` and `bibliography_references` tables
5. Frontend polls `/api/results` or uses SSE for progress updates

## Database Schema
**Core tables** (Neon PostgreSQL):
- `users`: User profiles with subscription plans
- `analysis_jobs`: Analysis sessions (file, status, progress tracking)
- `bibliography_references`: Individual references with verification results
- `openalex_cache`: API response caching to reduce lookups

**Indexes**: Email, user_id, job_id, status fields indexed for query performance

## Key Patterns & Conventions

### Environment Variables
```
DATABASE_URL      # Neon connection string (REST API format)
OPENAI_API_KEY    # For AI insights
OPENALEX_API_KEY  # Academic reference validation
RESEND_API_KEY    # Email service
```
Must be defined in `.env.local` for dev, exposed via `vite.config.ts` to frontend.

### Reference Status Enum
Use `ReferenceStatus` type: `'verified' | 'issue' | 'warning' | 'retracted' | 'duplicate' | 'not_found'`
- Update `status` field when verification completes
- Store issues array separately for detailed feedback

### File Parsing
- BibTeX: Parse via regex pattern matching (`/\@(\w+)\{...}/gi`)
- PDF: Extract text, apply pattern detection (year YYYY, common author patterns)
- LaTeX: Support `\bibitem[Author(Year)]{Key}` format

## Development Commands

```bash
npm run dev           # Start Vite frontend (port 3000) + dev server (port 3001)
npm run dev:api       # Start only Node.js API server
npm run dev:vite      # Start only Vite frontend
npm run dev:both      # Parallel with concurrently
npm run init-db       # Initialize database schema
npm run build         # Build production bundle
```

**Proxying:** Vite proxies `/api/*` to `http://localhost:3001/api/*` in dev.

## Critical Integration Points

### OpenAlex Integration
- Cache query results in `openalex_cache` table to minimize API calls
- Query by title: `GET https://api.openalex.org/works?search={title}`
- Extract fields: year, authors, DOI, venue (publication venue)
- Returns `Reference` object with confidence score

### Neon REST API (vs Connection Pooler)
- Use HTTP POST to `/sql` endpoint with Base64 auth header
- Supports parameterized queries (`params` array)
- Preferred for Vercel: avoids persistent connection overhead
- See `queryDatabase()` in `db-service.ts` for pattern

### User Context Flow
- **Dev/Local**: Demo user `DEMO_USER_ID` hardcoded in `dev-server.js` (00000000-0000-0000-0000-000000000001)
- **Auth**: `getCurrentUser()` from `neon-auth.ts` queries `users` table; all new users start on 'free' plan
- **Session**: Stored in localStorage as `refcheck_user` JSON; validated per API request
- **Subscription state**: Checked before allowing new analysis; increment `checksThisMonth` after job completion

## Authentication & Authorization

### User Authentication Flow
1. **Signup/Login** → `neon-auth.ts` functions (`signupWithEmail`, `loginWithEmail`, `loginWithGoogle`)
2. **Password handling** → Currently uses simple Base64 encoding (demo); production must use bcrypt
3. **Email verification** → `sendEmailVerification()` generates code, stores in localStorage (Resend integration ready in `services.ts`)
4. **Session management** → User object stored in localStorage as `refcheck_user`; validated per request

### Subscription Tier Enforcement
- **Plans**: `'free' | 'pro' | 'enterprise'` (stored in `users.subscription_plan`)
- **Free tier limits**: Set in `UserProfile.subscription.maxChecksPerMonth` (typically 5 checks/month)
- **Enforcement point**: Check `user.subscription.checksThisMonth < maxChecksPerMonth` before allowing new analysis in `/api/analyze`
- **Monthly reset**: Schedule a cron job to reset `checksThisMonth` to 0 on the 1st of each month
- **Pro/Enterprise**: Unlock advanced features (higher limits, no watermark, API access)

**Example enforcement in API endpoint:**
```typescript
if (user.subscription.checksThisMonth >= user.subscription.maxChecksPerMonth) {
  return res.status(403).json({ error: 'Monthly limit reached. Upgrade your plan.' });
}
```

## AI Verification & OpenAI Integration

### Reference Verification Pipeline
1. **Parse reference** from file → Extract title, authors, year
2. **Query OpenAlex** → Find canonical metadata with caching (see `verifyWithOpenAlex()` in `services.ts`)
3. **Generate AI insight** → Call OpenAI GPT-4 with discrepancy context (`getAiVerificationInsight()`)
4. **Score confidence** → 0-100 based on title/year match (title weight: 0.7, year weight: 0.3)
5. **Store result** → Save to `bibliography_references` with status (`verified | issue | warning | retracted | not_found`)

### OpenAI Integration Details
- **Model**: gpt-4-turbo (can downgrade to gpt-3.5-turbo to reduce costs)
- **Max tokens**: 150 (concise 2-sentence diagnostics per reference)
- **System prompt**: "Academic bibliography verification expert"
- **Input context**: Original title/year, canonical match, detected flags (title mismatch, year discrepancy, retracted paper)
- **Error handling**: Gracefully falls back to generic message if API fails; returns helpful defaults
- **Cost optimization**: Call AI only for references with `confidence < 80` to reduce token usage

**See `getAiVerificationInsight()` in `services.ts` for implementation.**

## Deployment: Vercel & Neon Management

### Vercel Deployment Setup
1. **Install Vercel CLI**: `npm install -g vercel`
2. **Deploy**: 
   - Push code to GitHub
   - Link repo in Vercel dashboard
   - Set environment variables in Vercel Project Settings:
     - `DATABASE_URL`: Neon connection string (pooler endpoint for serverless)
     - `OPENAI_API_KEY`, `OPENALEX_API_KEY`, `RESEND_API_KEY`
3. **Build command**: `npm run build`
4. **Output directory**: `.vite` (generated by Vite)
5. **API routes**: Automatically discovered in `_vercel_api/` directory

### Neon Database Management
- **Connection**: Use **pooler endpoint** (`-pooler.` in URL) for Vercel (avoids long-held connections)
- **Schema management**: Execute SQL in Neon SQL Editor or via `npm run init-db`
- **Backups**: Neon automatically retains 7-day backup history; enable point-in-time restore if needed
- **Monitoring**: Check "Activity" tab in Neon dashboard for slow queries; review `openalex_cache` table size (index on `expires_at` helps cleanup)
- **Scaling**: Free tier sufficient for <1000 references/month; upgrade if needing higher throughput

### Environment Variables Checklist
**Required for both local dev and Vercel:**
```
DATABASE_URL              # Neon pooler connection string
OPENAI_API_KEY           # OpenAI API key (starts with sk-)
OPENALEX_API_KEY         # OpenAlex API key
RESEND_API_KEY           # Resend email service API key (optional for local dev)
```

**Vite exposes these via `vite.config.ts` - prefix with `VITE_` for frontend access** (e.g., `VITE_OPENAI_API_KEY`)

### Local Development vs. Production Differences
| Aspect | Local | Production |
|--------|-------|-----------|
| **Backend** | `dev-server.js` (Node HTTP) on 3001 | `_vercel_api/` serverless functions |
| **Demo user** | `DEMO_USER_ID` hardcoded | Real user from JWT/session |
| **Database** | Direct connection OK | Must use pooler endpoint |
| **API keys** | `.env.local` file | Vercel Project Settings |
| **Email** | Console log only (Resend disabled) | Resend API integration active |

## Common Gotchas

1. **PDF parsing limitations**: `pdf-parse` requires binary buffer; text extraction may miss formatted references
2. **Duplicate detection**: Manual by comparing normalized titles/authors (not yet fully automated)
3. **OpenAlex rate limiting**: Cache aggressively; implement exponential backoff on 429 errors
4. **Vercel cold starts**: Avoid module-level API calls; lazy-load secrets in handler functions (see `getOpenAiClient()` pattern in `services.ts`)
5. **Type mismatches**: `User` type in `db-schema.ts` differs from `UserProfile` in `types.ts`; reconcile when refactoring auth
6. **Connection pooling**: Always use Neon **pooler endpoint** for Vercel; direct connections will hang
7. **Password hashing**: Current demo uses Base64; must implement bcrypt + salting for production

## New Feature Checklist
- **Database changes**: Update `db-schema.ts`, run `npm run init-db` (or manual Neon console)
- **API endpoint**: Add handler to `_vercel_api/{endpoint}.ts` with proper error handling
- **Frontend component**: Use AppView enum for navigation; pass state via props or context
- **External API**: Add cache table if querying 3rd-party (e.g., CrossRef, Semantic Scholar)
- **Subscription tier**: Add check in endpoint using `user.subscription.plan`; increment `checksThisMonth` on job completion
- **Email flows**: Use `sendEmail()` from `services.ts`; Resend handles templating and delivery
- **Tests**: Currently none; consider adding Jest + React Testing Library when scaling
