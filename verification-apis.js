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

    // EXTREMELY PERMISSIVE: 20% threshold
    // Accept any reasonable match - better false positive than false negative
    if (titleSimilarity < 20) {
      console.log(`   ⚠️ OpenAlex: Title similarity too low (${titleSimilarity}%) - rejecting match`);
      console.log(`      Your title: "${reference.title}"`);
      console.log(`      Found title: "${match.title}"`);
      return { source: 'OpenAlex', found: false, confidence: 0 };
    }
    
    // BOOST confidence if DOI matches
    if (reference.doi && match.doi) {
      const doi1 = reference.doi.toLowerCase().replace(/[^0-9./]/g, '');
      const doi2 = match.doi.toLowerCase().replace(/[^0-9./]/g, '');
      if (doi1 === doi2 || doi1.includes(doi2) || doi2.includes(doi1)) {
        console.log(`   🎯 OpenAlex: DOI MATCH FOUND - Boosting confidence to 100%`);
        titleSimilarity = 100; // Override with perfect score
      }
    }
    
    // Log match for debugging
    console.log(`   ✅ OpenAlex: Found match (${titleSimilarity}% similarity)`);
    console.log(`      Your title: "${reference.title}"`);
    console.log(`      Found title: "${match.title}"`);

    // Extract ALL authors from OpenAlex
    const allAuthors = match.authorships?.map(a => a.author.display_name).filter(Boolean) || [];
    console.log(`   📚 OpenAlex found ${allAuthors.length} authors:`, allAuthors);

    // Extract rich metadata for better export
    const metadata = {
      publisher: match.primary_location?.source?.publisher,
      pages: match.biblio?.first_page && match.biblio?.last_page ? `${match.biblio.first_page}--${match.biblio.last_page}` : match.biblio?.first_page,
      volume: match.biblio?.volume,
      issue: match.biblio?.issue,
      editor: match.authorships?.filter(a => a.author_position === 'editor').map(a => a.author.display_name).join(' and '),
      is_conference: match.type === 'proceedings-article' || match.type === 'conference-proceedings',
      month: match.publication_date ? new Date(match.publication_date).toLocaleString('en-US', { month: 'short' }).toLowerCase() : null,
    };

    return {
      source: 'OpenAlex',
      found: true,
      confidence: titleSimilarity,
      canonical_title: match.title,
      canonical_authors: allAuthors.join(' and '), // BibTeX uses ' and '
      canonical_year: match.publication_year,
      doi: match.doi ? match.doi.replace('https://doi.org/', '').replace('DOI:', '').trim() : null,
      is_retracted: match.is_retracted || false,
      cited_by_count: match.cited_by_count || 0,
      venue: match.primary_location?.source?.display_name,
      bibtex_type: match.type === 'proceedings-article' ? 'inproceedings' : 'article',
      metadata,
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

    // EXTREMELY PERMISSIVE: 20% threshold
    if (titleSimilarity < 35) {
      console.log(`   ⚠️ Crossref: Title similarity too low (${titleSimilarity}%) - rejecting match`);
      return { source: 'Crossref', found: false, confidence: 0 };
    }
    
    // BOOST confidence if DOI matches
    if (reference.doi && match.DOI) {
      const doi1 = reference.doi.toLowerCase().replace(/[^0-9./]/g, '');
      const doi2 = match.DOI.toLowerCase().replace(/[^0-9./]/g, '');
      if (doi1 === doi2 || doi1.includes(doi2) || doi2.includes(doi1)) {
        console.log(`   🎯 Crossref: DOI MATCH FOUND - Boosting confidence to 100%`);
        titleSimilarity = 100;
      }
    }
    
    // Log match for debugging
    console.log(`   ✅ Crossref: Found match (${titleSimilarity}% similarity)`);

    // Extract ALL authors from Crossref
    const allAuthors = match.author?.map(a => {
      const given = a.given || '';
      const family = a.family || '';
      return `${given} ${family}`.trim();
    }).filter(Boolean) || [];
    console.log(`   📚 Crossref found ${allAuthors.length} authors:`, allAuthors);

    // Extract rich metadata from Crossref
    const metadata = {
      publisher: match.publisher,
      pages: match.page,
      volume: match.volume,
      issue: match.issue,
      container_title: match.container?.[0] || match['container-title']?.[0],
      is_conference: match.type?.includes('proceedings-article') || match.type?.includes('conference'),
    };

    return {
      source: 'Crossref',
      found: true,
      confidence: titleSimilarity,
      canonical_title: match.title?.[0],
      canonical_authors: allAuthors.join(' and '), // BibTeX format
      canonical_year: parseInt(match.published?.['date-parts']?.[0]?.[0]),
      doi: match.DOI,
      venue: match.container?.[0] || match['container-title']?.[0],
      bibtex_type: (match.type?.includes('proceedings') || match.type?.includes('conference')) ? 'inproceedings' : 'article',
      metadata,
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
    const titleSimilarity = calculateSimilarity(reference.title, match.title || '');
    const yearMatch = reference.year === match.year;

    // EXTREMELY PERMISSIVE: 20% threshold
    if (titleSimilarity < 35) {
      console.log(`   ⚠️ Semantic Scholar: Title similarity too low (${titleSimilarity}%) - rejecting match`);
      return { source: 'Semantic Scholar', found: false, confidence: 0 };
    }
    
    // BOOST confidence if DOI matches
    if (reference.doi && match.externalIds?.DOI) {
      const doi1 = reference.doi.toLowerCase().replace(/[^0-9./]/g, '');
      const doi2 = match.externalIds.DOI.toLowerCase().replace(/[^0-9./]/g, '');
      if (doi1 === doi2 || doi1.includes(doi2) || doi2.includes(doi1)) {
        console.log(`   🎯 Semantic Scholar: DOI MATCH FOUND - Boosting confidence to 100%`);
        titleSimilarity = 100;
      }
    }
    
    // Log match for debugging
    console.log(`   ✅ Semantic Scholar: Found match (${titleSimilarity}% similarity)`);

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
  console.log(`🔍 Cross-validating: "${reference.title?.substring(0, 50) || 'No title'}..."`);

  // VALIDATION: Check if reference has garbage data from poor PDF extraction
  const hasGarbageTitle = !reference.title ||
    reference.title.length < 10 ||
    reference.title.toLowerCase().includes('doi:') ||
    reference.title.toLowerCase().startsWith('doi') ||
    reference.title.match(/^https?:\/\//i) ||
    reference.title.match(/^\d+\.\d+\//); // Looks like "10.1002/..."

  const hasGarbageAuthors = !reference.authors ||
    reference.authors.length < 3 ||
    reference.authors.toLowerCase() === 'unknown' ||
    reference.authors.toLowerCase() === 'et al.' ||
    reference.authors.toLowerCase() === 'et al';

  if (hasGarbageTitle || hasGarbageAuthors) {
    console.warn(`⚠️ SKIPPING verification - poor extraction quality:`);
    console.warn(`   Title: "${reference.title}" (garbage: ${hasGarbageTitle})`);
    console.warn(`   Authors: "${reference.authors}" (garbage: ${hasGarbageAuthors})`);

    return {
      status: 'warning',
      confidence: 0,
      issues: ['⚠️ EXTRACTION ERROR - Reference data appears malformed or incomplete. Please check original document.'],
      verified_by: [],
      canonical_title: null,
      canonical_authors: null,
      canonical_year: null,
      doi: reference.doi || null, // Keep DOI if it was extracted
      venue: null,
      cited_by_count: null,
      is_retracted: false,
      all_results: []
    };
  }

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

  // Check for AI-generated/fake reference patterns
  const fakePatterns = detectFakePatterns(reference);
  const hasFakePatterns = fakePatterns.length > 0;

  // Aggregate results
  if (foundCount === 0) {
    // NO APIs found this reference - highly suspicious!
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

    return {
      status: 'not_found',
      confidence: 0,
      issues: issues,
      verified_by: [],
      canonical_title: null,
      canonical_authors: null,
      canonical_year: null,
      doi: null,
      venue: null,
      cited_by_count: 0,
      is_retracted: false,
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

  // Use issues ONLY from the best result to avoid contamination from bad matches
  // (e.g. if Semantic Scholar found a 2017 paper but OpenAlex found the correct 2007 paper,
  // we don't want the 'Year mismatch' error from Semantic Scholar)
  const allIssues = [...(bestResult.issues || [])];

  // Generate detailed confidence explanation
  const confidenceFactors = generateConfidenceExplanation(
    bestResult.confidence,
    reference.year === bestResult.canonical_year,
    true, // authorMatch will be enhanced
    foundCount
  );

  // Add confidence breakdown to issues for low confidence matches
  if (bestResult.confidence < 50) {
    allIssues.push('📊 LOW CONFIDENCE BREAKDOWN:');
    confidenceFactors.forEach(factor => allIssues.push(`   ${factor}`));
  }

  // Determine overall status
  let status = 'verified';
  let overallConfidence = bestResult.confidence;

  // If not the same paper, don't suggest corrections - mark as suspicious
  if (!isSamePaper) {
    // The API found a DIFFERENT paper - this is suspicious!
    console.warn(`⚠️ WARNING: API found different paper. Original may be fake.`);

    return {
      status: 'not_found',
      confidence: 0,
      canonical_title: null,
      canonical_authors: null,
      canonical_year: null,
      doi: null,
      venue: null,
      cited_by_count: 0,
      is_retracted: false,
      issues: [
        '❌ NOT FOUND - No matching paper in academic databases',
        `⚠️ API found a different paper: "${bestResult.canonical_title?.substring(0, 80)}..."`,
        '🚨 This reference may be fake, AI-generated, or severely misspelled',
        ...(hasFakePatterns ? ['🤖 AI-generated content patterns detected:', ...fakePatterns.map(p => `   • ${p}`)] : [])
      ],
      verified_by: [],
      all_results: results,
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
    bibtex_type: bestResult.bibtex_type || 'article',
    metadata: bestResult.metadata || {},
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
  // RULE 1: If DOIs match exactly - definitely the same paper (HIGHEST PRIORITY)
  if (originalReference.doi && foundResult.doi) {
    const doi1 = originalReference.doi.toLowerCase().trim()
      .replace('https://doi.org/', '')
      .replace('http://doi.org/', '')
      .replace('doi:', '')
      .replace(/\s+/g, '');
    const doi2 = foundResult.doi.toLowerCase().trim()
      .replace('https://doi.org/', '')
      .replace('http://doi.org/', '')
      .replace('doi:', '')
      .replace(/\s+/g, '');

    if (doi1 === doi2 || doi1.includes(doi2) || doi2.includes(doi1)) {
      console.log(`   ✅ DOI MATCH (EXACT OR PARTIAL) - Same paper: ${doi1}`);
      return true;
    }
  }
  
  // RULE 1B: If API found DOI but user didn't provide one, check title+year match
  // This handles incomplete user references
  if (!originalReference.doi && foundResult.doi) {
    console.log(`   ℹ️ API found DOI but user didn't provide - checking title/year...`);
  }

  // RULE 2: No DOI, but need STRONG evidence (title + author + year)
  const titleSimilarity = calculateSimilarity(originalReference.title, foundResult.canonical_title);
  const yearMatch = originalReference.year === foundResult.canonical_year;

  // Check author overlap (but handle "et al." cases)
  let authorMatch = false;
  if (originalReference.authors && foundResult.canonical_authors) {
    const authorSplitRegex = /\s+(?:and|AND)\s+|[,;&]/;
    const originalAuthors = originalReference.authors.toLowerCase().split(authorSplitRegex).map(a => a.trim());
    const foundAuthors = foundResult.canonical_authors.toLowerCase().split(authorSplitRegex).map(a => a.trim());

    // SPECIAL CASE: If original has "et al." - trust the API result
    const hasEtAl = originalReference.authors.toLowerCase().includes('et al');
    if (hasEtAl && foundAuthors.length >= 3) {
      // If original shows "Dada et al." and API finds multiple authors starting with similar name
      const firstOriginalAuthor = originalAuthors[0].replace(/et al\.?/gi, '').trim();
      const firstFoundAuthor = foundAuthors[0];

      // Check if first author matches (allowing for partial matches)
      if (firstFoundAuthor.includes(firstOriginalAuthor) || firstOriginalAuthor.includes(firstFoundAuthor)) {
        console.log(`   ✅ First author match with "et al." - accepting full author list`);
        authorMatch = true;
      }
    } else {
      // Normal author matching
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
      authorMatch = overlapPercentage >= 40; // Lowered from 50% to 40%

      console.log(`   📊 Author overlap: ${overlapPercentage.toFixed(0)}% (${matchCount}/${Math.min(originalAuthors.length, foundAuthors.length)} authors)`);
    }
  }

  console.log(`   📊 Title similarity: ${titleSimilarity.toFixed(0)}%`);
  console.log(`   📊 Year match: ${yearMatch ? 'YES' : 'NO'} (${originalReference.year} vs ${foundResult.canonical_year})`);
  console.log(`   📊 Author match: ${authorMatch ? 'YES' : 'NO'}`);

  // EXTREMELY RELAXED RULES (minimal false negatives):
  // Option 1: Even moderate title + year is good enough
  if (titleSimilarity > 50 && yearMatch) {
    console.log(`   ✅ MODERATE TITLE + YEAR - Same paper`);
    return true;
  }

  // Option 2: High title + author (year can differ)
  if (titleSimilarity > 75 && authorMatch) {
    console.log(`   ✅ HIGH TITLE + AUTHOR - Same paper`);
    return true;
  }

  // Option 3: Low bar for all three matching
  if (titleSimilarity > 45 && yearMatch && authorMatch) {
    console.log(`   ✅ WEAK MATCH BUT ALL FACTORS ALIGN - Same paper`);
    return true;
  }
  
  // Option 4: Year off by 1-2 but decent title
  if (titleSimilarity > 60 && Math.abs(originalReference.year - foundResult.canonical_year) <= 2 && authorMatch) {
    console.log(`   ✅ GOOD TITLE - Same paper (year off by 1-2)`);
    return true;
  }
  
  // Option 5: API has DOI and moderate title match
  if (foundResult.doi && titleSimilarity > 55 && yearMatch) {
    console.log(`   ✅ API HAS DOI + DECENT MATCH - Same paper`);
    return true;
  }
  
  // Option 6: Very low threshold if year and author both match
  if (titleSimilarity > 35 && yearMatch && authorMatch) {
    console.log(`   ✅ LOW TITLE BUT YEAR+AUTHOR MATCH - Same paper`);
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
 * IMPROVED: More forgiving for academic paper titles with subtitles, special formatting
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  // Normalize: lowercase, trim, remove common stopwords and special chars
  const normalize = (str) => str.toLowerCase()
    .trim()
    // Remove special punctuation but keep spaces
    .replace(/[:\-–—()\[\]{}"'`]/g, ' ')
    // Remove common academic words that don't help matching
    .replace(/\b(a|an|the|of|for|in|on|at|to|with|by|from|and|or)\b/gi, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  const s1 = normalize(str1);
  const s2 = normalize(str2);

  if (s1 === s2) return 100;

  // IMPROVEMENT 1: Check if one is substring of the other (handles subtitles)
  // "SMS Phishing" should match "SMS Phishing Based on Arabic Text"
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length < s2.length ? s2 : s1;
    return Math.round((shorter.length / longer.length) * 100);
  }

  // Extract words (keep words with 2+ chars, including numbers)
  const words1 = s1.split(/\s+/).filter(w => w.length > 1 && /[a-z0-9]/.test(w));
  const words2 = s2.split(/\s+/).filter(w => w.length > 1 && /[a-z0-9]/.test(w));

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

  // IMPROVEMENT 2: Also count partial word matches (for abbreviations, typos)
  let partialMatches = 0;
  for (const word1 of set1) {
    for (const word2 of set2) {
      if (word1.length >= 4 && word2.length >= 4) {
        // Check if words overlap significantly (>70%)
        const shorter = word1.length < word2.length ? word1 : word2;
        const longer = word1.length < word2.length ? word2 : word1;
        if (longer.includes(shorter) || shorter.includes(longer)) {
          partialMatches += 0.5; // Half credit for partial match
        }
      }
    }
  }

  matchCount += partialMatches;

  // Jaccard similarity: intersection / union
  const unionSize = set1.size + set2.size - matchCount;
  const jaccardSimilarity = (matchCount / unionSize) * 100;

  // Also check word order similarity (for exact phrase matching)
  let orderMatchCount = 0;
  const minLength = Math.min(words1.length, words2.length);
  for (let i = 0; i < minLength; i++) {
    if (words1[i] === words2[i]) {
      orderMatchCount++;
    }
  }
  const orderSimilarity = (orderMatchCount / Math.max(words1.length, words2.length)) * 100;

  // Combine scores (Jaccard more important, but order matters too)
  const finalSimilarity = (jaccardSimilarity * 0.7) + (orderSimilarity * 0.3);

  return Math.round(finalSimilarity);
}

/**
 * Detect specific issues with a reference and provide detailed confidence breakdown
 */
function detectIssues(original, match, titleSimilarity, yearMatch) {
  const issues = [];

  // Title mismatch - with severity levels
  if (titleSimilarity < 80) {
    if (titleSimilarity < 30) {
      issues.push(`❌ Critical: Title completely different (${titleSimilarity}% match) - Likely a different paper or severe typo`);
    } else if (titleSimilarity < 60) {
      issues.push(`⚠️ Major: Significant title mismatch (${titleSimilarity}% match) - Check for missing words or incorrect title`);
    } else {
      issues.push(`⚠️ Minor: Title differs slightly (${titleSimilarity}% match) - Possible typo or abbreviation`);
    }
  }

  // Year mismatch
  // Year mismatch - Ensure we compare numbers and ignore if years are identical
  if (match.publication_year && Number(original.year) !== Number(match.publication_year)) {
    const yearDiff = Math.abs(Number(original.year) - Number(match.publication_year));

    // Double check - sometimes the API might return the same year but strict check failed?
    // If diff is 0, don't report issue
    if (yearDiff > 0) {
      if (yearDiff > 5) {
        issues.push(`❌ Critical: Year completely wrong (${original.year} vs ${match.publication_year}) - ${yearDiff} years difference`);
      } else {
        issues.push(`⚠️ Minor: Year mismatch (${original.year} vs ${match.publication_year}) - Possible preprint/final version`);
      }
    }
  }

  // Missing DOI
  if (!match.doi && !original.doi) {
    issues.push('ℹ️ Info: No DOI found - Consider adding for better tracking');
  }

  // Check for common fake reference patterns
  const fakePatterns = detectFakePatterns(original);
  if (fakePatterns.length > 0) {
    issues.push('⚠️ SUSPICIOUS PATTERNS DETECTED:');
    fakePatterns.forEach(pattern => issues.push(`   • ${pattern}`));
  }

  return issues;
}

/**
 * Generate detailed confidence explanation
 */
function generateConfidenceExplanation(titleSimilarity, yearMatch, authorMatch, foundCount) {
  const factors = [];

  // Title factor (40% weight)
  if (titleSimilarity >= 90) {
    factors.push(`✅ Title: Excellent match (${titleSimilarity}%)`);
  } else if (titleSimilarity >= 70) {
    factors.push(`⚠️ Title: Good match (${titleSimilarity}%)`);
  } else if (titleSimilarity >= 50) {
    factors.push(`⚠️ Title: Weak match (${titleSimilarity}%)`);
  } else {
    factors.push(`❌ Title: Poor match (${titleSimilarity}%) - Major concern`);
  }

  // Year factor (20% weight)
  if (yearMatch) {
    factors.push(`✅ Year: Exact match`);
  } else {
    factors.push(`❌ Year: Mismatch - Reduces confidence by 20%`);
  }

  // Author factor (20% weight)
  if (authorMatch) {
    factors.push(`✅ Authors: Match found`);
  } else {
    factors.push(`⚠️ Authors: No clear match - Reduces confidence by 20%`);
  }

  // Database consensus (20% weight)
  if (foundCount >= 3) {
    factors.push(`✅ Found in all 3 databases (OpenAlex, Crossref, Semantic Scholar)`);
  } else if (foundCount === 2) {
    factors.push(`⚠️ Found in only ${foundCount} databases - Less reliable`);
  } else {
    factors.push(`⚠️ Found in only 1 database - Low reliability`);
  }

  return factors;
}

/**
 * Detect patterns that suggest a fake/AI-generated reference
 * Returns array of detected suspicious patterns
 */
function detectFakePatterns(reference) {
  const patterns = [];
  const title = reference.title.toLowerCase();
  const authors = (reference.authors || '').toLowerCase();
  const year = reference.year;

  // 1. AI-GENERATED TITLE PATTERNS
  // Common patterns in AI-generated academic titles
  const aiTitlePatterns = [
    { pattern: /synthetic\s+(benchmark|dataset|evaluation|analysis)/i, msg: 'Contains "Synthetic" + technical term (common in AI-generated papers)' },
    { pattern: /ablation[- ]driven/i, msg: 'Contains "Ablation-Driven" (uncommon phrasing, possibly AI-generated)' },
    { pattern: /comprehensive\s+survey\s+of\s+\w+\s+in\s+the\s+era\s+of/i, msg: 'Overly generic survey title pattern' },
    { pattern: /towards?\s+(a\s+)?better\s+understanding/i, msg: 'Generic "Towards Better Understanding" pattern' },
    { pattern: /novel\s+approach\s+(for|to)\s+\w+\s+using/i, msg: 'Generic "Novel Approach" pattern' },
    { pattern: /deep\s+learning[- ]based\s+\w+\s+for\s+\w+/i, msg: 'Generic "Deep Learning-based X for Y" pattern' },
  ];

  aiTitlePatterns.forEach(({ pattern, msg }) => {
    if (pattern.test(reference.title)) {
      patterns.push(msg);
    }
  });

  // 2. OVERLY BUZZWORD-HEAVY TITLES
  const buzzwords = ['synthetic', 'ablation', 'comprehensive', 'novel', 'advanced', 'intelligent', 'smart', 'efficient'];
  const buzzwordCount = buzzwords.filter(word => title.includes(word)).length;
  if (buzzwordCount >= 3) {
    patterns.push(`Title contains ${buzzwordCount} buzzwords (may be AI-generated)`);
  }

  // 3. SUSPICIOUS AUTHOR PATTERNS
  if (/[0-9]{3,}/.test(authors)) {
    patterns.push('Author names contain numbers (likely corrupted data)');
  }
  if (/mohahs|xxxxx|test|fake|dummy|placeholder|lorem|ipsum/.test(authors)) {
    patterns.push('Author names contain placeholder text');
  }
  if (authors.length < 3 && authors !== 'unknown') {
    patterns.push('Author field too short (likely extraction error)');
  }

  // 4. SUSPICIOUS TITLE PATTERNS
  if (/xxxxxxx|testing|dummy|placeholder|lorem|ipsum|sample|example/.test(title)) {
    patterns.push('Title contains placeholder text');
  }
  if (title.length < 15) {
    patterns.push('Title too short (likely incomplete or fake)');
  }
  if (title.length > 300) {
    patterns.push('Title unusually long (may be corrupted extraction)');
  }

  // 5. IMPOSSIBLE OR SUSPICIOUS METADATA
  const currentYear = new Date().getFullYear();
  if (year > currentYear + 1) {
    patterns.push(`Publication year (${year}) is in the future`);
  }
  if (year < 1900) {
    patterns.push(`Publication year (${year}) is before 1900`);
  }

  // 6. TITLE STRUCTURE ISSUES
  // Check for missing spaces (common in corrupted PDFs or fake data)
  if (/[a-z][A-Z]/.test(reference.title) && !reference.title.includes('PhD') && !reference.title.includes('USA')) {
    patterns.push('Title has unusual capitalization (possible extraction error)');
  }

  // 7. GENERIC CONFERENCE/WORKSHOP PATTERNS
  // AI often generates plausible-sounding but fake conference names
  if (/proceedings?\s+of\s+the\s+\d+(st|nd|rd|th)\s+\w+\s+workshop/i.test(reference.title)) {
    const confMatch = reference.title.match(/\d+(st|nd|rd|th)\s+(\w+\s+){1,3}workshop/i);
    if (confMatch) {
      patterns.push('Contains generic workshop naming pattern (verify conference exists)');
    }
  }

  // 8. YEAR-TITLE MISMATCH
  // Some AI-generated references use very recent years with old-sounding titles
  if (year >= 2020 && /legacy|traditional|classical|conventional/.test(title)) {
    // This is actually fine - just a weak signal
    // patterns.push('Recent year with old-sounding terminology');
  }

  return patterns;
}
