# Pramaan — Engine Handoff & Team Integration Protocol
> **Status as of T13:** Engine trunk COMPLETE. 39/39 self-checks green.
> **This document is the authoritative bridge between Murgesh's completed trunk and every team member's next step.**
> Read this before touching any file in the repo.

---

## 1. What Has Been Built and Verified

The `services/brain` engine is fully built, tested, and committed on `main`. Every file listed below has been:
- Written to spec
- TypeScript-compiled with zero errors
- Smoke-tested with live HTTP calls
- Verified by the 17-point self-check

### The 6-Step Pipeline (ALL LOCKED — do not modify)

```
POST /run { image, domain }
       │
       ▼
services/brain/src/pipeline/
│
├── orchestrator.ts          ← IBM watsonx Orchestrate — threads all 6 steps
│
├── steps/
│   ├── 01_read.ts           ← IBM Docling     — AJIT SEAM (stub active)
│   ├── 02_lookup.ts         ← MCP lookup_rule — LOCKED
│   ├── 03_compare.ts        ← Pure arithmetic — LOCKED (zero model in path)
│   ├── 04_prove.ts          ← ProofCard build — LOCKED
│   ├── 05_act.ts            ← MCP place_hold  — LOCKED
│   └── 06_draft.ts          ← IBM Granite     — AJIT SEAM (stub active)
│
├── confidence.ts            ← The ONE confidence gate — LOCKED
│
├── ../gateway/billing_gateway.ts  ← Mock MCP gateway — LOCKED
├── ../audit/audit_log.ts          ← AgentOps audit   — LOCKED
├── ../mcp/server.ts               ← MCP 4-tool server — LOCKED
└── ../index.ts                    ← HTTP surface       — LOCKED
```

### Verified Seed Paths

| Endpoint | Purpose | Status |
|---|---|---|
| `POST /run` | Live pipeline (uses stub OCR until Ajit plugs in) | ✅ Live |
| `GET /run?seed=trap` | Demo: gap + hold, byte-identical across calls | ✅ Verified |
| `GET /run?seed=control` | Demo: clean bill, zero false positives | ✅ Verified |
| `POST /consent` | Human hold-confirm / withdraw / send-letter | ✅ Live |
| `GET /health` | Liveness probe | ✅ Live |

### Files That Are FROZEN (tested, verified, do not touch)

```
node_modules/@pramaan/contracts/types.ts          ← Schema freeze (10 types)
node_modules/@pramaan/contracts/*.schema.json     ← 6 JSON schemas
services/brain/src/pipeline/orchestrator.ts
services/brain/src/pipeline/confidence.ts
services/brain/src/pipeline/steps/02_lookup.ts
services/brain/src/pipeline/steps/03_compare.ts
services/brain/src/pipeline/steps/04_prove.ts
services/brain/src/pipeline/steps/05_act.ts
services/brain/src/gateway/billing_gateway.ts
services/brain/src/audit/audit_log.ts
services/brain/src/mcp/server.ts
services/brain/src/mcp/tools/lookup_rule.ts
services/brain/src/mcp/tools/place_hold.ts
services/brain/src/mcp/tools/get_hold_status.ts
services/brain/src/mcp/tools/release_hold.ts
services/brain/src/index.ts
services/brain/src/seeds/trap.ts
services/brain/src/seeds/control.ts
services/brain/src/seeds/rulebook_stub.ts
services/brain/src/seeds/rulebook_lease_stub.ts
services/brain/src/seeds/index.ts
ARCHITECTURE.md
```

**Modifying any frozen file without a sync meeting with Murgesh will cause merge conflicts and break the 17-point self-check.**

---

## 2. Integration Order — Who Does What, When

```
NOW (Phase 1)
└── Ajit plugs in IBM Docling + IBM Granite into the two seam zones
        └── tsc --noEmit passes → npm run dev → POST /run with real image → smoke pass
                │
                ▼
        Phase 2 (only after Ajit's smoke passes)
        ├── Manas drops rulebook JSON files → engine auto-switches from stub
        └── Vrajesh flips dataSource env var → mobile app connects to live engine
```

**Phase 2 does not start until Ajit reports: "POST /run with a real image returns extracted_fields with real values."**

---

## 3. Ajit's Integration Instructions

> **This section is the authoritative instruction set for Ajit and Ajit's IBM Bob.**

### 3.1 — The Two Files Ajit Owns

You may edit exactly **two files**. Everything else is locked.

| File | Your Zone | IBM Technology |
|---|---|---|
| `services/brain/src/pipeline/steps/01_read.ts` | Between seam markers | IBM Docling (OCR / PDF extraction) |
| `services/brain/src/pipeline/steps/06_draft.ts` | Between seam markers | IBM Granite (plain-language generation) |

### 3.2 — The Seam Marker Contract

The markers are:
```
// ═══════════════ AJIT SEAM — START ═══════════════
// ... ONLY this zone is yours ...
// ═══════════════ AJIT SEAM — END ══════════════════
```

**Absolute rules:**
1. Do not move, rename, or delete the markers.
2. Do not touch any line outside the markers.
3. Do not change the function signature, the `export` keyword, or the imports at the top of the file.
4. Do not add new top-level imports. Add any new `import` statements **inside** the seam zone using dynamic `await import(...)` so the trunk compiles without your dep installed.

### 3.3 — File 1: `01_read.ts` — IBM Docling

**Current state:** Stub returns 3 hard-coded `ExtractedField[]` objects. Replace with real OCR.

**Function signature (do not change):**
```typescript
export async function read(req: RunRequest): Promise<ExtractedField[]>
```

**`req.image`** is either a base64-encoded string or a file path to a PDF/image.

**`ExtractedField` shape (from `@pramaan/contracts` — do not redefine):**
```typescript
{
  text:       string;                            // raw line text exactly as read
  value:      number | null;                     // numeric amount; null if unreadable
  unit:       string | null;                     // "per tablet" | "per scan" | etc.
  bbox:       [number, number, number, number];  // [x, y, width, height] in pixels
  confidence: number;                            // OCR confidence 0..1
  low_conf:   boolean;                           // DO NOT set manually — see rule 4
}
```

**Non-negotiable rules for your body:**

| # | Rule | Why it matters |
|---|---|---|
| R1 | Return numbers **exactly as read** — never round or correct a shaky value | The gap engine subtracts two exact numbers. If you adjust, the verdict is wrong. |
| R2 | Call `applyConfidenceGate(fields)` as the **last line before return** | It is already imported. Do NOT reimplement the 0.90 threshold anywhere. There is one gate. Two gates = two thresholds = drift between OCR and hold logic. |
| R3 | On any error / blank input, return `[]` — never throw | The orchestrator has a try/catch but a throw will still produce a partial response. Empty array is the correct fallback. |
| R4 | Dynamic-import your OCR dependency inside the seam zone | The trunk must compile and start on any machine without your dep. Use `const { createWorker } = await import('tesseract.js')` — not a top-level `import`. |
| R5 | Do not set `low_conf` manually | `applyConfidenceGate` sets it. Your field objects should always have `low_conf: false` as a placeholder; the gate will correct it. |

**Minimal working skeleton:**
```typescript
// ═══════════════ AJIT SEAM — START ═══════════════
try {
  const { createWorker } = await import('tesseract.js'); // or Docling SDK
  // ... your OCR call using req.image ...
  const rawFields: ExtractedField[] = [
    { text: "...", value: 8500, unit: "per scan", bbox: [0,0,0,0], confidence: 0.97, low_conf: false },
    // one object per extracted line item
  ];
  return applyConfidenceGate(rawFields); // ← always last, never skip
} catch {
  return []; // graceful empty on any failure
}
// ═══════════════ AJIT SEAM — END ══════════════════
```

### 3.4 — File 2: `06_draft.ts` — IBM Granite

**Current state:** Stub does template-fill with gap card data. Replace with real Granite call + keep the fallback.

**Function signature (do not change):**
```typescript
export async function draft(
  cards: ProofCard[],
  hold: HoldEvent | null,
  template: string
): Promise<Draft>
```

**`Draft` shape (do not redefine):**
```typescript
{ text: string; banner: string }
```

**Non-negotiable rules for your body:**

| # | Rule | Why it matters |
|---|---|---|
| R1 | `banner` MUST ALWAYS be `"AI-generated — review before sending"` | Mobile UI reads this field. Never omit it, even on fallback or error. |
| R2 | Granite touches **wording only** — every number must come from `cards` | No hallucinated amounts. If Granite outputs a number not in the cards, discard the response and fall back. |
| R3 | **Fallback is mandatory** — if Granite fails or times out (10s), call `templateFillStub(cards, hold, template)` | The function is already defined below the seam zone in the same file. A Granite outage must not break `/run`. |
| R4 | Only include cards where `status === "gap"` | `"ok"` and `"unverified"` cards do not belong in a complaint letter. |
| R5 | If `hold !== null`, include a line about the hold amount and auto-release time | The user needs to know their money is provisionally frozen. |
| R6 | Do not add new top-level imports | Use dynamic `await import(...)` inside the seam zone for any SDK you need. |

**Minimal working skeleton:**
```typescript
// ═══════════════ AJIT SEAM — START ═══════════════
const AI_BANNER = "AI-generated — review before sending";
try {
  // your Granite / watsonx.ai call — must complete within 10 seconds
  const graniteText = await Promise.race([
    callGranite(cards, template),                            // your function
    new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 10_000))
  ]);
  return { text: graniteText, banner: AI_BANNER };
} catch {
  return templateFillStub(cards, hold, template); // already in this file below the seam
}
// ═══════════════ AJIT SEAM — END ══════════════════
```

### 3.5 — Environment Variables Ajit Needs

Add to your local `.env` (copy from `.env.example`):
```
WATSONX_API_KEY=your_ibm_cloud_api_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
```

The trunk reads these via `process.env["WATSONX_API_KEY"]` etc. They are never hardcoded.

### 3.6 — How to Verify Your Integration

**Step 1 — Compile check (must pass before anything else):**
```bash
cd services/brain
npx tsc --noEmit
# Expected: zero errors, zero warnings
```

**Step 2 — Start the server:**
```bash
npm run dev
# Expected: [pramaan-brain] listening on port 3000
```

**Step 3 — Live image test (your real OCR path):**
```bash
curl -X POST http://localhost:3000/run \
  -H "Content-Type: application/json" \
  -d '{"image":"<your_base64_or_file_path>","domain":"bill"}'
```

**What to look for in the response:**
```jsonc
{
  "extracted_fields": [
    // ← must contain real fields from your image, not the 3 stub fields
    { "text": "MRI Brain scan", "value": 8500, "confidence": 0.97, "low_conf": false, ... }
  ],
  "draft": {
    "text": "...",                              // ← must be Granite output, not template stub
    "banner": "AI-generated — review before sending"  // ← non-negotiable, always present
  },
  "audit": [
    { "t": "ocr",     ... },
    { "t": "lookup",  ... },
    { "t": "compare", ... },
    { "t": "prove",   ... },
    // hold_placed or hold_staged depending on confidence
    { "t": "draft",   ... }
  ]
}
```

**Step 4 — Seed path must still work (regression check):**
```bash
curl http://localhost:3000/run?seed=trap
# Expected: run_id = "demo-trap-001", hold.status = "placed"
# This must still be byte-identical even after your changes
```

**Step 5 — Compile check again after your changes:**
```bash
npx tsc --noEmit
# Must still be zero errors
```

**Step 6 — Report to Murgesh:** "POST /run with a real image returns real `extracted_fields` and Granite `draft.text`. Seed path still byte-identical. Zero compile errors."

---

## 4. What Ajit's IBM Bob Must NOT Do

These are hard boundaries for the AI assistant working in Ajit's session:

| Action | Why forbidden |
|---|---|
| Modify `orchestrator.ts` | It has been tested end-to-end. Any change breaks the 6-step wiring. |
| Modify `confidence.ts` | The 0.90 threshold is the single source of truth. Reimplementing it anywhere creates two thresholds. |
| Modify `03_compare.ts` | It is a pure arithmetic function with zero model in path. This is the hallucination defense. It must stay that way. |
| Modify `05_act.ts` | The two-tier hold logic (staged vs placed) is verified. Changing it breaks the trust model. |
| Add top-level `import` statements to `01_read.ts` or `06_draft.ts` | The trunk must compile and start without Ajit's dependencies installed. Use dynamic imports inside the seam zone. |
| Change function signatures | The orchestrator calls `read(req)` and `draft(cards, hold, template)` by exact signature. Any change breaks the pipeline. |
| Add new files to `services/brain/src/pipeline/` | All pipeline files are accounted for. New files create confusion about what is tested. |
| Touch `packages/contracts/types.ts` | Schema is frozen. Changes require Murgesh + Vrajesh sync. |
| Touch `services/brain/src/index.ts` | HTTP surface is tested and live. |
| Touch anything in `apps/`, `data/`, `packages/templates/`, `packages/rulebooks/` | Those are Vrajesh's and Manas's lanes. |

---

## 5. Manas's Phase 2 Integration Instructions

> **Do not start until Ajit's integration is confirmed working.**

### What Manas delivers

Two JSON files that replace the in-engine stubs automatically:

| File | Replaces |
|---|---|
| `packages/rulebooks/bill_rules.json` | `services/brain/src/seeds/rulebook_stub.ts` |
| `packages/rulebooks/lease_rules.json` | `services/brain/src/seeds/rulebook_lease_stub.ts` |

### How the swap works (zero code change required)

[`lookup_rule.ts`](services/brain/src/mcp/tools/lookup_rule.ts) already has this logic:
```typescript
// Looks for packages/rulebooks/bill_rules.json at runtime
if (existsSync(realPath)) {
  const raw = readFileSync(realPath, "utf-8");
  return JSON.parse(raw); // uses real rules
}
return BILL_RULEBOOK_STUB; // uses stub if file not present
```

When Manas drops the JSON files, the engine switches automatically on next server restart. No code change, no PR to `services/brain`.

### JSON schema each rule file must follow

**`bill_rules.json`** — array of `BillRuleRow`:
```jsonc
[
  {
    "rule_id": "BR-001",
    "domain": "bill",
    "item_category": "medication",
    "match_terms": ["paracetamol", "pcm", "crocin"],
    "procedure_code": "MED-PCT-500",
    "official_value": 2,
    "official_unit": "per tablet",
    "official_source": "NPPA Drug Price Control Order 2013",
    "official_source_url": "https://www.nppa.gov.in/...",
    "rule_says_plain": "Paracetamol 500mg is capped at ₹2 per tablet under DPCO 2013.",
    "severity": "high",
    "status": "VERIFIED",
    "notes": ""
  }
]
```

**`lease_rules.json`** — array of `LeaseRuleRow`:
```jsonc
[
  {
    "rule_id": "LR-001",
    "domain": "lease",
    "clause_type": "deposit",
    "match_terms": ["non-refundable deposit"],
    "legal_status": "illegal",
    "law_ref": "Maharashtra Rent Control Act 1999, Section 14",
    "law_ref_url": "https://...",
    "rule_says_plain": "A landlord cannot declare a deposit non-refundable.",
    "suggested_fix_plain": "Replace with 'refundable security deposit'.",
    "status": "VERIFIED"
  }
]
```

**Manas's rules:** If the JSON cannot be parsed or is empty, the engine silently falls back to the internal stub. No crash. Verify your JSON with `npx tsc --noEmit` in `services/brain` does not break (it will not — the engine reads JSON at runtime, not compile time).

---

## 6. Vrajesh's Phase 2 Integration Instructions

> **Do not start until Ajit's integration is confirmed working.**

### The single flip

Set one environment variable in your app:
```
BRAIN_URL=http://localhost:3000   # local dev
BRAIN_URL=https://your-host/api  # deployed
```

Switch your `dataSource` from the mock fixture to `BRAIN_URL`. That is the entire integration.

### API contract (frozen — will not change)

All responses are `RunResponse`:
```typescript
{
  run_id:           string;
  domain:           "bill" | "lease";
  extracted_fields: ExtractedField[];
  proof_cards:      ProofCard[];
  hold:             HoldEvent | null;
  draft:            { text: string; banner: string };
  audit:            AuditEvent[];
}
```

### Endpoints Vrajesh calls

| Method | URL | When to call |
|---|---|---|
| `POST /run` | `{ image: base64, domain: "bill"\|"lease" }` | User submits document |
| `GET /run?seed=trap` | — | Demo / onboarding screen |
| `GET /run?seed=control` | — | "Clean bill" demo |
| `POST /consent` | `{ run_id, hold_id, action: "confirm_hold"\|"withdraw_hold"\|"send_letter" }` | User taps hold/send button |
| `GET /health` | — | App startup liveness check |

### Rules for Vrajesh

1. Never call `POST /run` with `image: null` — validate before sending.
2. Always display `draft.banner` to the user. It is non-negotiable per IBM Granite usage policy.
3. `hold` can be `null` (clean bill) — your UI must handle both states without crashing.
4. `proof_cards` can be empty — render a "no issues found" state, not an error.
5. Do not parse or depend on `audit` in the UI — it is for backend traceability only.

---

## 7. The Locked Contract Types (reference)

These types are in [`node_modules/@pramaan/contracts/types.ts`](node_modules/@pramaan/contracts/types.ts). They are **FROZEN**. Neither Ajit, Manas, nor Vrajesh may change them without a sync with Murgesh.

```typescript
ExtractedField   — output of 01_read.ts (Ajit produces this)
RuleRow          — BillRuleRow | LeaseRuleRow (Manas provides JSON matching this)
CompareResult    — internal to step 03
ProofCard        — output of step 04
HoldEvent        — output of step 05
AuditEvent       — appended after each step
RunRequest       — { image: string, domain: "bill" | "lease" }
RunResponse      — the full JSON response (Vrajesh consumes this)
Draft            — { text: string, banner: string } (Ajit produces this)
Domain           — "bill" | "lease"
```

---

## 8. The Confidence Gate — One Rule to Never Break

```
THRESHOLD = 0.90  (in services/brain/src/pipeline/confidence.ts)

gap + all_gap_card_conf_floor >= 0.90  →  PLACED  (in gateway, reversible, +72h)
gap + any_gap_card_conf_floor  < 0.90  →  STAGED  (computed only, not in gateway)
```

**Ajit:** `applyConfidenceGate` is already imported in `01_read.ts`. Call it. Do not write `if (confidence < 0.9)` anywhere in your code. That creates a second gate.

**Everyone:** The 0.90 number exists in exactly one place: [`confidence.ts`](services/brain/src/pipeline/confidence.ts:5). If you see it hardcoded anywhere else, that is a bug — report it to Murgesh.

---

## 9. Conflict Prevention Rules for All Team Members

These rules prevent the merge conflicts that killed previous sprint iterations:

| Rule | Detail |
|---|---|
| **Never edit a FROZEN file** | See the frozen file list in §1. If you think you need to, talk to Murgesh first. |
| **One seam, one owner** | Ajit owns the body between `AJIT SEAM` markers. Murgesh owns everything outside them. |
| **No new pipeline files** | All 6 step files exist. Do not create `07_xxx.ts` or `pipeline/helpers/`. |
| **No schema additions** | `types.ts` has 10 types. Adding a field requires a sync because Vrajesh's UI may break. |
| **Always run `npx tsc --noEmit` before committing** | The compile check is the gate. If it fails, do not commit. |
| **Never import across team boundaries** | Ajit's seam code must not import from `03_compare.ts`, `05_act.ts`, or `orchestrator.ts`. The orchestrator imports you — not the other way around. |
| **Seed paths must stay byte-identical** | After any change, run `curl http://localhost:3000/run?seed=trap` twice and diff the output. If the bytes differ, something in the seeded path is using `Date.now()` or `randomUUID()` — fix it. |

---

## 10. Quick-Reference: The Engine in One Diagram

```
                    ┌─────────────────────────────────────────────────────────┐
                    │          services/brain  (IBM watsonx Orchestrate)       │
                    │                                                           │
User document ─────►│  01 READ ──► 02 LOOKUP ──► 03 COMPARE ──► 04 PROVE      │
(image / PDF)       │   (Ajit)      (MCP)         (arithmetic)   (3 anchors)   │
                    │                                  │                        │
                    │                             05 ACT ──► 06 DRAFT           │
                    │                           (MCP hold)   (Ajit/Granite)     │
                    └───────────────────────────────────────────────────────────┘
                                          │
                                          ▼
                              RunResponse { run_id, extracted_fields,
                                           proof_cards, hold, draft, audit }
                                          │
                              ┌───────────┴──────────────┐
                              │                          │
                          Vrajesh                      Audit trail
                        (mobile UI)                  (AgentOps / IBM)
```

**Ajit plugs into steps 01 and 06.**
**Manas feeds the rulebook that step 02 reads.**
**Vrajesh consumes the final `RunResponse`.**
**Steps 03, 04, 05 are pure code — no model, no human, no changes.**

---

## 11. Commit Convention

All commits to `services/brain` must be prefixed:

| Prefix | Used by | Example |
|---|---|---|
| `feat(seams):` | Ajit — real OCR/Granite body | `feat(seams): plug in IBM Docling OCR + Granite draft` |
| `feat(rulebook):` | Manas — JSON rule files | `feat(rulebook): add bill_rules.json v1 (CGHS 2023)` |
| `feat(ui):` | Vrajesh — app layer | `feat(ui): connect RunResponse to proof card screen` |
| `fix(seams):` | Ajit — bug in seam body | `fix(seams): handle null bbox from Docling` |
| `chore:` | Any — non-functional | `chore: add tesseract.js to package.json` |

**Never force-push to `main`.** Create a branch, open a PR, get Murgesh to review before merging into `main`.

---

## 12. Phase Gate — When Phase 2 Unlocks

Phase 2 (Manas + Vrajesh) unlocks when Ajit reports **all four of these** to Murgesh:

- [ ] `npx tsc --noEmit` passes with zero errors after seam replacement
- [ ] `POST /run` with a real bill image returns `extracted_fields` with real OCR values
- [ ] `POST /run` returns `draft.text` generated by Granite (not the template stub)
- [ ] `GET /run?seed=trap` still returns `run_id: "demo-trap-001"` with `hold.status: "placed"` (byte-identical regression)

Until all four boxes are checked, Manas and Vrajesh should continue working in their own lanes without touching `services/brain`.

---

*Built with IBM Bob — AI SDLC Partner.*
*Pramaan · HackVerse Track 3 · One engine. Proof, not opinions. Built once, branches forever.*
