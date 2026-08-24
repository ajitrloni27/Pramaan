# Pramaan Build Plan — Murgesh (TRUNK) Autonomous Build
> Last updated: full synthesis of trial.md v3 + all product-logic + sprint refinements applied
> Repo audit: 55 files checked · 48 empty · all path corrections applied
> Logic corrections: BUG#1 ACT algorithm · BUG#2 PATH B · Issue#3 Map key · Issue#4 RuleRow narrowing · Issue#5 confidence gate ownership
> Refinements: T1 type count corrected · T7 AJIT_SEAMS.md confidence gate instruction · T10 control.ts detailed
> Status: ✅ SAFE TO EXECUTE — verified against murgesh.pdf, roles.pdf, ajit.pdf, manas.pdf, wiring diagrams

---

## Scope & Boundaries

**This plan covers ONLY Murgesh's lane.** Hard boundaries enforced throughout.

### ✅ Whitelist — Bob may create/edit ONLY:
```
packages/contracts/**
services/brain/**
.env.example
ARCHITECTURE.md (repo root — T12 only)
```

### ❌ Blacklist — NEVER touch:
```
apps/**                     → Vrajesh's lane (mobile UI)
packages/templates/**       → Manas's lane (letter wording)
packages/rulebooks/**       → Manas's lane (rule content)
data/**                     → Manas's lane (cited data, samples)
README.md                   → Vrajesh's lane
```

### Ajit Seam Rule:
- `01_read.ts` and `06_draft.ts` — Murgesh writes the **skeleton only** (signature + seam markers + stub)
- Ajit replaces only the body between seam markers. Never the orchestrator. Never the same lines.

---

## Confirmed Repo State (Audit 2026-08-09)

| Area | Files | State |
|------|-------|-------|
| `packages/contracts/` | `types.ts` + 6 `.schema.json` | All **empty** |
| `services/brain/tsconfig.json` | Exists | **Empty** |
| `services/brain/package.json` | Has name/type/scripts | **No deps declared** |
| `packages/contracts/package.json` | Has name/main | **No `exports` field** |
| All `services/brain/src/**` | 19 source files | All **empty** |
| `.env.example` | Root | **Does not exist** |
| `ARCHITECTURE.md` | Root | **Does not exist** |

### Path Corrections (team prompts had these wrong — corrected here)
- ❌ `data/rulebooks/bill.json` → ✅ `services/brain/src/seeds/rulebook_stub.ts` (Murgesh's lane)
- ❌ `packages/rulebooks/` for stubs → ✅ `services/brain/src/seeds/` (Manas owns `packages/rulebooks/`)
- ❌ `pipeline/confidence_gate.ts` → ✅ `services/brain/src/pipeline/confidence.ts`
- ❌ `packages/contracts/package.json` missing `exports` → must be fixed in T1

---

## Sub-Task 0 (T0): Environment Baseline

**Intent:** Create `.env.example` at repo root. Credential issues and missing env vars are the classic Day-1 time sink.

**Expected Outcomes:**
- `.env.example` exists at repo root with all variables and comments

**Todo List:**
1. Create `.env.example` with exactly these variables:
   ```
   # Run Mode
   RUN_MODE=mock                # mock | live | seed

   # Brain Service
   BRAIN_PORT=3000
   LOG_LEVEL=debug
   THRESHOLD=0.90               # confidence gate — do not change casually

   # Billing Gateway (Mock)
   BILLING_GATEWAY_URL=http://localhost:3001
   HOLD_TTL_HOURS=72

   # IBM watsonx (Ajit's model calls only — trunk never uses these)
   WATSONX_API_KEY=your_api_key_here
   WATSONX_PROJECT_ID=your_project_id_here
   GRANITE_MODEL_ID=ibm/granite-3-8b-instruct
   GRANITE_TIMEOUT_MS=10000

   # MCP Server
   MCP_TRANSPORT=stdio
   ```

**Commit:** `chore: add .env.example (RUN_MODE, IBM creds, THRESHOLD)`

**Status:** [ ] pending

---

## Sub-Task 1 (T1): Infrastructure + Contract Types + Schema Freeze ⛔ BLOCKS EVERYTHING

**Intent:** Two things in one commit gate: (a) fix the `services/brain` tsconfig and deps so code can compile; (b) freeze all contract types. After this commit, schemas are FROZEN — changes require Murgesh + Vrajesh sync.

**Expected Outcomes:**
- `services/brain/tsconfig.json` properly configured (extends base, path alias for `@pramaan/contracts`)
- `services/brain/package.json` declares all dependencies
- `packages/contracts/package.json` has `exports` field
- `packages/contracts/types.ts` exports all **10 exported types** (`ExtractedField`, `RuleRow`, `ProofCard`, `HoldEvent`, `AuditEvent`, `RunRequest`, `RunResponse`, `CompareResult`, `Draft`, `Domain`), header says FROZEN. `PipelineState` is internal to the orchestrator (T8) — NOT a contract export.
- All 6 `.schema.json` files populated and consistent with `types.ts`
- `tsc --noEmit` passes with zero errors

**Todo List:**

**Infrastructure (do first):**
1. Rewrite `services/brain/tsconfig.json`:
   - `extends: "../../tsconfig.base.json"`
   - `compilerOptions.paths: { "@pramaan/contracts": ["../../packages/contracts/types.ts"] }`
   - `compilerOptions.outDir: "dist"`, `rootDir: "src"`
2. Update `services/brain/package.json`: add `dependencies: { "@modelcontextprotocol/sdk": "latest", "zod": "latest", "express": "latest" }` and `devDependencies: { "tsx": "latest", "@types/node": "latest", "@types/express": "latest", "typescript": "latest" }`
3. Add `"exports": { ".": "./types.ts" }` to `packages/contracts/package.json`

**Contract Types (use these exact shapes — field names are LAW):**
4. Write `packages/contracts/types.ts` with header `// FROZEN @ P1 — 2026-08-09 — Changes require Murgesh + Vrajesh sync (sprint rule #1).` and these exact exports:

   **`ExtractedField`**: `text: string`, `value: number | null`, `unit: string | null`, `bbox: [number, number, number, number]`, `confidence: number`, `low_conf: boolean`

   **`RuleRow`** — discriminated union on `domain`:
   - Bill: `rule_id`, `domain: "bill"`, `item_category`, `match_terms: string[]`, `procedure_code`, `official_value: number`, `official_unit`, `official_source`, `official_source_url`, `rule_says_plain`, `severity: "high"|"medium"`, `status: "VERIFIED"|"UNVERIFIED"`, `notes`
   - Lease: `rule_id`, `domain: "lease"`, `clause_type`, `match_terms: string[]`, `legal_status: "illegal"|"risky"|"info"`, `law_ref`, `law_ref_url`, `rule_says_plain`, `suggested_fix_plain`, `status: "VERIFIED"|"UNVERIFIED"`

   **`ProofCard`**: `item: string`, `your_value: number`, `official_value: number`, `gap: number`, `status: "gap"|"ok"|"unverified"`, `source_anchor: { ref: string; bbox?: [number,number,number,number]; ocr_confidence?: number }`, `rule_anchor: { ref: string; url?: string }`, `compute_anchor: string`, `rule_says_plain: string`

   **`HoldEvent`**: `hold_id: string`, `invoice_id: string`, `amount: number`, `status: "staged"|"placed"|"released"`, `reversible: boolean`, `expires_at: string | null`, `placed_by: "auto"|"user"`, `confidence_floor: number`

   **`AuditEvent`**: `t: "ocr"|"lookup"|"compare"|"prove"|"hold_placed"|"hold_staged"|"hold_released"|"draft"|"consent"|"error"`, `run_id: string`, `ts: string`, `payload: object`

   **`RunRequest`**: `image: string`, `domain: "bill"|"lease"`

   **`RunResponse`**: `run_id: string`, `domain: string`, `extracted_fields: ExtractedField[]`, `proof_cards: ProofCard[]`, `hold: HoldEvent | null`, `draft: { text: string; banner: string }`, `audit: AuditEvent[]`

   **`CompareResult`**: `field: ExtractedField`, `your_value: number`, `official_value: number`, `gap: number`, `status: "gap"|"ok"|"unverified"`

   **`Draft`**: `{ text: string; banner: string }`

   **`Domain`**: `"bill" | "lease"`

5. Populate all 6 `.schema.json` files with JSON Schema equivalents matching `types.ts`

**Validation:**
- Every field name matches exactly (e.g. `low_conf` NOT `lowConf`, `rule_says_plain` NOT `ruleSaysPlain`)
- `RuleRow` is a discriminated union (not a merged flat type)
- `tsc --noEmit` passes

**Commit:** `feat(contracts): freeze P1 schemas per murgesh spec §6 — FROZEN`

> ⛔ After this commit, NEVER modify a schema without explicit instruction from Murgesh.

**Status:** [ ] pending

---

## Sub-Task 2 (T2): Mock Billing Gateway

**Intent:** The agentic proof. The agent mutates external state. No state mutation = mail-merge, not an agent. This mock IS the system for the sprint.

**Expected Outcomes:**
- `BillingGateway` class with 5 methods: `placeHold`, `getStatus`, `release`, `confirm`, `tick`
- `placeHold` is idempotent: same `(invoice_id, pack_id)` → same `hold_id` always
- `confirm(hold_id)` — human tap path: keeps `status: "placed"`, sets `placed_by: "user"`
- `tick(now)` auto-expires "placed" holds past their `expires_at`
- Singleton `export const billingGateway = new BillingGateway()` exported
- Zero LLM, zero network calls

**Todo List:**
1. Write [`services/brain/src/gateway/billing_gateway.ts`](services/brain/src/gateway/billing_gateway.ts)
2. Private state: `holds: Map<string, HoldEvent>` and `idempotencyKeys: Map<string, string>` (maps `"invoice_id::pack_id"` → `hold_id`)
3. `placeHold`: check `idempotencyKeys` first; if found return existing hold; else `crypto.randomUUID()`, `expires_at = new Date(Date.now() + 72*60*60*1000).toISOString()`, `status: "placed"`, `placed_by: "auto"`
4. `getStatus`: return hold or throw `new Error("Hold not found: " + hold_id)`
5. `release`: set `status = "released"`, return; throw if not found
6. `confirm`: set `placed_by = "user"`, return; throw if not found
7. `tick`: iterate holds, find `status === "placed"` with `expires_at < now.toISOString()`, call `this.release(hold_id, "auto_expiry")`
8. Import `HoldEvent` from `@pramaan/contracts` only — never redefine

**Commit:** `feat(gateway): mock billing gateway — idempotent holds + 72h auto-release`

**Status:** [ ] pending

---

## Sub-Task 3 (T3): Append-Only Audit Log

**Intent:** Governance artifact (AgentOps story). Every step and every consent action writes here. Append-only is a hard constraint — a release is a NEW event, not an edit.

**Expected Outcomes:**
- `append(event: AuditEvent): void` — append-only, never mutates existing entries
- `list(run_id: string): AuditEvent[]` — returns events for a run in insertion order
- Singleton `export const auditLog` instance exported
- IBM stack comment: `// IBM: AgentOps — consent + audit + governance layer`

**Todo List:**
1. Write [`services/brain/src/audit/audit_log.ts`](services/brain/src/audit/audit_log.ts)
2. Module-level `const _log: AuditEvent[] = []`; class or object with `append` and `list` methods
3. `list` filters by `run_id` and returns in insertion order (never sorted, never reversed)
4. Export `const auditLog` singleton

**Commit:** `feat(audit): append-only audit log (AgentOps)`

**Status:** [ ] pending

---

## Sub-Task 4 (T4): Step 03 COMPARE — The Hallucination Defense ⚠ MOST CRITICAL

**Intent:** THE moat. The verdict is arithmetic over cited numbers. No model anywhere near the subtraction. This answers jury question #1: "How do you know it isn't hallucinating?"

**Expected Outcomes:**
- `compare(fields: ExtractedField[], rules: Map<string, RuleRow>): CompareResult[]` exported
- File-top comment: `// ZERO LLM — pure arithmetic. The verdict is arithmetic over two cited numbers. No model in this path.`
- Unmatched field → silently skipped (no card, no error)
- `rule.status === "UNVERIFIED"` → result status `"unverified"`
- `field.value === null` → result status `"unverified"`
- Unit mismatch → result status `"unverified"`
- `gap = field.value - rule.official_value`; `gap > 0` → `"gap"`, else `"ok"`
- Zero model/SDK/network imports — **Murgesh reads every line personally after generation**
- `services/brain/src/seeds/rulebook_stub.ts` created with 3 hardcoded bill `RuleRow` entries (marked `// STUB — replace when Manas delivers packages/rulebooks/bill_rules.json`)

**Todo List:**
1. Write [`services/brain/src/pipeline/steps/03_compare.ts`](services/brain/src/pipeline/steps/03_compare.ts)
2. Lookup: match `field.text.toLowerCase()` against `rule.match_terms` — any `match_term` substring of field text = match
3. Unit normalizer (private helper, same file): `normalizeToBaseUnit(value: number, unit: string): number | null`; `"per tablet"` = identity; `"per strip"` → divide by 10; `"per scan"` = identity; unknown unit → return `null` → triggers "unverified"; NEVER subtract per-tablet from line-total
4. Write [`services/brain/src/seeds/rulebook_stub.ts`](services/brain/src/seeds/rulebook_stub.ts): 3 bill `RuleRow` entries including one for Paracetamol (`official_value: 2`, `official_unit: "per tablet"`)
5. Post-generation check: scan every `import` statement — zero matches for "watson", "openai", "llm", "model", "granite", "ai", "tesseract", "docling"

**Commit:** `feat(compare): deterministic gap engine — zero LLM in verdict path`

**Status:** [ ] pending

---

## Sub-Task 5 (T5): MCP Server + 4 Tools

**Intent:** MCP is the tool-discovery layer. Watsonx.data ships a managed MCP server (judge bait). The rulebook is served THROUGH `lookup_rule` — the citation gate cannot be bypassed on-device.

**Expected Outcomes:**
- `lookup_rule(domain, text): RuleRow[]` — matches against rulebook stub (or real file if present), returns `[]` on no match, never throws
- `place_hold(invoice_id, amount, evidence_pack_id)` — delegates to `billingGateway.placeHold()`, idempotent
- `get_hold_status(hold_id)` — delegates to `billingGateway.getStatus()`
- `release_hold(hold_id, reason)` — delegates to `billingGateway.release()`
- IBM stack comment in server.ts: `// IBM: MCP (watsonx.data managed server) — tool discovery layer`
- Zero LLM calls anywhere

**Todo List:**
1. Write `mcp/tools/lookup_rule.ts`: load from `rulebook_stub.ts` (real file fallback: check `packages/rulebooks/` and use if present, else stub); case-insensitive `match_terms` substring filter; return empty array on no match
2. Write `mcp/tools/place_hold.ts`: import `billingGateway`, call `placeHold()`, return `{ hold_id, status, expires_at, reversible: true }`
3. Write `mcp/tools/get_hold_status.ts`: delegate to `billingGateway.getStatus()`
4. Write `mcp/tools/release_hold.ts`: delegate to `billingGateway.release()`
5. Write `mcp/server.ts`: `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`, `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`; use `zod` for input schemas; register all 4 tools; `server.connect(transport)`

**Relevant Context:**
- `billingGateway` singleton from T2
- `RuleRow`, `HoldEvent` from `@pramaan/contracts`
- Rulebook stub from T4: `services/brain/src/seeds/rulebook_stub.ts`

**Commit:** `feat(mcp): server + 4 tools (lookup_rule, place_hold, get_hold_status, release_hold)`

**Status:** [ ] pending

---

## Sub-Task 6 (T6): Steps 02 LOOKUP + 04 PROVE + 05 ACT (Two-Tier)

**Intent:** The three middle steps. Step 05 ACT is the agentic proof: the agent mutates external state, but only when it's confident enough. This answers jury question #2: "Is this actually an agent?"

**Expected Outcomes:**

**02 LOOKUP:**
- `lookup(fields: ExtractedField[], domain: Domain): Promise<Map<string, RuleRow>>`
- Map key is the field's **array index as a string** (e.g. `"0"`, `"1"`) — `ExtractedField` has no id field
- Calls MCP `lookup_rule(domain, field.text)` for each field by index; builds `Map<string, RuleRow>`
- No match for a field = that index has no entry in the map (silence over false alarm)

**04 PROVE:**
- `prove(compares: CompareResult[], fields: ExtractedField[], rules: Map<string, RuleRow>): ProofCard[]`
- Each card carries THREE anchors: `source_anchor` (from field), `rule_anchor` (from rule), `compute_anchor` (literal expression e.g. `"45000 - 18000"`)
- **HARD RULE**: card with missing `rule_anchor` → status `"unverified"`, NEVER `"gap"`. No anchor = no accusation.

**05 ACT — Two-Tier Hold (⚠ exact algorithm — do not reorder steps):**
- `act(cards: ProofCard[], invoice_id: string): Promise<HoldEvent | null>`
- `const THRESHOLD = parseFloat(process.env.THRESHOLD ?? "0.90")`
- Step 1: `const gapCards = cards.filter(c => c.status === "gap")`
- Step 2: `const totalDisputed = sum of gap across ALL gapCards` (do NOT exclude any cards yet)
- Step 3: `const confFloor = min(source_anchor.ocr_confidence) across ALL gapCards` (including low-conf ones)
- Step 4: if `totalDisputed <= 0` → return `null`
- Step 5: if `confFloor >= THRESHOLD` → call MCP `place_hold(invoice_id, totalDisputed, evidence_pack_id)` → return `HoldEvent` with `status: "placed"`, reversible, +72h
- Step 6: if `confFloor < THRESHOLD` → **do NOT call MCP**; return a computed staged object `{ status: "staged", invoice_id, amount: totalDisputed, reversible: true, expires_at: null, placed_by: "auto", confidence_floor: confFloor, hold_id: crypto.randomUUID() }` cast as `HoldEvent`
- Step 7: Append `"hold_placed"` or `"hold_staged"` AuditEvent via `auditLog`
- **WHY this order matters**: excluding low-conf cards before computing confFloor makes the staged branch unreachable — confFloor could never be below threshold. That kills the yellow-gate trust model. NEVER filter before computing confFloor.

**RuleRow narrowing in `compare` and `prove` (Issue#4):**
- Before accessing `rule.official_value`, narrow the discriminated union: `if (rule.domain === "lease") { ... emit "unverified" with rule_says_plain ... return }`
- Lease `RuleRow` has no `official_value` — accessing it without narrowing is a TypeScript compile error in strict mode

**Todo List:**
1. Write [`services/brain/src/pipeline/steps/02_lookup.ts`](services/brain/src/pipeline/steps/02_lookup.ts) — map key = field array index (string); call `lookup_rule(domain, field.text)` per field
2. Write [`services/brain/src/pipeline/steps/04_prove.ts`](services/brain/src/pipeline/steps/04_prove.ts) — test: missing rule_anchor → "unverified"; narrow `RuleRow` on `domain` before accessing bill-only fields
3. Write [`services/brain/src/pipeline/steps/05_act.ts`](services/brain/src/pipeline/steps/05_act.ts) — implement the exact 7-step algorithm above; test: all-high-conf gap → placed; any-low-conf gap → staged; no gap → null
4. In `compare`: narrow `RuleRow` discriminated union on `domain` before accessing `official_value`; lease rows → emit `"unverified"` immediately with `rule_says_plain` populated

**Relevant Context:**
- `auditLog` singleton from T3
- `billingGateway` from T2; MCP tools from T5
- `THRESHOLD` from env (default `0.90`)

**Commit:** `feat(pipeline): steps 02 lookup, 04 prove, 05 two-tier act`

**Status:** [ ] pending

---

## Sub-Task 7 (T7): Ajit Seams — 01/06 Skeletons + AJIT_SEAMS.md

**Intent:** The handoff. Clean seams = zero merge conflicts when Ajit arrives. The skeletons must compile and run with zero external dependencies. Ajit replaces only the body between seam markers.

**Expected Outcomes:**
- `01_read.ts` — skeleton with seam markers; stub returns 3 realistic `ExtractedField` objects including **one with `confidence: 0.81, low_conf: true`** (exercises yellow gate + staged hold path) and **one Paracetamol at 45/tablet** (exercises gap detection)
- `06_draft.ts` — skeleton with seam markers; stub does pure template-fill (no model), always returns `banner: "AI-generated — review before sending"`
- `AJIT_SEAMS.md` — handoff doc at `services/brain/AJIT_SEAMS.md`
- Both files compile with zero imports beyond `@pramaan/contracts`

**Seam marker format (exact):**
```typescript
// ═══════════════ AJIT SEAM — START ═══════════════
// TODO(ajit): replace this stub body with the real implementation.
// Contract: signature, types, and orchestrator wiring are Murgesh's.
// Replace ONLY the body between the seam markers. Nothing else.
// ...stub code...
// ═══════════════ AJIT SEAM — END ══════════════════
```

**AJIT_SEAMS.md must contain:**
1. The two files and exact zones Ajit may edit (between seam markers)
2. Exact return shapes (point to `@pramaan/contracts`)
3. What he must NEVER touch: orchestrator, schemas, other steps
4. How to test: `POST /run` and inspect `extracted_fields` / `draft` / `audit` in `RunResponse`
5. Rules: report reads exactly (never "fix" a shaky value); Granite touches wording only; banner always present; fallback must render without a model
6. **Confidence gate ownership (explicit instruction)**: *"Your `01_read.ts` body MUST `import { applyConfidenceGate } from '../confidence.js'` and call it on your extracted fields before returning. Do NOT reimplement the 0.90 threshold. There is exactly one confidence gate in this codebase. Two gates = two thresholds = drift between OCR and hold logic."*

**IBM stack comments:**
- `01_read.ts`: `// IBM: Docling — PDF/image structured extraction (Ajit)`
- `06_draft.ts`: `// IBM: Granite — plain-language letter generation (Ajit)`

**Todo List:**
1. Write [`services/brain/src/pipeline/steps/01_read.ts`](services/brain/src/pipeline/steps/01_read.ts) with seam markers and 3-field stub
2. Write [`services/brain/src/pipeline/steps/06_draft.ts`](services/brain/src/pipeline/steps/06_draft.ts) with seam markers and template-fill stub
3. Write `services/brain/AJIT_SEAMS.md`
4. Write [`services/brain/src/pipeline/confidence.ts`](services/brain/src/pipeline/confidence.ts): `applyConfidenceGate(fields: ExtractedField[]): ExtractedField[]` with `THRESHOLD = 0.90`

**Commit:** `feat(seams): 01/06 skeletons + AJIT_SEAMS.md handoff doc`

**Status:** [ ] pending

---

## Sub-Task 8 (T8): The Orchestrator

**Intent:** Threads state through all six steps sequentially. Maps to watsonx Orchestrate. Never crashes — partial response beats total failure.

**Expected Outcomes:**
- `orchestrate(req: RunRequest): Promise<RunResponse>` exported
- Internal `PipelineState` interface (not exported)
- Steps called in strict order: `read → lookup → compare → prove → act → draft`
- `auditLog.append()` called after EACH step with correct `t` value
- Any step error: catch, append `t: "error"` event, return partial `RunResponse` (never throw)
- `run_id` via `crypto.randomUUID()`
- IBM stack comment: `// IBM: watsonx Orchestrate / Agent Lab — 6-step agent flow`

**Todo List:**
1. Write [`services/brain/src/pipeline/orchestrator.ts`](services/brain/src/pipeline/orchestrator.ts)
2. Define `interface PipelineState { fields, rules, gaps, cards, hold, draft }` locally
3. Wrap each step in `try/catch`; on error: `auditLog.append({ t: "error", run_id, ts: new Date().toISOString(), payload: { step: "stepName", error: e instanceof Error ? e.message : String(e) } })` then break, return partial response
4. Import steps from `./steps/01_read.js`, `./steps/02_lookup.js`, etc. (ESM `.js` extensions)
5. `draft` step: pass `""` as template (Ajit fills with real template path)

**Commit:** `feat(orchestrator): 6-step trunk with per-step audit + partial-on-error`

**Status:** [ ] pending

---

## Sub-Task 9 (T9): HTTP Surface

**Intent:** The ONLY boundary Vrajesh's app touches. Three endpoints + health. After this, Vrajesh flips `dataSource` from mock to live with one env var.

**Expected Outcomes:**
- `POST /run` → calls `orchestrate(req)`, returns `RunResponse`
- `GET /run?seed=trap&domain=bill` → returns deterministic seed (wired in T10)
- `POST /consent` → appends consent `AuditEvent`; `confirm_hold` → `billingGateway.confirm()`; `withdraw_hold` → `billingGateway.release(hold_id, "user_withdraw")`; returns `{ audit: AuditEvent }`
- `GET /health` → `200 { ok: true }`
- Global error handler: structured errors, no stack traces, no crashes
- Port from `process.env.BRAIN_PORT ?? 3000`

**Todo List:**
1. Write [`services/brain/src/index.ts`](services/brain/src/index.ts) using Express
2. `POST /run`: parse body, call `orchestrate()`, return result
3. `GET /run?seed=...`: import from seed file, return directly (wired after T10)
4. `POST /consent`: validate action, route to gateway/auditLog, return audit entry
5. Global `app.use((err, req, res, next) => ...)` — JSON error, no stack trace

**Commit:** `feat(http): /run, /run?seed=trap, /consent surface`

**Status:** [ ] pending

---

## Sub-Task 10 (T10): Deterministic Seed — trap.ts

**Intent:** The stage demo safety net. Sprint rule #6 — the 90-second demo runs on pre-seeded data. No live OCR/LLM/network gamble in front of judges. Byte-identical across runs.

**PATH B spec (per PRM-WD-06 §6) — the engine proves itself on stage:**
PATH B does NOT return a pure static JSON blob. It short-circuits step 01 only (uses fixed seed fields), then runs steps 02–05 normally through the real engine, proving the pipeline works on stage data. The hold and draft in the response are pre-baked constants (for byte-identity), but the compare/prove logic executes live on the seed fields. This design satisfies both "byte-identical" (fixed run_id, fixed ts, fixed hold, fixed draft) AND "engine proves itself" (02–05 run on the seeded fields).

**Expected Outcomes:**
- `SEED_TRAP_FIELDS: ExtractedField[]` exported — fixed array of trap fields (Paracetamol at ₹45/tablet, one MRI overcharge), used as step 01 output
- `FIXED_HOLD: HoldEvent` exported — pre-baked placed hold with fixed `hold_id`, fixed `expires_at` constant, `status: "placed"`
- `FIXED_DRAFT: Draft` exported — pre-baked draft with banner
- `FIXED_RUN_ID = "demo-trap-001"` — constant string, never generated at runtime
- `GET /run?seed=trap` in `index.ts`: call `lookup(SEED_TRAP_FIELDS, "bill")` → `compare(fields, rules)` → `prove(gaps, fields, rules)` → skip step 05 (use `FIXED_HOLD`) → skip step 06 (use `FIXED_DRAFT`) → assemble `RunResponse` with `run_id: FIXED_RUN_ID` and fixed audit `ts` constants
- Two consecutive calls produce identical bytes

**Todo List:**
1. Write [`services/brain/src/seeds/trap.ts`](services/brain/src/seeds/trap.ts) exporting `SEED_TRAP_FIELDS`, `FIXED_HOLD`, `FIXED_DRAFT`, `FIXED_RUN_ID`
2. All timestamps in audit trail: fixed ISO string constants (e.g. `"2026-08-09T18:00:00.000Z"`) — zero `Date.now()` or `new Date()` in the seeded path
3. In `index.ts` PATH B: import seed constants; call steps 02–05 on `SEED_TRAP_FIELDS`; replace step 01 output and step 05/06 output with fixed constants; assemble and return
4. Write [`services/brain/src/seeds/control.ts`](services/brain/src/seeds/control.ts): export `CONTROL_SEED_FIELDS: ExtractedField[]` with 6 items, all `confidence >= 0.95`, all matching `rulebook_stub.ts` entries exactly so `gap = 0` for every field. Used for the P7 restraint beat (proves the engine does NOT flag a clean bill). No hold, no draft needed — the orchestrator produces `hold: null` naturally when no gaps exist.

**Validation:** `diff <(curl -s "localhost:3000/run?seed=trap") <(curl -s "localhost:3000/run?seed=trap")` → empty diff

**Commit:** `feat(seed): deterministic /run?seed=trap — engine runs 02-05, fixed hold/draft/timestamps`

**Status:** [ ] pending

---

## Sub-Task 11 (T11): Lease Path — Rulebook Swap, Same Trunk

**Intent:** Sprint rule #10 — the tree stays a tree. Lease = rulebook swap through the SAME orchestrator. Copying the engine is amputating the tree.

**Expected Outcomes:**
- `services/brain/src/seeds/rulebook_lease_stub.ts` — 5 lease `RuleRow` entries (3 with `legal_status: "illegal"`: non-refundable deposit, landlord entry without 24h notice, tenant pays structural repairs)
- `POST /run` with `domain: "lease"` runs through the SAME orchestrator, same steps, same audit
- `prove`/`compare` handle lease rows gracefully: lease cards may lack numeric `official_value` → emit `status: "unverified"` with `rule_says_plain` intact
- Zero duplicated pipeline code

**Todo List:**
1. Write [`services/brain/src/seeds/rulebook_lease_stub.ts`](services/brain/src/seeds/rulebook_lease_stub.ts) with 5 lease `RuleRow` entries marked `// STUB — replace when Manas delivers packages/rulebooks/lease_rules.json`
2. Update `lookup_rule` in T5: also load lease stub when `domain === "lease"`
3. Verify `compare` handles lease RuleRow (no `official_value` field) → `"unverified"` without crash
4. Verify `prove` handles lease cards — `rule_says_plain` still populated on unverified cards

**Validation:** `POST /run` with `domain: "lease"` returns clause cards through one orchestrator; `grep -r "leaseOrchestrat\|leaseEngine\|leaseCompare"` → zero results

**Commit:** `feat(lease): rulebook-swap lease path on same trunk (no engine copy)`

**Status:** [ ] pending

---

## Sub-Task 12 (T12): IBM Stack Comments + ARCHITECTURE.md

**Intent:** P6 deliverable. Maps every Pramaan component to IBM technology. The meta-narrative for judges.

**Expected Outcomes:**
- IBM stack comments present in all relevant files (where not already added)
- `ARCHITECTURE.md` at repo root — one-pager with 6-step diagram, IBM mapping table, hallucination defense statement, agentic statement, IBM Bob acknowledgement

**Todo List:**
1. Verify/add IBM stack comments:
   - `pipeline/orchestrator.ts` → `// IBM: watsonx Orchestrate / Agent Lab — 6-step agent flow`
   - `mcp/server.ts` → `// IBM: MCP (watsonx.data managed server) — tool discovery layer`
   - `audit/audit_log.ts` → `// IBM: AgentOps — consent + audit + governance layer`
   - `steps/06_draft.ts` → `// IBM: Granite — plain-language letter generation (Ajit)`
   - `steps/01_read.ts` → `// IBM: Docling — PDF/image structured extraction (Ajit)`
   - `seeds/*.ts` → `// IBM: Data Prep Kit — rulebook fixtures`
2. Write `ARCHITECTURE.md` at repo root containing:
   - 6-step trunk diagram (text/ASCII)
   - IBM mapping table
   - Statement: `"The verdict is arithmetic over two cited numbers, computed by code with no model in the path."`
   - Statement: `"The agent mutates external state through MCP (mock gateway for sprint; production pattern)."`
   - Statement: `"If using RAG or Agentic — IBM for both. RAG = retrieval over the rule corpus via MCP lookup_rule; Agentic = watsonx Orchestrate + MCP tools."`
   - Note: `"Development process assisted by IBM Bob (AI SDLC Partner)."`

**Commit:** `docs: IBM stack mapping in code + ARCHITECTURE.md (P6)`

**Status:** [ ] pending

---

## Sub-Task 13 (T13): Stability Pass

**Intent:** The trunk must survive 10 consecutive `/run` calls including malformed bodies and edge cases. Timeouts prevent hanging steps. Byte-identical seed verified after all changes.

**Expected Outcomes:**
- 10× `POST /run` (mixed bill/lease, malformed bodies, blank image) → zero 500s, zero crashes
- Step timeouts added to orchestrator (default 10s per step)
- `GET /run?seed=trap` still byte-identical after all changes
- Q&A paragraph added to `ARCHITECTURE.md`
- All 17 self-check items verified and reported to Murgesh

**Todo List:**
1. Add `Promise.race([stepCall(), timeout(10000)])` wrapper in orchestrator for each step
2. Test malformed bodies → structured JSON error, no crash
3. Add Q&A paragraph to `ARCHITECTURE.md` under "How the verdict is grounded": `"The verdict is arithmetic over two cited numbers — your bill and the official rule — computed by code with no model in the path. Every card carries three anchors: your source, the official source, and the exact subtraction. Anyone can re-run it."`
4. Run the 17-point self-check (§ below) and report all results

**Commit:** `chore: stability pass — timeouts, error shapes, zero 500s`

**Status:** [ ] pending

---

## Dependency Order

```
T0  (.env.example)
    └── T1  (infra + contract types + schema freeze)  ← BLOCKS ALL
            ├── T2  (billing gateway)
            │       └── T5  (MCP server + 4 tools)
            │               └── T6  (steps 02 + 04 + 05)
            ├── T3  (audit log)
            │       └── T6  (steps 02 + 04 + 05)
            ├── T4  (compare + rulebook_stub.ts)
            │       └── T5  (MCP uses stub)
            ├── T7  (Ajit seams 01/06 + AJIT_SEAMS.md)
            │
            T6 + T7 + T8 → T8  (orchestrator)
                               └── T9  (HTTP surface)
                                       └── T10  (seed trap.ts)
                                               └── T11  (lease path)
                                                       └── T12  (IBM docs)
                                                               └── T13  (stability)
```

**T2, T3, T4, T7 are parallelizable after T1.**

---

## Hold State Machine (the ONLY way hold.status changes)

```
(no disputed gap)              → hold = null
gap + conf ≥ 0.90              → PLACED  (via MCP, reversible, +72h, placed_by "auto")
gap + conf < 0.90              → STAGED  (computed, NOT frozen in gateway)
STAGED + /consent confirm_hold → PLACED  (placed_by "user")
STAGED + no tap                → stays draft only
PLACED + 72h no confirm        → RELEASED (auto_expiry via tick)
PLACED + /consent confirm_hold → PLACED  (placed_by "user", confirmed)
PLACED + /consent withdraw     → RELEASED (user_withdraw)
```

Every transition writes an AuditEvent. Do not weaken this for any reason.

---

## 17-Point Final Self-Check (T13 reports this)

| # | Check |
|---|-------|
| 1 | All 6 contract schemas match §T1 shapes exactly; header says FROZEN |
| 2 | `placeHold` is idempotent: same `(invoice_id, pack_id)` → same `hold_id` |
| 3 | `tick()` auto-releases expired holds |
| 4 | `03_compare.ts` contains ZERO model/SDK/network imports |
| 5 | Unit normalization prevents per-tablet vs line-total subtraction |
| 6 | Missing `rule_anchor` → card `"unverified"`, never `"gap"` |
| 7 | Low-confidence gap → STAGED, never auto-placed |
| 8 | High-confidence gap → PLACED, reversible, +72h |
| 9 | Audit trail: one ordered entry per step + consent events |
| 10 | Step error → partial `RunResponse`, never a crash |
| 11 | `GET /run?seed=trap` byte-identical across 2 calls |
| 12 | Lease runs through the SAME orchestrator (no copied engine) |
| 13 | `01/06` skeletons: seam markers present, zero deps beyond contracts, compile clean |
| 14 | `AJIT_SEAMS.md` exists and names exactly what Ajit may/may-not touch |
| 15 | NO blacklist file created or modified (`apps/**`, `data/**`, `packages/templates/**`, `packages/rulebooks/**`, `README.md`) |
| 16 | 10× `POST /run` → zero 500s |
| 17 | IBM stack comments + `ARCHITECTURE.md` present |

**All 17 green → report to Murgesh: "TRUNK COMPLETE — ready for Ajit plug-in and Vrajesh live flip."**

---

## Commit Messages

| Task | Commit |
|------|--------|
| T0 | `chore: add .env.example (RUN_MODE, IBM creds, THRESHOLD)` |
| T1 | `feat(contracts): freeze P1 schemas per murgesh spec §6 — FROZEN` |
| T2 | `feat(gateway): mock billing gateway — idempotent holds + 72h auto-release` |
| T3 | `feat(audit): append-only audit log (AgentOps)` |
| T4 | `feat(compare): deterministic gap engine — zero LLM in verdict path` |
| T5 | `feat(mcp): server + 4 tools (lookup_rule, place_hold, get_hold_status, release_hold)` |
| T6 | `feat(pipeline): steps 02 lookup, 04 prove, 05 two-tier act` |
| T7 | `feat(seams): 01/06 skeletons + AJIT_SEAMS.md handoff doc` |
| T8 | `feat(orchestrator): 6-step trunk with per-step audit + partial-on-error` |
| T9 | `feat(http): /run, /run?seed=trap, /consent surface` |
| T10 | `feat(seed): deterministic /run?seed=trap — byte-identical, no runtime timestamps` |
| T11 | `feat(lease): rulebook-swap lease path on same trunk (no engine copy)` |
| T12 | `docs: IBM stack mapping in code + ARCHITECTURE.md (P6)` |
| T13 | `chore: stability pass — timeouts, error shapes, zero 500s` |
