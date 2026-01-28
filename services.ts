
import { Reference } from "./types";
import { getCachedOpenAlexResponse, cacheOpenAlexResponse } from "./db-service";

// Environment-configured keys with safe fallbacks
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const OPENALEX_API_KEY = (process.env.OPENALEX_API_KEY || "").trim();
const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();

// OpenAI API base URL
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Lazy initialization to avoid throwing at module import time
function getOpenAiClient() {
  if (!OPENAI_API_KEY) return null;
  return { apiKey: OPENAI_API_KEY };
}

/**
 * Sends an email using Resend.com with basic error handling
 */
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    if (!RESEND_API_KEY) {
      return { success: false, error: { message: "Missing RESEND_API_KEY. Configure it in .env.local" } };
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CheckMyBib <admin@khabeerk.com>",
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Verifies a reference using multi-API strategy (OpenAlex → Crossref → Semantic Scholar)
 * This is the main verification entry point with intelligent fallback
 */
export async function verifyWithOpenAlex(ref: Reference): Promise<Partial<Reference>> {
  if (!ref || !ref.title) return { status: 'not_found', confidence: 0 };

  console.log(`\n🔍 Verifying: "${ref.title}"`);

  // Strategy 1: Try OpenAlex (primary source - most reliable for academic papers)
  let result = await tryOpenAlex(ref);
  if (result.status !== 'not_found' && result.confidence && result.confidence >= 60) {
    console.log(`✓ OpenAlex found match (${result.confidence}% confidence)`);
    return result;
  }
  
  // Strategy 2: Fallback to Crossref (excellent for journal articles and DOIs)
  console.log(`⚠️ OpenAlex confidence low (${result.confidence || 0}%), trying Crossref...`);
  result = await tryCrossref(ref);
  if (result.status !== 'not_found' && result.confidence && result.confidence >= 60) {
    console.log(`✓ Crossref found match (${result.confidence}% confidence)`);
    return result;
  }
  
  // Strategy 3: Final fallback to Semantic Scholar (good for CS papers)
  console.log(`⚠️ Crossref confidence low (${result.confidence || 0}%), trying Semantic Scholar...`);
  result = await trySemanticScholar(ref);
  if (result.status !== 'not_found') {
    console.log(`✓ Semantic Scholar found match (${result.confidence}% confidence)`);
    return result;
  }

  // All APIs failed
  console.log(`❌ No match found in any API`);
  return { status: 'not_found', issues: ['NOT FOUND IN ANY REGISTRY'], confidence: 0 };
}

/**
 * Try OpenAlex API with multi-strategy search
 */
async function tryOpenAlex(ref: Reference): Promise<Partial<Reference>> {
  try {
    if (!OPENALEX_API_KEY) {
      console.log('[OpenAlex] API key missing, skipping');
      return { status: 'not_found', confidence: 0 };
    }

    // Strategy 1: Try DOI first (most reliable)
    if (ref.doi) {
      const doiResult = await searchByDOI(ref.doi, ref);
      if (doiResult && doiResult.status !== 'not_found') {
        return doiResult;
      }
    }

    // Check cache for title search
    const cacheKey = normalizeCacheKey(ref.title);
    const cachedResponse = await getCachedOpenAlexResponse(cacheKey);
    if (cachedResponse) {
      return processOpenAlexResponse(cachedResponse, ref);
    }

    // Strategy 2: Enhanced title search with multiple attempts
    let data = null;
    
    // Attempt 1: Exact title search
    data = await searchOpenAlex(ref.title);
    
    // Attempt 2: If no results, try normalized title (remove special chars, extra words)
    if (!data.results || data.results.length === 0) {
      const normalizedTitle = normalizeSearchTitle(ref.title);
      console.log(`[OpenAlex] Retry with normalized title: "${normalizedTitle}"`);
      data = await searchOpenAlex(normalizedTitle);
    }
    
    // Attempt 3: If still no results and we have author+year, try combined search
    if ((!data.results || data.results.length === 0) && ref.authors && ref.year) {
      const firstAuthor = extractFirstAuthor(ref.authors);
      const combinedQuery = `${normalizeSearchTitle(ref.title)} ${firstAuthor} ${ref.year}`;
      console.log(`[OpenAlex] Retry with author+year: "${combinedQuery}"`);
      data = await searchOpenAlex(combinedQuery);
    }
    
    // Cache the response if we found results
    if (data.results && data.results.length > 0) {
      await cacheOpenAlexResponse(cacheKey, data);
    }

    return processOpenAlexResponse(data, ref);
  } catch (error) {
    console.error("[OpenAlex] Error:", error);
    return { status: 'warning', issues: ['OPENALEX ERROR'], confidence: 0 };
  }
}

/**
 * Try Crossref API as fallback
 */
async function tryCrossref(ref: Reference): Promise<Partial<Reference>> {
  try {
    const CROSSREF_EMAIL = 'verify@checkmybib.ai'; // Polite pool access
    
    // Strategy 1: Search by DOI first
    if (ref.doi) {
      const cleanDoi = ref.doi.replace('https://doi.org/', '').replace('http://doi.org/', '').trim();
      const url = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;
      
      try {
        const response = await fetch(url, {
          headers: { 'mailto': CROSSREF_EMAIL }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[Crossref] ✓ Found by DOI: "${data.message.title[0]}"`);
          return processCrossrefResponse({ message: { items: [data.message] } }, ref);
        }
      } catch (e) {
        // DOI not found, try title search
      }
    }
    
    // Strategy 2: Search by title
    const url = `https://api.crossref.org/works?query.title=${encodeURIComponent(ref.title)}&rows=5`;
    const response = await fetch(url, {
      headers: { 'mailto': CROSSREF_EMAIL }
    });
    
    if (!response.ok) {
      console.log(`[Crossref] API error: ${response.status}`);
      return { status: 'not_found', confidence: 0 };
    }
    
    const data = await response.json();
    return processCrossrefResponse(data, ref);
  } catch (error) {
    console.error("[Crossref] Error:", error);
    return { status: 'warning', issues: ['CROSSREF ERROR'], confidence: 0 };
  }
}

/**
 * Try Semantic Scholar API as final fallback
 */
async function trySemanticScholar(ref: Reference): Promise<Partial<Reference>> {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(ref.title)}&fields=title,year,doi,authors,venue,publicationTypes,isOpenAccess,fieldsOfStudy&limit=5`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`[Semantic Scholar] API error: ${response.status}`);
      return { status: 'not_found', confidence: 0 };
    }
    
    const data = await response.json();
    return processSemanticScholarResponse(data, ref);
  } catch (error) {
    console.error("[Semantic Scholar] Error:", error);
    return { status: 'warning', issues: ['SEMANTIC SCHOLAR ERROR'], confidence: 0 };
  }
}

/**
 * Search OpenAlex by DOI
 */
async function searchByDOI(doi: string, ref: Reference): Promise<Partial<Reference> | null> {
  try {
    const cleanDoi = doi.replace('https://doi.org/', '').replace('http://doi.org/', '').trim();
    const url = `https://api.openalex.org/works?filter=doi:${encodeURIComponent(cleanDoi)}`;
    
    console.log(`[OpenAlex] Searching by DOI: ${cleanDoi}`);
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      console.log(`[OpenAlex] ✓ Found by DOI: "${data.results[0].display_name}"`);
      return processOpenAlexResponse(data, ref);
    }
    return null;
  } catch (error) {
    console.error('[OpenAlex] DOI search error:', error);
    return null;
  }
}

/**
 * Search OpenAlex API with query
 */
async function searchOpenAlex(query: string): Promise<any> {
  const encodedQuery = encodeURIComponent(query.trim());
  const url = `https://api.openalex.org/works?search=${encodedQuery}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Registry error: ${response.status}`);
  
  return await response.json();
}

/**
 * Normalize title for better search results
 * Removes common academic stopwords and special characters
 */
function normalizeSearchTitle(title: string): string {
  return title
    .replace(/[:\-–—()\[\]{}"'`]/g, ' ')  // Remove special punctuation
    .replace(/\b(a|an|the|of|for|in|on|at|to|with|by|from|and|or|using|based)\b/gi, ' ')  // Remove stopwords
    .replace(/\s+/g, ' ')  // Collapse spaces
    .trim();
}

/**
 * Extract first author from author string
 */
function extractFirstAuthor(authors: string): string {
  // Handle "LastName, FirstName" or "FirstName LastName"
  const firstAuthor = authors.split(/[;,]|\band\b/i)[0].trim();
  // Return last name only
  const parts = firstAuthor.split(/\s+/);
  return parts[parts.length - 1]; // Last word is usually surname
}

/**
 * Normalize cache key for consistent caching
 */
function normalizeCacheKey(title: string): string {
  return title.toLowerCase().trim();
}

/**
 * Process OpenAlex API response
 */
function processOpenAlexResponse(data: any, ref: Reference): Partial<Reference> {
  if (!data.results || data.results.length === 0) {
    return { status: 'not_found', issues: ['NOT FOUND IN REGISTRY'], confidence: 0 };
  }

  const bestMatch = data.results[0];
  const canonicalTitle = bestMatch.display_name;
  const canonicalYear = bestMatch.publication_year;
  const doi = bestMatch.doi;
  const venue = bestMatch.primary_location?.source?.display_name || "Unknown Venue";
  
  // Enhanced peer review and preprint detection
  const sourceType = bestMatch.primary_location?.source?.type;
  const venueLower = venue.toLowerCase();
  
  // Known preprint servers and repositories
  const preprintIndicators = [
    'arxiv', 'biorxiv', 'medrxiv', 'chemrxiv', 'ssrn',
    'preprint', 'repository', 'osf preprints', 'research square',
    'authorea', 'zenodo', 'figshare', 'psyarxiv', 'socarxiv',
    'engrxiv', 'techrxiv', 'eartharxiv'
  ];
  
  const isPreprint = sourceType === 'repository' || 
                     preprintIndicators.some(indicator => venueLower.includes(indicator));
  
  // Peer-reviewed journals typically have type 'journal'
  const isPeerReviewed = sourceType === 'journal' && !isPreprint;
  
  // Enhanced title similarity calculation with word-level matching
  const titleSimilarity = calculateTitleSimilarity(ref.title, canonicalTitle);
  
  // Determine if titles match (>70% similarity or substring match)
  const cleanInput = ref.title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanFound = canonicalTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  const isSubstringMatch = cleanFound.includes(cleanInput) || cleanInput.includes(cleanFound);
  
  const titleScore = isSubstringMatch ? 1.0 : (titleSimilarity >= 70 ? 0.9 : titleSimilarity >= 50 ? 0.7 : 0.4);
  const yearScore = Math.abs(canonicalYear - ref.year) === 0 ? 1.0 : Math.abs(canonicalYear - ref.year) <= 1 ? 0.8 : 0.3;
  const finalConfidence = Math.round(((titleScore * 0.7) + (yearScore * 0.3)) * 100);
  
  console.log(`[OpenAlex] Match quality: Title=${titleSimilarity.toFixed(1)}%, TitleScore=${titleScore.toFixed(2)}, Year=${ref.year}/${canonicalYear}, Confidence=${finalConfidence}%`);

  const issues: string[] = [];
  if (titleScore < 1) issues.push("TITLE MISMATCH");
  if (yearScore < 1) issues.push("YEAR DISCREPANCY");
  if (!ref.doi && doi) issues.push("ADD DOI");
  if (!ref.source && venue) issues.push("ADD VENUE");
  
  // CRITICAL: Check for retraction (OpenAlex provides this from Retraction Watch data)
  if (bestMatch.is_retracted) {
    issues.push("🚨 RETRACTED PAPER - DO NOT CITE");
  }
  
  // Check for preprints/non-peer-reviewed work
  if (isPreprint) {
    issues.push("📄 PREPRINT - Not Peer-Reviewed");
  } else if (!isPeerReviewed && sourceType !== 'journal') {
    issues.push("⚠️ UNVERIFIED - Review Status Unknown");
  }

  return {
    status: bestMatch.is_retracted ? 'retracted' : (issues.length === 0 ? 'verified' : (issues.length >= 2 || titleScore < 0.7) ? 'issue' : 'warning'),
    issues: issues,
    confidence: finalConfidence,
    canonicalTitle,
    canonicalYear,
    doi: doi?.replace('https://doi.org/', '') || ref.doi,
    venue
  };
}

/**
 * Calculate title similarity using word-level Jaccard + fuzzy matching
 * Returns 0-100 percentage
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  if (!title1 || !title2) return 0;
  
  // Normalize both titles
  const normalize = (str: string) => str.toLowerCase()
    .replace(/[:\-–—()\[\]{}"'`]/g, ' ')
    .replace(/\b(a|an|the|of|for|in|on|at|to|with|by|from|and|or)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const s1 = normalize(title1);
  const s2 = normalize(title2);
  
  if (s1 === s2) return 100;
  
  // Check substring match (handles titles with subtitles)
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length < s2.length ? s2 : s1;
    return Math.round((shorter.length / longer.length) * 100);
  }
  
  // Word-level Jaccard similarity
  const words1 = s1.split(/\s+/).filter(w => w.length > 2);
  const words2 = s2.split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  let matchCount = 0;
  for (const word of set1) {
    if (set2.has(word)) {
      matchCount++;
    }
  }
  
  // Also count partial matches for typos/abbreviations
  let partialMatches = 0;
  for (const word1 of set1) {
    if (set2.has(word1)) continue; // Already counted
    for (const word2 of set2) {
      if (word1.length >= 4 && word2.length >= 4) {
        if (word1.includes(word2) || word2.includes(word1)) {
          partialMatches += 0.5;
        }
      }
    }
  }
  
  matchCount += partialMatches;
  const unionSize = set1.size + set2.size - matchCount;
  return Math.round((matchCount / unionSize) * 100);
}

/**
 * AI analysis of the metadata discrepancy using OpenAI
 */
export async function getAiVerificationInsight(ref: Reference): Promise<string> {
  try {
    const client = getOpenAiClient();
    if (!client) {
      return "AI Diagnostic unavailable. Please set OPENAI_API_KEY in .env and restart the dev server.";
    }
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an academic bibliography verification expert. Provide concise, professional diagnostics.'
          },
          {
            role: 'user',
            content: `Audit Analysis:\nTarget Paper: "${ref.title}" (${ref.year})\nRegistry Match: "${ref.canonicalTitle || 'None'}" (${ref.canonicalYear || 'N/A'})\nFlags: ${ref.issues?.join(', ') || 'None'}\n\nProvide a professional, 2-sentence diagnostic. Be specific about whether this is a minor naming convention issue or a serious citation error. If retracted, state it clearly.`
          }
        ],
        max_tokens: 150,
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return "AI service error. Please review the metadata manually.";
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Discrepancy detected. Manual validation against the DOI landing page is recommended.";
  } catch (error) {
    console.error('AI verification error:', error);
    return "AI Insight service temporarily unavailable. Please review the year and title for common typos.";
  }
}
