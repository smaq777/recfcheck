# SEO Audit: VerifyCite (RefCheck)

**Date**: January 24, 2026  
**Auditor**: Antigravity SEO Agent

## 1. Executive Summary & Scorecard

**Overall SEO Health Score: 10/100 (Critical)**

The current application is a **Client-Side Rendered (CSR) Single Page Application (SPA)** without a routing library. This means:
1.  **Zero Indexability**: Google sees only one URL (`/`) regardless of whether the user is on "Pricing", "Login", or "Home". Deep linking is impossible.
2.  **Missing Metadata**: No descriptions, Open Graph tags, or canonicals are present.
3.  **Missing Control Files**: `robots.txt` and `sitemap.xml` are completely missing (directory does not exist).

### Scorecard Breakdown
| Category | Score | Notes |
| :--- | :--- | :--- |
| **Indexability** | **0/100** | Only one URL exists. Googlebot cannot index sub-pages. |
| **Crawlability** | **0/100** | No `robots.txt` or `sitemap.xml`. |
| **Metadata** | **10/100** | Only `<title>` exists in `index.html`. No per-page metadata. |
| **Structured Data** | **0/100** | None implemented. |
| **Performance** | **40/100** | Tailwind via CDN is blocking/slow. |

---

## 2. Critical Issues List (Prioritized)

### [CRITICAL] SEO-001: Missing URL Routing Architecture
*   **Where**: `App.tsx`, `types.ts`
*   **Issue**: The app uses `useState<AppView>` to switch screens. The URL bar never changes.
*   **Why**: Search engines cannot index "Pricing" or "Product" if they don't have unique URLs (e.g., `/pricing`). Users cannot share links.
*   **Fix**: Migrate strict state-based navigation to **React Router DOM**.

### [CRITICAL] SEO-002: Missing Base SEO Files
*   **Where**: Root directory (missing `public/`)
*   **Issue**: No `robots.txt` or `sitemap.xml`.
*   **Why**: Crawlers blindly hit the site without instructions. Sitemaps are essential for SPAs to help Google discover links it can't "click".
*   **Fix**: Create `public/` and add standard files.

### [HIGH] SEO-003: Missing Page-Level Metadata
*   **Where**: `index.html` (global only)
*   **Issue**: Every "page" shares the same title "RefCheck...". No meta descriptions.
*   **Why**: Click-through rate (CTR) depends on unique titles and descriptions in SERPs.
*   **Fix**: Implement `react-helmet-async` to dynamically inject `<title>` and `<meta>` tags per route.

### [HIGH] SEO-004: Performance - Tailwind CDN
*   **Where**: `index.html`
*   **Issue**: `<script src="https://cdn.tailwindcss.com..."></script>`
*   **Why**: The browser must download and compile the entire Tailwind engine (3MB+) before rendering styles. Core Web Vitals (LCP/FCP) will be poor.
*   **Fix**: Switch to build-time PostCSS/Tailwind (standard Vite setup).

---

## 3. Patch Plan (Immediate Action)

1.  **Infrastructure**: Install `react-router-dom` and `react-helmet-async`.
2.  **Architecture**: Refactor `App.tsx` to use `<Routes>` and replace button `onClick`s with `<Link to="...">`.
3.  **Metadata**: Create a reusable `<SEO />` component.
4.  **Files**: Generate static `robots.txt` and `sitemap.xml` for the marketing pages.

## 4. Final Acceptance Checklist
- [ ] Navigating to `/pricing` loads the Pricing page directly.
- [ ] `<title>` changes to "Pricing - RefCheck" when on that page.
- [ ] `robots.txt` exists at `/robots.txt`.
- [ ] `sitemap.xml` exists at `/sitemap.xml`.
- [ ] Marketing pages are accessible to Googlebot (no "noindex").
