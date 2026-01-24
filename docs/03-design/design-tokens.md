# RefCheck Design System
**Document:** docs/03-design/design-tokens.md  
**Last Updated:** January 23, 2026

---

## Color Palette

### Primary Colors
```css
--primary: #1e3a5f;           /* Navy blue - headers, primary buttons */
--primary-light: #2d4a6f;     /* Hover state */
--primary-dark: #0f2744;      /* Active/pressed state */
```

### Status Colors
```css
--success: #10b981;           /* Green - verified, success */
--error: #ef4444;             /* Red - issues, retracted, not found */
--warning: #f59e0b;           /* Orange - warnings, mismatches */
--info: #3b82f6;              /* Blue - add DOI, add venue, info */
--duplicate: #a855f7;         /* Purple - duplicate references */
```

### Neutral Colors
```css
--background: #f8fafb;        /* Page background */
--background-alt: #eef1f7;    /* Section background */
--surface: #ffffff;           /* Card background */
--border: #e5eaf1;            /* Borders, dividers */
--border-dark: #d1d5db;       /* Input borders */

--text-primary: #1a1f36;      /* Headings, important text */
--text-secondary: #374151;    /* Body text */
--text-muted: #6b7280;        /* Secondary info */
--text-light: #9ca3af;        /* Placeholders, captions */
```

---

## Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Font Sizes
```css
--text-xs: 0.75rem;    /* 12px - captions, badges */
--text-sm: 0.875rem;   /* 14px - secondary text */
--text-base: 1rem;     /* 16px - body text */
--text-lg: 1.125rem;   /* 18px - subheadings */
--text-xl: 1.25rem;    /* 20px - section titles */
--text-2xl: 1.5rem;    /* 24px - page titles */
--text-3xl: 1.875rem;  /* 30px - hero text */
--text-4xl: 2.25rem;   /* 36px - large hero */
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## Spacing

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

---

## Border Radius

```css
--radius-sm: 0.25rem;  /* 4px - small elements */
--radius-md: 0.5rem;   /* 8px - buttons, inputs */
--radius-lg: 0.75rem;  /* 12px - cards */
--radius-xl: 1rem;     /* 16px - modals, large cards */
--radius-full: 9999px; /* Pills, avatars */
```

---

## Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

---

## Component Styles

### Buttons

#### Primary Button
```css
.btn-primary {
  background: var(--primary);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  transition: background 0.2s;
}
.btn-primary:hover {
  background: var(--primary-light);
}
```

#### Secondary Button
```css
.btn-secondary {
  background: white;
  color: var(--text-primary);
  border: 1px solid var(--border);
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
}
.btn-secondary:hover {
  background: var(--background);
}
```

### Status Badges

```jsx
// Verified
<span className="badge badge-success">✅ VERIFIED</span>

// Issue/Error
<span className="badge badge-error">❌ NOT FOUND</span>
<span className="badge badge-error">🚫 RETRACTED</span>

// Warning
<span className="badge badge-warning">⚠️ TITLE MISMATCH</span>
<span className="badge badge-warning">⚠️ YEAR DISCREPANCY</span>

// Info
<span className="badge badge-info">🔗 ADD DOI</span>
<span className="badge badge-info">📍 ADD VENUE</span>

// Duplicate
<span className="badge badge-duplicate">🔄 DUPLICATE</span>

// Neutral
<span className="badge badge-neutral">❓ NEEDS REVIEW</span>
```

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.badge-success {
  background: #d1fae5;
  color: #065f46;
}

.badge-error {
  background: #fee2e2;
  color: #991b1b;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.badge-info {
  background: #dbeafe;
  color: #1e40af;
}

.badge-duplicate {
  background: #f3e8ff;
  color: #6b21a8;
}

.badge-neutral {
  background: #f3f4f6;
  color: #374151;
}
```

### Cards

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
}

.card-header {
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-4);
}
```

### Progress Bar

```css
.progress-bar {
  height: 8px;
  background: var(--border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--success));
  transition: width 0.3s ease;
}
```

### Confidence Indicator

```css
.confidence-bar {
  width: 100px;
  height: 6px;
  background: var(--border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.confidence-bar[data-score="high"] .fill { background: var(--success); }
.confidence-bar[data-score="medium"] .fill { background: var(--warning); }
.confidence-bar[data-score="low"] .fill { background: var(--error); }
```

---

## Icon Usage

Use Material Symbols Outlined for all icons:

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
```

### Common Icons

| Purpose | Icon | Code |
|---------|------|------|
| Verified | ✅ | `check_circle` |
| Error | ❌ | `error` |
| Warning | ⚠️ | `warning` |
| Info | ℹ️ | `info` |
| Duplicate | 🔄 | `content_copy` |
| DOI | 🔗 | `link` |
| Edit | ✏️ | `edit` |
| Delete | 🗑️ | `delete` |
| Download | ⬇️ | `download` |
| Upload | ⬆️ | `upload` |
| Settings | ⚙️ | `settings` |
| Search | 🔍 | `search` |
| Filter | 🔽 | `filter_list` |
| Sort | ↕️ | `sort` |

---

## Responsive Breakpoints

```css
/* Mobile first */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

---

## Animation Tokens

```css
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;

/* Slide in from right (for drawer) */
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

/* Fade in up (for modals) */
@keyframes fadeInUp {
  from { 
    opacity: 0; 
    transform: translateY(10px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}
```

---

## Z-Index Scale

```css
--z-dropdown: 100;
--z-sticky: 200;
--z-drawer: 300;
--z-modal: 400;
--z-toast: 500;
--z-tooltip: 600;
```
