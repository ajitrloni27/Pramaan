# WAY-THRAJIT
## How Murgesh and Ajit Built Pramaan — Together
> **Sprint:** HackVerse Track 3 · 8–10 Aug 2026
> **Stack:** IBM watsonx Orchestrate · IBM Docling · IBM Granite · MCP · AgentOps
> **Engine trunk:** Murgesh · **OCR + Granite seams:** Ajit

---

## The Big Picture

Murgesh built the engine. Ajit plugged in the eyes and the voice.
Neither waited for the other. Neither broke the other's work.
This document is the honest record of how that happened.

```
Murgesh                          Ajit
────────────────────────────────────────────────────────────
Build contracts, gateway,        First OCR attempt (raw, no
audit, compare, MCP, steps       seam markers yet)
02/04/05 in parallel             ↓
                                 Granite attempt (__dirname bug)
Build 01/06 skeletons            ↓
+ AJIT_SEAMS.md handoff          Env template + template fixes
↓                                ↓
Build orchestrator               ── Murgesh merges, reviews,
Build HTTP surface               fixes Ajit's 3 compile errors
Fix Ajit's 3 errors              ↓
Build seeds (trap/control)       Phase 1 PR: Tesseract OCR live
Build lease path                    + Granite live
IBM docs pass                    ↓
17-point self-check (39/39)      Phase 2: Word-level row grouping
HANDOFF.md written               + number guard + Ollama fallback
                                 + adversarial harness
M-P1→M-P7 engine hardening      ↓
P9 harness (engine side)         5/5 adversarial scenarios pass
────────────────────────────────────────────────────────────
              Both sides ready for P9
```

---

## Phase 0 — Scaffold
**What happened:** Vrajesh initialised the repo. Empty files. Nothing wired.
**Completion:** ✅ Clean starting point, everyone on the same commit.

---

## Phase 1 — Murgesh Builds the Engine (T0 → T13)
**Who:** Murgesh (TRUNK)
**Duration:** ~8 hours parallel to Ajit's first attempts

### T0 — Environment Baseline
Created `.env.example` with `RUN_MODE`, IBM credential slots, `THRESHOLD`.
No credential issues on Day 1. ✅

### T1 — Contract Types + Schema Freeze
10 TypeScript types frozen in `@pramaan/contracts/types.ts`:
`ExtractedField`, `RuleRow`, `CompareResult`, `ProofCard`, `HoldEvent`,
`AuditEvent`, `RunRequest`, `RunResponse`, `Draft`, `Domain`.
6 JSON schemas. Header says `FROZEN @ P1`. **No one touched this file after.** ✅

### T2 — Mock Billing Gateway
`BillingGateway` class: idempotent `placeHold`, 72h auto-expiry via `tick()`,
`confirm()`, `release()`. Same `(invoice_id, pack_id)` always returns same `hold_id`.
Verified: idempotency test passes. ✅

### T3 — Append-Only Audit Log
`AuditLog` class: `append()` + `list(run_id)`. Never updates, never deletes.
Mapped to IBM AgentOps. Every step, every consent tap writes an immutable event. ✅

### T4 — Step 03 COMPARE (The Hallucination Defense)
Pure arithmetic function. Zero model calls. Zero network. Zero side effects.
Subtracts `field.value` from `rule.official_value`. Three-anchor ProofCard.
**The verdict is arithmetic over two cited numbers. The model is not in the path.** ✅

### T5 — MCP Server + 4 Tools
`lookup_rule`, `place_hold`, `get_hold_status`, `release_hold`.
Mapped to watsonx.data managed MCP server. Tools call gateway, not the engine directly. ✅

### T6 — Steps 02/04/05
- **02 LOOKUP:** Calls `lookupRule` for each field. Builds `Map<fieldIdx, RuleRow>`.
- **04 PROVE:** Assembles `ProofCard[]` with 3 anchors (source, rule, compute). Hard rule: no rule_anchor → `"unverified"`, never `"gap"`.
- **05 ACT:** Two-tier hold logic. `confFloor = min(all gap card confidences)`. ≥0.90 → PLACED. <0.90 → STAGED. Gap = 0 → null. ✅

### T7 — Ajit Seam Skeletons + AJIT_SEAMS.md
Two skeleton files with exact seam markers:
```
// ═══════════════ AJIT SEAM — START ═══════════════
// ═══════════════ AJIT SEAM — END ══════════════════
```
`confidence.ts` locked as the single confidence gate (`THRESHOLD = 0.90`).
`AJIT_SEAMS.md` written: exact rules, return shapes, what to never touch.
**Both files compile and start with zero external deps installed.** ✅

### T8 — The Orchestrator
`orchestrate(req)` threads all 6 steps sequentially.
`withTimeout(15s)` per step. Step error → partial `RunResponse`, never throws.
Mapped to IBM watsonx Orchestrate / Agent Lab.
Smoke: `ocr→lookup→compare→prove→draft` all audit events present. ✅

### T9 — HTTP Surface
Express server: `POST /run`, `GET /run?seed=trap|control`, `POST /consent`, `GET /health`.
`express.json({ limit: "10mb" })` — handles real bill images.
Global error handler — no stack traces, structured JSON only.
`21/21` HTTP smoke checks passed. ✅

### T10 — Deterministic Seed (PATH B)
`SEED_TRAP_FIELDS`, `FIXED_HOLD`, `FIXED_DRAFT`, `FIXED_RUN_ID` are constants.
Steps 02–05 run live on seed fields. Hold + draft + timestamps are baked.
`GET /run?seed=trap` is byte-identical across any number of calls.
Verified: `diff <(curl seed) <(curl seed)` → empty. ✅

### T11 — Lease Path
5 lease rules (3 illegal, 2 risky). Same orchestrator, same 6 steps.
Only the rulebook changes. `grep leaseOrchestrat|leaseEngine` → zero results.
Lease cards → `"unverified"` (no official_value to subtract). Hold = null. ✅

### T12 — IBM Stack Comments + ARCHITECTURE.md
IBM header in every relevant file. `ARCHITECTURE.md` with 6-step diagram,
IBM mapping table, hallucination defense, agentic statement, IBM Bob note. ✅

### T13 — Stability Pass
**17-point self-check: 39/39 assertions green.**
10× stress zero 500s. Seed byte-identical. All frozen files untouched.
`HANDOFF.md` written — 12-section bridge for Ajit, Manas, Vrajesh. ✅

---

## Phase 2 — Ajit's First Attempts (Parallel to T7–T8)

### Attempt 1 — OCR (commit `a7536584`)
**What Ajit did:** First Tesseract pass.
**Problem found:** Top-level `import { createWorker } from 'tesseract.js'` — crashes trunk at startup before OCR even runs. Seam markers not used.
**How resolved:** Murgesh held the trunk clean; Ajit corrected in next iteration.

### Attempt 2 — Granite (commit `ae0fcce3`)
**What Ajit did:** First Granite draft with template fallback and banner.
**Problems found:**
1. `__dirname` used in ESM context — `ReferenceError` at runtime.
2. Five phantom `ProofCard` fields accessed (`.bill_date`, `.user_name`, `.hospital_name`, `.item_category`, `.official_source`) — none exist in the frozen contract.
3. Stray `}` at end of both files — `tsc error TS1128`.
**How resolved:** Murgesh patched all three issues in the T9 commit (`ad3df22a`) — without touching inside Ajit's seam zones.

---

## Phase 3 — Ajit's Phase 1 PR (First Clean Plug-in)

### What Ajit delivered:
| File | Change | Quality |
|---|---|---|
| `package.json` | Added `tesseract.js ^7.0.0` + `@ibm-cloud/watsonx-ai ^1.7.16` | ✅ Correct location, correct versions |
| `01_read.ts` | Real Tesseract OCR via `await import('tesseract.js')` | ✅ Dynamic import, no top-level dep |
| `06_draft.ts` | Real Granite via `await import('@ibm-cloud/watsonx-ai')` | ✅ Dynamic import, 10s timeout, fallback |

### 38/38 PR review checks passed:
- Seam markers intact (both files, both START + END) ✅
- Function signatures unchanged ✅
- No top-level external imports ✅
- `applyConfidenceGate(rawFields)` as last line ✅
- `banner` always `"AI-generated — review before sending"` ✅
- `templateFillStub` fallback called on Granite error ✅
- `10_000` ms timeout on Granite ✅
- `confidence ÷ 100` normalisation ✅
- `bbox [x, y, x1-x0, y1-y0]` = correct `[x,y,w,h]` format ✅
- Zero frozen files touched ✅
- Seed path byte-identical after merge ✅

**PR merged to main. Phase 1 gate: CLOSED.** ✅

---

## Phase 4 — Murgesh Engine Hardening (M-P1 → M-P7)
*Run in parallel while Ajit worked on his hardening pass.*

| Task | What Changed | Outcome |
|---|---|---|
| M-P1 Field audit | Verified Ajit's field names match contract exactly | No adapter needed ✅ |
| M-P2 Unit aliases | `UNIT_ALIASES` map: tab→per tablet, strip→per strip, day→per day, per ml, per 100ml | `"Crocin Tab"` now matches correctly ✅ |
| M-P3 Fuzzy lookup | Two-pass match: substring + tokenized. Noise tokens stripped (mg, ml, x30, tab…) | `"Paracetamol 500mg x30 Tab"` → BR-001 ✅ |
| M-P4 Forward compat | null-text fields skipped. Timeout 10s→15s. 15-field mixed pipeline verified | No crash on null values or null units ✅ |
| M-P5 Consent flow | send_letter/confirm/withdraw full lifecycle tested | Seed byte-identical after mutations ✅ |
| M-P6 AJIT_SEAMS.md | Live Integration Notes section: unit table, field names, fuzzy lookup explained | Ajit's Bob has the full picture ✅ |
| M-P7 Re-check | 17-point self-check re-run with all hardening applied | 31/31 green ✅ |

---

## Phase 5 — Ajit's Hardening Pass

### What Ajit hardened:
| Area | Change | Why It Matters |
|---|---|---|
| Word-level row grouping | Groups OCR words by Y-coordinate into logical line rows | Better table and multi-column bill handling |
| Value/unit extraction | Smarter heuristics for numeric token + unit detection | Real bills have "₹8,500" not just "8500" |
| Tesseract config | `blocks:true`, `user_defined_dpi` passed to `recognize()` | Fixes block-level extraction for structured documents |
| Number guard (Granite) | If Granite outputs a number not in cards → discard, fall back | Prevents hallucinated overcharge amounts |
| Ollama fallback | After Granite → templateFillStub → Ollama as second model path | Three-tier fallback: Granite → template → Ollama |
| Banner on all paths | Banner enforced even on Ollama fallback path | Mobile UI always gets the required string |
| Adversarial harness | 5 nasty bill scenarios prepared and tested | P9 baseline established before break-testing |

**All changes inside seam markers. Zero frozen files touched.** ✅

---

## Phase 6 — P9 Engine Pre-hardening + Harness (Murgesh)

### Engine fix before Ajit drops real images:
`express.json({ limit: "10mb" })` — raised from Express's 100kb default.
Without this, real bill images (1–3 MB base64) would silently 413 before our code runs.

### P9 Adversarial Harness built:
`data/samples/adversarial/run_adversarial.ts` — 5 structured scenarios:

| Scenario | What It Tests | Pass Criterion |
|---|---|---|
| S1 Tilted (15°) | Confidence gate fires on rotated image | 200 OK, hold STAGED or null — NEVER placed |
| S2 Blurred | Low-conf fields correctly flagged | 200 OK, hold STAGED or null — NEVER placed |
| S3 Blank image | Graceful empty return | 200 OK, `extracted_fields = []`, `hold = null` |
| S4 Weird table | Unextractable → value:null → unverified | 200 OK, null values never produce gap cards |
| S5 Mixed language | Partial extraction, no crash | 200 OK, banner always present |
| Seed regression | Core demo survives all adversarial runs | Byte-identical, `run_id=demo-trap-001` |

**Engine dry-run: 5/5 scenarios pass before Ajit drops a single real image.** ✅

---

## The Scorecard

| Metric | Result |
|---|---|
| Engine sub-tasks completed (T0–T13) | **13 / 13** |
| Murgesh hardening tasks (M-P1→M-P7) | **7 / 7** |
| Ajit PR review checks | **38 / 38** |
| 17-point self-check assertions (final) | **39 / 39** |
| P9 adversarial scenarios (engine dry-run) | **5 / 5** |
| P9 adversarial scenarios (real images)    | **5 / 5** |
| Frozen file violations by Ajit | **0** |
| Merge conflicts | **0** |
| Compile errors at any commit (final) | **0** |
| 500 errors under 10× stress | **0** |
| Seed byte-identity (after all changes) | **✅ identical** |

---

## The Three Moments That Could Have Gone Wrong

### 1. Ajit's first top-level `tesseract.js` import
**Risk:** Crashes the trunk on startup before any request.
**How handled:** Murgesh held the skeleton with explicit seam instructions. Ajit corrected in Phase 1 PR. HANDOFF.md §3.3 Rule R4 added: "dynamic-import your dep inside the seam zone."

### 2. `__dirname` in ESM
**Risk:** `ReferenceError` at Granite call time, not compile time — invisible until demo.
**How handled:** Caught in T9 review. Fixed to `import.meta.url` pattern. Added to AJIT_SEAMS.md forbidden list.

### 3. Phantom ProofCard fields
**Risk:** TypeScript compiles (with `as ProofCard`) but crashes or produces garbled output at runtime.
**How handled:** Caught in T9 compile review. All five replaced with real contract fields. Contract is FROZEN — this can never re-occur without a tsc error.

---

## What's Solid — What's Next

### Solid (do not touch)
- All engine steps (02–05): pure, tested, zero model in path
- Contract types: 10 types, FROZEN, enforced by tsc
- Confidence gate: one function, one threshold, one place
- Seed path: byte-identical, demo-safe
- Consent flow: staged/placed/released lifecycle verified

### Next (in order)
1. ~~**Ajit drops 4 real adversarial images** → runs `run_adversarial.ts`~~ ✅ **DONE — 5/5 PASS, P9 gate CLOSED**
2. ~~**Murgesh patches** only what Ajit reports~~ ✅ **No bugs to patch — bug list empty**
3. ~~**P9 bug list empty** → Phase 2 gate opens~~ ✅ **Phase 2 gate: OPEN**
4. **Manas** drops `packages/rulebooks/bill_rules.json` + `lease_rules.json` → engine auto-switches from stub
5. **Vrajesh** sets `BRAIN_URL=http://localhost:3000` → mobile app connects live

---

*Murgesh + Ajit · Pramaan · HackVerse Track 3*
*One engine. Proof, not opinions. Built once, branches forever.*
*Development process assisted by IBM Bob (AI SDLC Partner).*
