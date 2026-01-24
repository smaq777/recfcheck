
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
        from: "RefCheck <admin@khabeerk.com>",
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
 * Verifies a single reference against OpenAlex API with caching
 */
export async function verifyWithOpenAlex(ref: Reference): Promise<Partial<Reference>> {
  try {
    if (!OPENALEX_API_KEY) {
      return { status: 'warning', issues: ['OpenAlex key missing'], confidence: 0 };
    }
    if (!ref || !ref.title) return { status: 'not_found', confidence: 0 };

    // Check cache first
    const cachedResponse = await getCachedOpenAlexResponse(ref.title.trim());
    if (cachedResponse) {
      return processOpenAlexResponse(cachedResponse, ref);
    }

    const query = encodeURIComponent(ref.title.trim());
    const url = `https://api.openalex.org/works?search=${query}&api_key=${OPENALEX_API_KEY}&mailto=verify@refcheck.ai`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Registry error: ${response.status}`);
    
    const data = await response.json();
    
    // Cache the response for future use
    if (data.results && data.results.length > 0) {
      await cacheOpenAlexResponse(ref.title.trim(), data);
    }

    return processOpenAlexResponse(data, ref);
  } catch (error) {
    console.error("Verification Error:", error);
    return { status: 'warning', issues: ['NEEDS REVIEW'], confidence: 0 };
  }
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
  
  const cleanInput = ref.title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanFound = canonicalTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const titleScore = cleanFound.includes(cleanInput) || cleanInput.includes(cleanFound) ? 1.0 : 0.6;
  const yearScore = Math.abs(canonicalYear - ref.year) === 0 ? 1.0 : Math.abs(canonicalYear - ref.year) <= 1 ? 0.8 : 0.3;
  const finalConfidence = Math.round(((titleScore * 0.7) + (yearScore * 0.3)) * 100);

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
