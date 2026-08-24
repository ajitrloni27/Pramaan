# Trunk Advancements Plan (M-ADV-1 → M-ADV-5)

> Owner: Murgesh (TRUNK) · HackVerse sprint · Engine is FROZEN — only additive changes.

---

## Top-Level Overview

Five tasks add production-readiness signals and jury Q&A depth on top of the frozen engine:

1. **M-ADV-1** — A new file `real_billing_gateway.ts` that mirrors `BillingGateway` but uses `fetch()`. Not wired in.
2. **M-ADV-2** — A `GET /audit/:run_id` endpoint on `index.ts` that exposes `auditLog.list(run_id)`.
3. **M-ADV-3** — A documented Debug Skill trace in `ARCHITECTURE.md` (no permanent code change; THRESHOLD reverts to 0.90).
4. **M-ADV-4** — A "Production Path" narrative section appended to `ARCHITECTURE.md`.
5. **M-ADV-5** — Compile + runtime stability re-check, 17-point self-check table.

**Hard rules in effect:**
- Never wire `RealBillingGateway` into the orchestrator.
- Never permanently change THRESHOLD.
- Never modify frozen files (orchestrator.ts, 02–05 steps, confidence.ts, contracts).
- Never touch Ajit's seam bodies in 01_read.ts / 06_draft.ts.
- `npx tsc --noEmit` must pass after every task.

---

## Sub-Task M-ADV-1: RealBillingGateway Adapter

**Status:** [ ] pending

### Intent
Create a production-swap adapter at `services/brain/src/gateway/real_billing_gateway.ts` that implements the identical class shape as `BillingGateway` but routes each method through `fetch()` against a placeholder REST API. It is never imported by any engine file — it exists purely to demonstrate the one-line production swap to judges.

### Relevant Context
- **Existing class to mirror:** [`services/brain/src/gateway/billing_gateway.ts`](services/brain/src/gateway/billing_gateway.ts)
  - Methods: `placeHold(invoice_id, amount, pack_id, confidence_floor)`, `getStatus(hold_id)`, `release(hold_id, reason)`, `confirm(hold_id)`, `tick(now)`
  - Idempotency map pattern: `"${invoice_id}::${pack_id}"` → `hold_id`
  - Import: `import type { HoldEvent } from "@pramaan/contracts"`
- **HoldEvent shape** (from `packages/contracts/types.ts`):
  ```
  hold_id, invoice_id, amount, status, reversible, expires_at, placed_by, confidence_floor
  ```
- **TypeScript config:** `module: "node16"`, `skipLibCheck: true`, `lib: ["ES2022"]` (no DOM).
  - `fetch` is available at runtime in Node 18+ but TypeScript won't resolve its types without DOM lib.
  - Solution: use `(globalThis as any).fetch(...)` — compiles cleanly under strict mode, zero new dependencies, no lib change.
- **Placeholder API:** `https://jsonplaceholder.typicode.com/posts` (returns `{ id: number, ... }`)

### Expected Outcomes
- File `services/brain/src/gateway/real_billing_gateway.ts` exists.
- Exports class `RealBillingGateway` and a singleton `realBillingGateway`.
- Has the production-swap comment at the top.
- `npx tsc --noEmit` passes (zero errors).
- Orchestrator still imports only `billingGateway` from `billing_gateway.ts`.

### Todo List
1. Create `services/brain/src/gateway/real_billing_gateway.ts`.
2. Add the production-swap banner comment: `// PRODUCTION ADAPTER — swap BillingGateway for RealBillingGateway in orchestrator to go live. One-line change.`
3. Import `HoldEvent` from `@pramaan/contracts` only.
4. Declare `private idempotencyKeys = new Map<string, string>()` for client-side idempotency (same key pattern as mock).
5. Implement `placeHold`: check idempotency key; if not present, call `(globalThis as any).fetch("https://jsonplaceholder.typicode.com/posts", { method: "POST", ... })` with body `{ invoice_id, amount, pack_id }`; map response `id` to `hold_id`; build and return `HoldEvent`.
6. Implement `getStatus`: `(globalThis as any).fetch("https://jsonplaceholder.typicode.com/posts/{hold_id}")` GET; map to `HoldEvent`.
7. Implement `release`: `(globalThis as any).fetch(...)` DELETE; return `HoldEvent` with `status: "released"`.
8. Implement `confirm`: `(globalThis as any).fetch(...)` PATCH; return `HoldEvent` with `placed_by: "user"`.
9. Implement `tick(_now: Date): void` as no-op with comment explaining real API handles expiry server-side.
10. Export `class RealBillingGateway` and `const realBillingGateway = new RealBillingGateway()`.
11. Run `npx tsc --noEmit` and confirm zero errors.
12. Commit: `feat(gateway): real billing gateway adapter (production swap pattern)`

---

## Sub-Task M-ADV-2: GET /audit/:run_id Endpoint

**Status:** [ ] pending

### Intent
Add a single route to `services/brain/src/index.ts` that exposes the full governance trail for any `run_id` as an ordered JSON array. Compliance officers or judges can inspect every state-machine transition for a given run.

### Relevant Context
- **Target file:** [`services/brain/src/index.ts`](services/brain/src/index.ts)
- `auditLog` is already imported on line 6: `import { auditLog } from "./audit/audit_log.js"`
- `auditLog.list(run_id)` already exists in `audit_log.ts` — it filters the append-only `_log` array by `run_id` and returns `AuditEvent[]`.
- New route goes **before** the global error handler (line 167).
- No new imports needed.
- Existing API table in `ARCHITECTURE.md` will be updated in M-ADV-4 (or can be noted here).

### Expected Outcomes
- `GET /audit/demo-trap-001` returns a JSON array of `AuditEvent` objects ordered by insertion (append-only log).
- Empty array `[]` returned for an unknown `run_id` (not a 404 — that is the correct behavior for an audit query).
- `npx tsc --noEmit` passes.

### Todo List
1. Open `services/brain/src/index.ts`.
2. Insert new route block after the `POST /consent` handler and before the global error handler:
   ```
   // ── GET /audit/:run_id ───────────────────────────────────────────────────────
   app.get("/audit/:run_id", (req: Request, res: Response) => {
     const { run_id } = req.params;
     res.json(auditLog.list(run_id));
   });
   ```
3. Run `npx tsc --noEmit` — zero errors.
4. Commit: `feat(http): GET /audit/:run_id export endpoint`

---

## Sub-Task M-ADV-3: Debug Skill Demo Trace

**Status:** [ ] pending

### Intent
Document in `ARCHITECTURE.md` the exact Debug Skill trace that demonstrates how the confidence threshold drives the STAGED vs PLACED branch. This is a documentation-only task. The THRESHOLD is temporarily changed, the behavior is observed (traced mentally / logged), then reverted — the document records the finding.

### Relevant Context
- **`confidence.ts`** (line 3): `export const THRESHOLD = 0.90;` — this is a **frozen file**; it MUST revert to 0.90 before commit.
- **`05_act.ts`** (line 47): `if (confFloor >= THRESHOLD)` — this is the exact comparison line.
- **`ARCHITECTURE.md`** — append new `## Debug Skill Demo (IBM Bob)` section before the final footer line.
- The trace text is fully prescribed in the task spec.

### Expected Outcomes
- `ARCHITECTURE.md` contains section `## Debug Skill Demo (IBM Bob)` with the prescribed text.
- `confidence.ts` THRESHOLD = 0.90 (unchanged, reverted if ever touched).
- `npx tsc --noEmit` passes.

### Todo List
1. Read `services/brain/src/pipeline/confidence.ts` — confirm THRESHOLD = 0.90 (no change needed).
2. Read `services/brain/src/pipeline/steps/05_act.ts` — confirm line 47 `if (confFloor >= THRESHOLD)`.
3. Append the following section to `ARCHITECTURE.md` (before the final `*Development process…*` footer):
   ```markdown
   ## Debug Skill Demo (IBM Bob)

   When tuning the safety valve, we used IBM Bob's Debug Skill to trace the state machine transition.
   Changing THRESHOLD from 0.90 to 0.99 caused a 0.97-confidence gap to stage instead of place.
   Bob's trace showed the exact line in 05_act.ts where confFloor was compared against THRESHOLD.
   This is how we verified the two-tier hold logic during development.
   ```
4. Run `npx tsc --noEmit` — zero errors.
5. Commit: `docs: debug skill demo trace in ARCHITECTURE.md`

---

## Sub-Task M-ADV-4: Production Path Q&A Narrative

**Status:** [ ] pending

### Intent
Add a `## Production Path (Post-Hackathon)` section to `ARCHITECTURE.md` that gives judges and compliance reviewers a clear path from the sprint demo to a production deployment. Emphasises the decoupled architecture and the one-line gateway swap.

### Relevant Context
- **`ARCHITECTURE.md`** — append after the Debug Skill Demo section (M-ADV-3) and before the footer.
- The section content is fully prescribed in the task spec.
- Also update the **API Surface** table in `ARCHITECTURE.md` to include the new `GET /audit/:run_id` route added in M-ADV-2.

### Expected Outcomes
- `ARCHITECTURE.md` contains `## Production Path (Post-Hackathon)` section with all five bullet points.
- API Surface table includes the `/audit/:run_id` row.
- `npx tsc --noEmit` passes (documentation-only change).

### Todo List
1. Open `ARCHITECTURE.md`.
2. Update the API Surface table to add: `| GET | /audit/:run_id | Governance trail export. Returns ordered AuditEvent array for the given run_id. |`
3. Append section after the Debug Skill Demo section:
   ```markdown
   ## Production Path (Post-Hackathon)

   - The billing gateway is a mock for the sprint. Real hospital APIs are out of scope for 36 hours.
   - But the action is real: the agent mutates external state through MCP, which is the production pattern.
   - To go live: (1) Replace BillingGateway with RealBillingGateway in orchestrator.ts (one line),
     (2) Set BILLING_GATEWAY_URL to the real hospital API endpoint,
     (3) Add authentication headers in real_billing_gateway.ts.
   - The engine does not change. The 6-step trunk, the deterministic compare, the two-tier hold —
     all remain identical. Only the gateway adapter swaps.
   - This is the decoupled architecture: the verdict engine is independent of the billing backend.
   ```
4. Run `npx tsc --noEmit` — zero errors.
5. Commit: `docs: production path narrative in ARCHITECTURE.md`

---

## Sub-Task M-ADV-5: Final Stability Re-Check

**Status:** [ ] pending

### Intent
Verify that all four advancements compile cleanly, do not break existing behavior, and that the 17-point self-check passes in full.

### Relevant Context
- Frozen engine files unchanged; only additive files/routes/docs touched.
- `RealBillingGateway` is in `gateway/` but never imported by orchestrator.
- `auditLog.list()` was already implemented and tested.
- Seed byte-identity relies on `FIXED_*` constants and step 02–05 determinism — not touched.

### Expected Outcomes
The following 17-point self-check passes:

| # | Check | Expected |
|---|---|---|
| 1 | `npx tsc --noEmit` | Zero errors |
| 2 | `GET /health` | `{ ok: true }` |
| 3 | `POST /run` — valid bill image | 200, RunResponse |
| 4 | `POST /run` — valid lease image | 200, RunResponse |
| 5 | `POST /run` — missing image field | 400 |
| 6 | `POST /run` — missing domain field | 400 |
| 7 | `POST /run` — invalid domain | 400 |
| 8 | `POST /run` — malformed JSON | 400 |
| 9 | `POST /run` — empty body | 400 |
| 10 | `POST /run` — oversized (>10MB) | 413 or 400 |
| 11 | `GET /run?seed=trap` | Byte-identical RunResponse (FIXED_RUN_ID) |
| 12 | `GET /run?seed=trap` (second run) | Same byte-identical response |
| 13 | `GET /run?seed=control` | hold: null, clean bill draft |
| 14 | `GET /audit/demo-trap-001` | JSON array (may be empty before a /run) |
| 15 | `POST /consent` confirm_hold | 404 if hold not found (correct) |
| 16 | Orchestrator imports `billingGateway` only | `grep realBillingGateway orchestrator.ts` → no match |
| 17 | `RealBillingGateway` file exists and compiles | `tsc --noEmit` passes, file present |

### Todo List
1. Run `npx tsc --noEmit` from `services/brain/` — confirm zero errors.
2. Verify `services/brain/src/pipeline/orchestrator.ts` does NOT import `real_billing_gateway`.
3. Verify `services/brain/src/gateway/real_billing_gateway.ts` exists.
4. Confirm `ARCHITECTURE.md` contains both new sections.
5. Confirm `confidence.ts` THRESHOLD is still 0.90.
6. Report the 17-point self-check table with PASS/FAIL for each row.
7. Final commit (if any cleanup needed): `docs(trunk): M-ADV-5 stability verified`

---

*Plan written by IBM Bob (AI SDLC Partner) · Murgesh TRUNK lane · HackVerse 2026*
