# RefCheck Documentation

## 📖 Navigation

### Quick Start
- [Master PRD](00-MASTER-PRD.md) - Complete product requirements document
- [Implementation Priorities](08-implementation/priorities.md) - What to build first

### For Product Managers
- [Product Overview](01-product/overview.md) - Vision, goals, metrics
- [User Personas](01-product/user-personas.md) - Target users
- [Roadmap](01-product/roadmap.md) - Release timeline

### For Designers
- [Design Tokens](03-design/design-tokens.md) - Colors, spacing, typography
- [Component Library](03-design/component-library.md) - UI components specs
- [Page Layouts](03-design/page-layouts.md) - All page mockups

### For Developers

#### Getting Started
1. Read [00-MASTER-PRD.md](00-MASTER-PRD.md) - Master reference
2. Follow [Setup Guide](08-implementation/setup-guide.md)
3. Check [Implementation Priorities](08-implementation/priorities.md)

#### Frontend Development
- [Marketing Pages Requirements](04-requirements/marketing-pages.md)
- [Auth Pages Requirements](04-requirements/auth-pages.md)
- [App Pages Requirements](04-requirements/app-pages.md)
- [Component Specs](03-design/component-library.md)

#### Backend Development
- [API Endpoints](05-api/endpoints.md)
- [Database Schema](06-database/schema.md)
- [External Integrations](07-integrations/)

#### Testing
- [Testing Strategy](08-implementation/testing-strategy.md)

---

## 🔍 Quick Reference

### Find a Requirement
All requirements use format: `REQ-[TYPE]-[NUMBER]`

| Type | Location | Example |
|------|----------|---------|
| PAGE | `04-requirements/*-pages.md` | REQ-PAGE-011.5 |
| API | `05-api/endpoints.md` | REQ-API-001.3 |
| DB | `06-database/schema.md` | REQ-DB-002.1 |
| INT | `07-integrations/*.md` | REQ-INT-001.2 |
| FEAT | `04-requirements/features.md` | REQ-FEAT-003.1 |
| UI | `03-design/component-library.md` | REQ-UI-020 |

---

## 📋 Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| 00-MASTER-PRD.md | ✅ Complete | 2026-01-23 |
| Technical Architecture | ✅ Complete | 2026-01-23 |
| API Integrations | ✅ Complete | 2026-01-23 |
| Database Schema | ✅ Complete | 2026-01-23 |
| Implementation Plan | ✅ Complete | 2026-01-23 |

---

## 📁 Folder Structure

```
docs/
├── README.md                    # This file
├── 00-MASTER-PRD.md            # Complete PRD with all requirements
├── 01-product/                  # Product requirements
├── 02-technical/                # Technical specifications
├── 03-design/                   # Design system & UI specs
├── 04-requirements/             # Detailed requirements
├── 05-api/                      # API documentation
├── 06-database/                 # Data layer
├── 07-integrations/             # External services
├── 08-implementation/           # Build guides & priorities
└── 09-adr/                      # Architecture decisions
```
