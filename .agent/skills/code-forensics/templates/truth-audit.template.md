# PRD Truth Audit Report

> **PRD Under Audit:** [PRD filename or title]  
> **Audit Date:** [YYYY-MM-DD]  
> **Auditor:** AI Agent (Codebase Deep Scan Skill)

---

## Audit Summary

| Metric | Count |
|--------|-------|
| Total Claims Audited | |
| ✅ Confirmed | |
| ⚠️ Partial | |
| ❌ False | |
| 🔍 Undocumented (in code but not PRD) | |
| 🪦 Deprecated | |

**Accuracy Score:** `(CONFIRMED / TOTAL) × 100 = ___%`

**Reliability Score:** `TOTAL - (FALSE × 3) - (PARTIAL × 2) - (UNDOCUMENTED × 1) = ___`

**Verdict:** [✅ PRD is accurate | ⚠️ PRD needs revision | ❌ PRD is unreliable]

---

## Claim-by-Claim Audit

### Section: [PRD Section Name]

| # | PRD Claim | Code Evidence | Verdict | Notes |
|---|-----------|---------------|---------|-------|
| 1 | | `file:line` | ✅/⚠️/❌ | |
| 2 | | `file:line` | ✅/⚠️/❌ | |

### Section: [Next PRD Section]

| # | PRD Claim | Code Evidence | Verdict | Notes |
|---|-----------|---------------|---------|-------|
| | | | | |

---

## Undocumented Features (Code ≠ PRD)

Features found in code that the PRD does not mention:

| # | Feature | Location | Impact | Should Add to PRD? |
|---|---------|----------|--------|-------------------|
| | | | | |

---

## Discrepancy Details

### Critical Discrepancies (❌ FALSE)

#### Discrepancy 1: [Title]
- **PRD Says:** [Exact quote from PRD]
- **Code Shows:** [What the code actually does]
- **Evidence:** `[file:line]`
- **Impact:** [What this means for users/stakeholders]
- **Recommendation:** [Update PRD / Implement feature / Remove claim]

### Partial Discrepancies (⚠️ PARTIAL)

#### Discrepancy 1: [Title]
- **PRD Says:** [Exact quote]
- **Code Shows:** [What's actually implemented]
- **Gap:** [What's missing or different]
- **Evidence:** `[file:line]`
- **Recommendation:** [Specific action]

---

## Architecture Alignment

Does the code's architecture match the PRD's implied architecture?

| Aspect | PRD Implies | Code Reality | Match? |
|--------|-------------|--------------|--------|
| | | | |

---

## Recommendations

### PRD Corrections Needed
1. [Specific correction with page/section reference]

### Missing Implementation
1. [Feature in PRD but not in code]

### Undocumented Features to Add
1. [Feature in code but not in PRD]

### Data Flow Corrections
1. [Any pipeline/flow that differs from PRD description]

---

## Audit Trail

### Files Examined
- [List of all files reviewed during audit]

### Methodology
- Scan Level: [L3 Deep / L4 Forensic]
- Phases Completed: [1-5]
- Time Spent: [estimate]
