# PRAMAAN — Technical Reference (A-Z)
### The engineering bible · technologies, components, schemas, terminology
### HackVerse Track 3 · 2026

VERSION NOTE (read first): this document is the AUTHORITATIVE TECHNICAL
SPEC. The plain team doc (pramaan-team-doc.md) was written earlier and still
says "five steps" and "nothing blocked without your tap." The evolved design
— used here, in the traps doc, the sprint playbook, and the architecture —
is SIX steps (an ACT/hold step between PROVE and WAIT) and a PROVISIONAL,
REVERSIBLE, CONFIDENCE-GATED hold (permanent actions still need the tap).
Where this spec and the plain team doc disagree, THIS SPEC WINS. Update the
plain doc's section 4 and section 8 to match when you next re-export it.

---

## 1. System in one paragraph

Pramaan is a mobile-first evidence engine. A thin client (Ionic + Capacitor)
captures a document and renders a verdict; a cloud "brain" reads the
document, looks up the official rule for each line, computes the gap with
deterministic code, packages the gap as a three-anchor proof card, places a
provisional reversible hold on the disputed amount through an MCP tool, and
drafts a human-reviewed letter with Granite. The client never decides; the
brain never acts permanently without a logged human tap. The same pipeline
serves any document domain by swapping a curated, cited rule-book — the
"tree" architecture. The product's promise is "proof, not opinions": every
verdict is reproducible from two cited sources and one arithmetic
expression, and the system stays silent rather than guess.

---

## 2. Technology stack (layer -> tech -> role -> why)

| Layer | Technology | Role | Why this |
|---|---|---|---|
| Mobile client | Ionic + React (Ionic-React) | the 4-screen app | reuses the team's React skill; web tech that ships as a native app |
| Native runtime | Capacitor (+ @capacitor/camera) | real installable app + native camera | the product is a phone-at-the-counter gesture; Capacitor gives native camera from web code |
| Stage demo | `ionic serve` (browser build) | deterministic on-stage demo | same codebase, no emulator/camera risk; phone-frame in browser |
| Backend runtime | Node.js + TypeScript (Express/Fastify) | serves /run, /consent | one language across the monorepo; fast to wire |
| Orchestration | IBM watsonx Orchestrate / Agent Lab | chains the 6 steps as an agent flow | sponsor's agentic control plane; aligns with the cert labs |
| Vision / OCR | watsonx vision OR Tesseract/Google Vision (Ajit picks) | step 01 extraction + bbox + confidence | must return per-field bounding boxes + confidence; the bbox drives the overlay |
| Drafting LLM | IBM Granite (Granite-3.x Instruct) | step 06 wording only | open + sovereign + IBM bait; crucially it is walled off from the verdict |
| Tool protocol | MCP (Model Context Protocol) | tool discovery/calls (rule-book, hold) | 2026 standard; IBM watsonx.data ships a managed MCP server; strong judge bait |
| Governance | AgentOps / audit log | consent + audit trail | the trust story made observable; maps to IBM's governance push |
| Mock external system | in-memory billing gateway | the system the agent "acts on" | makes the ACT step real (state change) without a real hospital API |
| Shared types | JSON Schema -> generated TS (`packages/contracts`) | the schema-first contract | one source of truth app+brain both import |
| Rule data | versioned JSON (`packages/rulebooks`) | the curated official truth | human-curated, cited, reviewable in a diff |

---

## 3. Component catalog (responsibility / in / out / owner)

- Orchestrator (services/brain/pipeline/orchestrator.ts) — Murgesh.
  In: run request. Out: run_response. Wires 01..06, threads state, appends audit.
- Read step (01_read.ts) — Ajit. In: image|seed. Out: extracted_fields[].
- Lookup step (02_lookup.ts) — Murgesh. In: fields+domain. Out: field->rule map (via MCP).
- Compare step (03_compare.ts) — Murgesh. In: fields+rules. Out: gaps. DETERMINISTIC.
- Prove step (04_prove.ts) — Murgesh. In: gaps+anchors. Out: proof_cards[].
- Act step (05_act.ts) — Murgesh. In: cards+confidence. Out: hold event (via MCP).
- Draft step (06_draft.ts) — Ajit. In: cards+template. Out: draft (via Granite|fallback).
- MCP server (mcp/server.ts) — Murgesh. Exposes the four tools below.
- Billing gateway (gateway/billing_gateway.ts) — Murgesh. Mock stateful hold store.
- Audit log (audit/audit_log.ts) — Murgesh. Append-only event store.
- Data source (apps/mobile/src/data/dataSource.ts) — Vrajesh. mock|live switch.
- Screens (apps/mobile/src/screens/*) — Vrajesh. Render run_response; capture; tap.
- Camera lib (apps/mobile/src/lib/camera.ts) — Ajit. Capacitor camera + perms.
- Rule-books (packages/rulebooks/*) — Manas. Cited official values + plain lines.
- Templates (packages/templates/*) — Manas. Letter/notice wording with placeholders.

---

## 4. Data model (schemas, field by field)

### 4.1 ExtractedField (step 01 output)
    { text: string, value: number|null, unit: string|null,
      bbox: [x,y,w,h], confidence: number (0..1), low_conf: boolean }
  low_conf = confidence < THRESHOLD. The UI paints low_conf fields yellow.

### 4.2 RuleRow (what Manas fills; consumed by step 02)
  Bill row:
    { rule_id, domain:"bill", item_category, match_terms: string[],
      procedure_code: string, official_value: number, official_unit: string,
      official_source: string, official_source_url: string,
      rule_says_plain: string, severity: "high"|"medium",
      status: "VERIFIED"|"UNVERIFIED", notes: string }
  Lease row:
    { rule_id, domain:"lease", clause_type, match_terms: string[],
      legal_status: "illegal"|"risky"|"info", law_ref: string, law_ref_url: string,
      rule_says_plain: string, suggested_fix_plain: string,
      status: "VERIFIED"|"UNVERIFIED" }
  Only VERIFIED rows yield a numeric gap on screen. UNVERIFIED -> "unverified" card.

### 4.3 ProofCard (step 04 output; the moat)
    { item: string, your_value: number, official_value: number, gap: number,
      status: "gap"|"ok"|"unverified",
      source_anchor:  { ref: string, bbox?: [..], ocr_confidence?: number },
      rule_anchor:    { ref: string, url?: string },
      compute_anchor: string,            # e.g. "45000 - 18000"
      rule_says_plain: string }
  A card is trustworthy iff all three anchors are present (status != unverified).

### 4.4 HoldEvent (step 05 output)
    { hold_id: string, invoice_id: string, amount: number,
      status: "staged"|"placed"|"released",
      reversible: boolean, expires_at: string|null,
      placed_by: "auto"|"user", confidence_floor: number }
  "staged" = computed, not placed. "placed" by auto is provisional+reversible.

### 4.5 AuditEvent (appended by every step + consent)
    { t: "ocr"|"lookup"|"compare"|"prove"|"hold_placed"|"hold_staged"
        |"hold_released"|"draft"|"consent",
      run_id: string, ts: string, payload: object }
  Append-only. Never mutated. This is the governance artifact.

### 4.6 RunResponse (the boundary; see pipeline §1)
    { run_id, domain, extracted_fields[], proof_cards[], hold: HoldEvent|null,
      draft: { text, banner }, audit: AuditEvent[] }

---

## 5. Pipeline spec (technical, condensed)

See pramaan-pipeline.md for the narrative + diagrams. The invariants:
- Step 03 contains no language model call (verdict = arithmetic over cited numbers).
- Step 05 auto-places a hold ONLY when min confidence over gap cards >= THRESHOLD
  AND total disputed > 0; otherwise it stages. Auto holds are reversible + 72h.
- Step 06 model output is wording only; numbers in the draft come from proof cards.
- Every step appends an AuditEvent; the orchestrator never swallows a step error
  silently — a failed step yields a partial response with an audit "error" event
  and the affected cards marked "unverified".

---

## 6. MCP tool spec (signatures the agent calls)

    lookup_rule(domain: "bill"|"lease", text: string)
      -> RuleRow[]                      # matched by match_terms; [] if none
    place_hold(invoice_id: string, amount: number, evidence_pack_id: string)
      -> { hold_id, status:"placed", expires_at, reversible:true }
    get_hold_status(hold_id: string)
      -> HoldEvent
    release_hold(hold_id: string, reason: "auto_expiry"|"user_withdraw"|"confirmed_then_resolved")
      -> HoldEvent (status:"released")
  The rule-book is exposed THROUGH lookup_rule (not by the agent reading files),
  so the citation gate and versioning stay server-authoritative.

---

## 7. Trust & safety model (the five gates, named)

1. Confidence gate (step 01/05): per-field confidence; low_conf cannot auto-hold.
2. Anchor gate (step 04): no rule_anchor => "unverified", never "gap".
3. Consent gate (POST /consent): permanent actions (send letter, confirm hold,
   escalate) require an explicit, logged user tap.
4. Provisional-hold gate (step 05): auto-actions are reversible + time-boxed;
   they protect the user now and self-heal if unconfirmed.
5. Citation gate (process, Manas): no official_value ships without a source;
   enforced by review of packages/rulebooks diffs.
   Cross-cutting rule: SILENCE OVER A FALSE ALARM. When unsure at any gate,
   the system downgrades (yellow / unverified / staged) rather than asserts.

---

## 8. IBM stack mapping (for the proposal + code comments)

| Pramaan component | IBM component | Where in code |
|---|---|---|
| 6-step agent flow | watsonx Orchestrate / Agent Lab | pipeline/orchestrator.ts |
| Plain-language + draft | IBM Granite | steps/06_draft.ts |
| Tool calls (rule-book, hold) | MCP (watsonx.data managed server) | mcp/server.ts |
| Consent + audit + governance | AgentOps | audit/audit_log.ts + /consent |
| Native camera + app | (Capacitor; IBM-agnostic) | apps/mobile/src/lib/camera.ts |
Mention MCP + watsonx Orchestrate + Granite + AgentOps by name in the
proposal's Technical Stack; map each in code comments (playbook P6 task).

---

## 9. Terminology glossary (technical word -> meaning in Pramaan)

- Trunk: the shared 6-step pipeline (services/brain/pipeline). Built once.
- Branch / domain: a document type (bill, lease, ...) = a rule-book config.
- Grafting point: the three things a new domain supplies — what to read
  (match_terms/fields), the official rule (rule row), the plain wording
  (rule_says_plain / template).
- Evidence pack: the run_response's proof_cards + audit, addressable by
  evidence_pack_id; the artifact a forum/lawyer/pharmacist can check.
- 3-anchor proof: source_anchor + rule_anchor + compute_anchor; the
  reproducibility guarantee that distinguishes proof from opinion.
- Verdict: the gap/status on a card; produced by deterministic code only.
- Hold: a provisional freeze on a disputed amount in the (mock) billing
  system; the agent's real-world action.
- Staged vs placed: staged = computed, awaiting tap; placed = freeze active.
- Seeded mode: /run?seed=... returns a fixed payload; the deterministic demo.
- dataSource: the client-side mock|live switch (one env var).
- Citation gate: the rule that no number ships without a signed source.
- Confidence gate: the rule that low-confidence reads cannot auto-act.
- Consent gate: the rule that permanent actions need a logged tap.

---

## 10. Non-functional notes (the "works under pressure" properties)

- Determinism: seeded /run is byte-identical across runs (no timestamps in
  the seeded payload; audit ts fixed in seed). The live compare is pure.
- Idempotency of hold: place_hold on the same (invoice_id, evidence_pack_id)
  returns the existing hold_id, never a second freeze.
- Audit immutability: append-only; release/confirm are NEW events, not edits.
- Graceful degradation: Granite down -> template fallback; OCR low-conf ->
  yellow gate; rule missing -> unverified card. No path crashes the demo.
- No PII in aggregate: rule-books and templates contain no personal data;
  the user's extracted data stays in their run_response / device cache.
- Testability: each step is a function with a unit test (services/brain/tests);
  the pipeline has an e2e test on trap + control seeds. The freeze tag
  (playbook P8) requires these green.

---

## 11. How this spec relates to the other docs

- pramaan-team-doc.md      = the WHY, in plain words (for humans + judges).
- pramaan-sprint-playbook.md = the WHEN + WHO (the 36-hour plan).
- pramaan-traps.md          = the four pre-decided risk fixes.
- pramaan-repo-structure.md = the WHERE (folders + ownership).
- pramaan-pipeline.md       = the HOW-it-travels (data flow + contracts).
- THIS file                 = the WHAT-EXACTLY (tech + schemas + terms).
If two docs disagree, the order of authority for TECHNICAL facts is:
  THIS file > pipeline > repo-structure > playbook > traps > team-doc.
(The team-doc leads on NARRATIVE and PITCH wording, not on technical facts.)

Pramaan · Technical Reference · HackVerse Track 3
Vrajesh · Murgesh · Ajit · Manas — one trunk, many branches, one contract.