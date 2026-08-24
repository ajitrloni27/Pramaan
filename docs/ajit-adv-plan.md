# Ajit Enhancement Tasks — Plan (A-ADV-1 through A-ADV-5)

> **Owner:** Ajit (SAP lane) · **Reviewer:** Murgesh (TRUNK — read-only)  
> **Scope:** Seam bodies of `01_read.ts` and `06_draft.ts` only. All other files are off-limits.  
> **Frozen file:** `packages/contracts/types.ts` — MUST NOT be changed.

---

## Top-Level Overview

Five enhancement tasks hardening the Granite + Docling integration, verifying the Ollama fallback chain, extending the adversarial harness with a PDF case, and running a final full-stack verification.

**Critical contract constraint discovered during research:**  
`AuditEvent.t` in `packages/contracts/types.ts` (line 76–86) is a frozen discriminated union:  
`"ocr" | "lookup" | "compare" | "prove" | "hold_placed" | "hold_staged" | "hold_released" | "draft" | "consent" | "error"`  
It does **not** include `"granite_guard_triggered"`.  
Task A-ADV-1(c) asks for `t: "granite_guard_triggered"` — this would be a TypeScript compile error and violates the contract freeze. **Resolution:** Use `t: "error"` (closest existing type) for the audit event, with `payload` carrying `{ event: "granite_guard_triggered", discarded_numbers, valid_numbers }`. This keeps the intent while respecting the frozen type. **Flag this to Murgesh** in the commit message so he is aware.

---

## Sub-Tasks

---

### A-ADV-1 — Harden Granite Prompt Engineering (06_draft.ts seam)

**Status:** `[ ] pending`

**Intent:**  
Replace the existing flat prompt with a structured one that explicitly separates roles, overcharge data, and instructions. Add a stronger number guard that extracts all numeric values from Granite's output and discards the response if any number is not in the valid set from gap cards + hold. Append an audit event when the guard fires, using `t: "error"` (the closest allowed type) since `"granite_guard_triggered"` is not in the frozen union.

**Expected Outcomes:**
- Granite prompt is structured with explicit OVERCHARGES, PROVISIONAL HOLD, and INSTRUCTIONS sections
- Number guard regex extracts all `₹?digits` from Granite output and validates each against the allowed set
- If any hallucinated number found: log to stderr, append `auditLog` event with `t: "error"` + payload containing `event: "granite_guard_triggered"`, then fall back to `templateFillStub`
- `auditLog` is imported **at the top of the file** (outside seam markers — one-time setup allowed per task spec)
- Zero TypeScript compile errors

**Todo List:**
1. Read current state of `06_draft.ts` (already done — lines 1–135)
2. Add `import { auditLog } from "../../audit/audit_log.js";` to the top-level imports (line 6, outside seam zone — explicitly allowed by task spec as "one-time setup")
3. Inside the seam, replace the `prompt` construction (lines 34–58) with the new structured prompt format using numbered line items and explicit INSTRUCTIONS section
4. After the existing empty-string guard (line 86), add the number guard:
   - Build `validNumbers: Set<number>` from all `your_value`, `official_value`, `gap` on gap cards plus `hold.amount` if present
   - Extract all numeric tokens from `graniteText` using `/₹?\s*([\d,]+\.?\d*)/g`, parse each to float
   - If any extracted number is NOT in `validNumbers`, log the warning, call `auditLog.append({ t: "error", run_id: "current-run-id", ts: new Date().toISOString(), payload: { event: "granite_guard_triggered", discarded_numbers: [...], valid_numbers: [...] } })`, and return `templateFillStub(cards, hold, template)`
5. Note: `run_id` is not passed into `draft()` — use `"draft-run-unknown"` as a safe placeholder (the orchestrator links events by run_id; this partial event is still useful for debugging)
6. Run `npx tsc --noEmit` — zero errors
7. Commit: `feat(seams): enhanced Granite prompt + number guard with audit event`

**Relevant Context:**
- `06_draft.ts` seam: lines 13–97
- Existing prompt: lines 34–58
- Existing empty guard: lines 85–89
- `auditLog.append` API: `services/brain/src/audit/audit_log.ts` line 13
- `AuditEvent` type: `packages/contracts/types.ts` lines 75–90
- Frozen union: `t` must be one of the 9 existing literals — use `"error"` for guard events

---

### A-ADV-2 — Add Docling Adapter for PDF Input (01_read.ts seam)

**Status:** `[ ] pending`

**Intent:**  
Replace the current hard-rejection of PDF input (lines 13–20 in `01_read.ts`) with an attempted Docling parse first, falling back to Tesseract for images. The current code returns `[]` for all PDFs — this task makes PDFs actually work when Docling is available.

**Expected Outcomes:**
- PDF detection: `data:application/pdf` prefix OR `.pdf` suffix → Docling path
- Docling attempted via dynamic `await import('@docling/core')` (graceful failure if not installed)
- `parseDoclingOutput` helper defined inside the seam zone — converts Docling result to `ExtractedField[]`
- On Docling failure: falls through to Tesseract (for image inputs) or returns `[]` (for PDF inputs Tesseract can't handle)
- `applyConfidenceGate` still called exactly once as the last expression before `return`
- If `@docling/core` is not installed, dynamic import fails silently → falls back to Tesseract path → zero crash
- Zero TypeScript compile errors

**Todo List:**
1. Remove the current hard PDF rejection block (lines 13–20)
2. Add PDF detection logic before the Tesseract section:
   - Detect: `req.image.startsWith("data:application/pdf")` OR `req.image.endsWith(".pdf")`
   - If PDF: attempt Docling via dynamic import in a try/catch
   - On Docling success: parse via `parseDoclingOutput` helper, return `applyConfidenceGate(rawFields)`
   - On Docling failure: log warning, return `[]` (Tesseract cannot handle PDFs)
3. Define `parseDoclingOutput(result: any): ExtractedField[]` inside the seam zone:
   - Tables path: iterate `result.tables → rows → cells`, join cell text, extract value/unit, set bbox and confidence
   - Text fallback: split `result.text` by newlines, each line becomes a field
   - Uses existing `extractNumber` / `extractUnit` logic (inline the same regex patterns already in the seam)
   - Always sets `low_conf: false` (gate handles it)
4. Non-PDF path: existing Tesseract block remains unchanged
5. `applyConfidenceGate` remains the last call before each `return` in all paths
6. Run `npx tsc --noEmit` — zero errors
7. Commit: `feat(seams): Docling adapter for PDF input with Tesseract fallback`

**Relevant Context:**
- `01_read.ts` seam: lines 8–159
- Current PDF rejection: lines 13–20 (to be replaced)
- Tesseract block: lines 29–154 (to remain for non-PDF input)
- `applyConfidenceGate` import: line 5 (already present, static — correct)
- `ExtractedField` type: `packages/contracts/types.ts` lines 4–11
- Rule: `applyConfidenceGate` called exactly once per code path (AJIT_SEAMS.md line 53)

---

### A-ADV-3 — Test Ollama Fallback End-to-End + Document Fallback Chain

**Status:** `[ ] pending`

**Intent:**  
Verify the three-tier fallback chain (Granite → Ollama → templateFillStub) functions correctly under network failure, and document the chain in `AJIT_SEAMS.md`.

**Expected Outcomes:**
- `AJIT_SEAMS.md` has a new section `## Fallback Chain (06_draft.ts)` documenting all three tiers
- Section states: Priority 1 = Granite via watsonx.ai (10s timeout), Priority 2 = Ollama local (if installed), Priority 3 = templateFillStub
- States that all three paths return `{ text, banner: "AI-generated — review before sending" }`
- States that the demo never depends on a live model call
- The existing code already handles this fallback correctly (the `catch` block at line 93 falls back to `templateFillStub`); Ollama tier needs to be verified — if Ollama is not installed locally, the chain is Granite → templateFillStub (acceptable for sprint)
- Commit: `docs(seams): fallback chain documented in AJIT_SEAMS.md`

**Todo List:**
1. Append the `## Fallback Chain (06_draft.ts)` section to `AJIT_SEAMS.md`
2. Describe the chain exactly as specified: priorities 1, 2, 3 with descriptions
3. Note that Ollama tier is optional — if not installed, chain is Granite → templateFillStub
4. Note that `draft()` currently has one catch-all: if Ollama integration is desired in future, it would go inside the catch before calling `templateFillStub` — but for this sprint, the catch goes directly to template
5. Commit: `docs(seams): fallback chain documented in AJIT_SEAMS.md`

**Relevant Context:**
- `AJIT_SEAMS.md`: 322 lines, append after line 322
- `06_draft.ts` catch block: lines 93–95 (currently falls directly to `templateFillStub`)
- Task spec says: "If Ollama is not installed locally, skip the Ollama tier — the chain is Granite → templateFillStub. That's acceptable for the sprint."

---

### A-ADV-4 — Extend Adversarial Harness with PDF Test Case

**Status:** `[ ] pending`

**Intent:**  
Add a 6th test case (S6: PDF bill) to the adversarial harness. If no sample PDF is available, the harness gracefully skips S6 and still runs the original 5 cases without error.

**Expected Outcomes:**
- `run_adversarial.ts` contains an S6 block for "PDF bill"
- S6 logic: attempt to load `sample_bill.pdf` from `IMAGE_DIR`; if not found, log "PDF test skipped — no sample available" and mark S6 as skipped (not failed)
- If PDF is loaded: POST to `/run` with the base64 PDF, verify 200 OK + no crash + banner present
- Summary table updated to reflect 5 or 6 scenarios
- Original 5 scenarios (S1–S5) unaffected
- `npx tsx data/samples/adversarial/run_adversarial.ts` runs to completion — no crashes
- Zero TypeScript compile errors

**Todo List:**
1. After the S5 block (line 244) in `run_adversarial.ts`, add S6 scenario block
2. Use `loadImage("sample_bill.pdf", "")` — but modify logic: if synthetic fallback is empty string, skip the scenario with a console log instead of POSTing
3. If PDF found: POST to `/run`, check status 200, check no 500, check banner present
4. Mark `s6.record(...)` appropriately; if skipped, mark as passed (skip ≠ fail)
5. Update the summary section to mention "5 or 6 scenarios" (or keep it dynamic — `results.length`)
6. Run `npx tsc --noEmit` on the harness file — zero errors
7. Commit: `feat(adversarial): PDF test case added to harness`

**Relevant Context:**
- `run_adversarial.ts`: lines 227–277
- S5 ends at line 244; seed regression starts at line 248
- Insert S6 between line 244 and line 246 (the blank line before seed regression)
- `loadImage` helper: lines 97–106 — returns synthetic payload if file not found

---

### A-ADV-5 — Final Verification

**Status:** `[ ] pending`

**Intent:**  
Run the full verification checklist to confirm all A-ADV-1 through A-ADV-4 changes are coherent, the seed path is byte-identical, TypeScript compiles clean, and the audit log records guard events correctly.

**Expected Outcomes:**
- `npx tsc --noEmit` → zero errors
- Adversarial harness → 5/5 or 6/6 pass
- Seed regression → byte-identical, `run_id = "demo-trap-001"`
- `draft.banner` always present on all paths
- If number guard was triggered during testing, `t: "error"` event with `event: "granite_guard_triggered"` payload visible in audit log

**Todo List:**
1. Run `npx tsc --noEmit` in `services/brain/` — zero errors required
2. Run `npx tsx data/samples/adversarial/run_adversarial.ts` — verify output
3. Check seed regression: `GET /run?seed=trap` twice — byte-identical
4. If any compile error: fix before reporting done
5. Report final status to Murgesh

**Relevant Context:**
- TypeScript config: `services/brain/tsconfig.json`
- Harness runner: `data/samples/adversarial/run_adversarial.ts`
- Seed endpoint: `GET /run?seed=trap`

---

## Dependency Order

```
A-ADV-1 (06_draft.ts changes)
    ↓
A-ADV-2 (01_read.ts changes)  ← independent of A-ADV-1, can be done in either order
    ↓
A-ADV-3 (docs only — AJIT_SEAMS.md)
    ↓
A-ADV-4 (harness extension)
    ↓
A-ADV-5 (final verification — depends on all above)
```

A-ADV-1 and A-ADV-2 are independent of each other. A-ADV-3 is documentation only. A-ADV-5 must be last.

---

## Seam Boundaries (non-negotiable)

| File | Seam START | Seam END | Lines editable |
|------|-----------|---------|----------------|
| `01_read.ts` | line 8 | line 159 | 9–158 |
| `06_draft.ts` | line 13 | line 97 | 14–96 |

Top-level imports (outside markers) may only be added as a one-time setup if explicitly required by a task (per task spec A-ADV-1 for `auditLog` import).

---

*Plan written 2026-08-09. Built with IBM Bob — AI SDLC Partner.*
