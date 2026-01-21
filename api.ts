
import { GoogleGenAI } from "@google/genai";
import { Reference } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const OPENALEX_API_KEY = "Mg58OkzFTg3vrh3nEZpz7C";
const RESEND_API_KEY = "re_BsuJrREp_Hi9Jn69qR6nzE1mznwpZVkqm";

/**
 * Sends an email using Resend.com with basic error handling
 */
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RefCheck Audit <onboarding@resend.dev>",
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
 * Verifies a single reference against OpenAlex API
 * Implements better title normalization and proximity matching for years
 */
export async function verifyWithOpenAlex(ref: Reference): Promise<Partial<Reference>> {
  try {
    // Search by title is most effective for general bib entries
    const query = encodeURIComponent(ref.title.trim());
    const url = `https://api.openalex.org/works?search=${query}&api_key=${OPENALEX_API_KEY}&mailto=verify@refcheck.ai`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Registry unavailable: ${response.status}`);
    
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // Find the most likely candidate (first one is usually best for specific title searches)
      const bestMatch = data.results[0];
      const canonicalTitle = bestMatch.display_name;
      const canonicalYear = bestMatch.publication_year;
      const doi = bestMatch.doi;
      const venue = bestMatch.primary_location?.source?.display_name || "Unknown Venue";
      
      // Advanced normalization for matching
      const cleanInput = ref.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanFound = canonicalTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Calculate a simple match score
      const titleScore = cleanFound.includes(cleanInput) || cleanInput.includes(cleanFound) ? 1.0 : 0.6;
      const yearScore = Math.abs(canonicalYear - ref.year) === 0 ? 1.0 : Math.abs(canonicalYear - ref.year) <= 1 ? 0.8 : 0.3;
      const finalConfidence = Math.round(((titleScore * 0.7) + (yearScore * 0.3)) * 100);

      const issues: string[] = [];
      if (titleScore < 1) issues.push("Subtle Title Difference");
      if (yearScore < 1) issues.push("Year Discrepancy");
      if (!ref.doi && doi) issues.push("Registry DOI Available");
      if (bestMatch.is_retracted) issues.push("RETRACTED WORK");

      return {
        status: bestMatch.is_retracted ? 'retracted' : (issues.length === 0 ? 'verified' : issues.length > 2 ? 'issue' : 'warning'),
        issues,
        confidence: finalConfidence,
        canonicalTitle,
        canonicalYear,
        doi: doi?.replace('https://doi.org/', '') || ref.doi,
        venue
      };
    }
    
    return { status: 'warning', issues: ['No Registry Match'], confidence: 0 };
  } catch (error) {
    console.error("Verification Error:", error);
    return { status: 'warning', issues: ['Lookup Failed'], confidence: 0 };
  }
}

/**
 * AI analysis of the metadata discrepancy using Gemini
 */
export async function getAiVerificationInsight(ref: Reference): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Audit Analysis:
      Target Paper: "${ref.title}" (${ref.year})
      Registry Match: "${ref.canonicalTitle}" (${ref.canonicalYear})
      Flags: ${ref.issues?.join(', ')}
      
      Instructions: Provide a professional, 2-sentence diagnostic. Be specific about whether this is a minor naming convention issue or a serious citation error. If it is retracted, state it clearly.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Discrepancy detected. Manual validation against the DOI landing page is recommended.";
  } catch (error) {
    return "AI Insight service temporarily at capacity. Please review the year and title for common typos.";
  }
}
