# RefCheck Master PRD - Product Requirements Document
**Version:** 1.0  
**Last Updated:** January 23, 2026  
**Status:** Active Development

---

## Executive Summary

RefCheck is an academic bibliography verification tool that helps researchers ensure the integrity and accuracy of their reference lists. Users upload documents (PDF, BibTeX, LaTeX) containing bibliographies, and the system cross-validates each reference against authoritative academic databases (OpenAlex, Crossref, Semantic Scholar) to detect:

- **Fake/fabricated references** - Citations that don't exist in any registry
- **Metadata mismatches** - Incorrect titles, years, or author names
- **Missing information** - DOIs, venues, page numbers
- **Retracted papers** - Papers that have been withdrawn
- **Duplicates** - Same reference cited multiple times with variations
- **Preprint vs. published** - Papers still in preprint or peer review status

---

## Table of Contents

1. [Project Status & Current Implementation](#1-project-status--current-implementation)
2. [Core User Flows](#2-core-user-flows)
3. [Functional Requirements](#3-functional-requirements)
4. [API Integrations](#4-api-integrations)
5. [Database Schema](#5-database-schema)
6. [UI/UX Requirements](#6-uiux-requirements)
7. [Implementation Phases](#7-implementation-phases)
8. [Task Breakdown](#8-task-breakdown)

---

## 1. Project Status & Current Implementation

### ✅ COMPLETED Features

| Feature | Status | Location |
|---------|--------|----------|
| User Authentication (Email/Google) | ✅ Done | `auth-client.ts`, `neon-auth.ts` |
| Login/Signup/Password Reset Pages | ✅ Done | `pages/LoginPage.tsx`, `SignupPage.tsx` |
| User Session Management | ✅ Done | `App.tsx` |
| Basic BibTeX Parsing | ✅ Done | `file-parser.ts`, `dev-server.js` |
| PDF Text Extraction | ✅ Done | `dev-server.js` (using pdf-parse) |
| OpenAlex Integration | ✅ Done | `verification-apis.js` |
| Crossref Integration | ✅ Done | `verification-apis.js` |
| Semantic Scholar Integration | ✅ Done | `verification-apis.js` |
| Basic Results Display | ✅ Done | `pages/ResultsOverviewEnhanced.tsx` |
| Database Schema | ✅ Done | `db-service.ts`, `db-schema.ts` |
| UI Components (Landing, Dashboard) | ✅ Done | `pages/` directory |
| API Caching (OpenAlex) | ✅ Done | `openalex_cache` table |

### 🔄 IN PROGRESS / Needs Enhancement

| Feature | Status | Priority |
|---------|--------|----------|
| Reference verification accuracy | 🔄 Enhance | **P0 - Critical** |
| Processing progress UI | 🔄 Enhance | **P1 - High** |
| Results detail drawer | 🔄 Enhance | **P1 - High** |
| Quick fix functionality | 🔄 Enhance | **P1 - High** |
| Export corrected BibTeX | 🔄 Enhance | **P1 - High** |
| Duplicate detection | 🔄 Enhance | **P2 - Medium** |

### ❌ NOT STARTED

| Feature | Priority |
|---------|----------|
| File upload validation modal | **P1 - High** |
| Retraction Watch integration | **P2 - Medium** |
| GROBID PDF parsing | **P2 - Medium** |
| Preprint/peer-review status check | **P2 - Medium** |
| Batch auto-fix | **P1 - High** |
| Export to multiple formats (RIS, EndNote) | **P3 - Low** |

---

## 2. Core User Flows

### 2.1 Primary Flow: Bibliography Verification

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER JOURNEY: Verify Bibliography                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. UPLOAD ──► 2. VALIDATE ──► 3. PROCESS ──► 4. REVIEW ──► 5. FIX │
│     │              │               │              │             │   │
│     ▼              ▼               ▼              ▼             ▼   │
│  Drop file    Check format    Parse refs    View issues   Apply     │
│  (.bib/.pdf)  Show preview    Match DBs     Per-ref       corrections│
│               Confirm count   Score each    detail        Export    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Detailed Steps

#### Step 1: File Upload
- User drags/drops or clicks to select file
- Supported formats: `.bib`, `.pdf`, `.tex`, `.ris`
- File size limit: 25MB
- **NEW**: Show validation modal immediately after selection

#### Step 2: File Validation (NEW)
```
┌─────────────────────────────────────────────────────────────────┐
│  📄 Validating: thesis_final.bib                                │
│                                                                 │
│  ✅ File format valid                                          │
│  ✅ File size: 45 KB (under 25 MB limit)                       │
│  ✅ Encoding: UTF-8 detected                                   │
│  ✅ BibTeX syntax: Valid                                       │
│  ✅ References found: 127 entries                              │
│                                                                 │
│  [Cancel]                              [Continue to Analysis →] │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 3: Processing (ENHANCED)
Show detailed real-time progress:

| Stage | Progress | Description |
|-------|----------|-------------|
| Parsing | 0-15% | Extract references from file |
| Normalizing | 15-25% | Clean titles, authors, dates |
| Matching | 25-70% | Query OpenAlex, Crossref, S2 |
| Duplicate Detection | 70-85% | Find similar entries |
| Issue Analysis | 85-95% | Categorize problems |
| Report Generation | 95-100% | Prepare results |

#### Step 4: Results Review (ENHANCED)
```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Audit Results: thesis_references.bib                        │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │   ✅    │  │   ❌    │  │   ⚠️    │  │   🔄    │           │
│  │  162    │  │   38    │  │   14    │  │   12    │           │
│  │Verified │  │ Issues  │  │Warnings │  │Duplicate│           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│                                                                 │
│  [Quick Fixes Available: 54 DOIs, 18 venues, 3 years]          │
│  [Apply All Safe Fixes]  [Export]  [Fix All Issues →]          │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 5: Fix & Export
- Per-reference editing
- Batch auto-fix for safe changes
- Export corrected BibTeX file

---

## 3. Functional Requirements

### REQ-CORE-001: Reference Extraction

**Description:** Extract individual references from uploaded documents.

| Sub-Req | Requirement | Status |
|---------|-------------|--------|
| REQ-CORE-001.1 | Parse standard BibTeX entries (@article, @book, etc.) | ✅ Done |
| REQ-CORE-001.2 | Parse LaTeX \bibitem format | ✅ Done |
| REQ-CORE-001.3 | Extract references from PDF text | ✅ Basic |
| REQ-CORE-001.4 | Handle UTF-8 and special characters | ✅ Done |
| REQ-CORE-001.5 | Extract DOIs from reference text | ✅ Done |
| REQ-CORE-001.6 | Use GROBID for structured PDF parsing | ❌ TODO |

### REQ-CORE-002: Cross-Database Verification

**Description:** Validate each reference against academic databases.

| Sub-Req | Requirement | Status |
|---------|-------------|--------|
| REQ-CORE-002.1 | Query OpenAlex by title/author/year | ✅ Done |
| REQ-CORE-002.2 | Query Crossref by DOI or bibliographic search | ✅ Done |
| REQ-CORE-002.3 | Query Semantic Scholar for citations & metadata | ✅ Done |
| REQ-CORE-002.4 | Parallel API calls for speed | ✅ Done |
| REQ-CORE-002.5 | Cache API responses (30-day TTL) | ✅ Done |
| REQ-CORE-002.6 | Rate limiting per API (respectful polling) | 🔄 Basic |
| REQ-CORE-002.7 | Retry with exponential backoff on 429/5xx | ❌ TODO |

### REQ-CORE-003: Issue Detection

**Description:** Identify problems in each reference.

| Issue Type | Detection Method | Status |
|------------|-----------------|--------|
| **NOT FOUND** | No match in any database | ✅ Done |
| **TITLE MISMATCH** | Levenshtein/Jaccard similarity < 80% | ✅ Done |
| **YEAR DISCREPANCY** | Year differs from canonical | ✅ Done |
| **AUTHOR MISMATCH** | First author name differs | 🔄 Basic |
| **MISSING DOI** | No DOI in BibTeX but found in registry | ✅ Done |
| **MISSING VENUE** | No journal/booktitle but found in registry | ✅ Done |
| **RETRACTED** | `is_retracted = true` in OpenAlex | ✅ Done |
| **DUPLICATE** | Same DOI or >95% title similarity | 🔄 Basic |
| **PREPRINT** | Published in arXiv/bioRxiv without DOI | ❌ TODO |
| **NOT PEER REVIEWED** | Working paper, not in journal | ❌ TODO |

### REQ-CORE-004: Confidence Scoring

**Formula:**
```
confidence = (title_similarity × 0.50) + 
             (year_match × 0.20) + 
             (author_match × 0.20) + 
             (doi_match × 0.10)
```

| Score | Status | Color |
|-------|--------|-------|
| 90-100% | Verified | Green ✅ |
| 70-89% | Warning | Orange ⚠️ |
| 50-69% | Issue | Red ❌ |
| 0-49% | Not Found | Red ❌ |

### REQ-CORE-005: Reference Correction

**Description:** Allow users to fix issues and update their bibliography.

| Sub-Req | Requirement | Status |
|---------|-------------|--------|
| REQ-CORE-005.1 | Show canonical data from registry | ✅ Done |
| REQ-CORE-005.2 | One-click "Use Registry Value" per field | ❌ TODO |
| REQ-CORE-005.3 | Batch "Apply All Safe Fixes" | ❌ TODO |
| REQ-CORE-005.4 | Manual edit mode for fields | ❌ TODO |
| REQ-CORE-005.5 | Save corrections to database | 🔄 Basic |
| REQ-CORE-005.6 | Export corrected BibTeX file | ❌ TODO |
| REQ-CORE-005.7 | Mark as "Reviewed/Ignored" | ✅ Done |

---

## 4. API Integrations

### 4.1 OpenAlex (Primary)

**Endpoint:** `https://api.openalex.org/works`  
**Rate Limit:** 10 req/s (polite pool with mailto)  
**Status:** ✅ Implemented

```javascript
// Current implementation in verification-apis.js
const url = `https://api.openalex.org/works?filter=title.search:${query}&mailto=verify@refcheck.ai`;
```

**Data Retrieved:**
- `title` (display_name)
- `authors` (authorships[].author.display_name)
- `year` (publication_year)
- `doi`
- `venue` (primary_location.source.display_name)
- `is_retracted`
- `cited_by_count`
- `open_access.is_oa`

### 4.2 Crossref (Secondary)

**Endpoint:** `https://api.crossref.org/works`  
**Rate Limit:** 10 req/s (polite pool with mailto)  
**Status:** ✅ Implemented

**Data Retrieved:**
- `title`
- `authors` (author[].given + family)
- `year` (published.date-parts)
- `DOI`
- `venue` (container-title)
- `publisher`
- `is-referenced-by-count` (citations)

### 4.3 Semantic Scholar (Tertiary)

**Endpoint:** `https://api.semanticscholar.org/graph/v1/paper/search`  
**Rate Limit:** 100 req/min with API key, 10/min without  
**Status:** ✅ Implemented

**Data Retrieved:**
- `title`
- `authors`
- `year`
- `citationCount`
- `isOpenAccess`
- `venue`
- `externalIds.DOI`

### 4.4 Retraction Watch (TODO)

**Status:** ❌ Not Implemented  
**Priority:** P2 - Medium  

Retraction Watch maintains a database of retracted papers. Integration would flag any citations to known retracted works.

### 4.5 GROBID (TODO)

**Status:** ❌ Not Implemented  
**Priority:** P2 - Medium  

GROBID extracts structured bibliographic data from PDF files, much more accurately than regex-based extraction.

---

## 5. Database Schema

### Current Tables (Neon PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  photo_url TEXT,
  subscription_plan VARCHAR(50) DEFAULT 'free',
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analysis jobs table
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  total_references INTEGER DEFAULT 0,
  verified_count INTEGER DEFAULT 0,
  issues_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bibliography references table
CREATE TABLE bibliography_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bibtex_key VARCHAR(255),
  title VARCHAR(1024),
  authors VARCHAR(1024),
  year INTEGER,
  source VARCHAR(255),
  doi VARCHAR(255),
  url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  confidence_score INTEGER DEFAULT 0,
  canonical_title VARCHAR(1024),
  canonical_year INTEGER,
  canonical_authors VARCHAR(1024),
  venue VARCHAR(255),
  issues TEXT[],
  is_retracted BOOLEAN DEFAULT false,
  ai_insight TEXT,
  user_decision VARCHAR(50), -- 'accepted' | 'rejected' | 'ignored'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OpenAlex cache table
CREATE TABLE openalex_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_title VARCHAR(1024) NOT NULL UNIQUE,
  response JSONB,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);
```

### Schema Enhancements Needed

```sql
-- Add to bibliography_references
ALTER TABLE bibliography_references ADD COLUMN 
  corrected_title VARCHAR(1024),
  corrected_authors VARCHAR(1024),
  corrected_year INTEGER,
  corrected_doi VARCHAR(255),
  corrected_venue VARCHAR(255),
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_group_id UUID,
  api_sources TEXT[], -- ['openalex', 'crossref', 'semantic_scholar']
  citation_count INTEGER DEFAULT 0,
  is_open_access BOOLEAN DEFAULT false;

-- Add index for duplicates
CREATE INDEX idx_bibliography_references_duplicate_group 
  ON bibliography_references(duplicate_group_id);
```

---

## 6. UI/UX Requirements

### 6.1 Design Tokens

Based on your mockups:

```css
:root {
  /* Primary Colors */
  --primary: #1e3a5f;           /* Navy blue - headers, buttons */
  --primary-light: #2d4a6f;     /* Hover states */
  --accent: #10b981;            /* Green - success, verified */
  
  /* Status Colors */
  --success: #10b981;           /* Green - verified */
  --error: #ef4444;             /* Red - issues, retracted */
  --warning: #f59e0b;           /* Orange - warnings */
  --info: #3b82f6;              /* Blue - add DOI, info */
  --duplicate: #a855f7;         /* Purple - duplicates */
  
  /* Neutrals */
  --background: #f8fafb;        /* Page background */
  --surface: #ffffff;           /* Card background */
  --border: #e5eaf1;            /* Borders */
  --text-primary: #1a1f36;      /* Headings */
  --text-secondary: #6b7280;    /* Body text */
  --text-muted: #9ca3af;        /* Captions */
}
```

### 6.2 Issue Badge Components

| Issue Type | Icon | Color | Label |
|------------|------|-------|-------|
| Verified | ✅ | Green | "VERIFIED" |
| Retracted | 🚫 | Red | "RETRACTED PAPER" |
| Not Found | ❌ | Red | "NOT FOUND" |
| Title Mismatch | ⚠️ | Orange | "TITLE MISMATCH" |
| Year Discrepancy | ⚠️ | Orange | "YEAR DISCREPANCY" |
| Missing DOI | 🔗 | Blue | "ADD DOI" |
| Missing Venue | 📍 | Blue | "ADD VENUE" |
| Duplicate | 🔄 | Purple | "DUPLICATE" |
| Needs Review | ❓ | Gray | "NEEDS REVIEW" |

### 6.3 Page Requirements

#### Dashboard (New Check)
- Drag & drop upload zone
- Configuration panel (strictness, duplicate detection)
- Recent jobs list
- **Match mockup:** Image 5 (Start new reference check)

#### Processing Progress
- Step-by-step progress stepper
- Real-time log feed
- Stats cards (verified, duplicates, errors)
- Cancel button
- **Match mockup:** Image 3 (Analyzing References)

#### Results Overview
- Summary stat cards at top
- Filter tabs (All, Issues, Verified, Warnings, Duplicates)
- Reference table with status icons
- Quick Fixes banner
- Export button
- **Match mockup:** Image 2 (Results with detail drawer)

#### Reference Detail Drawer
- Status overview card
- Issue-by-issue breakdown
- Comparison table (Your BibTeX vs. Canonical)
- Quick fix buttons per issue
- "Apply All Safe Fixes" button
- **Match mockup:** Image 4 (Metadata mismatch drawer)

#### History
- Searchable job list
- Date filter
- Status badges
- Click to view results
- **Match mockup:** Image 1 (Verification History)

---

## 7. Implementation Phases

### Phase 1: Core Verification Engine (P0 - Critical)
**Timeline:** Week 1-2  
**Goal:** Make the reference checking 100% robust

| Task | Priority | Estimate |
|------|----------|----------|
| Enhance title similarity scoring | P0 | 4h |
| Improve author matching algorithm | P0 | 4h |
| Add retry logic for API failures | P0 | 2h |
| Implement proper rate limiting | P0 | 2h |
| Add preprint detection | P1 | 3h |
| Enhance duplicate detection | P1 | 4h |

### Phase 2: Processing & Progress UX (P1 - High)
**Timeline:** Week 2-3  
**Goal:** Show users exactly what's happening

| Task | Priority | Estimate |
|------|----------|----------|
| File validation modal | P1 | 4h |
| Enhanced progress stepper | P1 | 6h |
| Real-time log feed with SSE | P1 | 4h |
| Stats cards during processing | P1 | 2h |

### Phase 3: Results & Correction UX (P1 - High)
**Timeline:** Week 3-4  
**Goal:** Help users fix issues easily

| Task | Priority | Estimate |
|------|----------|----------|
| Enhanced results table with icons | P1 | 6h |
| Reference detail drawer | P1 | 8h |
| Per-issue fix buttons | P1 | 4h |
| Quick Fixes banner | P1 | 3h |
| Batch auto-fix | P1 | 4h |
| Export corrected BibTeX | P1 | 4h |

### Phase 4: Advanced Features (P2 - Medium)
**Timeline:** Week 5-6  
**Goal:** Premium features

| Task | Priority | Estimate |
|------|----------|----------|
| GROBID PDF parsing | P2 | 8h |
| Retraction Watch integration | P2 | 4h |
| Citation count display | P2 | 2h |
| Open access indicator | P2 | 2h |
| Export to RIS/EndNote | P3 | 4h |

---

## 8. Task Breakdown

### 8.1 Immediate Tasks (This Week)

#### TASK-001: Enhance Reference Verification Pipeline
**Priority:** P0 - Critical  
**Status:** 🔴 Not Started  
**Estimate:** 8 hours

**Objective:** Make cross-validation more accurate and robust.

**Subtasks:**
1. [ ] Improve title similarity algorithm (Jaccard + Levenshtein)
2. [ ] Add fuzzy author name matching
3. [ ] Weight confidence scoring by source reliability
4. [ ] Add retry with exponential backoff for API errors
5. [ ] Add proper rate limiting (p-queue or bottleneck)

**Files to modify:**
- `verification-apis.js`
- `services.ts`

---

#### TASK-002: File Upload Validation Modal
**Priority:** P1 - High  
**Status:** 🔴 Not Started  
**Estimate:** 4 hours

**Objective:** Show validation checks immediately after file selection.

**Subtasks:**
1. [ ] Create `FileValidationModal.tsx` component
2. [ ] Check file type, size, encoding
3. [ ] For BibTeX: validate syntax, count entries
4. [ ] For PDF: check if text extractable, detect references section
5. [ ] Show ✅/❌ for each check
6. [ ] Enable "Continue" only if all checks pass

**Files to create:**
- `pages/FileValidationModal.tsx`

**Files to modify:**
- `pages/NewCheck.tsx`

---

#### TASK-003: Enhanced Processing Progress Screen
**Priority:** P1 - High  
**Status:** 🔴 Not Started  
**Estimate:** 6 hours

**Objective:** Show detailed step-by-step progress with real-time updates.

**Subtasks:**
1. [ ] Redesign `ProcessingProgress.tsx` with new UI
2. [ ] Add progress stepper (Parsing → Normalizing → Matching → Scoring → Reporting)
3. [ ] Show sub-progress for each step
4. [ ] Add real-time log feed via SSE
5. [ ] Add stats cards (verified count, duplicates, errors)
6. [ ] Add "Pause/Cancel" functionality

**Files to modify:**
- `pages/ProcessingProgress.tsx`
- `dev-server.js` (add SSE endpoint)

---

#### TASK-004: Enhanced Results Table
**Priority:** P1 - High  
**Status:** 🔴 Not Started  
**Estimate:** 6 hours

**Objective:** Better visual hierarchy and issue indicators.

**Subtasks:**
1. [ ] Large status icons (✅/❌/⚠️/🔄) per row
2. [ ] Confidence bar + percentage
3. [ ] Issue badges with clear labels
4. [ ] Preview metadata in list (no click needed for basics)
5. [ ] Action buttons ("Review & Fix" vs "View Details")
6. [ ] Sortable columns

**Files to modify:**
- `pages/ResultsOverviewEnhanced.tsx`

---

#### TASK-005: Reference Detail Drawer (Slide-In Panel)
**Priority:** P1 - High  
**Status:** 🔴 Not Started  
**Estimate:** 8 hours

**Objective:** Comprehensive issue breakdown with fix actions.

**Subtasks:**
1. [ ] Create `ReferenceDetailDrawer.tsx` (slide-in from right)
2. [ ] Status overview card with all issues
3. [ ] Per-issue comparison (Your BibTeX vs. Registry)
4. [ ] "Why this matters" explanation per issue
5. [ ] Per-issue fix buttons
6. [ ] "Apply All Safe Fixes" button
7. [ ] Canonical metadata card with external link

**Files to modify:**
- `pages/ReferenceDetailDrawer.tsx`
- `pages/ResultsOverviewEnhanced.tsx`

---

#### TASK-006: Quick Fixes & Batch Corrections
**Priority:** P1 - High  
**Status:** 🔴 Not Started  
**Estimate:** 6 hours

**Objective:** Allow one-click fixes and batch corrections.

**Subtasks:**
1. [ ] Add "Quick Fixes Available" banner to results
2. [ ] Count auto-fixable issues by type
3. [ ] Implement "Apply All Safe Fixes" (DOIs, venues only)
4. [ ] Update database with corrections
5. [ ] Refresh UI after batch fix

**Files to modify:**
- `pages/ResultsOverviewEnhanced.tsx`
- `dev-server.js` (add fix endpoint)
- `db-queries.js`

---

#### TASK-007: Export Corrected BibTeX
**Priority:** P1 - High  
**Status:** 🔴 Not Started  
**Estimate:** 4 hours

**Objective:** Allow users to download their corrected bibliography.

**Subtasks:**
1. [ ] Add export button to results page
2. [ ] Generate corrected BibTeX from database
3. [ ] Include corrections (DOI, venue, title, year)
4. [ ] Download as `.bib` file
5. [ ] Option to exclude unverified/ignored references

**Files to create:**
- `lib/bibtex-exporter.ts`

**Files to modify:**
- `pages/ResultsOverviewEnhanced.tsx`
- `dev-server.js` (add export endpoint)

---

### 8.2 Complete Task Checklist

```
PHASE 1: CORE VERIFICATION (Week 1-2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] TASK-001: Enhance verification pipeline
    [ ] Title similarity (Jaccard + Levenshtein)
    [ ] Fuzzy author matching
    [ ] Weighted confidence scoring
    [ ] API retry logic
    [ ] Rate limiting

PHASE 2: PROCESSING UX (Week 2-3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] TASK-002: File validation modal
    [ ] Create modal component
    [ ] File checks (type, size, encoding)
    [ ] BibTeX syntax validation
    [ ] Reference count preview

[ ] TASK-003: Enhanced progress screen
    [ ] Progress stepper UI
    [ ] Sub-step progress
    [ ] Real-time log feed (SSE)
    [ ] Stats cards

PHASE 3: RESULTS & CORRECTIONS (Week 3-4)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] TASK-004: Enhanced results table
    [ ] Large status icons
    [ ] Confidence bars
    [ ] Issue badges
    [ ] Sortable columns

[ ] TASK-005: Detail drawer
    [ ] Slide-in panel
    [ ] Issue breakdown
    [ ] Comparison table
    [ ] Per-issue fix buttons

[ ] TASK-006: Quick fixes
    [ ] Fixes banner
    [ ] Batch apply safe fixes
    [ ] Database updates

[ ] TASK-007: Export BibTeX
    [ ] Generate corrected file
    [ ] Download functionality

PHASE 4: ADVANCED (Week 5-6)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] TASK-008: GROBID integration
[ ] TASK-009: Retraction Watch
[ ] TASK-010: Preprint detection
[ ] TASK-011: RIS/EndNote export
```

---

## Appendix A: File Structure

```
refcheck/
├── docs/                          # 📚 ALL DOCUMENTATION
│   ├── README.md                  # Navigation index
│   ├── 00-MASTER-PRD.md          # This file
│   ├── 01-product/               # Product specs
│   ├── 02-technical/             # Architecture
│   ├── 03-design/                # Design system
│   ├── 04-requirements/          # Detailed requirements
│   ├── 05-api/                   # API docs
│   ├── 06-database/              # Schema docs
│   ├── 07-integrations/          # External APIs
│   └── 08-implementation/        # Build guides
│
├── pages/                         # 📄 REACT PAGES
│   ├── NewCheck.tsx              # Upload & config
│   ├── ProcessingProgress.tsx    # Progress screen
│   ├── ResultsOverviewEnhanced.tsx
│   ├── ReferenceDetailDrawer.tsx # Detail panel
│   └── ...
│
├── src/lib/                       # 🔧 BUSINESS LOGIC (to create)
│   ├── parsers/                  # File parsers
│   ├── resolvers/                # API integrations
│   ├── validators/               # Validation logic
│   └── exporters/                # Export generators
│
├── verification-apis.js           # Current API integrations
├── file-parser.ts                # Current parsers
├── dev-server.js                 # Dev API server
└── services.ts                   # Backend services
```

---

## Appendix B: AI Agent Instructions

When implementing features:

1. **Never create random `.md` files** - All docs go in `docs/` subdirectory
2. **Reference this PRD** before implementing any feature
3. **Update task status** in this document after completing work
4. **Follow file structure** defined in Appendix A
5. **Use design tokens** from Section 6.1
6. **Match mockup designs** provided by user

---

**Document End**  
*Next: Proceed to [Implementation Priorities](08-implementation/priorities.md)*
