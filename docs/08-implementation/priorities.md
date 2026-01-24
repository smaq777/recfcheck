# Implementation Priorities & Task Plan
**Document:** docs/08-implementation/priorities.md  
**Last Updated:** January 23, 2026

---

## Priority Legend

| Priority | Label | Definition |
|----------|-------|------------|
| **P0** | 🔴 Critical | Core functionality - blocks everything else |
| **P1** | 🟠 High | Essential for MVP - must have |
| **P2** | 🟡 Medium | Important but can wait |
| **P3** | 🟢 Low | Nice to have |

---

## Phase 1: Core Verification Engine 🔴 P0
**Timeline:** Days 1-4  
**Goal:** Make reference checking bulletproof

### Why This First?
This is the **heart of the product**. If verification doesn't work reliably, nothing else matters. Users need to trust that when we say "NOT FOUND" or "VERIFIED", it's accurate.

### Tasks

#### TASK-001: Enhanced Title Matching
**Est:** 4 hours | **Priority:** P0

**Current Problem:** Simple string comparison misses valid matches.

**Solution:**
```javascript
// Implement in: verification-apis.js

function calculateTitleSimilarity(refTitle, canonicalTitle) {
  // 1. Normalize both titles
  const normalize = (t) => t.toLowerCase()
    .replace(/[^\w\s]/g, '')  // Remove punctuation
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
  
  const a = normalize(refTitle);
  const b = normalize(canonicalTitle);
  
  // 2. Jaccard similarity (word overlap)
  const aWords = new Set(a.split(' '));
  const bWords = new Set(b.split(' '));
  const intersection = [...aWords].filter(x => bWords.has(x)).length;
  const union = new Set([...aWords, ...bWords]).size;
  const jaccard = intersection / union;
  
  // 3. Levenshtein similarity (character-level)
  const levenshtein = 1 - (levenshteinDistance(a, b) / Math.max(a.length, b.length));
  
  // 4. Combined score (weighted average)
  return (jaccard * 0.6) + (levenshtein * 0.4);
}
```

**Acceptance Criteria:**
- [ ] Titles with minor differences (punctuation, capitalization) match at >90%
- [ ] Completely different titles score <50%
- [ ] Unit tests pass for 20+ test cases

---

#### TASK-002: Fuzzy Author Matching
**Est:** 4 hours | **Priority:** P0

**Current Problem:** "Smith, J." doesn't match "John Smith" or "J. Smith".

**Solution:**
```javascript
// Implement in: verification-apis.js

function matchAuthors(refAuthors, canonicalAuthors) {
  // Parse author strings into structured format
  const parseAuthors = (str) => {
    // Handle "Smith, J. and Doe, A." format
    // Handle "J. Smith, A. Doe" format
    // Handle "et al." cases
  };
  
  const refList = parseAuthors(refAuthors);
  const canonList = parseAuthors(canonicalAuthors);
  
  // Match first author (most important)
  const firstAuthorMatch = fuzzyMatchName(refList[0], canonList[0]);
  
  // Check if at least 50% of authors match
  const overallMatch = calculateAuthorOverlap(refList, canonList);
  
  return (firstAuthorMatch * 0.6) + (overallMatch * 0.4);
}
```

**Acceptance Criteria:**
- [ ] "Smith, J." matches "John Smith" at >80%
- [ ] "J. Smith" matches "Smith, J." at >90%
- [ ] "et al." handling works correctly

---

#### TASK-003: API Rate Limiting & Retry Logic
**Est:** 4 hours | **Priority:** P0

**Current Problem:** No retry on failures, may hit rate limits.

**Solution:**
```javascript
// Implement in: verification-apis.js

import PQueue from 'p-queue';

// Rate limiters per API
const openAlexQueue = new PQueue({ 
  concurrency: 5, 
  interval: 1000, 
  intervalCap: 10 
});

const crossrefQueue = new PQueue({ 
  concurrency: 5, 
  interval: 1000, 
  intervalCap: 10 
});

const semanticScholarQueue = new PQueue({ 
  concurrency: 10, 
  interval: 60000, 
  intervalCap: 100 
});

// Retry with exponential backoff
async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 || error.status >= 500) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

**Acceptance Criteria:**
- [ ] API calls are rate-limited per source
- [ ] Failed requests retry up to 3 times
- [ ] 429/5xx errors trigger exponential backoff

---

#### TASK-004: Enhanced Confidence Scoring
**Est:** 2 hours | **Priority:** P0

**Current Problem:** Scoring is too simple.

**Solution:**
```javascript
// Implement in: verification-apis.js

function calculateConfidence(reference, apiResults) {
  const weights = {
    title: 0.40,
    authors: 0.25,
    year: 0.15,
    doi: 0.10,
    sourceCount: 0.10  // How many APIs found it
  };
  
  let score = 0;
  
  // Title similarity
  const titleSim = calculateTitleSimilarity(reference.title, apiResults.canonical_title);
  score += titleSim * weights.title;
  
  // Author match
  const authorSim = matchAuthors(reference.authors, apiResults.canonical_authors);
  score += authorSim * weights.authors;
  
  // Year match (exact = 1.0, ±1 year = 0.8, ±2 years = 0.5)
  const yearDiff = Math.abs(reference.year - apiResults.canonical_year);
  const yearScore = yearDiff === 0 ? 1.0 : yearDiff === 1 ? 0.8 : yearDiff === 2 ? 0.5 : 0.2;
  score += yearScore * weights.year;
  
  // DOI match (exact match = bonus)
  if (reference.doi && reference.doi === apiResults.doi) {
    score += weights.doi;
  }
  
  // Found in multiple sources = more reliable
  const sourcesFound = apiResults.verified_by.length;
  score += (sourcesFound / 3) * weights.sourceCount;
  
  return Math.round(score * 100);
}
```

**Acceptance Criteria:**
- [ ] Confidence reflects actual match quality
- [ ] DOI matches boost score
- [ ] Multi-source verification boosts score

---

## Phase 2: Processing UX 🟠 P1
**Timeline:** Days 5-7  
**Goal:** Users see exactly what's happening

### Tasks

#### TASK-005: File Validation Modal
**Est:** 4 hours | **Priority:** P1

**Location:** `pages/FileValidationModal.tsx`

**Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│  📄 Validating: thesis_final.bib                           │
│                                                             │
│  ✅ File type: BibTeX (.bib)                               │
│  ✅ File size: 45 KB (under 25 MB limit)                   │
│  ✅ Encoding: UTF-8 detected                               │
│  ✅ Syntax: Valid BibTeX format                            │
│  ✅ References: 127 entries found                          │
│                                                             │
│  Preview:                                                   │
│  @article{smith2021quantum, ...}                           │
│  @book{jones2020machine, ...}                              │
│  @inproceedings{chen2019deep, ...}                         │
│  ... and 124 more                                          │
│                                                             │
│  [Cancel]                          [Continue to Analysis →] │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Modal appears after file selection
- [ ] Shows file type, size, encoding checks
- [ ] Validates BibTeX syntax (shows error if invalid)
- [ ] Shows reference count preview
- [ ] "Continue" disabled until all checks pass

---

#### TASK-006: Enhanced Processing Progress
**Est:** 6 hours | **Priority:** P1

**Location:** `pages/ProcessingProgress.tsx`

**Mockup (matches your Image 3):**
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Analyzing 214 References                          68%   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░  │
│  ETA: ~23 seconds remaining                                 │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ ✅ Verified │ │ ⚠️ Warnings │ │ ❌ Errors   │          │
│  │    145     │ │     12     │ │     0      │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                             │
│  PROCESS ROADMAP               LIVE ENGINE ROOM            │
│  ✅ Parsing        Done        [10:42:05] ⚠️ Found 12     │
│  ✅ Normalizing    Done          duplicate candidates      │
│  🔄 Matching       87%         [10:42:01] ✅ Resolved DOI │
│  ⏳ Scoring        Pending       for 82 references        │
│  ⏳ Reporting      Pending     [10:41:55] 🔵 Fetching    │
│                                  Crossref batch 3/5...    │
│                                [10:41:45] ✅ Normalization│
│                                  complete. 214 processed  │
│                                                             │
│  [Pause Check]                                              │
└─────────────────────────────────────────────────────────────┘
```

**Backend Changes:**
- Add SSE endpoint for real-time progress
- Emit progress events at each stage
- Include stats (verified, warnings, errors)

**Acceptance Criteria:**
- [ ] Progress bar updates in real-time
- [ ] Stage stepper shows current step
- [ ] Live log feed shows actions as they happen
- [ ] Stats update as references are processed

---

## Phase 3: Results & Corrections 🟠 P1
**Timeline:** Days 8-12  
**Goal:** Users can review and fix issues easily

### Tasks

#### TASK-007: Enhanced Results Table
**Est:** 6 hours | **Priority:** P1

**Location:** `pages/ResultsOverviewEnhanced.tsx`

**Key Changes:**
- Large status icons (32px instead of 16px)
- Confidence bar + percentage per row
- Issue badges with clear labels
- "Review & Fix" button per row
- Sortable columns (status, confidence, title)

**Acceptance Criteria:**
- [ ] Status icons clearly visible
- [ ] Issue badges use correct colors
- [ ] Clicking row opens detail drawer
- [ ] Sort by confidence/status works

---

#### TASK-008: Reference Detail Drawer
**Est:** 8 hours | **Priority:** P1

**Location:** `pages/ReferenceDetailDrawer.tsx`

**Mockup (matches your Image 4):**
```
┌────────────────────────────────────────────────────────────┐
│  ❌ Metadata mismatch                                 [×]  │
│  Reference ID: #wilson2023deep                             │
│                                                            │
│  [Summary] [Differences] [Suggestions] [History]           │
│                                                            │
│  Comparison                         2 Conflicts Found      │
│  ┌────────────────────────────────────────────────────────┐
│  │ FIELD    │ YOUR BIBTEX         │ CANONICAL             │
│  ├──────────┼─────────────────────┼───────────────────────┤
│  │ TITLE    │ Deep learning for   │ Deep Learning for     │
│  │          │ graphs              │ Graphs: A Survey      │
│  ├──────────┼─────────────────────┼───────────────────────┤
│  │ YEAR     │ 2022                │ 2023                  │
│  ├──────────┼─────────────────────┼───────────────────────┤
│  │ AUTHOR   │ Wu, Zonghan et al.  │ Wu, Zonghan et al.    │
│  └──────────┴─────────────────────┴───────────────────────┘
│                                                            │
│  Quick Fixes                                               │
│  ┌────────────────────────────────────────────────────────┐
│  │ 🔗 Add missing DOI                          [Apply]    │
│  │    10.1109/TKDE.2022.3150000                           │
│  ├────────────────────────────────────────────────────────┤
│  │ 👤 Normalize Author Names                   [Apply]    │
│  │    Format to "Lastname, Firstname"                     │
│  └────────────────────────────────────────────────────────┘
│                                                            │
│  [Ignore Warning]            [✓ Update Reference]         │
└────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Drawer slides in from right
- [ ] Comparison table shows all mismatches
- [ ] Quick fix buttons work per-issue
- [ ] "Update Reference" saves to database
- [ ] "Ignore" marks as reviewed

---

#### TASK-009: Quick Fixes Banner
**Est:** 3 hours | **Priority:** P1

**Location:** `pages/ResultsOverviewEnhanced.tsx`

**Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│  ✨ QUICK FIXES AVAILABLE                                   │
│                                                             │
│  ✅ Add 54 missing DOIs (all verified)                     │
│  ✅ Fill 18 missing venues (high confidence)               │
│  ⚠️  Fix 3 year discrepancies (needs review)               │
│                                                             │
│  [Apply All Safe Fixes]  [Review Each]                     │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Banner shows at top of results
- [ ] Counts auto-fixable issues correctly
- [ ] "Apply All Safe Fixes" only fixes high-confidence (>90%)
- [ ] UI refreshes after batch fix

---

#### TASK-010: Export Corrected BibTeX
**Est:** 4 hours | **Priority:** P1

**Location:** New file `lib/bibtex-exporter.ts`

**Functionality:**
```javascript
function exportCorrectedBibTeX(references) {
  let output = '';
  
  for (const ref of references) {
    // Use corrected values if available, otherwise original
    const title = ref.corrected_title || ref.title;
    const authors = ref.corrected_authors || ref.authors;
    const year = ref.corrected_year || ref.year;
    const doi = ref.corrected_doi || ref.doi;
    const venue = ref.corrected_venue || ref.venue;
    
    output += `@article{${ref.bibtex_key},\n`;
    output += `  title = {${title}},\n`;
    output += `  author = {${authors}},\n`;
    output += `  year = {${year}},\n`;
    if (venue) output += `  journal = {${venue}},\n`;
    if (doi) output += `  doi = {${doi}},\n`;
    output += `}\n\n`;
  }
  
  return output;
}
```

**Acceptance Criteria:**
- [ ] Export button downloads `.bib` file
- [ ] Corrected values are used when available
- [ ] Valid BibTeX syntax
- [ ] Option to exclude ignored references

---

## Phase 4: Advanced Features 🟡 P2
**Timeline:** Days 13-20  

### Tasks

#### TASK-011: GROBID PDF Parsing
**Est:** 8 hours | **Priority:** P2

Use GROBID to extract structured references from PDFs instead of regex.

---

#### TASK-012: Retraction Watch Integration
**Est:** 4 hours | **Priority:** P2

Cross-check references against Retraction Watch database.

---

#### TASK-013: Duplicate Detection Enhancement
**Est:** 4 hours | **Priority:** P2

Group duplicates visually, show "merge" option.

---

#### TASK-014: Preprint Detection
**Est:** 3 hours | **Priority:** P2

Flag references that are only in arXiv/bioRxiv without journal publication.

---

## Sprint Plan

### Week 1 (Days 1-5): Foundation
| Day | Tasks | Goal |
|-----|-------|------|
| 1 | TASK-001, TASK-002 | Title & author matching |
| 2 | TASK-003, TASK-004 | Rate limiting & scoring |
| 3 | TASK-005 | File validation modal |
| 4 | TASK-006 (start) | Processing progress UI |
| 5 | TASK-006 (finish) | Processing progress complete |

### Week 2 (Days 6-10): Results UX
| Day | Tasks | Goal |
|-----|-------|------|
| 6 | TASK-007 | Enhanced results table |
| 7 | TASK-008 (start) | Detail drawer UI |
| 8 | TASK-008 (finish) | Detail drawer complete |
| 9 | TASK-009 | Quick fixes banner |
| 10 | TASK-010 | BibTeX export |

### Week 3 (Days 11-15): Polish & Advanced
| Day | Tasks | Goal |
|-----|-------|------|
| 11 | Bug fixes, testing | Stabilize Phase 1-3 |
| 12 | TASK-011 | GROBID integration |
| 13 | TASK-012 | Retraction Watch |
| 14 | TASK-013 | Duplicate detection |
| 15 | TASK-014 | Preprint detection |

---

## Ready to Start?

**Recommended starting point:** TASK-001 (Enhanced Title Matching)

This is the foundation for accurate verification. Once the matching algorithms are solid, everything else builds on top.

**Command to begin:**
```
"Start implementing TASK-001: Enhanced Title Matching in verification-apis.js"
```

---

**Document End**
