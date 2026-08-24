# API Contract for Vrajesh's UI

> **This document is generated from verified tests.**
> If the UI doesn't match what is described here, **the UI is wrong — not the engine.**
> Every shape, code, and transition listed below is backed by a passing assertion in
> [`services/brain/test/api_contract_verify.ts`](../services/brain/test/api_contract_verify.ts).

---

## Table of Contents

1. [Base URL & Headers](#1-base-url--headers)
2. [Endpoints](#2-endpoints)
   - [GET /health](#get-health)
   - [POST /run](#post-run)
   - [GET /run?seed=](#get-runseed)
   - [POST /consent](#post-consent)
   - [GET /audit/:run_id](#get-auditrun_id)
3. [Type Reference](#3-type-reference)
4. [Hold State Machine](#4-hold-state-machine)
5. [Bbox Coordinate Format](#5-bbox-coordinate-format)
6. [Structured Error Codes](#6-structured-error-codes)
7. [What Vrajesh Must Handle](#7-what-vrajesh-must-handle)

---

## 1. Base URL & Headers

```
BRAIN_URL = http://localhost:3000        (local dev)
Content-Type: application/json           (all POST requests)
```

**CORS:** The engine allows requests from `localhost:5173` (Vite), `localhost:8100` (Ionic), and `localhost:3000`. No extra headers required from the UI.

---

## 2. Endpoints

### GET /health

Heartbeat. Call before any flow to verify the engine is running.

**Response `200`:**
```json
{ "ok": true }
```

---

### POST /run

Submit a bill or lease image for analysis.

**Request body:**
```json
{
  "image":  "<base64-encoded JPEG or PNG string>",
  "domain": "bill" | "lease"
}
```

> `image` must be a non-empty string. Maximum payload: **10 MB** (the entire JSON body, not just the image).
> Send a plain base64 string or a `data:image/jpeg;base64,...` data URI — both are accepted.

**Response `200` — `RunResponse`:**
```typescript
{
  run_id:           string,          // UUID — store this for all follow-up calls
  domain:           "bill" | "lease",
  extracted_fields: ExtractedField[],
  proof_cards:      ProofCard[],
  hold:             HoldEvent | null,
  draft:            { text: string, banner: string },
  audit:            AuditEvent[]
}
```

See [Type Reference](#3-type-reference) for full field shapes.

**Error responses:**

| Condition | HTTP | code |
|-----------|------|------|
| `image` missing or empty string | 400 | `INVALID_IMAGE` |
| `domain` not `"bill"` or `"lease"` | 400 | `INVALID_DOMAIN` |
| Body > 10 MB | 413 | `IMAGE_TOO_LARGE` |
| OCR step exceeds timeout | 504 | `OCR_TIMEOUT` |
| Any other pipeline error | 500 | `INTERNAL_ERROR` |

---

### GET /run?seed=

Deterministic demo path — byte-identical across runs. Use for UI testing without a real image.

**Query parameters:**

| Parameter | Values | Description |
|-----------|--------|-------------|
| `seed` | `trap` | Trap bill: MRI overcharge + paracetamol. Returns `hold.status = "placed"`, `run_id = "demo-trap-001"`. |
| `seed` | `control` | Clean bill: all amounts match. Returns `hold = null`, `run_id = "demo-control-001"`. |

**Response `200`:** Same `RunResponse` shape as `POST /run`.

**Guaranteed values for `seed=trap`:**
```json
{
  "run_id": "demo-trap-001",
  "domain": "bill",
  "hold": {
    "hold_id": "demo-hold-trap-001",
    "invoice_id": "demo-invoice-trap-001",
    "amount": 2100,
    "status": "placed",
    "reversible": true,
    "placed_by": "auto",
    "confidence_floor": 0.97
  }
}
```

**Error responses:**

| Condition | HTTP | code |
|-----------|------|------|
| Unknown `seed` value | 400 | `INVALID_SEED` |
| `domain` param not `"bill"` or `"lease"` | 400 | `INVALID_DOMAIN` |

---

### POST /consent

User tap on the hold — confirm, withdraw, or send the dispute letter.

**Request body:**
```json
{
  "run_id":  string,    // from RunResponse.run_id
  "hold_id": string,    // from RunResponse.hold.hold_id
  "action":  "confirm_hold" | "withdraw_hold" | "send_letter"
}
```

**Actions:**

| action | Gateway mutation | Audit event |
|--------|-----------------|-------------|
| `confirm_hold` | `hold.placed_by → "user"` (status stays `"placed"`) | `t: "consent"` appended |
| `withdraw_hold` | `hold.status → "released"` | `t: "consent"` appended |
| `send_letter` | **None** — audit only | `t: "consent"` appended |

**Response `200`:**
```json
{
  "audit": {
    "t": "consent",
    "run_id": "<run_id>",
    "ts": "<ISO timestamp>",
    "payload": { "action": "<action>", "hold_id": "<hold_id>" }
  }
}
```

**Error responses:**

| Condition | HTTP | code |
|-----------|------|------|
| `run_id` / `hold_id` / `action` missing or wrong type | 400 | `INVALID_REQUEST` |
| `run_id` has no audit events (no prior `/run` call) | 404 | `RUN_NOT_FOUND` |
| `hold_id` not in gateway (staged hold or wrong id) | 404 | `HOLD_NOT_FOUND` |

> ⚠️ **Important:** `confirm_hold` and `withdraw_hold` on a **staged** hold (`hold.status === "staged"`) will return `404 HOLD_NOT_FOUND`. Staged holds are never registered in the gateway. Show the user a "Re-scan with a clearer image" prompt instead.

---

### GET /audit/:run_id

Fetch the complete ordered governance trail for a run.

**Response `200`:** `AuditEvent[]` — ordered array, oldest first.

Returns `[]` (empty array) for an unknown `run_id`. **Never returns `404`.**

---

## 3. Type Reference

All types are defined in [`packages/contracts/types.ts`](../packages/contracts/types.ts) and are **frozen** (no UI-side changes).

### ExtractedField
```typescript
{
  text:       string,
  value:      number | null,    // numeric value read from bill/lease
  unit:       string | null,    // "per scan", "per tablet", "per test", "per day", null
  bbox:       [number, number, number, number],  // [x, y, width, height] in PIXELS
  confidence: number,           // 0..1 — OCR confidence
  low_conf:   boolean           // true when confidence < 0.90
}
```

### ProofCard
```typescript
{
  item:           string,
  your_value:     number,
  official_value: number,
  gap:            number,       // your_value - official_value
  status:         "gap" | "ok" | "unverified",
  source_anchor:  { ref: string, bbox?: [number,number,number,number], ocr_confidence?: number },
  rule_anchor:    { ref: string, url?: string },
  compute_anchor: string,       // e.g. "8500 - 6400"
  rule_says_plain: string       // human-readable citation
}
```

### HoldEvent
```typescript
{
  hold_id:          string,
  invoice_id:       string,
  amount:           number,
  status:           "staged" | "placed" | "released",
  reversible:       boolean,    // always true for placed holds
  expires_at:       string | null,  // ISO 8601; null for staged holds
  placed_by:        "auto" | "user",
  confidence_floor: number      // min OCR confidence across all gap cards
}
```

### AuditEvent
```typescript
{
  t:       "ocr" | "lookup" | "compare" | "prove" | "hold_placed" | "hold_staged"
         | "hold_released" | "draft" | "consent" | "error",
  run_id:  string,
  ts:      string,   // ISO 8601 timestamp
  payload: object    // step-specific data
}
```

---

## 4. Hold State Machine

```
                    ┌─────────────────────────────────┐
  POST /run         │                                 │
  (confFloor≥0.90)  │         PLACED (auto)           │
  ──────────────────►  status="placed"                │
                    │  placed_by="auto"               │
                    │  reversible=true                │
                    │  expires_at=<+72h ISO string>   │
                    └───┬──────────────┬──────────────┘
                        │              │
        POST /consent   │              │  POST /consent
        confirm_hold    │              │  withdraw_hold
                        ▼              ▼
               ┌────────────┐  ┌─────────────────┐
               │  PLACED     │  │    RELEASED      │
               │ (user tap)  │  │  status="released│
               │placed_by=   │  │                  │
               │  "user"     │  └─────────────────┘
               └────────────┘

                    ┌─────────────────────────────────┐
  POST /run         │                                 │
  (confFloor<0.90)  │         STAGED                  │
  ──────────────────►  status="staged"                │
                    │  expires_at=null                │
                    │  NOT in gateway                 │
                    └─────────────────────────────────┘
                         │
                         │  confirm_hold → 404 HOLD_NOT_FOUND
                         │  withdraw_hold → 404 HOLD_NOT_FOUND
                         │  send_letter → OK (audit only)
                         │
                         ▼
                    Show "Re-scan" prompt to user

  POST /run         ┌─────────────────────────────────┐
  (no gap cards)    │           null                  │
  ──────────────────►  hold = null                    │
                    │  No consent needed              │
                    └─────────────────────────────────┘

  Auto-expiry (72h) ──► status="released" (server-side tick)
```

**Rules for the UI:**

1. If `hold === null` → no overcharge detected. Disable all consent buttons.
2. If `hold.status === "staged"` → OCR confidence was too low. Show "Re-scan with a clearer image". Disable confirm/withdraw.
3. If `hold.status === "placed"` → show "Confirm Hold" and "Withdraw Hold" buttons.
4. If `hold.status === "released"` → hold already released. Show informational state only.
5. After any consent action, fetch `GET /audit/:run_id` to refresh the trail.

---

## 5. Bbox Coordinate Format

```
bbox = [x, y, width, height]   ← absolute PIXEL coordinates
```

- `x` — left edge of the field, in pixels from the left of the original image
- `y` — top edge of the field, in pixels from the top of the original image
- `width` — width of the bounding box in pixels
- `height` — height of the bounding box in pixels

**All values are ≥ 0. `width` and `height` are > 0. Values are < 4000px for standard images.**

**These are NOT normalized (0..1) coordinates.** If you receive values all ≤ 1.0, something has gone wrong in OCR — flag it.

**Scaling for canvas overlay:**
```javascript
const scaleX = canvasWidth  / imageNativeWidth;
const scaleY = canvasHeight / imageNativeHeight;

const rect = {
  x:      bbox[0] * scaleX,
  y:      bbox[1] * scaleY,
  width:  bbox[2] * scaleX,
  height: bbox[3] * scaleY,
};
```

---

## 6. Structured Error Codes

Every error response from the engine has **exactly this shape** — no exceptions:

```json
{
  "error":  "Human-readable message for logging",
  "code":   "MACHINE_READABLE_CODE",
  "status": 400
}
```

There is **never** a `stack` field. There is **never** HTML in the body.

| Code | HTTP | Trigger | UI action |
|------|------|---------|-----------|
| `INVALID_IMAGE` | 400 | `image` field missing, empty, or not a string | Show "Please select a valid image" |
| `INVALID_DOMAIN` | 400 | `domain` not `"bill"` or `"lease"` | Show "Invalid document type" |
| `INVALID_SEED` | 400 | Unknown `?seed=` value | Dev error — log it |
| `INVALID_REQUEST` | 400 | Malformed `/consent` body | Dev error — log it |
| `RUN_NOT_FOUND` | 404 | `run_id` has no audit trail (no prior `/run`) | Show "Session expired — please re-scan" |
| `HOLD_NOT_FOUND` | 404 | `hold_id` not in gateway (staged hold, wrong id, or already released) | Show "Re-scan with a clearer image" if staged; otherwise "Hold not found" |
| `IMAGE_TOO_LARGE` | 413 | Body > 10 MB | Show "Image too large — please use a smaller photo" |
| `OCR_TIMEOUT` | 504 | OCR step exceeded 15s timeout | Show "Analysis took too long — try a clearer image" |
| `STEP_TIMEOUT` | 504 | Any other pipeline step timeout | Show "Processing timed out — please try again" |
| `RULEBOOK_LOAD_ERROR` | 500 | Rulebook JSON could not be parsed | Show generic error; engine used stub fallback |
| `INTERNAL_ERROR` | 500 | Unhandled exception | Show "Something went wrong — please try again" |

---

## 7. What Vrajesh Must Handle

This is the exact switch Vrajesh's error handler must implement:

```typescript
async function callEngine(endpoint: string, body?: object) {
  const res = await fetch(`${BRAIN_URL}${endpoint}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    // Every error has { error, code, status } — branch on code, never on error text
    switch (data.code) {
      case "INVALID_IMAGE":      showToast("Please select a valid bill image.");         break;
      case "INVALID_DOMAIN":     showToast("Invalid document type.");                   break;
      case "INVALID_REQUEST":    console.error("Dev bug:", data.error);                 break;
      case "RUN_NOT_FOUND":      showToast("Session expired — please re-scan.");        break;
      case "HOLD_NOT_FOUND":     showToast("Re-scan with a clearer image.");            break;
      case "IMAGE_TOO_LARGE":    showToast("Image too large — use a smaller photo.");   break;
      case "OCR_TIMEOUT":        showToast("Analysis timed out — try a clearer image.");break;
      case "STEP_TIMEOUT":       showToast("Processing timed out — try again.");        break;
      case "RULEBOOK_LOAD_ERROR":
      case "INTERNAL_ERROR":     showToast("Something went wrong — please try again."); break;
      default:                   showToast("Unexpected error.");                        break;
    }
    return null;
  }

  return data;
}
```

**Hold rendering:**

```typescript
function renderHoldState(hold: HoldEvent | null) {
  if (hold === null)                return showCleanBillState();
  if (hold.status === "staged")     return showRescanPrompt();     // NOT in gateway
  if (hold.status === "placed")     return showConsentButtons(hold);
  if (hold.status === "released")   return showReleasedState(hold);
}
```

**Bbox overlay:**

```typescript
// After POST /run, for each extracted_field:
function drawBbox(ctx: CanvasRenderingContext2D, field: ExtractedField,
                  imgW: number, imgH: number, canvasW: number, canvasH: number) {
  const sx = canvasW / imgW;
  const sy = canvasH / imgH;
  ctx.strokeRect(
    field.bbox[0] * sx,
    field.bbox[1] * sy,
    field.bbox[2] * sx,
    field.bbox[3] * sy,
  );
}
```

---

*Last verified: `api_contract_verify.ts` — 601/601 assertions passing.*
*Engine frozen at `freeze-final-v1`. All changes to this document require a passing test update.*
