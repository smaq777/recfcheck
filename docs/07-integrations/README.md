# API Integrations Documentation
**Document:** docs/07-integrations/README.md  
**Last Updated:** January 23, 2026

---

## Overview

RefCheck uses three academic APIs for cross-validation:

| API | Purpose | Rate Limit | Auth |
|-----|---------|------------|------|
| **OpenAlex** | Primary metadata source | 10 req/s | Free (mailto) |
| **Crossref** | DOI registry, citations | 10 req/s | Free (mailto) |
| **Semantic Scholar** | Citations, abstracts | 100 req/min | API key (optional) |

All APIs are called in parallel for each reference. Results are aggregated, and the highest-confidence match is used.

---

## OpenAlex Integration

**File:** `verification-apis.js`  
**Endpoint:** `https://api.openalex.org/works`

### Request
```javascript
const url = `https://api.openalex.org/works?filter=title.search:${query}&mailto=verify@refcheck.ai`;
```

### Response Fields Used
| Field | Maps To |
|-------|---------|
| `display_name` | `canonical_title` |
| `authorships[].author.display_name` | `canonical_authors` |
| `publication_year` | `canonical_year` |
| `doi` | `doi` |
| `primary_location.source.display_name` | `venue` |
| `is_retracted` | `is_retracted` |
| `cited_by_count` | `citation_count` |
| `open_access.is_oa` | `is_open_access` |

### Status: ✅ Implemented

---

## Crossref Integration

**File:** `verification-apis.js`  
**Endpoint:** `https://api.crossref.org/works`

### Request
```javascript
const url = `https://api.crossref.org/works?query.title=${query}&mailto=verify@refcheck.ai&rows=1`;
```

### Response Fields Used
| Field | Maps To |
|-------|---------|
| `title[0]` | `canonical_title` |
| `author[].given + family` | `canonical_authors` |
| `published.date-parts[0][0]` | `canonical_year` |
| `DOI` | `doi` |
| `container-title[0]` | `venue` |
| `publisher` | `publisher` |
| `is-referenced-by-count` | `citation_count` |

### Status: ✅ Implemented

---

## Semantic Scholar Integration

**File:** `verification-apis.js`  
**Endpoint:** `https://api.semanticscholar.org/graph/v1/paper/search`

### Request
```javascript
const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${query}&limit=1&fields=title,authors,year,citationCount,isOpenAccess,venue,externalIds`;
```

### Response Fields Used
| Field | Maps To |
|-------|---------|
| `title` | `canonical_title` |
| `authors[].name` | `canonical_authors` |
| `year` | `canonical_year` |
| `externalIds.DOI` | `doi` |
| `venue` | `venue` |
| `citationCount` | `citation_count` |
| `isOpenAccess` | `is_open_access` |

### Status: ✅ Implemented

---

## Cross-Validation Logic

The `crossValidateReference()` function:

1. Calls all 3 APIs in parallel
2. Filters to only "found" results
3. Selects the result with highest confidence
4. Aggregates issues from all sources
5. Verifies same paper (not just similar title)

```javascript
// Aggregation logic
const bestResult = results
  .filter(r => r.found)
  .sort((a, b) => b.confidence - a.confidence)[0];

// Only use canonical data if it's the SAME paper
const isSamePaper = checkIfSamePaper(reference, bestResult);
```

### Status Determination

| Condition | Status |
|-----------|--------|
| Found in 0 APIs | `not_found` |
| Found but `is_retracted = true` | `retracted` |
| Found but confidence < 50% | `issue` |
| Found with 50-80% confidence | `warning` |
| Found with 80%+ confidence | `verified` |

---

## TODO: Additional Integrations

### Retraction Watch
**Priority:** P2  
**Purpose:** Flag retracted papers

### GROBID
**Priority:** P2  
**Purpose:** Better PDF reference extraction

### Unpaywall
**Priority:** P3  
**Purpose:** Open access links
