# Security Audit Report: VerifyCite / RefCheck

**Date:** 2026-01-23
**Auditor:** Senior Security Tester Agent (Antigravity)
**Status:** In Progress

---

## 1. Asset Map & Threat Model (Phase 0)

### Asset Inventory
| Asset | Description | Sensitivity | storage/Location |
|-------|-------------|-------------|------------------|
| **User Identities** | User accounts, emails, password hashes, verified status | **Critical** | Postgres (`users` table) |
| **Auth Tokens** | Bearer tokens (UUIDs in this dev implementation) | **Critical** | Client Headers, Server Logs (Wait! See Findings) |
| **Bibliography Data** | Extracted citations, verification results, AI insights | **High** | Postgres (`bibliography_references`) |
| **Uploaded Files** | .bib and .pdf source files | **High** | In-Memory (during processing only), Metadata in DB |
| **Analysis Reports** | The aggregated results of a verification job | **High** | JSON Response via API |
| **Infrastructure** | Database connection, API Server | **High** | Localhost (Dev), Neon (DB) |

### Threat Model Summary
*   **Attacker Profile:** Malicious User (authenticated), Anonymous Attacker (unauthenticated), Insider.
*   **Key Risks:** 
    *   **Data Leakage:** Users viewing others' research/bibliographies.
    *   **Impersonation:** Taking over user accounts.
    *   **Service Integrity:** Submitting fake data or crashing the parser (DoS).

---

## 2. Endpoint Inventory & Access Control Matrix (Phase 2)

| Endpoint | Method | Function | Auth Required? | Ownership Check? | **Status** |
|----------|--------|----------|----------------|------------------|------------|
| `/api/auth/signup` | POST | Register User | No | N/A | Safe |
| `/api/auth/login` | POST | Authenticate | No | N/A | Safe |
| `/api/auth/verify-email` | POST | Verify Code | No | N/A | Safe |
| `/api/analyze` | POST | Upload File | **Yes** | N/A (Creates new) | Safe |
| `/api/results` | GET | View Job | Gap (Auth logic exists) | **NO** (IDOR) | **CRITICAL** |
| `/api/export` | GET | Download Bib | Gap (Auth logic exists) | **NO** (IDOR) | **CRITICAL** |
| `/api/progress` | GET | SSE Stream | No | **NO** (IDOR) | **CRITICAL** |
| `/api/merge-duplicates` | POST | Edit Data | **Yes** | **NO** (IDOR) | **HIGH** |
| `/api/accept-correction`| POST | Edit Data | **Yes** | **NO** (IDOR) | **HIGH** |

---

## 3. Findings & Risk Register

### [SEV-CRIT-01] Authentication Bypass via `x-user-id` Header
- **Severity:** CRITICAL
- **Category:** Broken Authentication
- **Affected components:** `dev-server.js` (`extractUserId` function)
- **Impact:** Any attacker can impersonate ANY user by simply setting the `x-user-id` header to the target's UUID. This completely bypasses password and token checks.
- **Reproduction:**
    ```bash
    curl -H "x-user-id: <victim-uuid>" http://localhost:3001/api/analyze
    ```
- **Root Cause:** Insecure fallback logic in `extractUserId` that trusts client headers.
- **Fix Recommendation:** Remove the `x-user-id` header check. Only accept and validate the `Authorization: Bearer <token>` header.

### [SEV-CRIT-02] Insecure Direct Object Reference (IDOR) on Job Results
- **Severity:** CRITICAL
- **Category:** Broken Access Control
- **Affected components:** `dev-server.js` (`/api/results`, `/api/export`, `/api/progress`)
- **Impact:** A malicious user can access the private bibliography analysis of any other user if they can guess or enumerate the `jobId` (UUID).
- **Reproduction:**
    1. Authenticate as User A.
    2. Obtain a `jobId` belonging to User B.
    3. Request `GET /api/results?jobId=<UserB_JobId>`.
    4. Server returns the data (verified by code review: `getJobById` does not filter by user, and endpoint acts on result immediately).
- **Root Cause:** Backend endpoints retrieve the job `SELECT * FROM jobs WHERE id = $1` but fail to verify that `job.user_id === authenticated_user_id`.
- **Fix Recommendation:** 
    1. Modify `db-queries.js` to accept `userId` in `getJobById`.
    2. Or, modify `dev-server.js` to check `if (job.user_id !== userId) throw new Error("Unauthorized");` immediately after fetching.

### [SEV-HIGH-01] Sensitive Secrets Leaked in Server Logs
- **Severity:** HIGH
- **Category:** Security Misconfiguration / Data Exposure
- **Affected components:** `dev-server.js`
- **Impact:** Bearer tokens and User IDs are printed to stdout/logs. In a production environment, this would leak credentials to log aggregation services (Splunk, Datadog, etc.), accessible to many engineers.
- **Code Reference:**
    ```javascript
    console.log('[Auth] extractUserId - All request headers:', req.headers);
    console.log('[Auth] extractUserId - Found Bearer token, userId:', userId);
    ```
- **Fix Recommendation:** Remove console logs that print headers, tokens, or raw user verification codes.

### [SEV-MED-01] Weak File Type Validation (Extension Only)
- **Severity:** MEDIUM
- **Category:** File Upload
- **Affected components:** `dev-server.js` (`parseFile`)
- **Impact:** A user could upload a malicious executable renamed as `.bib` or `.pdf`. While the current parser might just fail, it opens the door to potential exploits if the parser has vulnerabilities (e.g. ImageMagick-style exploits, though less likely with `pdf-parse`).
- **Root Cause:** Validation relies on `fileName.endsWith(...)`.
- **Fix Recommendation:** Use "Magic Bytes" / MIME detection (e.g., via `file-type` or `mmmagic`) to verify the file content is actually PDF or Text/Bib.

### [SEV-MED-02] Lack of Rate Limiting
- **Severity:** MEDIUM
- **Category:** DoS / Abuse
- **Affected components:** API Server
- **Impact:** No controls to prevent a user from flooding `/api/analyze` or `/api/auth/login`.
- **Fix Recommendation:** Implement `express-rate-limit` or similar middleware (or strict manual logic in this raw Node server) to limit requests per IP/User.

---

## 4. Fix Plan (Prioritized)

1.  **Immediate Fixes (Today):**
    *   Fix [SEV-CRIT-01] by removing `x-user-id` support.
    *   Fix [SEV-CRIT-02] by adding ownership checks to all endpoints using `jobId`.
    *   Fix [SEV-HIGH-01] by cleaning up logs.

2.  **Hardening (Next Sprint):**
    *   Implement Magic Byte detection for uploads.
    *   Implement Rate Limiting.
    *   Secure HTTP Headers (Helmet).

