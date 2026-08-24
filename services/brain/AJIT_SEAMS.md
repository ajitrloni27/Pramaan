# Ajit's Seams — Handoff Guide

> **Pramaan · IBM Docling + IBM Granite integration**
> Team role: OCR extraction (`01_read.ts`) and plain-language letter generation (`06_draft.ts`).
> Owner: **Ajit**
> Trunk owner: **Murgesh** — all other files are off-limits.

---

## The Two Files You Own

| File | Step | IBM Technology | What You Replace |
|---|---|---|---|
| `services/brain/src/pipeline/steps/01_read.ts` | 01 READ | **IBM Docling** (PDF/image structured extraction) | Body between seam markers |
| `services/brain/src/pipeline/steps/06_draft.ts` | 06 DRAFT | **IBM Granite** (plain-language letter generation) | Body between seam markers |

**Edit ONLY the code between the seam markers:**

```
// ═══════════════ AJIT SEAM — START ═══════════════
// ... replace everything in here ...
// ═══════════════ AJIT SEAM — END ══════════════════
```

Do not touch the function signature, the imports at the top, the export, or any line outside the markers.

---

## File 1 — `01_read.ts`

### Signature (Murgesh's — do not change)

```typescript
export async function read(req: RunRequest): Promise<ExtractedField[]>
```

### `ExtractedField` shape (from `@pramaan/contracts`)

```typescript
interface ExtractedField {
  text: string;                              // raw line text as read from document
  value: number | null;                      // the numeric amount; null if unreadable
  unit: string | null;                       // e.g. "per tablet", "per scan"
  bbox: [number, number, number, number];    // [x, y, width, height] in pixels
  confidence: number;                        // OCR confidence 0..1
  low_conf: boolean;                         // set by applyConfidenceGate — do NOT hardcode
}
```

### Rules

1. **Report reads exactly.** Never round, correct, or adjust a value. If the bill says 45, return 45. The gap detection engine does the arithmetic.
2. **Confidence gate is owned here, by one function.** Your body MUST call `applyConfidenceGate(fields)` before returning (it is already imported at the top of the file). Do NOT reimplement the 0.90 threshold anywhere — not in your body, not in a helper. There is exactly one confidence gate in this codebase. Two gates = two thresholds = drift between OCR and hold logic.
3. **Never throw.** On blank/unreadable input, return `[]`. Wrap Docling failures in a try/catch and return `[]`.
4. **Docling for PDFs, Tesseract fallback for plain images.** `req.image` is either a base64-encoded string or a file path to a PDF/image.
5. `low_conf` on each field is set by `applyConfidenceGate` — do not set it manually.

### Minimal skeleton (for reference)

```typescript
// inside AJIT SEAM — your real implementation
const rawFields = await callDocling(req.image);   // your call
return applyConfidenceGate(rawFields);             // one gate, always last
```

---

## File 2 — `06_draft.ts`

### Signature (Murgesh's — do not change)

```typescript
export async function draft(
  cards: ProofCard[],
  hold: HoldEvent | null,
  template: string
): Promise<Draft>
```

### `ProofCard` shape (from `@pramaan/contracts`)

```typescript
interface ProofCard {
  item: string;
  your_value: number;
  official_value: number;
  gap: number;
  status: "gap" | "ok" | "unverified";
  source_anchor: { ref: string; bbox?: [...]; ocr_confidence?: number };
  rule_anchor: { ref: string; url?: string };
  compute_anchor: string;     // e.g. "8500 - 6400"
  rule_says_plain: string;
}
```

### `Draft` shape (from `@pramaan/contracts`)

```typescript
interface Draft {
  text: string;    // the complaint letter body
  banner: string;  // MUST always be "AI-generated — review before sending"
}
```

### Rules

1. **Granite touches wording only.** Every number in the letter must come from the `cards` array. If Granite outputs a number not present in the cards, discard it.
2. **`banner` is non-negotiable.** Always `"AI-generated — review before sending"` — on success, on fallback, always. Never omit it.
3. **Fallback is mandatory.** If Granite fails or times out (use a 10-second limit), fall back to the `templateFillStub` helper already in the file. The letter must render without a model. A Granite outage must not break the `/run` endpoint.
4. **Only `status === "gap"` cards go in the letter.** Skip `"ok"` and `"unverified"` cards.
5. **If `hold !== null`**, include a line about the hold amount and its auto-release time.

### Minimal skeleton (for reference)

```typescript
// inside AJIT SEAM — your real implementation
try {
  const graniteText = await callGranite(cards, template);  // your call, 10s timeout
  return { text: graniteText, banner: "AI-generated — review before sending" };
} catch {
  return templateFillStub(cards, hold, template);          // fallback already in file
}
```

---

## What You Must NEVER Touch

| File / Symbol | Reason |
|---|---|
| `pipeline/orchestrator.ts` | Threads all 6 steps — Murgesh owns the wiring |
| `pipeline/steps/02_lookup.ts` | MCP rulebook lookup |
| `pipeline/steps/03_compare.ts` | Hallucination-free arithmetic — no model in path |
| `pipeline/steps/04_prove.ts` | ProofCard builder |
| `pipeline/steps/05_act.ts` | MCP hold placement |
| `pipeline/confidence.ts` | The ONE confidence gate |
| `packages/contracts/**` | Schema freeze — Murgesh + Vrajesh sync required |
| `mcp/server.ts` | MCP tools |
| `audit/audit_log.ts` | Append-only audit trail |
| Function signatures in your two files | Orchestrator expects exact shapes |
| Imports outside your seam zone | Already set up correctly |

---

## How to Test Your Work

### Start the service

```bash
# from repo root
npm run dev
```

### Live run (uses your 01_read.ts)

```bash
curl -X POST http://localhost:3000/run \
  -H "Content-Type: application/json" \
  -d '{"image":"<base64_or_path>","domain":"bill"}'
```

### Inspect the response

Look at the `RunResponse` JSON:

```jsonc
{
  "run_id": "...",
  "extracted_fields": [ /* your output from 01_read.ts */ ],
  "proof_cards": [ /* gap detection results */ ],
  "hold": { /* or null */ },
  "draft": {
    "text": "...",          /* your output from 06_draft.ts */
    "banner": "AI-generated — review before sending"
  },
  "audit": [ /* every pipeline event */ ]
}
```

### Seed paths (no real image needed)

```bash
# Trap bill — exercises gap detection and hold placement
curl "http://localhost:3000/run?seed=trap"

# Clean bill — proves engine does NOT flag correct bills
curl "http://localhost:3000/run?seed=control"
```

### TypeScript compile check

```bash
npm run typecheck
# or
npx tsc --noEmit
```

Zero errors expected before and after your changes.

---

## Summary — Ajit's Contract

| | `01_read.ts` | `06_draft.ts` |
|---|---|---|
| **Input** | `RunRequest { image, domain }` | `ProofCard[], HoldEvent\|null, string` |
| **Output** | `ExtractedField[]` (after `applyConfidenceGate`) | `Draft { text, banner }` |
| **IBM tech** | IBM Docling (PDF/image) | IBM Granite (language model) |
| **Fallback** | Return `[]` on error | `templateFillStub` already in file |
| **Must never** | Hardcode 0.90 threshold | Omit banner / output numbers not in cards |
| **Seam zone** | Between `AJIT SEAM — START/END` markers | Between `AJIT SEAM — START/END` markers |

---

## Live Integration Notes (2026-08-09)

> Added after Ajit's Phase 1 PR merged. Engine hardened for real OCR output.

### Canonical field names you must emit from `01_read.ts`

Every object in the array you return **must have these exact field names** — the contract is frozen:

| Field | Type | Notes |
|---|---|---|
| `text` | `string` | Raw line text exactly as read. Never correct or truncate. |
| `value` | `number \| null` | First numeric token parsed from the line. `null` if no number found. |
| `unit` | `string \| null` | Unit string or `null`. See recognised units below. |
| `bbox` | `[number,number,number,number]` | `[x, y, width, height]` in pixels. `x1-x0`, `y1-y0` from Tesseract bbox. |
| `confidence` | `number` | OCR confidence **0.0–1.0**. Tesseract gives 0–100 — divide by 100. |
| `low_conf` | `boolean` | Always set to `false` in your object — `applyConfidenceGate` sets the real value. |

**Never use alternative names** (`conf`, `box`, `score`, `bounding_box`, etc.). TypeScript will catch it at compile time.

### Unit strings the engine recognises

The engine's unit normaliser (step 03 COMPARE) maps these to base units automatically:

| String Ajit emits | Engine normalises to | Arithmetic |
|---|---|---|
| `"per tablet"`, `"tablet"`, `"tablets"`, `"tab"`, `"tabs"`, `"per tab"` | `per tablet` | identity |
| `"per strip"`, `"strip"`, `"strips"` | `per strip` | ÷ 10 (10 tablets/strip) |
| `"per scan"`, `"scan"` | `per scan` | identity |
| `"per test"`, `"test"`, `"per report"` | `per test` | identity |
| `"per day"`, `"day"`, `"daily"`, `"/day"` | `per day` | identity |
| `"per procedure"`, `"procedure"` | `per procedure` | identity |
| `"per ml"`, `"ml"`, `"/ml"` | `per ml` | identity |
| `"per 100ml"`, `"100ml"`, `"/100ml"` | `per 100ml` | ÷ 100 |
| anything else or `null` | (unrecognised) | field → `"unverified"` — safe, no false alarm |

If you emit `"tab"` the engine correctly maps it to `"per tablet"`. If you emit a novel unit, add it to the `UNIT_ALIASES` table in `services/brain/src/pipeline/steps/03_compare.ts` — that is Murgesh's file, raise a PR comment.

### What happens to different field shapes

| Field state | Engine behaviour |
|---|---|
| `value: null` | step 03 COMPARE → status `"unverified"`. Safe. |
| `unit: null` | step 03 COMPARE → field assumed to match rule's base unit. If unit-safe, compared; else `"unverified"`. |
| `text: ""` or whitespace | step 02 LOOKUP skips silently. Field never reaches COMPARE. |
| `confidence < 0.90` | `applyConfidenceGate` sets `low_conf: true`. Step 05 ACT uses this to STAGE the hold (not PLACE). |
| No matching rule | COMPARE skips silently. Silence over false alarm. |
| Multiple rules match | First match used. LOOKUP returns all; engine takes `matches[0]`. |

### Fuzzy OCR text — lookup is now two-pass

The lookup engine (step 02 LOOKUP) now tokenises your OCR text and strips noise tokens before matching:

- **Pass 1:** Standard substring: `"Paracetamol 500mg x30"` → contains `"paracetamol"` → match ✅
- **Pass 2:** Token match: `"Crocin Tab 650mg"` → tokens: `["crocin", "650"]` → `"crocin"` is a match_term → match ✅
- **Noise stripped:** `mg`, `ml`, `x30`, `tab`, `caps`, `inj`, `amp`, `no.`, etc. — these never prevent a match.

You do **not** need to clean your text before returning it. Return it exactly as Tesseract gives it.

### The one rule that never changes

```typescript
return applyConfidenceGate(rawFields);  // ← always the last line before return
```

This is the only confidence gate in the codebase. Do not write `if (confidence < 0.9)` anywhere. Do not set `low_conf` manually. `applyConfidenceGate` does it correctly from the single source of truth in `confidence.ts`.

### What you must NEVER do (updated checklist)

| Action | Consequence |
|---|---|
| Change function signature of `read()` or `draft()` | Orchestrator breaks immediately |
| Add top-level `import` outside the seam zone | Trunk fails to start on machines without your dep |
| Set `low_conf: true` manually for any field | Creates a second confidence gate — drift between OCR and hold logic |
| Call `applyConfidenceGate` more than once | Double-gates — fields marked low-conf that should be high-conf |
| Output `banner: undefined` or omit `banner` | Mobile UI crashes — always `"AI-generated — review before sending"` |
| Output a number in `draft.text` not present in `cards` | Hallucinated overcharge — discard Granite output and fall back |
| Modify `orchestrator.ts`, `confidence.ts`, `03_compare.ts`, `05_act.ts` | You are not the owner — raise a PR comment to Murgesh |

### How to test after your next hardening pass

```bash
# 1. Compile check (always first)
cd services/brain && npx tsc --noEmit

# 2. Start server
npm run dev

# 3. Real image test — replace path with your sample bill
curl -s -X POST http://localhost:3000/run \
  -H "Content-Type: application/json" \
  -d "{\"image\":\"$(base64 -w0 /path/to/bill.png)\",\"domain\":\"bill\"}" | jq .

# 4. Check extracted_fields — should contain real OCR lines, not the 3 stub objects
# 5. Check draft.text — should be Granite output, not templateFillStub
# 6. Check hold — null (clean), staged (low-conf gap), or placed (high-conf gap)

# 7. Seed regression — must stay byte-identical
curl -s http://localhost:3000/run?seed=trap > a.json
curl -s http://localhost:3000/run?seed=trap > b.json
diff a.json b.json  # must be empty
```

---

*Updated 2026-08-09 — engine hardened for real OCR output (M-P1 through M-P6).*
*Built with IBM Bob — AI SDLC Partner.*
*Pramaan · HackVerse Track 3 · One engine. Proof, not opinions.*

---

## Fallback Chain (06_draft.ts)

Priority order when generating the dispute letter:

1. **IBM Granite via watsonx.ai** (10-second timeout via `Promise.race`)  
   Attempted first if `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` are set.  
   The number guard runs on Granite's output — if any numeric value in the response  
   is not present in the gap cards or hold data, the entire Granite response is  
   discarded and tier 2 is used.

2. **Ollama local** (if installed)  
   If Granite fails (network down, timeout, SDK error) and a local Ollama instance  
   is running, the engine can be extended to try Ollama here before falling to  
   `templateFillStub`. For this sprint, if Ollama is not installed locally, this  
   tier is skipped — the chain becomes Granite → templateFillStub.  
   To add Ollama: inside the `catch` block in the seam, before calling  
   `templateFillStub`, attempt `fetch("http://localhost:11434/api/generate", ...)`.

3. **templateFillStub** (pure string interpolation, no model)  
   Always available. No network, no model, no SDK required. Fills the letter  
   template with gap card data from `cards` array. Returns a fully formed letter.

All three paths return `{ text: string, banner: "AI-generated — review before sending" }`.  
The demo **never depends on a live model call** — `templateFillStub` is always the  
final safety net and produces a complete, correct letter regardless of network state.

Logs emitted:
- `[06_draft] WATSONX env vars missing — using fallback.` — env not configured
- `[06_draft] Granite returned empty output — using fallback.` — empty response
- `[06_draft] Number guard triggered — Granite hallucinated a value. Falling back.` — guard fired
- `[06_draft] Granite failed, using fallback:` — network/SDK error, falls to templateFillStub
