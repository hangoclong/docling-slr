# Codebase Deep Scan — Reference Guide

## Table of Contents

1. [Scan Techniques Catalog](#scan-techniques-catalog)
2. [Architecture Pattern Detection](#architecture-pattern-detection)
3. [Code Smell Taxonomy](#code-smell-taxonomy)
4. [Truth Audit Methodology](#truth-audit-methodology)
5. [Story Extraction from Code](#story-extraction-from-code)
6. [Commit Archaeology Commands](#commit-archaeology-commands)

---

## Scan Techniques Catalog

### 1. Structural Analysis

**Import Graph Construction:**
```bash
# TypeScript/JavaScript — find all imports from a module
grep -rn "from ['\"].*moduleName" --include="*.ts" --include="*.tsx" src/

# Find circular dependencies
# Trace: A imports B, B imports C, C imports A
grep -rn "from ['\"]" --include="*.ts" src/ | \
  awk -F: '{print $1}' | sort | uniq -c | sort -rn
```

**File Complexity Heuristics:**
| Metric | Threshold | Signal |
|--------|-----------|--------|
| Lines of Code | > 300 | Likely needs splitting |
| Import Count | > 15 | Too many dependencies |
| Function Count | > 10 | God object risk |
| Nesting Depth | > 4 | Complex logic, refactor |
| Cyclomatic Complexity | > 10 | Hard to test |

### 2. Semantic Analysis

**Function Signature Mining:**
```bash
# Extract all exported functions with their signatures
grep -rn "export.*function\|export const.*=.*=>" --include="*.ts" src/
```

**Type Definition Mining:**
```bash
# Extract all type/interface definitions
grep -rn "^export type\|^export interface\|^export enum" --include="*.ts" src/
```

**State Mutation Detection:**
```bash
# Find direct state mutations (React)
grep -rn "setState\|useState\|useReducer\|dispatch" --include="*.tsx" src/
# Find Zustand/Redux stores
grep -rn "create(\|createSlice\|createStore" --include="*.ts" src/
```

### 3. Database Schema Analysis

**Schema Discovery:**
```bash
# Prisma schema
cat prisma/schema.prisma

# Drizzle schema
find . -name "schema.ts" -path "*/db/*"

# SQL migrations
find . -path "*/migrations/*" -name "*.sql" | sort

# Supabase types (generated)
find . -name "database.types.ts" -o -name "supabase.ts"
```

**Query Pattern Analysis:**
```bash
# Find all database queries
grep -rn "\.from(\|\.select(\|\.insert(\|\.update(\|\.delete(" --include="*.ts" src/
# Prisma queries
grep -rn "prisma\.\|\.findMany\|\.findUnique\|\.create\|\.update" --include="*.ts" src/
```

### 4. API Surface Analysis

**Route Inventory:**
```bash
# Next.js App Router
find src/app -name "route.ts" -o -name "route.js"

# Next.js Pages API
find src/pages/api -name "*.ts"

# Express-style
grep -rn "router\.\(get\|post\|put\|delete\|patch\)" --include="*.ts" src/

# Server Actions (Next.js 13+)
grep -rn "'use server'" --include="*.ts" --include="*.tsx" src/
```

---

## Architecture Pattern Detection

### Clean Architecture Indicators

```
✅ PRESENT if:
  - src/ has domain/, application/, infrastructure/ directories
  - Entities have no framework imports
  - Repositories are behind interfaces
  - Use-cases/services accept dependencies via constructor

⚠️ PARTIAL if:
  - Some layers exist but boundaries leak
  - Some services import directly from DB layer

❌ ABSENT if:
  - Business logic lives in route handlers
  - Database queries scattered across UI components
  - No clear layering
```

### Modular Monolith Indicators

```
✅ PRESENT if:
  - Features organized in self-contained folders
  - Each module has its own types, services, and data access
  - Inter-module communication via defined interfaces

⚠️ PARTIAL if:
  - Feature folders exist but cross-import freely
  - Shared utilities break module boundaries

❌ ABSENT if:
  - Flat file structure
  - No feature-based organization
```

### Event-Driven Indicators

```
✅ PRESENT if:
  - Event emitter/bus patterns found
  - Pub/sub mechanisms (webhooks, queues)
  - Decoupled handlers responding to events

❌ ABSENT if:
  - Synchronous function calls only
  - No event/message infrastructure
```

---

## Code Smell Taxonomy

### Severity Matrix

| Severity | Impact | Action |
|----------|--------|--------|
| 🔴 Critical | System-level risk, data loss potential | Fix before shipping |
| 🟠 High | Feature-level risk, reliability concern | Fix in current sprint |
| 🟡 Medium | Maintainability debt, developer friction | Plan for next sprint |
| 🟢 Low | Style/convention, minor improvement | Nice to have |

### Detection Patterns

**God Object / God Service:**
```bash
# Files with too many responsibilities
wc -l src/**/*.ts | sort -rn | head -20
# Methods per class
grep -c "async \|function " src/services/*.ts
```

**Anemic Domain Model:**
```bash
# Entities/models with only type definitions, no methods
# Look for types/interfaces with no associated behavior
grep -rn "export interface.*{" --include="*.ts" src/domain/
```

**Primitive Obsession:**
```bash
# Functions accepting many primitive params instead of objects
grep -rn "function.*string.*string.*string\|number.*number.*number" --include="*.ts" src/
```

**Feature Envy:**
```
# A method that uses more properties from another object than its own
# Detected by analyzing property access patterns in function bodies
```

---

## Truth Audit Methodology

### The Adversarial Verification Protocol

When auditing a PRD or spec against code, adopt an **adversarial mindset**:

1. **Assume Claims Are Wrong** until proven by code evidence
2. **Demand Specificity** — "supports filtering" → which filters? where implemented?
3. **Check Completeness** — does the code handle ALL cases the PRD implies?
4. **Verify Error Paths** — happy path documented? what about failures?
5. **Test Edge Cases** — does the PRD account for limits, nulls, concurrency?

### Verdict Categories

| Verdict | Symbol | Meaning |
|---------|--------|---------|
| CONFIRMED | ✅ | Code fully implements the claim |
| PARTIAL | ⚠️ | Partially implemented or different from claim |
| FALSE | ❌ | Not implemented or contradicts claim |
| UNDOCUMENTED | 🔍 | Code does this but PRD doesn't mention it |
| DEPRECATED | 🪦 | Code exists but is dead/unused |

### Audit Severity Scoring

```
Score = (FALSE_count × 3) + (PARTIAL_count × 2) + (UNDOCUMENTED_count × 1)

Interpretation:
  0-5:   ✅ PRD is accurate
  6-15:  ⚠️ PRD needs revision
  16+:   ❌ PRD is unreliable — rewrite recommended
```

---

## Story Extraction from Code

### Reverse-Engineering User Stories

**Step 1: Identify Feature Boundaries**
```
Scan route handlers → each route = potential user story
Scan UI pages → each page = potential epic
Scan form components → each form = user interaction story
```

**Step 2: Extract the "What" from Code**
```typescript
// Code: src/app/api/papers/route.ts
// export async function GET(req) { ... }
// → Story: "As a researcher, I want to list papers so that I can browse my collection"

// Code: src/components/FilterPanel.tsx
// → Story: "As a researcher, I want to filter papers by criteria so that I can find relevant work"
```

**Step 3: Derive Acceptance Criteria from Code Behavior**
```
Given: [preconditions found in guard clauses and validation]
When:  [action represented by the function/handler]
Then:  [return value and side effects]
And:   [error cases found in catch blocks]
```

**Step 4: Identify Missing Stories**
```
Code that exists but has no corresponding user-facing feature:
  - Background jobs / cron tasks
  - Data migration scripts
  - Admin-only endpoints
  - Feature-flagged code (not yet released)
```

---

## Commit Archaeology Commands

### Hotspot Detection (High Churn Files)

```bash
# Files changed most often (complexity hotspots)
git log --format=format: --name-only --since="6 months ago" | \
  grep -v "^$" | sort | uniq -c | sort -rn | head -20

# Files with most authors (knowledge distribution risk)
git log --format="%an" --name-only | \
  awk '/^$/{next} /^[A-Z]/{author=$0;next} {print author, $0}' | \
  sort -k2 | uniq | awk '{print $NF}' | sort | uniq -c | sort -rn | head -20
```

### Change Coupling (Files That Change Together)

```bash
# Find files frequently modified in the same commit
git log --format=format: --name-only | \
  awk 'BEGIN{FS="\n"; RS=""} {for(i=1;i<=NF;i++) for(j=i+1;j<=NF;j++) print $i, $j}' | \
  sort | uniq -c | sort -rn | head -20
```

### Feature Timeline

```bash
# When was a feature area last touched?
git log --oneline --since="3 months ago" -- src/features/papers/

# Who has context on this area?
git shortlog -sn -- src/features/papers/
```

### Dead Code Detection via History

```bash
# Files not modified in 6+ months (potential dead code)
for f in $(find src -name "*.ts" -not -path "*/node_modules/*"); do
  last=$(git log -1 --format="%ai" -- "$f" 2>/dev/null)
  echo "$last $f"
done | sort | head -20
```

---

## Appendix: Scan Report Quality Checklist

Before delivering a scan report, verify:

- [ ] Every claim cites a specific file and line number
- [ ] Architecture diagram reflects ACTUAL code, not ideal design
- [ ] All external dependencies are inventoried
- [ ] Data flow traces cover at least 3 critical paths
- [ ] Business rules are extracted with their conditions
- [ ] Edge cases and failure modes are documented
- [ ] Technical debt items have severity ratings
- [ ] Recommendations are specific and actionable
- [ ] Missing test coverage areas are flagged
- [ ] PRD discrepancies (if auditing) have verdicts with evidence
