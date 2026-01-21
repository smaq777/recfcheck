/**
 * Real API integrations for reference verification
 * Supports: OpenAlex, Crossref, Semantic Scholar
 */

import dotenv from 'dotenv';
dotenv.config();

const OPENALEX_API_KEY = process.env.OPENALEX_API_KEY || '';
const CROSSREF_EMAIL = 'verify@refcheck.ai'; // Crossref is free but requires email

/**
 * Verify reference with OpenAlex API
 * https://docs.openalex.org/
 */
export async function verifyWithOpenAlex(reference) {
  try {
    const query = encodeURIComponent(reference.title.trim());
    const url = `https://api.openalex.org/works?filter=title.search:${query}&mailto=${CROSSREF_EMAIL}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`OpenAlex error: ${response.status}`);
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return { source: 'OpenAlex', found: false, confidence: 0 };
    }
    
    const match = data.results[0];
    const titleSimilarity = calculateSimilarity(reference.title, match.title);
    const yearMatch = reference.year === match.publication_year;
    
    // Extract ALL authors from OpenAlex
    const allAuthors = match.authorships?.map(a => a.author.display_name).filter(Boolean) || [];
    console.log(`   📚 OpenAlex found ${allAuthors.length} authors:`, allAuthors);
    
    return {
      source: 'OpenAlex',
      found: true,
      confidence: titleSimilarity,
      canonical_title: match.title,
      canonical_authors: allAuthors.join(', '),
      canonical_year: match.publication_year,
      doi: match.doi?.replace('https://doi.org/', ''),
      is_retracted: match.is_retracted || false,
      cited_by_count: match.cited_by_count || 0,
      venue: match.primary_location?.source?.display_name,
      open_access: match.open_access?.is_oa || false,
      url: `https://openalex.org/${match.id?.replace('https://openalex.org/', '')}`,
      issues: detectIssues(reference, match, titleSimilarity, yearMatch)
    };
  } catch (error) {
    console.error('OpenAlex verification error:', error);
    return { source: 'OpenAlex', found: false, confidence: 0, error: error.message };
  }
}

/**
 * Verify reference with Crossref API (FREE - no API key needed!)
 * https://www.crossref.org/documentation/retrieve-metadata/rest-api/
 */
export async function verifyWithCrossref(reference) {
  try {
    const query = encodeURIComponent(reference.title.trim());
    const url = `https://api.crossref.org/works?query.title=${query}&mailto=${CROSSREF_EMAIL}&rows=1`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Crossref error: ${response.status}`);
    
    const data = await response.json();
    
    if (!data.message || !data.message.items || data.message.items.length === 0) {
      return { source: 'Crossref', found: false, confidence: 0 };
    }
    
    const match = data.message.items[0];
    const titleSimilarity = calculateSimilarity(reference.title, match.title?.[0] || '');
    const yearMatch = reference.year === parseInt(match.published?.['date-parts']?.[0]?.[0]);
    
    // Extract ALL authors from Crossref
    const allAuthors = match.author?.map(a => {
      const given = a.given || '';
      const family = a.family || '';
      return `${given} ${family}`.trim();
    }).filter(Boolean) || [];
    console.log(`   📚 Crossref found ${allAuthors.length} authors:`, allAuthors);
    
    return {
      source: 'Crossref',
      found: true,
      confidence: titleSimilarity * (match.score / 100), // Crossref provides relevance score
      canonical_title: match.title?.[0],
      canonical_authors: allAuthors.join(', '),
      canonical_year: parseInt(match.published?.['date-parts']?.[0]?.[0]),
      doi: match.DOI,
      venue: match.container?.[0] || match['container-title']?.[0],
      publisher: match.publisher,
      is_retracted: match.update?.type === 'retraction' || false,
      cited_by_count: match['is-referenced-by-count'] || 0,
      url: match.DOI ? `https://doi.org/${match.DOI}` : null,
      issues: detectIssues(reference, { 
        title: match.title?.[0], 
        publication_year: parseInt(match.published?.['date-parts']?.[0]?.[0]),
        doi: match.DOI 
      }, titleSimilarity, yearMatch)
    };
  } catch (error) {
    console.error('Crossref verification error:', error);
    return { source: 'Crossref', found: false, confidence: 0, error: error.message };
  }
}

/**
 * Verify reference with Semantic Scholar API (FREE!)
 * https://www.semanticscholar.org/product/api
 */
export async function verifyWithSemanticScholar(reference) {
  try {
    const query = encodeURIComponent(reference.title.trim());
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${query}&limit=1&fields=title,authors,year,citationCount,isOpenAccess,venue,externalIds`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Semantic Scholar error: ${response.status}`);
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return { source: 'Semantic Scholar', found: false, confidence: 0 };
    }
    
    const match = data.data[0];
    const titleSimilarity = calculateSimilarity(reference.title, match.title);
    const yearMatch = reference.year === match.year;
    
    // Extract ALL authors from Semantic Scholar
    const allAuthors = match.authors?.map(a => a.name).filter(Boolean) || [];
    console.log(`   📚 Semantic Scholar found ${allAuthors.length} authors:`, allAuthors);
    
    return {
      source: 'Semantic Scholar',
      found: true,
      confidence: titleSimilarity,
      canonical_title: match.title,
      canonical_authors: allAuthors.join(', '),
      canonical_year: match.year,
      doi: match.externalIds?.DOI,
      venue: match.venue,
      cited_by_count: match.citationCount || 0,
      is_open_access: match.isOpenAccess || false,
      url: match.paperId ? `https://www.semanticscholar.org/paper/${match.paperId}` : null,
      issues: detectIssues(reference, match, titleSimilarity, yearMatch)
    };
  } catch (error) {
    console.error('Semantic Scholar verification error:', error);
    return { source: 'Semantic Scholar', found: false, confidence: 0, error: error.message };
  }
}

/**
 * Cross-validate across multiple APIs for higher accuracy
 */
export async function crossValidateReference(reference) {
  console.log(`🔍 Cross-validating: "${reference.title.substring(0, 50)}..."`);
  
  // Call all APIs in parallel
  const [openAlexResult, crossrefResult, semanticScholarResult] = await Promise.all([
    verifyWithOpenAlex(reference),
    verifyWithCrossref(reference),
    verifyWithSemanticScholar(reference)
  ]);
  
  const results = [openAlexResult, crossrefResult, semanticScholarResult];
  const foundCount = results.filter(r => r.found).length;
  
  console.log(`   OpenAlex: ${openAlexResult.found ? '✅' : '❌'} (${openAlexResult.confidence}%)`);
  console.log(`   Crossref: ${crossrefResult.found ? '✅' : '❌'} (${crossrefResult.confidence}%)`);
  console.log(`   Semantic Scholar: ${semanticScholarResult.found ? '✅' : '❌'} (${semanticScholarResult.confidence}%)`);
  
  // Aggregate results
  if (foundCount === 0) {
    return {
      status: 'not_found',
      confidence: 0,
      issues: ['NOT FOUND - Reference may be fake, unpublished, or incorrectly formatted'],
      verified_by: [],
      all_results: results
    };
  }
  
  // Use the result with highest confidence
  const bestResult = results
    .filter(r => r.found)
    .sort((a, b) => b.confidence - a.confidence)[0];
  
  // CRITICAL: Only use canonical data if it's ACTUALLY THE SAME PAPER
  // Check if this is the SAME paper (not just similar)
  const isSamePaper = checkIfSamePaper(reference, bestResult);
  
  // Aggregate issues from all sources
  const allIssues = [...new Set(results.flatMap(r => r.issues || []))];
  
  // Determine overall status
  let status = 'verified';
  let overallConfidence = bestResult.confidence;
  
  // If not the same paper, don't suggest corrections - just verify it exists
  if (!isSamePaper) {
    // The API found a different paper, not a typo correction
    return {
      status: 'verified',
      confidence: overallConfidence,
      canonical_title: null, // Don't suggest different paper as correction
      canonical_authors: null,
      canonical_year: null,
      doi: bestResult.doi,
      venue: bestResult.venue,
      cited_by_count: bestResult.cited_by_count,
      is_retracted: bestResult.is_retracted,
      issues: bestResult.is_retracted ? ['⚠️ RETRACTED - This paper has been officially retracted'] : [],
      verified_by: results.filter(r => r.found).map(r => r.source),
      // External viewing links (generate from DOI if available)
      google_scholar_url: generateGoogleScholarUrl(reference),
      openalex_url: openAlexResult.found && openAlexResult.url ? openAlexResult.url : null,
      crossref_url: bestResult.doi ? `https://doi.org/${bestResult.doi}` : 
                    (crossrefResult.found && crossrefResult.url ? crossrefResult.url : null),
      semantic_scholar_url: semanticScholarResult.found && semanticScholarResult.url ? semanticScholarResult.url : null,
      all_results: results
    };
  }
  
  if (foundCount === 1) {
    status = 'warning';
    allIssues.push('Found in only 1 database - needs manual review');
  }
  
  if (bestResult.is_retracted) {
    status = 'retracted';
    allIssues.push('⚠️ RETRACTED - This paper has been officially retracted');
  }
  
  if (overallConfidence < 70) {
    status = 'warning';
    allIssues.push('Low confidence match - title may be incorrect');
  }
  
  return {
    status,
    confidence: overallConfidence,
    canonical_title: bestResult.canonical_title,
    canonical_authors: bestResult.canonical_authors,
    canonical_year: bestResult.canonical_year,
    doi: bestResult.doi,
    venue: bestResult.venue,
    cited_by_count: bestResult.cited_by_count,
    is_retracted: bestResult.is_retracted,
    issues: allIssues,
    verified_by: results.filter(r => r.found).map(r => r.source),
    // External viewing links (prioritize direct paper URLs over generic search)
    google_scholar_url: generateGoogleScholarUrl(reference),
    openalex_url: openAlexResult.found && openAlexResult.url ? openAlexResult.url : null,
    crossref_url: bestResult.doi ? `https://doi.org/${bestResult.doi}` : 
                  (crossrefResult.found && crossrefResult.url ? crossrefResult.url : null),
    semantic_scholar_url: semanticScholarResult.found && semanticScholarResult.url ? semanticScholarResult.url : null,
    all_results: results
  };
}

/**
 * Check if the found result is actually THE SAME PAPER (not just similar)
 * Only return true if we have strong evidence it's the same paper
 * 
 * CRITICAL RULES:
 * 1. DOI match = 100% same paper → Show canonical citation
 * 2. NO DOI but title+author+year match = Same paper → Show canonical citation
 * 3. Otherwise = Different paper → Don't suggest correction
 */
function checkIfSamePaper(originalReference, foundResult) {
  // RULE 1: If DOIs match exactly - definitely the same paper
  if (originalReference.doi && foundResult.doi) {
    const doi1 = originalReference.doi.toLowerCase().trim().replace('https://doi.org/', '');
    const doi2 = foundResult.doi.toLowerCase().trim().replace('https://doi.org/', '');
    
    if (doi1 === doi2) {
      console.log(`   ✅ DOI EXACT MATCH - Same paper: ${doi1}`);
      return true;
    }
  }
  
  // RULE 2: No DOI, but need STRONG evidence (title + author + year)
  const titleSimilarity = calculateSimilarity(originalReference.title, foundResult.canonical_title);
  const yearMatch = originalReference.year === foundResult.canonical_year;
  
  // Check author overlap (need at least 50% matching authors)
  let authorMatch = false;
  if (originalReference.authors && foundResult.canonical_authors) {
    const originalAuthors = originalReference.authors.toLowerCase().split(/[,;&]/).map(a => a.trim());
    const foundAuthors = foundResult.canonical_authors.toLowerCase().split(/[,;&]/).map(a => a.trim());
    
    let matchCount = 0;
    for (const origAuthor of originalAuthors) {
      for (const foundAuthor of foundAuthors) {
        // Check if author names overlap significantly
        if (origAuthor.includes(foundAuthor) || foundAuthor.includes(origAuthor)) {
          matchCount++;
          break;
        }
      }
    }
    
    const overlapPercentage = (matchCount / Math.min(originalAuthors.length, foundAuthors.length)) * 100;
    authorMatch = overlapPercentage >= 50;
    
    console.log(`   📊 Author overlap: ${overlapPercentage.toFixed(0)}% (${matchCount}/${Math.min(originalAuthors.length, foundAuthors.length)} authors)`);
  }
  
  console.log(`   📊 Title similarity: ${titleSimilarity.toFixed(0)}%`);
  console.log(`   📊 Year match: ${yearMatch ? 'YES' : 'NO'} (${originalReference.year} vs ${foundResult.canonical_year})`);
  console.log(`   📊 Author match: ${authorMatch ? 'YES' : 'NO'}`);
  
  // MUST have: High title similarity (>98%) + Year match + Author overlap
  if (titleSimilarity > 98 && yearMatch && authorMatch) {
    console.log(`   ✅ HIGH CONFIDENCE MATCH - Same paper with minor typo`);
    return true;
  }
  
  // RULE 3: Otherwise, assume it's a DIFFERENT paper
  console.log(`   ❌ DIFFERENT PAPER - Not suggesting correction`);
  console.log(`      Original: "${originalReference.title}"`);
  console.log(`      Found:    "${foundResult.canonical_title}"`);
  return false;
}

/**
 * Generate Google Scholar search URL for a reference
 */
function generateGoogleScholarUrl(reference) {
  const query = encodeURIComponent(`${reference.title} ${reference.authors}`);
  return `https://scholar.google.com/scholar?q=${query}`;
}

/**
 * Calculate similarity between two strings (0-100)
 * Uses WORD-BASED matching to avoid false positives from character-level similarity
 * Example: "text-content using deep learning" vs "URLs detection" = LOW similarity
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  
  // Extract words (alphanumeric only, remove punctuation)
  const words1 = s1.split(/[^a-z0-9]+/).filter(w => w.length > 2);
  const words2 = s2.split(/[^a-z0-9]+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Count matching words
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  let matchCount = 0;
  for (const word of set1) {
    if (set2.has(word)) {
      matchCount++;
    }
  }
  
  // Jaccard similarity: intersection / union
  const unionSize = set1.size + set2.size - matchCount;
  const jaccardSimilarity = (matchCount / unionSize) * 100;
  
  // Also check word order similarity (for typo detection)
  let orderMatchCount = 0;
  const minLength = Math.min(words1.length, words2.length);
  for (let i = 0; i < minLength; i++) {
    if (words1[i] === words2[i]) {
      orderMatchCount++;
    }
  }
  const orderSimilarity = (orderMatchCount / Math.max(words1.length, words2.length)) * 100;
  
  // Combine both scores (Jaccard is more important)
  const finalSimilarity = (jaccardSimilarity * 0.7) + (orderSimilarity * 0.3);
  
  return Math.round(finalSimilarity);
}

/**
 * Detect specific issues with a reference
 */
function detectIssues(original, match, titleSimilarity, yearMatch) {
  const issues = [];
  
  // Title mismatch
  if (titleSimilarity < 80) {
    issues.push(`Title mismatch (${titleSimilarity}% match)`);
  }
  
  // Year mismatch
  if (!yearMatch && match.publication_year) {
    issues.push(`Year mismatch: ${original.year} vs ${match.publication_year}`);
  }
  
  // Missing DOI
  if (!match.doi && !original.doi) {
    issues.push('No DOI found');
  }
  
  // Check for common fake reference patterns
  if (detectFakePatterns(original)) {
    issues.push('⚠️ SUSPICIOUS - May be fake or AI-generated');
  }
  
  return issues;
}

/**
 * Detect patterns that suggest a fake/AI-generated reference
 */
function detectFakePatterns(reference) {
  const title = reference.title.toLowerCase();
  const authors = reference.authors.toLowerCase();
  
  // Check for nonsense author names
  if (/[0-9]{3,}|mohahs|xxxxx|test|fake|dummy/.test(authors)) {
    return true;
  }
  
  // Check for gibberish in title
  if (/xxxxxxx|testing|dummy|placeholder/.test(title)) {
    return true;
  }
  
  // Check for impossible years
  if (reference.year > new Date().getFullYear() + 1 || reference.year < 1900) {
    return true;
  }
  
  return false;
}
