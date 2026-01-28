# Multi-API Detection Enhancements Report

## ✅ COMPLETED: Multi-Strategy Search Across All APIs

All three academic verification APIs now use consistent multi-strategy search for maximum detection accuracy:

### 1. **OpenAlex API** (Free, no key required)
**Location:** `services.ts` (Vercel production) + `verification-apis.js` (dev server)

**Search Strategy (4-level fallback):**
1. **DOI Search** → Direct lookup by Digital Object Identifier (100% reliable)
2. **Exact Title Search** → Full title as-is
3. **Normalized Title Search** → Remove punctuation, stopwords (a, the, for, using, etc.)
4. **Author+Year Search** → Combined search with first author + publication year

**Threshold:** 70% title similarity (fuzzy matching with word-level Jaccard)

**Example:** CultureGuard paper (arXiv:2508.01710)
- Original: "Towards CultureGuard: A New Dataset Model for Multilingual Safety Applications"
- Normalized: "CultureGuard Dataset Model Multilingual Safety Applications"
- Fallback #3 successfully found paper that #2 missed

---

### 2. **Crossref API** (Free, no API key required)
**Location:** `verification-apis.js` (dev server only)

**Search Strategy (4-level fallback):**
1. **DOI Search** → Direct REST API call to `/works/{doi}`
2. **Exact Title Search** → `query.title={title}` parameter
3. **Normalized Title Search** → Remove special chars, stopwords
4. **Author+Year Search** → Combined search `query=title author year`

**Threshold:** 50% title similarity (increased from 35%)

**Response Format:**
```json
{
  "source": "Crossref",
  "found": true,
  "confidence": 75,
  "canonical_title": "...",
  "canonical_authors": "Author1 and Author2",
  "canonical_year": 2023,
  "doi": "10.xxxx/xxxxx",
  "venue": "Journal Name",
  "url": "https://doi.org/10.xxxx/xxxxx"
}
```

**Helper Functions:**
- `searchCrossrefByDOI(doi)` - Direct DOI lookup
- `processCrossrefMatch()` - Standardized output formatting

---

### 3. **Semantic Scholar API** (Free, no API key required)
**Location:** `verification-apis.js` (dev server only)

**Search Strategy (4-level fallback):**
1. **DOI Search** → Search with `doi:` query prefix
2. **Exact Title Search** → Direct title query
3. **Normalized Title Search** → Remove special chars, stopwords
4. **Author+Year Search** → Combined search with first author + year

**Threshold:** 50% title similarity (increased from 35%)

**Response Format:**
```json
{
  "source": "Semantic Scholar",
  "found": true,
  "confidence": 80,
  "canonical_title": "...",
  "canonical_authors": "Author1, Author2",
  "canonical_year": 2023,
  "venue": "Conference Name",
  "cited_by_count": 45,
  "is_open_access": true,
  "url": "https://www.semanticscholar.org/paper/..."
}
```

**Helper Functions:**
- `searchSemanticScholarByDOI(doi)` - Direct DOI lookup
- `processSemanticScholarMatch()` - Standardized output formatting

---

## 🔄 Architecture Overview

### Deployment Strategy

| Component | Local Dev | Production (Vercel) |
|-----------|-----------|-------------------|
| **APIs Used** | OpenAlex + Crossref + Semantic Scholar | OpenAlex only |
| **Verification File** | `verification-apis.js` | `services.ts` |
| **Entry Points** | PDF, BibTeX, LaTeX, Direct Form | Direct upload endpoint |
| **Cross-validation** | Triple-check, majority voting | Single API lookup |
| **Speed** | Slower (parallel 3 APIs) | Faster (single API) |
| **Coverage** | Highest (3 sources) | Good (optimized for cost) |

### Data Flow

```
Reference → Parse Title/Authors/Year
    ↓
[Strategy 1: DOI Search] → Found? Return ✅
    ↓
[Strategy 2: Exact Title] → Found? Return ✅
    ↓
[Strategy 3: Normalized Title] → Found? Return ✅
    ↓
[Strategy 4: Author+Year] → Found? Return ✅
    ↓
Not found ❌
```

---

## 🎯 Accuracy Improvements

### False Negatives (Missed Detection)
**Before:** Single title-only search missed variations
- "Towards CultureGuard: A New Dataset..." → Not found by OpenAlex
- Papers with subtitle variations failed

**After:** Multi-strategy fallback catches variations
- Strategy 3 (normalized) removes "Towards" → Found ✅
- Stopword removal helps with subtitle mismatches

### False Positives (Incorrect Duplicates)
**Before:** 35% threshold allowed too many false matches
**After:** 
- Raised threshold to 50-70% depending on API
- Added author overlap requirement (80%+)
- Added exact year matching requirement

---

## 🔧 Implementation Details

### Shared Helper Functions
All three APIs use these consistent utilities:

**1. Title Normalization**
```javascript
normalizeSearchTitle(title)
// Removes: punctuation, articles (a, the), common words (and, or, for, using, based, etc.)
// Example: "Towards CultureGuard: And Other..." → "CultureGuard Other"
```

**2. Author Extraction**
```javascript
extractFirstAuthor(authorString)
// Gets surname only from full author name
// Example: "John Smith, Jane Doe" → "Smith"
```

**3. Similarity Calculation**
```javascript
calculateSimilarity(title1, title2)
// Uses Levenshtein distance + word-level Jaccard matching
// Returns: 0-100 percentage
```

**4. Issue Detection**
```javascript
detectIssues(reference, canonicalData, similarity, yearMatch)
// Returns: array of potential problems
// Examples: title mismatch, year discrepancy, retracted status
```

---

## 📊 Search Thresholds Comparison

| API | Strategy 1 | Strategy 2 | Strategy 3 | Strategy 4 |
|-----|-----------|-----------|-----------|-----------|
| **OpenAlex** | 100% (DOI) | 70% | 70% | 70% |
| **Crossref** | 100% (DOI) | 50% | 50% | 50% |
| **Semantic Scholar** | 100% (DOI) | 50% | 50% | 50% |

---

## 🧪 Testing Recommendations

### Test Cases to Verify

1. **Exact Match**
   - Input: "Deep Learning" 
   - Expected: Found with 95%+ confidence
   - All strategies should find it

2. **Subtitle Variation**
   - Input: "Towards Deep Learning"
   - Expected: Found via Strategy 3
   - Original Strategy 2 should miss

3. **Title Normalization**
   - Input: "A Survey of Deep Learning and Neural Networks"
   - Expected: Found via Strategy 3
   - Normalized: "Survey Deep Learning Neural Networks"

4. **Author+Year Fallback**
   - Input: "Unknown Title by John Smith 2023"
   - Expected: Found via Strategy 4
   - Requires author and year to be present

5. **DOI Direct Lookup**
   - Input: doi="10.1234/xyz" (any title)
   - Expected: Found immediately via Strategy 1
   - Fastest path

---

## 🚀 Performance Impact

### API Call Reduction
- **Before:** 1 request per API (3 parallel)
- **After:** 1-4 requests per API (depending on strategy success)
- **Optimization:** Most papers found via Strategy 2 (exact title)

### Typical Scenarios

| Paper Type | Strategy Used | Requests |
|------------|--------------|----------|
| Exact match | Strategy 2 | 1 |
| With subtitle | Strategy 3 | 2 |
| Obscure paper | Strategy 4 | 3-4 |
| DOI available | Strategy 1 | 1 |
| Not found | All 4 | 4 |

---

## 🔒 Consistency Across Entry Methods

Enhanced APIs apply to:
- ✅ PDF uploads (via `file-parser.ts` → `verification-apis.js`)
- ✅ BibTeX uploads (via `file-parser.ts` → `verification-apis.js`)
- ✅ LaTeX uploads (via `file-parser.ts` → `verification-apis.js`)
- ✅ Direct form entry (via `verification-apis.js`)
- ✅ Vercel API uploads (via `services.ts`)

---

## 📝 Next Steps & Future Improvements

### Completed ✅
- Multi-strategy search for all 3 APIs
- Unified threshold strategy (50-70%)
- Helper functions for consistency
- Standardized output formatting
- Cross-validation in dev server

### Potential Future Enhancements
1. **Additional APIs:**
   - IEEE Xplore (requires API key)
   - Google Scholar (no official API)
   - arXiv (specific format matching)

2. **Smart Caching:**
   - Cache normalized titles separately
   - TTL-based expiration (30 days)
   - Negative cache for "not found" results

3. **Machine Learning:**
   - Learn weights for each strategy
   - Rank APIs by accuracy for specific paper types
   - Predict which strategy will succeed

4. **User Feedback:**
   - Learn from user corrections
   - Adjust thresholds per paper type
   - Fine-tune author matching

---

## 📞 Support

If papers still aren't being found:
1. Check console logs for which strategy failed
2. Verify DOI is correct (Strategy 1)
3. Try normalized title manually (Strategy 3)
4. Check author+year combination (Strategy 4)
5. Consider paper may not exist in academic databases

---

**Last Updated:** 2024  
**Status:** All APIs Enhanced ✅
