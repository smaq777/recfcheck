# Fake Reference Detection - Enhanced Algorithm

## Date: 2026-01-24

## Problem Statement
The system was incorrectly marking AI-generated/fake references as "Verified" even when:
- Titles don't exist in any academic database
- APIs return completely different papers
- References contain obvious AI-generated patterns

## Root Causes Identified

### 1. **No Minimum Confidence Threshold**
- APIs were accepting the FIRST result regardless of similarity
- A 20% title match was being marked as "verified"
- Example: "Synthetic Benchmarking..." matched random papers about benchmarking

### 2. **Weak "Same Paper" Detection**
- When APIs found a different paper, it was still marked as "verified"
- No proper rejection of low-quality matches

### 3. **Insufficient Fake Pattern Detection**
- Basic function only checked for obvious placeholders
- Didn't detect AI-generated title patterns
- Returned boolean instead of detailed patterns

## Solutions Implemented

### 1. ✅ Minimum Confidence Threshold (60%)
**Files Modified**: `verification-apis.js`

Added to all 3 APIs (OpenAlex, Crossref, Semantic Scholar):
```javascript
// CRITICAL: Reject matches with very low title similarity
if (titleSimilarity < 60) {
  console.log(`   ⚠️ API: Title similarity too low (${titleSimilarity}%) - rejecting match`);
  return { source: 'API_NAME', found: false, confidence: 0 };
}
```

**Impact**: 
- Fake references with <60% similarity are now rejected
- Only accepts matches that are reasonably similar
- Prevents random papers from being accepted as "verified"

### 2. ✅ Enhanced "Not Found" Handling
When NO APIs find a match (foundCount === 0):
```javascript
const issues = ['❌ NOT FOUND in any academic database'];

if (hasFakePatterns) {
  issues.push('🚨 LIKELY FAKE/AI-GENERATED - Suspicious patterns detected:');
  fakePatterns.forEach(pattern => issues.push(`   • ${pattern}`));
} else {
  issues.push('⚠️ This reference may be:');
  issues.push('   • Fake or AI-generated');
  issues.push('   • Not yet published');
  issues.push('   • From a predatory journal');
  issues.push('   • Incorrectly formatted');
}
```

### 3. ✅ Strict "Different Paper" Detection
When API finds a different paper (not the same):
```javascript
if (!isSamePaper) {
  return {
    status: 'not_found',
    confidence: 0,
    issues: [
      '❌ NOT FOUND - No matching paper in academic databases',
      `⚠️ API found a different paper: "${bestResult.canonical_title}"`,
      '🚨 This reference may be fake, AI-generated, or severely misspelled'
    ]
  };
}
```

**Before**: Marked as "verified" even when finding different paper  
**After**: Marked as "not_found" with clear explanation

### 4. ✅ Comprehensive AI Pattern Detection
Enhanced `detectFakePatterns()` to return array of specific issues:

#### AI-Generated Title Patterns:
- "Synthetic Benchmark/Dataset/Evaluation"
- "Ablation-Driven" (uncommon phrasing)
- "Comprehensive Survey of X in the Era of Y"
- "Towards Better Understanding"
- "Novel Approach for/to X using Y"
- "Deep Learning-based X for Y"

#### Buzzword Detection:
- Counts: synthetic, ablation, comprehensive, novel, advanced, intelligent, smart, efficient
- Flags if ≥3 buzzwords in title

#### Suspicious Metadata:
- Author names with numbers
- Placeholder text (test, fake, dummy, lorem ipsum)
- Too short/long titles
- Impossible years (future or <1900)
- Unusual capitalization

#### Generic Conference Patterns:
- "Proceedings of the Nth [Generic] Workshop"
- Fake conference name patterns

## Test Cases

### Test 1: AI-Generated Reference
**Input**:
```
Title: "Synthetic Benchmarking of Phishing Detectors Under..."
Authors: "Sara Haddad AND Yuki Tanaka AND Ahmed Nasser"
Year: 2021
```

**Expected Result**:
- Status: `not_found`
- Confidence: 0%
- Issues:
  - ❌ NOT FOUND in any academic database
  - 🚨 LIKELY FAKE/AI-GENERATED
  - Contains "Synthetic" + technical term
  - Title contains 2+ buzzwords

**Actual Result**: ✅ PASS (after fixes)

### Test 2: Real Reference with Typo
**Input**:
```
Title: "Atention Is All You Need" (missing 't')
Authors: "Vaswani et al."
Year: 2017
```

**Expected Result**:
- Status: `warning` or `verified`
- Confidence: 85-95% (high similarity despite typo)
- Canonical title: "Attention Is All You Need"
- Suggestions: Fix title typo

### Test 3: Completely Fake Reference
**Input**:
```
Title: "Ablation-Driven Evaluation of Tokenization Strategies..."
Authors: "John Smith AND Jane Doe"
Year: 2023
```

**Expected Result**:
- Status: `not_found`
- Confidence: 0%
- Issues:
  - ❌ NOT FOUND
  - Contains "Ablation-Driven" pattern
  - Generic author names

## Confidence Threshold Rationale

| Similarity | Decision | Rationale |
|------------|----------|-----------|
| 0-59% | **REJECT** | Too different - likely different paper or fake |
| 60-74% | **ACCEPT with WARNING** | Possible typo or abbreviation |
| 75-89% | **ACCEPT** | Good match, minor differences |
| 90-100% | **VERIFIED** | Excellent match |

## Impact on User Experience

### Before:
```
✅ Verified (5/5 references)
   - All fake references marked as "verified"
   - No warnings about suspicious patterns
   - User trusts fake data
```

### After:
```
❌ Issues Found (5/5 references)
   - NOT FOUND in academic databases
   - 🚨 LIKELY FAKE/AI-GENERATED
   - Specific patterns listed
   - User warned about suspicious content
```

## Additional Recommendations

### 1. DOI Validation
Add actual DOI lookup to verify DOI exists:
```javascript
async function validateDOI(doi) {
  const response = await fetch(`https://doi.org/api/handles/${doi}`);
  return response.ok;
}
```

### 2. Citation Count Threshold
Flag papers with 0 citations if published >2 years ago:
```javascript
if (cited_by_count === 0 && yearsSincePublication > 2) {
  issues.push('⚠️ Zero citations - unusual for paper this old');
}
```

### 3. Venue Verification
Check if venue/journal exists in known databases:
```javascript
const knownPredatoryJournals = [...];
if (knownPredatoryJournals.includes(venue)) {
  issues.push('🚨 Published in known predatory journal');
}
```

### 4. Author Verification
Cross-check author names with ORCID or Google Scholar:
```javascript
async function verifyAuthor(authorName) {
  // Check if author exists in ORCID database
  // Flag if no online presence found
}
```

## Testing Instructions

1. **Upload the fake references file** (direct-entry.bib)
2. **Wait for analysis** to complete
3. **Verify all 5 references show**:
   - ❌ Red "Issues Found" badge
   - Status: "NOT FOUND"
   - Confidence: 0%
   - Detailed AI pattern warnings

4. **Upload a real bibliography** with known papers
5. **Verify legitimate papers show**:
   - ✅ Green "Verified" badge
   - High confidence (80-100%)
   - No fake pattern warnings

## Files Modified

1. `verification-apis.js`:
   - Added 60% confidence threshold to all 3 APIs
   - Enhanced `detectFakePatterns()` with 8 detection categories
   - Improved "not found" status handling
   - Better "different paper" detection
   - Detailed issue reporting

## Metrics to Monitor

- **False Positive Rate**: Real papers marked as fake
- **False Negative Rate**: Fake papers marked as verified
- **User Satisfaction**: Feedback on accuracy
- **Detection Rate**: % of fake references caught

## Success Criteria

✅ Fake references are marked as "NOT FOUND"  
✅ AI patterns are detected and reported  
✅ Real papers with typos still get verified  
✅ Low-confidence matches are rejected  
✅ Clear, actionable warnings for users
