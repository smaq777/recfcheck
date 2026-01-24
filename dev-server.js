/**
 * Local development API server for RefCheck
 * Handles /api/analyze and /api/results endpoints
 * Run alongside Vite dev server: npm run dev
 */

import http from "http";
import { fileURLToPath } from "url";
import { dirname } from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import pdfParse from "pdf-parse";
import { crossValidateReference } from "./verification-apis.js";
import { query } from "./db-connection.js";
import {
  createJob,
  getJobById,
  updateJobProgress,
  completeJob,
  createReference,
  getJobReferences,
  updateReferenceDecision,
  updateReferenceDuplicateStatus,
  deleteDuplicateReferences,
  deleteReference,
  logActivity,
  getUserByEmail,
  createUser,
  getUserJobs
} from "./db-queries.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Security configuration
const BCRYPT_SALT_ROUNDS = 12;

// Store active SSE connections for progress updates
const activeConnections = new Map(); // jobId -> response object

/**
 * Extract user ID from Authorization header (Bearer token or session)
 * In production, this would validate a JWT token
 */
function extractUserId(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.substring(7);
  }
  return null;
}

/**
 * Validate that user is authenticated
 */
function requireAuth(req) {
  const userId = extractUserId(req);
  if (!userId) {
    throw new Error('Unauthorized - No authentication token provided');
  }
  return userId;
}

// Mock file parser
async function parseFile(fileName, buffer) {
  if (fileName.endsWith(".bib")) {
    const content = buffer.toString('utf8');
    console.log('📝 Parsing .bib file...');
    console.log('📄 Content preview:', content.substring(0, 200));

    const references = [];

    // FORMAT 1: Check for LaTeX \bibitem format
    // \bibitem[Author(2025)]{Key} Author, S., 2025. Title. Journal.
    const bibitemPattern = /\\bibitem\[([^\]]+)\]\{([^}]+)\}\s*([^\n]+(?:\n(?!\\bibitem)[^\n]+)*)/g;
    let match;

    while ((match = bibitemPattern.exec(content)) !== null) {
      const [, citation, key, text] = match;

      // Extract year from citation like "Author(2025)" or text
      const yearMatch = citation.match(/\((\d{4})\)/) || text.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? parseInt(yearMatch[1] || yearMatch[0]) : new Date().getFullYear();

      // Extract author from citation or beginning of text
      const authorMatch = citation.match(/^([^(]+)/) || text.match(/^([^.,]+)/);
      const authors = authorMatch ? authorMatch[1].trim() : 'Unknown';

      // Extract title (usually after year and before journal)
      const titleMatch = text.match(/\d{4}[^.]*?\.?\s*([^.]+)\./);
      const title = titleMatch ? titleMatch[1].trim() : text.substring(0, 100).trim();

      // Extract journal/source
      const journalMatch = text.match(/\\textit\{([^}]+)\}/) || text.match(/\.\s*([^.,\d]+?)[\d,]/);
      const source = journalMatch ? journalMatch[1].trim() : 'Unknown';

      references.push({
        bibtex_key: key.trim(),
        title: title || text.substring(0, 100),
        authors: authors,
        year: year,
        source: source,
        doi: "",
        url: "",
      });
    }

    console.log(`✅ Found ${references.length} \\bibitem entries`);

    // FORMAT 2: Standard BibTeX format (@article, @book, etc.)
    if (references.length === 0) {
      // Match @type{key, field={value}, ...} across multiple lines
      const bibtexPattern = /@(\w+)\s*\{\s*([^,\s]+)\s*,([^@]*?)(?=\n@|\n\s*$)/gs;

      while ((match = bibtexPattern.exec(content)) !== null) {
        const [, type, key, fields] = match;

        // Extract fields
        const titleMatch = fields.match(/title\s*=\s*[{"]([^}"]+)[}"]/i);
        const authorMatch = fields.match(/author\s*=\s*[{"]([^}"]+)[}"]/i);
        const yearMatch = fields.match(/year\s*=\s*[{"]?(\d{4})[}"]?/i);
        const journalMatch = fields.match(/journal\s*=\s*[{"]([^}"]+)[}"]/i);
        const booktitleMatch = fields.match(/booktitle\s*=\s*[{"]([^}"]+)[}"]/i);

        references.push({
          bibtex_key: key.trim(),
          title: titleMatch ? titleMatch[1].trim() : "Unknown Title",
          authors: authorMatch ? authorMatch[1].trim() : "Unknown Author",
          year: yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear(),
          source: (journalMatch || booktitleMatch)?.[1]?.trim() || "Unknown Source",
          doi: "",
          url: "",
        });
      }

      console.log(`✅ Found ${references.length} @bibtex entries`);
    }

    if (references.length === 0) {
      console.log('❌ No bibliography entries found');
      return { references: [], hasBibliography: false };
    }

    console.log(`\n✅ SUCCESS: Parsed ${references.length} BibTeX/bibitem entries`);
    console.log(`📊 First few:`, references.slice(0, 3).map(r => `[${r.bibtex_key}] ${r.authors} (${r.year})`).join(', '));
    return { references, hasBibliography: true };
  }

  if (fileName.endsWith(".pdf")) {
    console.log('📄 Parsing PDF file...');

    try {
      // Use pdf-parse to extract text from PDF
      const data = await pdfParse(buffer);
      const text = data.text;

      console.log(`📝 Extracted ${text.length} characters from ${data.numpages} pages`);

      // Look for References section - try multiple approaches
      let referencesText = '';
      let refStartIndex = -1;

      // Approach 1: Find explicit "References" heading
      const refMatch = text.match(/\n\s*(References|REFERENCES|Bibliography|BIBLIOGRAPHY|Works\s+Cited)\s*\n/i);
      if (refMatch && refMatch.index !== undefined) {
        refStartIndex = refMatch.index;
        referencesText = text.substring(refStartIndex);
        console.log('✅ Found explicit References section at position', refStartIndex);
      } else {
        // Approach 2: Look for numbered references pattern in last 40% of doc
        const lastPart = text.substring(Math.floor(text.length * 0.6));
        const hasNumberedRefs = /\[\d+\]/.test(lastPart);
        if (hasNumberedRefs) {
          referencesText = lastPart;
          console.log('✅ Found numbered references in last 40% of document');
        } else {
          referencesText = lastPart;
          console.log('⚠️ No explicit references section found, searching last 40%');
        }
      }

      console.log(`🔍 Analyzing ${referencesText.length} characters for citation patterns...`);

      // Show a sample of what we're searching
      const sample = referencesText.substring(0, 500).replace(/\s+/g, ' ').trim();
      console.log('📄 Sample text:', sample.substring(0, 200) + '...');

      // NORMALIZE TEXT: Fix common PDF issues
      // 1. Remove hyphenation at line breaks: "process- ing" -> "processing"
      let normalizedText = referencesText.replace(/(\w+)-\s+(\w+)/g, '$1$2');
      // 2. Normalize whitespace: convert newlines to spaces within references
      // but keep paragraph breaks (double newlines) 
      normalizedText = normalizedText.replace(/\n(?!\s*\[)/g, ' ');
      // 3. Clean up multiple spaces
      normalizedText = normalizedText.replace(/\s{2,}/g, ' ');

      console.log('🔧 Normalized text for pattern matching');

      const references = [];

      // PATTERN 1: Capture from [N] to [N+1] - most reliable for numbered references
      // This captures the entire reference regardless of line breaks
      const patternNumbered = /\[(\d+)\]\s+(.+?)(?=\s*\[(\d+)\]|\s*$)/gs;
      let match;

      console.log('🔎 Trying numbered pattern: [N] ... [N+1]');
      while ((match = patternNumbered.exec(normalizedText)) !== null && references.length < 200) {
        const [, number, content] = match;

        // Extract year
        const yearMatch = content.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

        // Extract author (first part before year or comma)
        let authors = 'Unknown';
        const authorMatch = content.match(/^([^,]+?)(?:,|\s+\d{4})/);
        if (authorMatch) {
          authors = authorMatch[1].trim();
        }

        // Extract title (usually after year and before journal/source)
        let title = content.substring(0, 150).trim();
        const titleMatch = content.match(/\d{4}\s*\.?\s*([^.]+)\./);
        if (titleMatch && titleMatch[1].length > 10) {
          title = titleMatch[1].trim();
        }

        references.push({
          bibtex_key: `ref${number}`,
          title: title,
          authors: authors,
          year: year,
          source: 'Academic Journal',
          doi: '',
          url: '',
        });
      }

      console.log(`✅ Numbered pattern found ${references.length} references`);

      // Fallback patterns if the numbered pattern didn't work
      if (references.length === 0) {
        console.log('⚠️ Numbered pattern failed, trying alternative patterns...');

        // PATTERN 2: Author-year format (very common in PDFs)
        // Example: "Dada, E.G., et al., 2019. Machine learning for email spam filtering..."
        // Example: "Leslie Lamport, LaTeX: a document preparation system, Addison Wesley, 1994."

        // Split by newlines and look for author-year patterns
        const lines = referencesText.split('\n').filter(line => line.trim().length > 20);

        console.log(`🔎 Trying author-year pattern on ${lines.length} lines...`);

        let refNumber = 1;
        let currentRef = null;

        for (const line of lines) {
          const trimmedLine = line.trim();

          // Skip lines that are too short or look like headers
          if (trimmedLine.length < 30) continue;
          if (/^(References|Bibliography|Page \d+|^\d+$)/i.test(trimmedLine)) continue;

          // Pattern: Author(s), Year. Title...
          // Look for patterns like:
          // 1. "LastName, F.N., LastName, F.N., Year."
          // 2. "LastName, FirstName, Year."
          // 3. "LastName et al., Year."
          const authorYearPattern = /^([A-Z][a-z]+(?:[-\s][A-Z][a-z]+)?(?:,\s*[A-Z]\.?[A-Z]?\.?)?(?:\s*(?:and|&amp;|et al\.)?\s*[A-Z][a-z]+(?:,\s*[A-Z]\.?[A-Z]?\.?)?)*)\s*[,.]?\s*(?:\()?(\d{4}[a-z]?)(?:\))?[,.]?\s+(.+)/;

          const authorYearMatch = trimmedLine.match(authorYearPattern);

          if (authorYearMatch) {
            // Save previous reference
            if (currentRef && currentRef.title && currentRef.authors) {
              references.push(currentRef);
            }

            const [, authors, year, titleAndRest] = authorYearMatch;

            // Extract title (usually ends at period, comma, or journal name)
            let title = titleAndRest.split(/[,.](?=\s+[A-Z])/)[0]?.trim() || titleAndRest.substring(0, 150);

            // Clean title - remove trailing punctuation and common noise
            title = title.replace(/^["']|["']$/g, '').trim();

            // Extract DOI if present
            const doiMatch = trimmedLine.match(/doi[:\s]*([10]\.\d{4,}(?:\.\d+)*\/[^\s,]+)/i);
            const doi = doiMatch ? doiMatch[1].trim() : '';

            currentRef = {
              bibtex_key: `ref${refNumber}`,
              title: title,
              authors: authors.trim(),
              year: parseInt(year),
              source: 'Academic Publication',
              doi: doi,
              url: '',
            };

            refNumber++;
          } else if (currentRef) {
            // This might be a continuation of the previous reference
            // Add to title if it doesn't have DOI or looks like title continuation
            if (!currentRef.doi && trimmedLine.length < 200) {
              const doiMatch = trimmedLine.match(/doi[:\s]*([10]\.\d{4,}(?:\.\d+)*\/[^\s,]+)/i);
              if (doiMatch) {
                currentRef.doi = doiMatch[1].trim();
              }
            }
          }
        }

        // Don't forget the last reference
        if (currentRef && currentRef.title && currentRef.authors) {
          references.push(currentRef);
        }

        console.log(`✅ Author-year pattern found ${references.length} references`);

        // PATTERN 3: Numbered without brackets - "1. Author, Year..."
        if (references.length === 0) {
          console.log('🔎 Trying numbered-list pattern (1. Author...)');

          const numberedListPattern = /^(\d+)\.\s+([A-Z][^.]+?[,.]?\s+(?:\()?(\d{4}[a-z]?)(?:\))?[,.]?\s+.+?)(?=\n\d+\.|$)/gms;

          while ((match = numberedListPattern.exec(referencesText)) !== null && references.length < 200) {
            const [, number, content, year] = match;

            // Extract author from beginning
            const authorMatch = content.match(/^([^,]+(?:,\s*[A-Z]\.?[A-Z]?\.?)?(?:\s*et al\.)?)/);
            const authors = authorMatch ? authorMatch[1].trim() : 'Unknown';

            // Extract title (after year)
            let title = content.split(/\d{4}/)[1]?.split(/[,.](?=\s+[A-Z])/)[0]?.trim() || content.substring(0, 150);
            title = title.replace(/^[,.\s]+|[,.\s]+$/g, '').replace(/^["']|["']$/g, '');

            references.push({
              bibtex_key: `ref${number}`,
              title: title,
              authors: authors,
              year: parseInt(year),
              source: 'Academic Publication',
              doi: '',
              url: '',
            });
          }

          console.log(`✅ Numbered-list pattern found ${references.length} references`);
        }
      }

      if (references.length > 0) {
        console.log(`\n✅ SUCCESS: Extracted ${references.length} references from PDF`);
        console.log(`📊 First few:`, references.slice(0, 3).map(r => `[${r.bibtex_key}] ${r.authors} (${r.year})`).join(', '));
        return { references, hasBibliography: true };
      }

      // Check if there's bibliography content even if we couldn't parse it
      const hasBibliography = /(?:References|Bibliography|Works\s+Cited)/i.test(text) ||
        /\[\d+\]/.test(referencesText) ||
        /doi[:\s]*10\.\d{4,}/i.test(text);

      console.log('\n❌ No references extracted');
      console.log(`📋 Bibliography indicators: ${hasBibliography}`);
      console.log(`📋 Has [number] patterns: ${/\[\d+\]/.test(referencesText)}`);
      console.log(`📋 Has DOI patterns: ${/doi[:\s]*10\.\d{4,}/i.test(text)}`);

      return { references: [], hasBibliography };
    } catch (error) {
      console.error('❌ PDF parsing error:', error);
      return { references: [], hasBibliography: false };
    }
  }

  // Fallback: Try to find bibliography section
  const content = buffer.toString('utf8', 0, Math.min(buffer.length, 100000));
  const hasBibliography =
    /bibliography|references|works cited/i.test(content) ||
    /@\w+\s*\{/.test(content);
  return {
    references: [],
    hasBibliography,
  };
}

// Parse incoming request body (as Buffer for binary data)
function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;

    req.on("data", (chunk) => {
      chunks.push(chunk);
      totalSize += chunk.length;
      if (totalSize > 50 * 1024 * 1024) {
        // 50MB limit
        reject(new Error("File too large"));
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Parse multipart form data from Buffer
function parseMultipart(body, contentType) {
  const boundary = contentType.split("boundary=")[1];
  if (!boundary) return null;

  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;

  // Split buffer by boundary
  while (start < body.length) {
    const boundaryIndex = body.indexOf(boundaryBuffer, start);
    if (boundaryIndex === -1) break;

    const nextBoundary = body.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
    if (nextBoundary === -1) break;

    parts.push(body.slice(boundaryIndex, nextBoundary));
    start = nextBoundary;
  }

  const result = { file: null, fileName: "", userId: "" };

  for (const part of parts) {
    const partStr = part.toString('utf8', 0, Math.min(part.length, 500)); // Read header only

    if (partStr.includes('name="file"')) {
      const match = partStr.match(/filename="([^"]+)"/);
      if (match) {
        result.fileName = match[1];
        // Find where file data starts (after \r\n\r\n)
        const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
        if (headerEnd !== -1) {
          const fileStart = headerEnd + 4;
          // File ends before final \r\n
          const fileData = part.slice(fileStart);
          // Remove trailing \r\n if present
          const endMarker = fileData.lastIndexOf(Buffer.from('\r\n'));
          result.file = endMarker > fileData.length - 10 ? fileData.slice(0, endMarker) : fileData;
        }
      }
    } else if (partStr.includes('name="fileName"')) {
      const match = partStr.match(/\r\n\r\n(.+?)\r\n/);
      if (match) {
        result.fileName = match[1].trim();
      }
    } else if (partStr.includes('name="userId"')) {
      const match = partStr.match(/\r\n\r\n(.+?)\r\n/);
      if (match) {
        result.userId = match[1].trim();
      }
    }
  }

  console.log('📦 Parsed multipart data:', {
    fileName: result.fileName,
    fileSize: result.file?.length || 0,
    userId: result.userId
  });

  return result.file ? result : null;
}

/**
 * Get AI verification insight via OpenAI API
 * Provides intelligent analysis of reference authenticity and academic quality
 */
async function getAiInsight(reference) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return null; // Return null instead of error message - will be handled gracefully in UI
  }

  try {
    // Build comprehensive context for AI analysis
    const hasCanonical = reference.suggestedTitle && reference.suggestedTitle !== reference.originalTitle;
    const hasIssues = reference.issues && reference.issues.length > 0;
    const isNotFound = reference.status === 'not_found';
    const isVerified = reference.status === 'verified';
    const isWarning = reference.status === 'warning';
    const isRetracted = reference.is_retracted;

    // Detect if issues mention AI/fake patterns
    const hasFakePatterns = reference.issues?.some(issue =>
      issue.includes('FAKE') ||
      issue.includes('AI-GENERATED') ||
      issue.includes('SUSPICIOUS')
    );

    // Build detailed prompt based on status
    let analysisPrompt = '';

    if (isNotFound && hasFakePatterns) {
      // FAKE REFERENCE DETECTED
      analysisPrompt = `You are an expert academic integrity advisor analyzing a potentially FAKE or AI-GENERATED reference.

**UPLOADED REFERENCE:**
Title: "${reference.originalTitle}"
Authors: "${reference.originalAuthors}"
Year: ${reference.originalYear}
Source: "${reference.originalSource || 'Not specified'}"

**VERIFICATION RESULTS:**
Status: NOT FOUND in OpenAlex, Crossref, or Semantic Scholar
Confidence: ${reference.confidenceScore}%
Issues Detected:
${reference.issues.map(issue => `- ${issue}`).join('\n')}

**YOUR TASK:**
As an academic integrity expert, provide:
1. A clear assessment of whether this reference appears to be fake/AI-generated (be direct but professional)
2. Specific red flags you notice in the title, authors, or metadata
3. Actionable advice for the researcher (e.g., "Remove this reference", "Verify with supervisor", "Search Google Scholar manually")
4. If salvageable, suggest how to find the correct reference

Keep your response concise (3-4 sentences), professional, and actionable. Be honest about authenticity concerns.`;

    } else if (isNotFound) {
      // NOT FOUND BUT NO FAKE PATTERNS
      analysisPrompt = `You are an expert academic librarian helping a researcher locate a missing reference.

**UPLOADED REFERENCE:**
Title: "${reference.originalTitle}"
Authors: "${reference.originalAuthors}"
Year: ${reference.originalYear}

**VERIFICATION RESULTS:**
Status: NOT FOUND in major academic databases
Confidence: ${reference.confidenceScore}%

**YOUR TASK:**
Provide helpful guidance:
1. Possible reasons why this reference wasn't found (typo, preprint, conference paper, non-indexed journal)
2. Specific steps to manually verify this reference
3. Alternative search strategies (Google Scholar, ResearchGate, author's website)

Keep response concise (3-4 sentences) and actionable.`;

    } else if (isRetracted) {
      // RETRACTED PAPER
      analysisPrompt = `You are an academic integrity advisor analyzing a RETRACTED paper.

**REFERENCE:**
Title: "${reference.originalTitle}"
Year: ${reference.originalYear}

**VERIFICATION RESULTS:**
Status: RETRACTED
Database Match: "${reference.suggestedTitle || 'N/A'}"

**YOUR TASK:**
Provide urgent guidance:
1. Explain the severity of citing retracted papers
2. Recommend immediate action (remove or replace)
3. Suggest how to find alternative sources on the same topic

Keep response firm but professional (2-3 sentences).`;

    } else if (hasCanonical && hasIssues) {
      // ISSUES FOUND WITH CORRECTIONS AVAILABLE
      analysisPrompt = `You are an academic writing advisor helping improve bibliography quality.

**UPLOADED REFERENCE:**
Title: "${reference.originalTitle}"
Authors: "${reference.originalAuthors}"
Year: ${reference.originalYear}

**VERIFIED DATABASE VERSION:**
Title: "${reference.suggestedTitle}"
Authors: "${reference.suggestedAuthors}"
Year: ${reference.suggestedYear}
Confidence: ${reference.confidenceScore}%

**ISSUES DETECTED:**
${reference.issues.map(issue => `- ${issue}`).join('\n')}

**YOUR TASK:**
Provide constructive feedback:
1. Assess the severity of the discrepancies
2. Explain why accuracy matters for academic credibility
3. Recommend whether to accept the suggested corrections

Keep response encouraging and actionable (3 sentences).`;

    } else if (isVerified) {
      // VERIFIED SUCCESSFULLY
      analysisPrompt = `You are an academic quality advisor reviewing a verified reference.

**REFERENCE:**
Title: "${reference.originalTitle}"
Year: ${reference.originalYear}
Citations: ${reference.cited_by_count || 'Unknown'}
Confidence: ${reference.confidenceScore}%

**YOUR TASK:**
Provide brief quality assessment:
1. Confirm the reference is legitimate and well-cited (if applicable)
2. Note any minor improvements that could enhance citation quality
3. Encourage good academic practice

Keep response positive and brief (2 sentences).`;

    } else {
      // FALLBACK
      analysisPrompt = `Analyze this academic reference and provide professional guidance in 2-3 sentences:
Title: "${reference.originalTitle}"
Status: ${reference.status}
Issues: ${reference.issues?.join(', ') || 'None'}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an expert academic advisor specializing in bibliography verification, academic integrity, and research quality. Provide clear, professional, actionable guidance. Be direct about fake references but supportive in tone.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 250,
        temperature: 0.7, // Slightly creative but still professional
      })
    });

    if (!response.ok) {
      console.error('[OpenAI Error]', response.statusText);
      return null;
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content;

    if (insight) {
      console.log(`   🤖 AI Insight generated (${insight.length} chars)`);
    }

    return insight || null;
  } catch (error) {
    console.error('[AI Insight Error]', error);
    return null; // Fail gracefully
  }
}

// Create server
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  try {
    // POST /api/auth/signup - Create new user account
    if (req.url === "/api/auth/signup" && req.method === "POST") {
      try {
        const body = await parseBody(req);
        const { email, password, displayName } = JSON.parse(body.toString('utf8'));

        console.log(`[Auth] Signup attempt for: ${email}, displayName: ${displayName}`);

        if (!email || !password || password.length < 8) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Invalid email or password (minimum 8 characters)' }));
          return;
        }

        // Check if user already exists
        let existing = null;
        try {
          existing = await getUserByEmail(email);
        } catch (dbError) {
          console.warn('[Auth] Database check failed:', dbError.message);
        }

        if (existing) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Email already registered' }));
          return;
        }

        // Hash password with bcrypt
        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
        const userId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user in database using raw query
        let user = null;
        try {
          const result = await query(
            `INSERT INTO users (email, full_name, password_hash, verification_token, verification_code_expires, email_verified, subscription_tier, created_at)
             VALUES ($1, $2, $3, $4, $5, false, 'free', NOW())
             RETURNING id, email, full_name, email_verified, subscription_tier, created_at`,
            [email, displayName, passwordHash, verificationCode, expiresAt]
          );
          user = result.rows[0];
        } catch (dbError) {
          console.error('[Auth] Database insert error:', dbError.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: `Database error: ${dbError.message}` }));
          return;
        }

        console.log(`✅ User created: ${email}`);

        // Send verification email via Resend
        if (process.env.RESEND_API_KEY) {
          try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'RefCheck <admin@khabeerk.com>',
                to: email,
                subject: 'Verify your RefCheck email address',
                html: `
                  <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
                    <h2 style="color: #2c346d;">Welcome to RefCheck, ${displayName}!</h2>
                    <p>Thank you for signing up! Please verify your email address to activate your account.</p>
                    <p style="margin: 20px 0; font-size: 14px; color: #666;">Enter this verification code on the website:</p>
                    <div style="margin: 30px 0; padding: 20px; background-color: #f5f5f5; border-radius: 8px; text-align: center;">
                      <div style="font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #2c346d; font-family: monospace;">${verificationCode}</div>
                    </div>
                    <p style="font-size: 14px; color: #666;">Copy and paste this code into the verification form to complete your registration.</p>
                    <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #999;">This code expires in 24 hours. If you didn't create this account, please ignore this email.</p>
                    <p style="font-size: 11px; color: #999;">RefCheck - Academic Bibliography Verification</p>
                  </div>
                `,
              }),
            });

            if (emailResponse.ok) {
              console.log(`✅ Verification email sent to ${email}`);
            } else {
              const emailError = await emailResponse.json();
              console.warn(`⚠️ Email send failed: ${emailError.message}`);
            }
          } catch (emailError) {
            console.warn(`⚠️ Email service error: ${emailError.message}`);
          }
        } else {
          console.warn(`⚠️ RESEND_API_KEY not set - verification email not sent`);
        }

        const authUser = {
          id: user.id,
          email: user.email,
          displayName: user.full_name,
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          emailVerified: false,
          subscription: { plan: 'free' },
          createdAt: new Date(user.created_at).getTime(),
        };

        console.log(`✅ User created successfully: ${email}`);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: authUser }));
      } catch (error) {
        console.error('[Signup Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: error.message }));
      }
      return;
    }

    // POST /api/auth/login - Login with email and password
    if (req.url === "/api/auth/login" && req.method === "POST") {
      try {
        const body = await parseBody(req);
        const { email, password } = JSON.parse(body.toString('utf8'));

        console.log(`[Auth] Login attempt for: ${email}`);

        if (!email || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Email and password required' }));
          return;
        }

        // Try database lookup
        let user = null;
        try {
          user = await getUserByEmail(email);
        } catch (dbError) {
          console.warn('[Auth] Database unavailable, using demo mode');
          // Demo mode for testing without database
          if (email === 'demo@refcheck.com' && password === 'Demo123!') {
            user = {
              id: '00000000-0000-0000-0000-000000000001',
              email: 'demo@refcheck.com',
              full_name: 'Demo User',
              email_verified: true,
              subscription_tier: 'pro',
              created_at: new Date().toISOString()
            };
          }
        }

        if (!user) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Email or password is incorrect. Please try again.' }));
          return;
        }

        // Verify password with bcrypt
        if (user.password_hash) {
          const isPasswordValid = await bcrypt.compare(password, user.password_hash);
          if (!isPasswordValid) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Email or password is incorrect. Please try again.' }));
            return;
          }
        }

        console.log(`✅ User logged in: ${email}`);

        const authUser = {
          id: user.id,
          email: user.email,
          displayName: user.full_name,
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          emailVerified: user.email_verified || false,
          subscription: { plan: user.subscription_tier || 'free' },
          createdAt: new Date(user.created_at).getTime()
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: authUser }));
      } catch (error) {
        console.error('[Login Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Server error. Please try again.' }));
      }
      return;
    }

    // POST /api/auth/verify-email - Verify email with code
    if (req.url === "/api/auth/verify-email" && req.method === "POST") {
      try {
        const body = await parseBody(req);
        const { email, code } = JSON.parse(body.toString('utf8'));

        console.log(`🔍 Verify Email Request: email=${email}, code=${code}`);

        if (!email || !code) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Email and verification code required' }));
          return;
        }

        // Get user and verify code
        const user = await getUserByEmail(email);
        console.log(`🔍 User from DB:`, user);
        console.log(`🔍 Stored verification_token: ${user?.verification_token}`);
        console.log(`🔍 Provided code: ${code}`);
        console.log(`🔍 Match: ${user?.verification_token === code}`);

        if (!user || user.verification_token !== code) {
          console.log(`❌ Verification failed`);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Invalid or expired verification code' }));
          return;
        }

        // Update database to mark email as verified
        try {
          await query(
            `UPDATE users SET email_verified = true, verification_token = NULL WHERE id = $1`,
            [user.id]
          );
          console.log(`✅ Email verified in database: ${email}`);
        } catch (dbError) {
          console.error('[Verification] Failed to update database:', dbError.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Failed to verify email. Please try again.' }));
          return;
        }

        const authUser = {
          id: user.id,
          email: user.email,
          displayName: user.full_name,
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          emailVerified: true,
          subscription: { plan: user.subscription_tier || 'free' },
          createdAt: new Date(user.created_at).getTime()
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: authUser }));
      } catch (error) {
        console.error('[Email Verification Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: error.message }));
      }
      return;
    }

    // POST /api/auth/forgot-password - Request password reset
    if (req.url === "/api/auth/forgot-password" && req.method === "POST") {
      try {
        const body = await parseBody(req);
        const { email } = JSON.parse(body.toString('utf8'));

        if (!email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Email required' }));
          return;
        }

        const user = await getUserByEmail(email);
        if (!user) {
          // Don't reveal if email exists for security
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
          return;
        }

        const resetCode = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        // Store reset code in database
        await query(
          `UPDATE users SET password_reset_code = $1, password_reset_expires = $2 WHERE id = $3`,
          [resetCode, expiresAt, user.id]
        );

        console.log(`✅ Password reset requested for: ${email}`);

        // Send reset email via Resend
        if (process.env.RESEND_API_KEY) {
          const resetUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/reset-password?code=${resetCode}&email=${encodeURIComponent(email)}`;
          
          try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'RefCheck <admin@khabeerk.com>',
                to: email,
                subject: 'Reset your RefCheck password',
                html: `
                  <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
                    <h2 style="color: #2c346d;">Password Reset Request</h2>
                    <p>Hi ${user.full_name || 'there'},</p>
                    <p>We received a request to reset your password. Click the link below to create a new password.</p>
                    <div style="margin: 30px 0;">
                      <a href="${resetUrl}" style="background-color: #2c346d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
                    <p style="font-size: 12px; color: #999; word-break: break-all;">${resetUrl}</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #999;">This link expires in 24 hours. If you didn't request a password reset, please ignore this email - your password will remain unchanged.</p>
                    <p style="font-size: 11px; color: #999;">RefCheck - Academic Bibliography Verification</p>
                  </div>
                `,
              }),
            });

            if (emailResponse.ok) {
              console.log(`✅ Password reset email sent to ${email}`);
            } else {
              const emailError = await emailResponse.json();
              console.warn(`⚠️ Email send failed: ${emailError.message}`);
            }
          } catch (emailError) {
            console.warn(`⚠️ Email service error: ${emailError.message}`);
          }
        } else {
          console.warn(`⚠️ RESEND_API_KEY not set - reset email not sent`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('[Password Reset Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: error.message }));
      }
      return;
    }

    // POST /api/auth/reset-password - Reset password with code
    if (req.url === "/api/auth/reset-password" && req.method === "POST") {
      try {
        const body = await parseBody(req);
        const { email, code, newPassword } = JSON.parse(body.toString('utf8'));

        if (!email || !code || !newPassword || newPassword.length < 8) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Invalid email, code, or password (minimum 8 characters)' }));
          return;
        }

        // Hash new password with bcrypt
        const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

        // Update password and clear reset code
        const result = await query(
          `UPDATE users 
           SET password_hash = $1, password_reset_code = NULL, password_reset_expires = NULL
           WHERE email = $2 AND password_reset_code = $3 AND password_reset_expires > NOW()
           RETURNING id`,
          [newPasswordHash, email, code]
        );

        if (!result.rows || result.rows.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Invalid or expired reset code' }));
          return;
        }

        console.log(`✅ Password reset successfully for: ${email}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('[Password Reset Confirm Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: error.message }));
      }
      return;
    }

    // GET /api/jobs - Get user jobs history
    if (req.url.startsWith("/api/jobs") && req.method === "GET") {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const userId = url.searchParams.get("userId");

        if (!userId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "userId parameter is required" }));
          return;
        }

        console.log(`[Jobs] Fetching jobs for user: ${userId}`);
        const jobs = await getUserJobs(userId);
        console.log(`[Jobs] Found ${jobs.length} jobs`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jobs }));
      } catch (error) {
        console.error("[Jobs Error]", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          message: error.message,
          stack: error.stack,
          query: error.query // pg error often has this
        }));
      }
      return;
    }

    // POST /api/analyze - Handle file upload and start processing
    if (req.url === "/api/analyze" && req.method === "POST") {
      try {
        console.log('[/api/analyze] Request headers:', {
          authorization: req.headers.authorization,
          'x-user-id': req.headers['x-user-id'],
          'content-type': req.headers['content-type']
        });

        const contentType = req.headers["content-type"] || "";

        if (!contentType.includes("multipart/form-data")) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Expected multipart form data" }));
          return;
        }

        const body = await parseBody(req);
        const formData = parseMultipart(body, contentType);

        if (!formData) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "No file provided" }));
          return;
        }

        // Parse file (await since it's now async for PDF parsing)
        const parsed = await parseFile(formData.fileName, formData.file);

        if (!parsed.hasBibliography) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: `No bibliography found in "${formData.fileName}". Please ensure your document contains a references or bibliography section.`,
            })
          );
          return;
        }

        if (parsed.references.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: `Found a bibliography section in "${formData.fileName}", but couldn't extract individual reference entries. For .bib files: Entries must start with @ (e.g., @article{...}). For PDFs: References should be numbered like [1], [2], etc. Try exporting as .bib from your reference manager, or use the 'Direct Entry' tab.`,
            })
          );
          return;
        }

        // Require authentication
        let userId;
        try {
          userId = requireAuth(req);
          console.log('[/api/analyze] ✅ Auth successful - userId type:', typeof userId);
          console.log('[/api/analyze] ✅ Auth successful - userId value:', userId);
          console.log('[/api/analyze] ✅ Auth successful - userId JSON:', JSON.stringify(userId));
        } catch (err) {
          console.log('[/api/analyze] Auth failed:', err.message);
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
          return;
        }

        // Create job in database
        const fileType = formData.fileName.endsWith('.pdf') ? 'pdf' : 'bib';
        console.log('[/api/analyze] About to create job with userId:', userId, 'type:', typeof userId);
        const job = await createJob(
          userId,
          formData.fileName,
          fileType,
          parsed.references.length
        );

        const jobId = job.id;

        console.log(`✅ File parsed: ${formData.fileName}`);
        console.log(`📊 References found: ${parsed.references.length}`);
        console.log(`💾 Job created in database with ID: ${jobId}`);

        // Log activity
        await logActivity(userId, jobId, 'upload', {
          fileName: formData.fileName,
          fileType,
          totalReferences: parsed.references.length
        });

        // Start background processing
        (async () => {
          const verifiedReferences = [];
          let currentVerifiedCount = 0;
          let currentIssuesCount = 0;
          let currentWarningsCount = 0;

          for (let i = 0; i < parsed.references.length; i++) {
            const ref = parsed.references[i];

            // Update progress in database
            const progress = Math.round(((i + 1) / parsed.references.length) * 100);
            let currentStep = "Registry Matching";
            if (progress < 16) currentStep = "Parsing Document";
            else if (progress < 26) currentStep = "Normalizing Metadata";
            else if (progress < 71) currentStep = "Registry Matching";
            else if (progress < 86) currentStep = "Duplicate Detection";
            else if (progress < 96) currentStep = "Issue Analysis";
            else currentStep = "Generating Report";

            await updateJobProgress(jobId, progress, currentStep);

            console.log(`   [${i + 1}/${parsed.references.length}] Verifying: "${ref.title.substring(0, 50)}..."`);

            // Cross-validate reference FIRST (moved before using it)
            const verified = await crossValidateReference(ref);

            // Update local counters (moved after verification)
            if (verified.status === 'verified') currentVerifiedCount++;
            else if (['issue', 'retracted', 'not_found'].includes(verified.status)) currentIssuesCount++;
            else if (verified.status === 'warning') currentWarningsCount++;

            // Send SSE update if client is connected
            if (activeConnections.has(jobId)) {
              const clientRes = activeConnections.get(jobId);
              clientRes.write(`data: ${JSON.stringify({
                progress,
                currentStep,
                status: 'processing',
                processedReferences: i + 1,
                totalReferences: parsed.references.length,
                verifiedCount: currentVerifiedCount,
                issuesCount: currentIssuesCount,
                warningsCount: currentWarningsCount
              })}\n\n`);
            }

            // Create reference in database
            const referenceData = {
              bibtexKey: ref.bibtex_key || `ref_${i}`,
              originalTitle: ref.title,
              originalAuthors: ref.authors,
              originalYear: ref.year,
              originalSource: ref.source,
              suggestedTitle: verified.canonical_title,
              suggestedAuthors: verified.canonical_authors,
              suggestedYear: verified.canonical_year,
              status: verified.status,
              confidenceScore: Math.round(verified.confidence),
              suggestedVenue: verified.venue,
              suggestedDoi: verified.doi,
              is_retracted: verified.is_retracted,
              cited_by_count: verified.cited_by_count,
              google_scholar_url: verified.google_scholar_url,
              openalex_url: verified.openalex_url,
              crossref_url: verified.crossref_url,
              semantic_scholar_url: verified.semantic_scholar_url,
              duplicate_group_id: null,
              duplicate_group_count: null,
              is_primary_duplicate: false,
              issues: verified.issues || [],
              metadata: verified.metadata || {},
              bibtex_type: verified.bibtex_type || 'article'
            };

            const savedRef = await createReference(jobId, referenceData);
            const aiInsight = await getAiInsight(referenceData);

            verifiedReferences.push({
              ...savedRef,
              ai_insight: aiInsight,
              issues: verified.issues || [],
              verified_by: verified.verified_by
            });

            // Rate limiting: wait 500ms between requests
            if (i < parsed.references.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          // DUPLICATE DETECTION - after all references are verified
          console.log('🔍 Detecting duplicates...');
          const duplicateGroups = detectDuplicates(verifiedReferences);

          // Mark duplicates with count info in database
          for (const group of duplicateGroups) {
            const groupCount = group.length;
            const groupId = crypto.randomUUID(); // Generate a unique ID for this duplicate group

            // Mark the first one as the primary (keep this one)
            const primaryRef = group[0];
            await updateReferenceDuplicateStatus(primaryRef.id, {
              status: primaryRef.status, // Keep original status (verified/issue)
              duplicate_group_id: groupId,
              duplicate_group_count: groupCount,
              is_primary_duplicate: true,
              issues: primaryRef.issues || []
            });

            // Update in memory for SSE response
            const primaryRefObj = verifiedReferences.find(r => r.id === primaryRef.id);
            if (primaryRefObj) {
              primaryRefObj.duplicate_group_id = groupId;
              primaryRefObj.duplicate_group_count = groupCount;
              primaryRefObj.is_primary_duplicate = true;
            }

            // Mark the rest as duplicates (to be removed)
            for (let i = 1; i < group.length; i++) {
              const dupRef = group[i];
              const dupIssues = [...(dupRef.issues || [])];
              dupIssues.push(`Duplicate - appears ${groupCount} times in your bibliography`);

              await updateReferenceDuplicateStatus(dupRef.id, {
                status: 'duplicate',
                duplicate_group_id: groupId,
                duplicate_group_count: groupCount,
                is_primary_duplicate: false,
                issues: dupIssues
              });

              // Update in memory for SSE response
              const dupRefObj = verifiedReferences.find(r => r.id === dupRef.id);
              if (dupRefObj) {
                dupRefObj.status = 'duplicate';
                dupRefObj.duplicate_group_id = groupId;
                dupRefObj.duplicate_group_count = groupCount;
                dupRefObj.is_primary_duplicate = false;
                dupRefObj.issues = dupIssues;
              }
            }
          }

          // Mark job as completed in database
          await completeJob(jobId, 'completed');
          job.completedAt = new Date().toISOString();

          // Send final SSE update
          if (activeConnections.has(jobId)) {
            const clientRes = activeConnections.get(jobId);
            const finalVerified = verifiedReferences.filter(r => r.status === 'verified').length;
            const finalIssues = verifiedReferences.filter(r => ['issue', 'retracted', 'not_found'].includes(r.status)).length;
            const finalWarnings = verifiedReferences.filter(r => r.status === 'warning').length;

            clientRes.write(`data: ${JSON.stringify({
              progress: 100,
              currentStep: 'Complete',
              status: 'completed',
              processedReferences: verifiedReferences.length,
              totalReferences: verifiedReferences.length,
              verifiedCount: finalVerified,
              issuesCount: finalIssues,
              warningsCount: finalWarnings
            })}\n\n`);
          }

          console.log(`✅ Job ${jobId} completed with ${verifiedReferences.length} references`);
          console.log(`🔄 Found ${duplicateGroups.length} duplicate groups`);
        })();

        // Return jobId immediately
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            jobId,
            totalReferences: parsed.references.length,
            message: `Processing ${parsed.references.length} references...`,
          })
        );
        return;
      } catch (analyzeError) {
        console.error('❌ Error in /api/analyze:', analyzeError);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          error: `Failed to process file: ${analyzeError.message}`,
          details: analyzeError.stack
        }));
        return;
      }
    }

    // GET /api/progress - Stream real-time progress via SSE
    if (req.url.startsWith("/api/progress") && req.method === "GET") {
      const url = new URL(req.url, "http://localhost");
      const jobId = url.searchParams.get("jobId");

      if (!jobId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "jobId required" }));
        return;
      }

      const job = await getJobById(jobId);
      if (!job) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Job not found" }));
        return;
      }

      // Set up SSE
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      // Store connection for background updates
      activeConnections.set(jobId, res);

      // Send progress updates every 500ms
      const interval = setInterval(async () => {
        try {
          const job = await getJobById(jobId);
          if (!job) {
            clearInterval(interval);
            activeConnections.delete(jobId);
            res.end();
            return;
          }

          const data = {
            progress: job.progress,
            currentStep: job.progress_message,
            status: job.status,
            processedReferences: Math.floor((job.progress / 100) * job.total_references),
            totalReferences: job.total_references,
          };

          console.log(`[SSE /api/progress] Sending update for job ${jobId}:`, {
            ...data,
            jobFromDB: {
              id: job.id,
              file_name: job.file_name,
              total_references_in_db: job.total_references,
              status: job.status
            }
          });

          res.write(`data: ${JSON.stringify(data)}\n\n`);

          // Close connection when completed
          if (job.status === "completed" || job.status === "failed") {
            clearInterval(interval);
            activeConnections.delete(jobId);
            res.end();
          }
        } catch (error) {
          console.error(`[SSE /api/progress] Error fetching job ${jobId}:`, error.message);

          // On connection error, send error event and close
          if (error.message?.includes('Connection') || error.message?.includes('timeout')) {
            try {
              res.write(`data: ${JSON.stringify({ error: 'Connection lost, please refresh' })}\n\n`);
            } catch (writeError) {
              console.error('[SSE] Failed to write error:', writeError.message);
            }
            clearInterval(interval);
            activeConnections.delete(jobId);
            res.end();
          }
        }
      }, 500);

      // Clean up on client disconnect
      req.on("close", () => {
        clearInterval(interval);
        activeConnections.delete(jobId);
      });

      return;
    }

    // GET /api/results - Retrieve analysis results
    if (req.url.startsWith("/api/results") && req.method === "GET") {
      const url = new URL(req.url, "http://localhost");
      const jobId = url.searchParams.get("jobId");

      if (!jobId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "jobId required" }));
        return;
      }

      const job = await getJobById(jobId);
      if (!job) {
        console.log(`❌ Job not found: ${jobId}`);
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Job not found" }));
        return;
      }

      // Require authentication and verify ownership (Fix IDOR)
      let userId;
      try {
        userId = requireAuth(req);
      } catch (err) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }

      if (job.user_id !== userId) {
        console.warn(`⚠️ ALARM: Blocked IDOR access attempt. User ${userId} tried to access job ${jobId} owned by ${job.user_id}`);
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized access to this job" }));
        return;
      }

      const references = await getJobReferences(jobId);

      console.log(`✅ Retrieved job: ${jobId}`);
      console.log(`   - Original total: ${job.total_references}`);
      console.log(`   - References count: ${references.length}`);

      // DEBUG: Log first reference to see what data we have
      if (references.length > 0) {
        console.log('\n📋 FIRST REFERENCE RAW DATA FROM DATABASE:');
        console.log('========================================');
        console.log('ID:', references[0].id);
        console.log('Title:', references[0].title);
        console.log('Authors (parsed from file):', references[0].authors);
        console.log('original_authors (snake_case):', references[0].original_authors);
        console.log('canonical_authors (snake_case FROM API):', references[0].canonical_authors);
        console.log('canonical_title:', references[0].canonical_title);
        console.log('canonical_year:', references[0].canonical_year);
        console.log('confidence_score:', references[0].confidence_score);
        console.log('status:', references[0].status);
        console.log('issues:', references[0].issues);
        console.log('========================================\n');
      }

      // Transform snake_case database fields to camelCase for frontend
      const transformedReferences = references.map(ref => ({
        ...ref,
        canonicalTitle: ref.canonical_title,
        canonicalYear: ref.canonical_year,
        canonicalAuthors: ref.canonical_authors,
        citedByCount: ref.cited_by_count,
        isRetracted: ref.is_retracted,
        openalexUrl: ref.openalex_url,
        crossrefUrl: ref.crossref_url,
        semanticScholarUrl: ref.semantic_scholar_url,
        googleScholarUrl: ref.google_scholar_url,
        duplicateGroupId: ref.duplicate_group_id,
        isPrimaryDuplicate: ref.is_primary_duplicate,
        // Keep snake_case as well for backward compatibility
        original_authors: ref.original_authors,
        canonical_title: ref.canonical_title,
        canonical_year: ref.canonical_year,
        canonical_authors: ref.canonical_authors
      }));

      if (transformedReferences.length > 0) {
        console.log('🔄 AFTER TRANSFORMATION (camelCase):');
        console.log('========================================');
        console.log('canonicalAuthors (camelCase):', transformedReferences[0].canonicalAuthors);
        console.log('canonical_authors (snake_case kept):', transformedReferences[0].canonical_authors);
        console.log('authors (original):', transformedReferences[0].authors);
        console.log('========================================\n');
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          jobId,
          status: job.status,
          fileName: job.file_name,
          references: transformedReferences,
          totalReferences: job.total_references,  // Use original count from job, not reference count
          verifiedCount: references.filter((r) => r.status === "verified")
            .length,
          issuesCount: references.filter((r) => ["issue", "retracted", "not_found"].includes(r.status))
            .length,
          warningsCount: references.filter((r) => r.status === "warning")
            .length,
        })
      );
      return;
    }

    // POST /api/accept-correction - Accept or reject a correction
    if (req.url === "/api/accept-correction" && req.method === "POST") {
      const body = await parseBody(req);
      const { jobId, referenceId, decision, correctedData } = JSON.parse(body.toString('utf8'));

      const job = await getJobById(jobId);
      if (!job) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Job not found" }));
        return;
      }

      // Require authentication
      const userId = requireAuth(req);

      // Verify ownership (Fix IDOR)
      if (job.user_id !== userId) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      // Update the reference in database
      await updateReferenceDecision(referenceId, decision, correctedData);

      // Log activity
      await logActivity(userId, jobId, decision === 'accepted' ? 'accept_correction' : 'reject_correction', {
        referenceId,
        correctedData
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // POST /api/merge-duplicates - Merge duplicate references
    if (req.url === "/api/merge-duplicates" && req.method === "POST") {
      try {
        const body = await parseBody(req);
        const { jobId, primaryId, idsToDelete } = JSON.parse(body.toString('utf8'));

        // Require authentication
        const userId = requireAuth(req);

        // Get job and verify ownership
        const job = await getJobById(jobId);
        if (!job) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Job not found' }));
          return;
        }

        if (job.user_id !== userId) {
          console.warn(`⚠️ ALARM: Blocked IDOR access attempt. User ${userId} tried to access job ${jobId}`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        // Delete duplicate references
        const deletedCount = await deleteDuplicateReferences(jobId, idsToDelete);

        console.log(`✅ Merged duplicates for job ${jobId}: kept ${primaryId}, removed ${deletedCount} duplicates`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, deletedCount }));
        return;
      } catch (error) {
        console.error('Merge duplicates error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to merge duplicates', details: error.message }));
        return;
      }
    }

    // DELETE /api/reference - Delete a reference
    if (req.url.startsWith("/api/reference") && req.method === "DELETE") {
      try {
        const url = new URL(req.url, "http://localhost");
        const referenceId = url.searchParams.get("id");
        const jobId = url.searchParams.get("jobId");

        if (!referenceId || !jobId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Reference ID and Job ID are required' }));
          return;
        }

        // Require authentication
        let userId;
        try {
          userId = requireAuth(req);
        } catch (err) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
          return;
        }

        // Verify job ownership
        const job = await getJobById(jobId);
        if (!job) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Job not found' }));
          return;
        }

        if (job.user_id !== userId) {
          console.warn(`⚠️ ALARM: Blocked IDOR access attempt. User ${userId} tried to delete reference from job ${jobId}`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        // Delete the reference
        const deletedRef = await deleteReference(referenceId);

        if (!deletedRef) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Reference not found' }));
          return;
        }

        // Log activity
        await logActivity(userId, jobId, 'delete_reference', {
          referenceId,
          title: deletedRef.original_title,
          reason: 'User removed reference'
        });

        console.log(`✅ Deleted reference ${referenceId} from job ${jobId}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Reference deleted successfully',
          deletedId: referenceId
        }));
        return;
      } catch (error) {
        console.error('Delete reference error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to delete reference', details: error.message }));
        return;
      }
    }

    // POST /api/update-reference - Update reference with canonical data
    if (req.url === "/api/update-reference" && req.method === "POST") {
      try {
        const body = await parseBody(req);
        const { referenceId, applyFields } = JSON.parse(body.toString('utf8'));

        if (!referenceId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Reference ID is required' }));
          return;
        }

        // Get the reference with canonical data
        const referenceResult = await query(
          `SELECT * FROM "references" WHERE id = $1`,
          [referenceId]
        );

        if (referenceResult.rows.length === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Reference not found' }));
          return;
        }

        const ref = referenceResult.rows[0];

        // Build UPDATE statement dynamically based on applyFields
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (applyFields.includes('title') && ref.canonical_title) {
          updates.push(`original_title = $${paramIndex}`);
          values.push(ref.canonical_title);
          paramIndex++;
        }

        if (applyFields.includes('authors') && ref.canonical_authors) {
          updates.push(`original_authors = $${paramIndex}`);
          values.push(ref.canonical_authors);
          paramIndex++;
        }

        if (applyFields.includes('year') && ref.canonical_year) {
          updates.push(`original_year = $${paramIndex}`);
          values.push(ref.canonical_year);
          paramIndex++;
        }

        if (applyFields.includes('venue') && ref.venue) {
          updates.push(`original_source = $${paramIndex}`);
          values.push(ref.venue);
          paramIndex++;
        }

        if (applyFields.includes('doi') && ref.doi) {
          updates.push(`doi = $${paramIndex}`);
          values.push(ref.doi);
          paramIndex++;
        }

        // Always update status to 'verified' and set updated_at
        updates.push(`status = $${paramIndex}`);
        values.push('verified');
        paramIndex++;

        updates.push(`updated_at = NOW()`);

        // Add the reference ID as the last parameter
        values.push(referenceId);

        const updateQuery = `
          UPDATE "references" 
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `;

        const result = await query(updateQuery, values);

        console.log(`✅ Updated reference ${referenceId}: applied ${applyFields.join(', ')}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Reference updated successfully',
          reference: result.rows[0]
        }));
        return;
      } catch (error) {
        console.error('Update reference error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to update reference', details: error.message }));
        return;
      }
    }

    // GET /api/export - Export corrected bibliography
    if (req.url.startsWith("/api/export") && req.method === "GET") {
      const url = new URL(req.url, "http://localhost");
      const jobId = url.searchParams.get("jobId");
      const format = url.searchParams.get("format") || "bib";

      if (!jobId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "jobId required" }));
        return;
      }

      const job = await getJobById(jobId);
      if (!job) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Job not found" }));
        return;
      }

      // Get all references
      const references = await getJobReferences(jobId);

      // Require authentication first (Security Fix)
      let userId;
      try {
        userId = requireAuth(req);
      } catch (err) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Authentication required" }));
        return;
      }

      // Verify ownership (Fix IDOR)
      if (job.user_id !== userId) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized access to this export" }));
        return;
      }

      // Generate BibTeX export
      let output = '';

      if (format === 'bib') {
        for (const ref of references) {
          // Skip duplicates if not accepted by user
          if (ref.status === 'duplicate' && ref.user_decision !== 'accepted') continue;

          // Use corrected data if accepted, otherwise original
          const title = ref.corrected_title || ref.original_title;
          const authors = ref.corrected_authors || ref.original_authors;
          const year = ref.corrected_year || ref.original_year;
          const venue = ref.venue || ref.original_source;
          const doi = ref.doi || '';

          output += `@article{${ref.bibtex_key},\\n`;
          output += `  title = {${title}},\\n`;
          output += `  author = {${authors}},\\n`;
          output += `  year = {${year}},\\n`;
          output += `  journal = {${venue}},\\n`;
          if (doi) output += `  doi = {${doi}},\\n`;
          output += `}\\n\\n`;
        }
      }

      // Log export activity
      await logActivity(userId, jobId, 'export', { format });

      res.writeHead(200, {
        "Content-Type": "application/x-bibtex",
        "Content-Disposition": `attachment; filename="${job.file_name.replace(/\\.[^.]+$/, '')}_corrected.bib"`
      });
      res.end(output);
      return;
    }

    // Health check
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    console.error("❌ Error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

// Helper function: Detect duplicates
function detectDuplicates(references) {
  const groups = [];
  const processed = new Set();

  for (let i = 0; i < references.length; i++) {
    if (processed.has(i)) continue;

    const group = [references[i]];

    for (let j = i + 1; j < references.length; j++) {
      if (processed.has(j)) continue;

      let isDuplicate = false;
      let reason = '';

      // RULE 1: Exact DOI match = definitely same paper
      if (references[i].doi && references[j].doi) {
        const doi1 = references[i].doi.toLowerCase().trim();
        const doi2 = references[j].doi.toLowerCase().trim();
        if (doi1 === doi2) {
          isDuplicate = true;
          reason = `Same DOI: ${doi1}`;
          console.log(`🔄 Duplicate found: ${reason}`);
        }
      }

      // RULE 2: Title similarity using Levenshtein distance (NOT just word count!)
      if (!isDuplicate && references[i].title && references[j].title) {
        const titleSim = calculateTitleSimilarity(references[i].title, references[j].title);

        // For duplicate detection, require VERY high similarity (98%+)
        // This prevents "phishing attack" papers from matching each other
        if (titleSim > 98) {
          // Additional check: year must match OR be within 1 year (preprint vs published)
          const year1 = references[i].year || references[i].original_year;
          const year2 = references[j].year || references[j].original_year;
          const yearDiff = year1 && year2 ? Math.abs(year1 - year2) : 999;

          if (yearDiff <= 1) {
            isDuplicate = true;
            reason = `Nearly identical titles (${titleSim.toFixed(1)}%) + year match`;
            console.log(`🔄 Duplicate found: ${reason}`);
            console.log(`   Title 1: "${references[i].title}"`);
            console.log(`   Title 2: "${references[j].title}"`);
          } else {
            console.log(`⚠️  Same title but different years (${year1} vs ${year2}) - NOT marking as duplicate`);
          }
        } else if (titleSim > 80) {
          // Log similar papers for debugging (but NOT duplicates)
          console.log(`ℹ️  Similar papers (${titleSim.toFixed(1)}% similarity) - NOT duplicates:`);
          console.log(`   [${i}] "${references[i].title}" (${references[i].year})`);
          console.log(`   [${j}] "${references[j].title}" (${references[j].year})`);
        }
      }

      if (isDuplicate) {
        group.push(references[j]);
        processed.add(j);
      }
    }

    if (group.length > 1) {
      console.log(`✅ Duplicate group created with ${group.length} entries`);
      groups.push(group);
    }

    processed.add(i);
  }

  console.log(`📊 Duplicate detection complete: Found ${groups.length} duplicate groups`);
  return groups;
}

// Levenshtein distance for accurate string similarity
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // substitution
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1      // insertion
        );
      }
    }
  }

  return dp[m][n];
}

// Calculate title similarity using Levenshtein distance
function calculateTitleSimilarity(title1, title2) {
  if (!title1 || !title2) return 0;

  // Normalize: lowercase, remove extra spaces, remove punctuation
  const normalize = (str) => str
    .toLowerCase()
    .replace(/[.,;:!?"""'']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const s1 = normalize(title1);
  const s2 = normalize(title2);

  if (s1 === s2) return 100;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(s1, s2);
  const similarity = ((maxLen - distance) / maxLen) * 100;

  return similarity;
}

const PORT = process.env.API_PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Dev API Server running on http://localhost:${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   POST /api/analyze - Upload file for analysis`);
  console.log(`   GET  /api/results - Retrieve analysis results`);
  console.log(`   GET  /health - Server health check\n`);
});
