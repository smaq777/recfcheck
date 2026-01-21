/**
 * Local development API server for RefCheck
 * Handles /api/analyze and /api/results endpoints
 * Run alongside Vite dev server: npm run dev
 */

import http from "http";
import { fileURLToPath } from "url";
import { dirname } from "path";
import pdfParse from "pdf-parse";
import { crossValidateReference } from "./verification-apis.js";
import { 
  createJob, 
  getJobById, 
  updateJobProgress, 
  completeJob,
  createReference,
  getJobReferences,
  updateReferenceDecision,
  deleteDuplicateReferences,
  logActivity,
  getUserByEmail,
  createUser
} from "./db-queries.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Temporary: Use a demo user until authentication is implemented
// In production, this will come from session/JWT
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

// Store active SSE connections for progress updates
const activeConnections = new Map(); // jobId -> response object

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
      console.log(`✅ Numbered pattern found ${references.length} references`);
      
      // Fallback patterns if the numbered pattern didn't work
      if (references.length === 0) {
        console.log('⚠️ Numbered pattern failed, trying alternative patterns...');
        
        // Try original patterns on original text
        const pattern1 = /\[(\d+)\]\s*([A-Z][^\d]+?)\s*,?\s*(\d{4})[^\[]{20,}?(?=\[|$)/gs;
        while ((match = pattern1.exec(referencesText)) !== null && references.length < 200) {
          const [fullMatch, number, authorsAndTitle, year] = match;
          const content = fullMatch.replace(`[${number}]`, '').trim();
          
          references.push({
            bibtex_key: `ref${number}`,
            title: content.substring(0, 150),
            authors: authorsAndTitle.split(year)[0].trim() || 'Unknown',
            year: parseInt(year, 10),
            source: 'Academic Journal',
            doi: '',
            url: '',
          });
        }
        console.log(`✅ Fallback pattern found ${references.length} references`);
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

// Mock OpenAI insight
function getMockAiInsight(reference) {
  const insights = [
    "This reference appears to be correctly formatted with matching metadata from academic registries.",
    "The publication year and venue information require verification against official sources.",
    "Author names and title formatting align with standard academic conventions.",
    "Consider verifying the DOI with CrossRef to ensure complete metadata accuracy.",
    "This citation follows proper academic standards with complete metadata information.",
  ];
  return insights[Math.floor(Math.random() * insights.length)];
}

// REMOVED: mockVerifyWithOpenAlex - now using real APIs from verification-apis.js

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
    // POST /api/analyze - Handle file upload and start processing
    if (req.url === "/api/analyze" && req.method === "POST") {
      try {
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

      // Create job in database
      const fileType = formData.fileName.endsWith('.pdf') ? 'pdf' : 'bib';
      const job = await createJob(
        DEMO_USER_ID,
        formData.fileName,
        fileType,
        parsed.references.length
      );
      
      const jobId = job.id;

      console.log(`✅ File parsed: ${formData.fileName}`);
      console.log(`📊 References found: ${parsed.references.length}`);
      console.log(`💾 Job created in database with ID: ${jobId}`);
      
      // Log activity
      await logActivity(DEMO_USER_ID, jobId, 'upload', {
        fileName: formData.fileName,
        fileType,
        totalReferences: parsed.references.length
      });

      // Start background processing
      (async () => {
        const verifiedReferences = [];
        
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
          
          // Send SSE update if client is connected
          if (activeConnections.has(jobId)) {
            const clientRes = activeConnections.get(jobId);
            clientRes.write(`data: ${JSON.stringify({ progress, currentStep, processedReferences: i + 1, totalReferences: parsed.references.length })}\n\n`);
          }
          
          console.log(`   [${i+1}/${parsed.references.length}] Verifying: "${ref.title.substring(0, 50)}..."`);
          
          const verified = await crossValidateReference(ref);
          
          // Create reference in database
          const referenceData = {
            bibtex_key: ref.bibtex_key || `ref_${i}`,
            original_title: ref.title,
            original_authors: ref.authors,
            original_year: ref.year,
            original_source: ref.source,
            canonical_title: verified.canonical_title,
            canonical_authors: verified.canonical_authors,
            canonical_year: verified.canonical_year,
            status: verified.status,
            confidence_score: Math.round(verified.confidence),
            venue: verified.venue,
            doi: verified.doi,
            is_retracted: verified.is_retracted,
            cited_by_count: verified.cited_by_count,
            google_scholar_url: verified.google_scholar_url,
            openalex_url: verified.openalex_url,
            crossref_url: verified.crossref_url,
            semantic_scholar_url: verified.semantic_scholar_url,
            duplicate_group_id: null,
            duplicate_group_count: null,
            is_primary_duplicate: false
          };
          
          const savedRef = await createReference(jobId, referenceData);
          verifiedReferences.push({
            ...savedRef,
            ai_insight: getMockAiInsight(ref),
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
          const primaryRef = group[0];
          
          // Mark the first one as the primary (keep this one)
          const primaryRefObj = verifiedReferences.find(r => r.id === primaryRef.id);
          if (primaryRefObj) {
            primaryRefObj.duplicate_group_count = groupCount;
            primaryRefObj.duplicate_group_ids = group.map(g => g.id);
            primaryRefObj.is_primary_duplicate = true;
            // TODO: Update in database
          }
          
          // Mark the rest as duplicates (to be removed)
          for (let i = 1; i < group.length; i++) {
            const dupRef = verifiedReferences.find(r => r.id === group[i].id);
            if (dupRef) {
              dupRef.status = 'duplicate';
              dupRef.issues = dupRef.issues.filter(issue => !issue.startsWith('Duplicate of'));
              dupRef.issues.push(`Duplicate - appears ${groupCount} times in your bibliography`);
              dupRef.duplicate_of = primaryRef.id;
              dupRef.duplicate_group_count = groupCount;
              dupRef.duplicate_group_ids = group.map(g => g.id);
              dupRef.is_primary_duplicate = false;
              // TODO: Update in database
            }
          }
        }
        
        // Mark job as completed in database
        await completeJob(jobId, 'completed');
        job.completedAt = new Date().toISOString();
        
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

        res.write(`data: ${JSON.stringify(data)}\n\n`);

        // Close connection when completed
        if (job.status === "completed") {
          clearInterval(interval);
          activeConnections.delete(jobId);
          res.end();
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
      
      // Get all references for this job
      const references = await getJobReferences(jobId);

      console.log(`✅ Retrieved job: ${jobId} with ${references.length} references`);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          jobId,
          status: job.status,
          fileName: job.file_name,
          references: references,
          totalReferences: references.length,
          verifiedCount: references.filter((r) => r.status === "verified")
            .length,
          issuesCount: references.filter((r) => r.issues && r.issues.length > 0)
            .length,
        })
      );
      return;
    }

    // POST /api/merge-duplicates - Remove duplicate references
    if (req.url === "/api/merge-duplicates" && req.method === "POST") {
      const body = await parseBody(req);
      const { jobId, referenceId } = JSON.parse(body.toString('utf8'));
      
      const job = await getJobById(jobId);
      if (!job) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Job not found' }));
        return;
      }
      
      const references = await getJobReferences(jobId);
      
      // Find the primary reference
      const primaryRef = references.find(r => r.id === referenceId);
      if (!primaryRef || !primaryRef.duplicate_group_ids) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not a duplicate group' }));
        return;
      }
      
      // Remove all duplicates except the primary from database
      const idsToRemove = primaryRef.duplicate_group_ids.filter(id => id !== primaryRef.id);
      await deleteDuplicateReferences(jobId, idsToRemove);
      
      console.log(`🔄 Merged duplicates for ${referenceId}, removed ${idsToRemove.length} duplicates from database`);
      
      // Log activity
      await logActivity(DEMO_USER_ID, jobId, 'merge_duplicates', {
        primaryRefId: referenceId,
        removedCount: idsToRemove.length
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        removedCount: idsToRemove.length,
        remainingReferences: job.references.length 
      }));
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

      // Update the reference in database
      await updateReferenceDecision(referenceId, decision, correctedData);
      
      // Log activity
      await logActivity(DEMO_USER_ID, jobId, decision === 'accepted' ? 'accept_correction' : 'reject_correction', {
        referenceId,
        correctedData
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
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
      await logActivity(DEMO_USER_ID, jobId, 'export', { format });

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
      
      // RULE 1: Exact DOI match = definitely same paper
      if (references[i].doi && references[j].doi) {
        const doi1 = references[i].doi.toLowerCase().trim();
        const doi2 = references[j].doi.toLowerCase().trim();
        if (doi1 === doi2) {
          isDuplicate = true;
          console.log(`🔄 Duplicate found: Same DOI (${doi1})`);
        }
      }
      
      // RULE 2: VERY high title similarity (>95%) + same year + same first author
      if (!isDuplicate) {
        const titleSim = calculateStringSimilarity(references[i].title, references[j].title);
        const yearMatch = references[i].year === references[j].year;
        
        // Extract first author for comparison
        const author1 = references[i].authors?.split(/[,;&]/)[0]?.trim().toLowerCase();
        const author2 = references[j].authors?.split(/[,;&]/)[0]?.trim().toLowerCase();
        const authorMatch = author1 && author2 && (author1.includes(author2) || author2.includes(author1));
        
        // Must be >95% similar title + same year + same first author
        if (titleSim > 95 && yearMatch && authorMatch) {
          isDuplicate = true;
          console.log(`🔄 Duplicate found: High similarity (${titleSim}%) + year match + author match`);
          console.log(`   Title 1: "${references[i].title}"`);
          console.log(`   Title 2: "${references[j].title}"`);
        } else if (titleSim > 85) {
          // Log near-matches for debugging (but don't mark as duplicate)
          console.log(`⚠️  Similar papers (NOT duplicate): ${titleSim}% similarity`);
          console.log(`   Title 1: "${references[i].title}"`);
          console.log(`   Title 2: "${references[j].title}"`);
          console.log(`   Year match: ${yearMatch}, Author match: ${authorMatch}`);
        }
      }
      
      if (isDuplicate) {
        group.push(references[j]);
        processed.add(j);
      }
    }
    
    if (group.length > 1) {
      groups.push(group);
    }
    
    processed.add(i);
  }
  
  return groups;
}

// Helper function: Calculate string similarity
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  
  // Simple similarity: check common words
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w)).length;
  const totalWords = Math.max(words1.length, words2.length);
  
  return Math.round((commonWords / totalWords) * 100);
}

const PORT = process.env.API_PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Dev API Server running on http://localhost:${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   POST /api/analyze - Upload file for analysis`);
  console.log(`   GET  /api/results - Retrieve analysis results`);
  console.log(`   GET  /health - Server health check\n`);
});
