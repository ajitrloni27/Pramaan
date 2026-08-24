# MURGESH — TRUNK
### Technical Co-Lead · The Engine · Pramaan · HackVerse Track 3
### Team: Vrajesh (Lead/BARK) · Murgesh (Tech Co-Lead/TRUNK) · Ajit (SAP) · Manas (ROOTS)

Read this top to bottom once. Then keep it open while you build.
Everything you produce is described with its exact shape — endpoint
contracts, function signatures, JSON schemas, the hold state machine —
so there is never a "what exactly do I build?" moment. You are the engine
builder; this is written in your language.

---

## 0. Read this first — why your seat is load-bearing

The screen Vrajesh builds is a RENDERER. It shows whatever you return.
The verdict — was this person overcharged, by how much, against what rule,
is the money frozen — is computed by YOUR code. If your compare is wrong,
the card is wrong, and the entire "proof, not opinions" promise collapses
on stage. If your hold doesn't fire, the product is "just a mail-merge"
and we lose the agentic story. If your schemas drift from Vrajesh's screen,
the merge at P3 breaks silently and we burn the sprint.

You are not "the backend guy." You are the person who makes the verdict
TRUE and the action REAL. The screen makes it visible; you make it correct.
Own that.

---

## 1. Your role in one line, and in the tree

One line: You build the trunk — the six-step engine that reads a document,
proves the gap, freezes the money, and drafts the letter — and you publish
the contract the whole team builds against.

In the tree: the trunk is the engine every branch reuses. The bill and the
lease are configs (rule-books) that flow through YOUR pipeline unchanged.
You build it once; it serves every domain forever. If anyone tries to copy
your pipeline for the lease, stop them — the lease is a rule-book swap, not
a second engine (playbook rule #10). You are the guardian of the trunk.

---

## 2. The co-lead contract — how you and Vrajesh work

You are the TECHNICAL CO-LEAD. Here is exactly what that means:

- Vrajesh holds the FINAL CALL on direction, product, the screen, and the
  pitch. You own the ENGINE IMPLEMENTATION — the how.
- Your job INCLUDES pushing back on technical calls. Before you build
  something Vrajesh specced, if you think the call is wrong, SAY SO. He
  wants your "why?" on the engine, the schemas, and the MCP layer. That is
  not insubordination; it is the technical safety net for the whole team.
  On a technical-implementation disagreement, your view carries real weight.
- Once you two are aligned, you own the build end-to-end and the team
  commits. No re-litigating after the decision.
- The two daily syncs (phase start + a mid sync, 10 min each) are for
  ALIGNMENT, not negotiation: you keep the engine and the screen in
  lockstep. Decisions are already made; the sync just prevents drift.
- SCHEMA-FIRST (playbook rule #1): you freeze the three schemas in P1.
  Vrajesh builds the screen against a MOCK from P1. The schema is the
  contract. Changing a field after P1 needs a 2-min V-M sync, never a
  surprise — because a schema change is a contract change, and contract
  changes are the #1 merge risk.
- You are the ONLY person who merges into services/brain. A PR that touches
  packages/contracts needs you AND whoever consumes the changed field
  (usually Vrajesh).

The practical tip: Vrajesh leads by giving you the WHAT and the WHY. When
he delegates, make sure you understand the WHY before you build — you
execute faster and better when you understand the reasoning, and you've
said so yourself. If the WHY isn't clear, ask. That's the system working.

---

## 3. What you own (the complete list)

Folders (you are the sole merger here):
- services/brain/**                  — the entire engine
- packages/contracts/**              — the schemas (you PUBLISH; all consume)

Artifacts you build:
- The HTTP surface: POST /run, GET /run?seed=trap, POST /consent
- The orchestrator (watsonx Orchestrate flow wiring the 6 steps)
- Step 02 LOOKUP, 03 COMPARE, 04 PROVE, 05 ACT (you implement these four)
- Step 01 READ and 06 DRAFT — you define the I/O contract + file skeleton;
  Ajit implements the model calls inside them (see §4)
- The MCP server + four tools (lookup_rule, place_hold, get_hold_status,
  release_hold)
- The mock Billing Gateway (stateful hold store)
- The append-only audit log
- The seeded-mode payload (seeds/trap.ts) for the deterministic demo
- The three JSON schemas in packages/contracts + generated TS types
- The one-page IBM-stack architecture note (P6)
- The "how the verdict is grounded" Q&A paragraph (P8)

You do NOT own (boundaries — §14): the screens/components (Vrajesh), the
OCR model call + Granite model call (Ajit implements; you wire), the
rule-book content + templates (Manas).

---

## 4. The six steps — which you implement vs which you wire

The trunk is six files in services/brain/pipeline/steps, in order. You own
the orchestrator that threads state through all six. You IMPLEMENT four of
them; you DEFINE THE CONTRACT for the other two and Ajit fills the model
call. This is the clean split that removes your only overlap with Ajit.

| Step | File | Who implements the body | You do |
|---|---|---|---|
| 01 READ | 01_read.ts | Ajit (OCR/vision call) | define I/O: (image? \| seed?) -> ExtractedField[]; wire into orchestrator |
| 02 LOOKUP | 02_lookup.ts | YOU | MCP lookup_rule -> field->rule map |
| 03 COMPARE | 03_compare.ts | YOU | DETERMINISTIC subtract -> gaps (NO LLM) |
| 04 PROVE | 04_prove.ts | YOU | assemble 3-anchor proof cards |
| 05 ACT | 05_act.ts | YOU | MCP place_hold (two-tier) \| stage |
| 06 DRAFT | 06_draft.ts | Ajit (Granite call + fallback) | define I/O: (cards, hold, template) -> Draft; wire into orchestrator |

The rule for 01 and 06: you write the function signature, the input/output
types (from packages/contracts), and a stub that returns a fixed value.
Ajit replaces the stub body with the real model call. The orchestrator
never knows or cares whether the body is a stub or a model — it just calls
the function. That is why the merge is clean: you and Ajit never edit the
same lines.

---

## 5. The artifacts, exactly (shapes you build to)

### 5.1 The HTTP surface (services/brain/src/index.ts)

    POST /run
      req:  { image: string, domain: "bill" | "lease" }
      res:  RunResponse                      # live path (PATH A)

    GET  /run?seed=trap&domain=bill
      res:  RunResponse                      # seeded path (PATH B) — byte-identical every call

    POST /consent
      req:  { run_id: string, action: "confirm_hold" | "withdraw_hold" | "send_letter" }
      res:  { audit: AuditEvent }            # appends a consent event; mutates hold if relevant

The app renders RunResponse verbatim. It never recomputes gaps, never
decides hold status, never rewrites the draft. You are authoritative.

### 5.2 The orchestrator (pipeline/orchestrator.ts)

    orchestrate(req: RunRequest): Promise<RunResponse>
      // watsonx Orchestrate flow:
      //   state = {}
      //   state.fields  = await read(req)            # 01 (Ajit's body)
      //   state.rules   = await lookup(state.fields, req.domain)   # 02
      //   state.gaps    = compare(state.fields, state.rules)       # 03  (pure)
      //   state.cards   = prove(state.gaps, state.fields, state.rules)  # 04
      //   state.hold    = await act(state.cards)     # 05
      //   state.draft   = await draft(state.cards, state.hold, template) # 06 (Ajit's body)
      //   append an AuditEvent after EACH step
      //   return { run_id, domain, ...state, audit }
      // On any step error: do NOT crash. Append an audit "error" event,
      //   mark affected cards "unverified", return a partial RunResponse.

Each step is a pure-ish function: (input state) -> (input state + its
output). A step never reaches into an earlier step's internals; it reads
the accumulated state. That is what makes the trunk re-runnable and
testable per step (and what makes the seeded path trivial).

### 5.3 Step 02 LOOKUP (02_lookup.ts)

    lookup(fields: ExtractedField[], domain: Domain): Promise<Map<fieldId, RuleRow>>
      // for each field: call MCP lookup_rule(domain, field.text)
      // returns matched rule row(s) by match_terms; [] if none
      // a field with no match is NOT an error — it simply produces no card
      //   (silence over a false alarm)

### 5.4 Step 03 COMPARE (03_compare.ts) — THE HALLUCINATION DEFENSE

    compare(fields: ExtractedField[], rules: Map<fieldId, RuleRow>): CompareResult[]
      // CompareResult = { field, your_value, official_value, gap, status }
      // gap = your_value - official_value, NORMALIZED to the same unit
      //   (per-tablet vs per-tablet, per-scan vs per-scan — NEVER per-tablet
      //    vs line-total). Use official_unit to normalize.
      // status = "gap" if gap > tolerance else "ok"
      // if the matched rule.status == "UNVERIFIED" -> status = "unverified"

    THIS FUNCTION CONTAINS NO LANGUAGE MODEL CALL. The verdict is arithmetic
    over cited numbers. This is Truth 2 made structural: the model is
    physically not in the verdict path. Guard this in code review — if
    anyone suggests "let the LLM decide the gap," the answer is no.

### 5.5 Step 04 PROVE (04_prove.ts)

    prove(compares: CompareResult[], fields, rules): ProofCard[]
      // each card carries the THREE anchors:
      //   source_anchor  = { ref: "bill line N", bbox, ocr_confidence }
      //   rule_anchor    = { ref: rule.official_source, url }
      //   compute_anchor = the literal expression, e.g. "45000 - 18000"
      // plus rule_says_plain (Manas's human line)
      // a card with a missing rule_anchor is emitted status "unverified",
      //   NEVER "gap". No anchor -> no accusation.

### 5.6 Step 05 ACT (05_act.ts) — THE AGENTIC STEP (two-tier)

    act(cards: ProofCard[]): Promise<HoldEvent | null>
      const gapCards = cards.filter(c => c.status === "gap" && !c.low_conf)
      const totalDisputed = sum(gapCards.map(c => c.gap))
      const confFloor = min(gapCards.map(c => c.source_anchor.ocr_confidence))

      if (totalDisputed <= 0) return null
      if (confFloor >= THRESHOLD) {           # default THRESHOLD = 0.90
        return await mcp.place_hold(invoice_id, totalDisputed, evidence_pack_id)
        // -> { status: "placed", reversible: true, expires_at: +72h }
      } else {
        return { status: "staged", amount: totalDisputed, ... }  # computed, NOT placed
      }

    The auto-action is PROVISIONAL + REVERSIBLE + HIGH-CONFIDENCE ONLY. A
    misread can at worst stage a hold (nothing freezes) or place a 72h hold
    that auto-releases. Permanent consequences never happen without the tap
    (POST /consent). This is the trust model in code — do not weaken it.

### 5.7 The MCP server + tools (mcp/server.ts, mcp/tools/*)

    lookup_rule(domain: "bill"|"lease", text: string): RuleRow[]
    place_hold(invoice_id: string, amount: number, evidence_pack_id: string):
        { hold_id, status: "placed", expires_at, reversible: true }
    get_hold_status(hold_id: string): HoldEvent
    release_hold(hold_id: string,
        reason: "auto_expiry"|"user_withdraw"|"confirmed_then_resolved"): HoldEvent

    The rule-book is exposed THROUGH lookup_rule, not by the agent reading
    files. That keeps the citation gate + versioning server-authoritative
    (Manas's integrity layer cannot be bypassed on-device).

### 5.8 The mock Billing Gateway (gateway/billing_gateway.ts)

    class BillingGateway {
      holds: Map<hold_id, HoldEvent>           # in-memory state
      placeHold(invoice_id, amount, pack_id): HoldEvent
        // IDEMPOTENT: same (invoice_id, pack_id) returns the existing
        //   hold_id, never a second freeze.
      getStatus(hold_id): HoldEvent
      release(hold_id, reason): HoldEvent
      tick(now): void                          # simulate 72h auto-release
    }

    This mock IS the system for the sprint. There is no real hospital API.
    Real integrations are post-hackathon. The mock makes the ACT step REAL
    (it mutates state) without a real API — that is what makes us "agentic,"
    not a mail-merge (Trap 2 fix).

### 5.9 The audit log (audit/audit_log.ts)

    append(event: AuditEvent): void            # append-only; NEVER update/delete
    list(run_id: string): AuditEvent[]

    Every step appends; /consent appends. Immutability is by design — a
    release/confirm is a NEW event, not an edit. This is the governance
    artifact (AgentOps story) and the answer to "did the agent act on its
    own?": the trail shows exactly what was auto vs what was tapped.

### 5.10 Seeded mode (seeds/trap.ts)

    GET /run?seed=trap short-circuits step 01 (loads pre-extracted fields
    from data/samples/trap) and returns a FIXED hold + draft. No timestamps
    in the seeded payload (audit ts fixed in the seed) so the response is
    byte-identical across runs. This is the deterministic stage demo
    (playbook rule #6). Vrajesh gives you the seed spec in P7; you make
    /run?seed=trap return exactly the planted result.

---

## 6. The schemas you publish (packages/contracts) — freeze these in P1

These are the contract. Vrajesh's screen and your engine both import the
generated TS types from here. Publish them in P1 and FREEZE them. Field
names below are authoritative (from the technical reference §4).

ExtractedField (step 01 output):
    { text: string, value: number|null, unit: string|null,
      bbox: [x,y,w,h], confidence: number(0..1), low_conf: boolean }

RuleRow (what Manas fills; consumed by step 02):
    bill:  { rule_id, domain:"bill", item_category, match_terms: string[],
             procedure_code, official_value: number, official_unit: string,
             official_source, official_source_url, rule_says_plain,
             severity:"high"|"medium", status:"VERIFIED"|"UNVERIFIED", notes }
    lease: { rule_id, domain:"lease", clause_type, match_terms: string[],
             legal_status:"illegal"|"risky"|"info", law_ref, law_ref_url,
             rule_says_plain, suggested_fix_plain, status:"VERIFIED"|"UNVERIFIED" }

ProofCard (step 04 output — the moat):
    { item, your_value, official_value, gap, status:"gap"|"ok"|"unverified",
      source_anchor: { ref, bbox?, ocr_confidence? },
      rule_anchor:   { ref, url? },
      compute_anchor: string,           # e.g. "45000 - 18000"
      rule_says_plain: string }

HoldEvent (step 05 output):
    { hold_id, invoice_id, amount, status:"staged"|"placed"|"released",
      reversible: boolean, expires_at: string|null,
      placed_by:"auto"|"user", confidence_floor: number }

AuditEvent (appended by every step + consent):
    { t: "ocr"|"lookup"|"compare"|"prove"|"hold_placed"|"hold_staged"
        |"hold_released"|"draft"|"consent"|"error",
      run_id, ts, payload: object }

RunResponse (the boundary):
    { run_id, domain, extracted_fields[], proof_cards[],
      hold: HoldEvent|null, draft: { text, banner }, audit: AuditEvent[] }

Also publish rule_row.schema.json and a generated types.ts. If you ever
feel like inlining a type in the app or the brain, STOP — add it here and
import it (repo-structure §3).

---

## 7. The hold state machine (the only way hold.status changes)

    (no disputed $)                          -> hold = null

    high-conf gap $ present
        -> auto-place (conf >= THRESHOLD)    -> PLACED (provisional, reversible, +72h)
        -> conf < THRESHOLD                  -> STAGED (computed, not placed)

    STAGED  --human tap (POST /consent confirm)-->  PLACED (permanent-ish)
    STAGED  --no tap----------------------------->  (stays a draft only)
    PLACED  --72h, no confirm------------------>  RELEASED (auto_expiry)
    PLACED  --tap "confirm"-------------------->  PLACED (permanent-ish)
    PLACED  --tap "withdraw" / release_hold---->  RELEASED

Every transition writes an audit event. The mock gateway holds the state;
get_hold_status reads it. On stage, the seeded path returns a pre-baked
"placed" hold so Vrajesh's chip animates deterministically.

---

## 8. The "why" behind the key decisions (so you can push back intelligently)

You will want to know WHY before you build, and you should challenge any of
these if you think they're wrong — that's your job. Here's the reasoning:

- Why COMPARE is deterministic (no LLM): the verdict must be reproducible
  and non-hallucinating. Arithmetic over cited numbers cannot be wrong if
  the inputs are right. Putting a model in the verdict path would let it
  "think" a gap that isn't there — the exact thing we promised never to do.
  This is the structural hallucination defense. (If you see a faster way to
  keep it deterministic, propose it — but it must stay model-free.)
- Why the HOLD is two-tier (placed vs staged): an autonomous action must be
  safe. A misread number must not freeze a legitimate invoice. Provisional
  + reversible + high-confidence means the worst case is a staged hold
  (nothing freezes) or a 72h hold that self-heals. Permanent consequences
  need the tap. This is the trust model; do not weaken it for "cool factor."
- Why MCP (not direct function calls): MCP is the 2026 tool-discovery
  standard, IBM watsonx.data ships a managed MCP server (strong judge bait),
  and it cleanly separates the agent (orchestrator) from the tools (rule-book,
  gateway) — which is what keeps the rule-book server-authoritative and the
  citation gate intact.
- Why FREEZE the schemas in P1: the schema is the contract between your
  engine and Vrajesh's screen. If it drifts, the P3 merge breaks silently.
  Freezing it lets Vrajesh build against a mock from P1 — frontend never
  blocks on backend. This is the single most important scheduling decision
  in the sprint.
- Why SEEDED mode: the demo must be deterministic. /run?seed=trap returns a
  fixed payload so the stage flow never gambles on live OCR/LLM/network in
  the 90 seconds. Live calls happen in the build; the demo is a rehearsed
  script.
- Why a MOCK gateway (not a real hospital API): real integrations are out of
  scope for 36h and would eat the sprint. The mock makes the ACT step real
  (state change) and demoable, honestly. We narrate real integrations as the
  production path in Q&A.

---

## 9. Your timeline — step by step

### PRE-SPRINT (this week -> 31 Jul)

Do these NOW so the sprint is "freeze and build," not "invent under pressure."

1. Complete the IBM GLE course "Future Forward: AI for Innovation" and get
   YOUR completion certificate. (All four members must do this; yours goes
   in the PPT. This is a Round-1 requirement, separate from the Agent Lab /
   RAG labs.)
2. C7 — Scaffold the repo with Vrajesh: monorepo workspaces (apps/*,
   packages/*, services/*), tsconfig.base, .env.example (RUN_MODE, IBM
   creds, THRESHOLD). Confirm you and Vrajesh can both push. (Green when:
   empty repo, both can push.)
3. C5 — DRAFT the three schemas (proof-card, hold-event, audit-log) + the
   RunResponse + RuleRow shapes in packages/contracts, even if rough. (Green
   when: 3+ schema files exist.) Drafting them now means P1 is just "freeze,"
   not "invent from scratch."
4. Confirm IBM / watsonx creds + Agent Lab access work (a hello-world agent
   runs). Do this early — credential issues are the classic Day-1 time sink.
5. Read Manas's rule-book shape (RuleRow above) so your compare engine and
   lookup tool match what he'll fill. Agree the match_terms convention with
   him (his lever for matching).

### BY 7 AUG (day before the sprint)

6. Repo scaffolded + schemas drafted + IBM creds confirmed (above) DONE.
7. Mentally walk the six steps against the seeded trap bill so P2/P3 are
   execution, not design.

### SPRINT DAY 1 (8 Aug)

P0 (09:00-10:30): Repo + envs + IBM/watsonx creds on the venue wifi; confirm
  Agent Lab access; a hello-world agent runs. You BLOCK Vrajesh and Ajit
  until this is green — prioritize it.
P1 (10:30-11:30): PUBLISH + FREEZE the three schemas in packages/contracts.
  Notify Vrajesh. This is the contract; after this, changes need a V-M sync.
  (Done when: schema files committed, V notified.)
P1 (11:30-13:00): Stand up the mock Billing Gateway API: place_hold /
  get_hold_status / release_hold. (Done when: curl returns 200 + hold_id.)
P2 (13:45-16:00): Build the COMPARE engine — deterministic: load Manas's
  rule-book JSON, subtract like-for-like, emit gaps. (Done when: given a
  bill JSON + rule-book, returns proof-card-ready gaps. BLOCKED-BY Manas's
  rule-book — if it's late, build against a hardcoded 3-row rule-book and
  swap later; do not sit idle.)
P2 (16:00-18:00): Wrap the gateway as MCP tools (place_hold, get_hold_status,
  release_hold, lookup_rule). (Done when: an agent can call the tools via MCP.)
P3 (18:00-20:30): Build the ORCHESTRATION pipeline on watsonx Orchestrate:
  read -> compare -> prove -> ACT -> wait, threading state, appending audit.
  (Done when: pipeline returns proof cards + triggers a hold. BLOCKED-BY
  Ajit's OCR output for step 01 — use a stub for 01 until his is ready.)
  SYNC with Vrajesh at 18:00 and 20:30 (keep engine + screen aligned).
P3 (20:30-22:00): Provisional hold logic: auto-place on conf >= THRESHOLD;
  72h auto-release timer; low-conf -> staged not placed. (Done when: hold
  auto-places + shows expiry; low-conf stages.)
P4 (22:00-23:30): Audit-log writer: append every event (ocr, lookup, gap,
  hold, tap). (Done when: audit API returns an ordered trail.)
P4 (22:30-24:00): Expose a /run endpoint Vrajesh can call for the full flow.
  All-hands 23:30. (Done when: /run returns the full RunResponse. You BLOCK
  Vrajesh's P4 until this works.) Laptops closed by 00:30 — SLEEP.

### SPRINT DAY 2 (9 Aug)

P5 (07:00-10:00): Make ACT REAL: the hold actually mutates gateway state;
  get_hold_status reflects it; release works. (Done when: status flips
  placed -> released correctly.) SYNC with Vrajesh 07:30.
P5 (10:00-12:00): LEASE path on the SAME pipeline — rule-book swap only, NO
  engine copy. (Done when: /run with domain=lease returns clause cards.
  BLOCKED-BY Manas's lease JSON.) If anyone starts copying the pipeline for
  the lease, stop them.
P6 (12:45-16:30): Map every component to the IBM stack in code comments +
  write the one-page architecture note (watsonx Orchestrate / Granite / MCP /
  AgentOps per component). (Done when: the arch note lists each mapping.)
P6 (16:30-18:00): Stability pass: timeouts, error shapes, no crashes on bad
  input. (Done when: 10 /run calls, zero 500s.) SYNC with Vrajesh 16:30.
P7 (18:00-22:00): Support Vrajesh's determinism: a /run?seed=trap mode that
  returns the planted result. (Done when: seeded mode is byte-identical
  across runs. BLOCKED-BY Vrajesh's seed spec.)
P8 (22:00-24:00): FREEZE the engine; write the 1-paragraph "how the verdict
  is grounded" for Q&A. (Done when: Q&A paragraph ready; freeze tag exists.)
  All-hands 23:45. SLEEP by 00:30.

### SPRINT DAY 3 (10 Aug)

P9 (06:30-09:00): Fix ONLY the engine bugs Ajit finds. Do NOT refactor. Keep
  /run stable. (Done when: logged engine bugs closed. BLOCKED-BY Ajit's bug
  list.) This is Ajit's phase — you respond, you don't initiate changes.
P10 (09:00-jury): On standby for engine Q&A. DO NOT TOUCH CODE during
  rehearsal. (Done when: engine untouched; your answers are sharp.)

---

## 10. How your work plugs in (handoffs)

Who feeds you:
- Manas -> you: the rule-book JSON (bill by P2 16:00; lease by P3 22:00).
  Your compare + lookup consume it. If it's late, build against a hardcoded
  stub and swap; never rebuild his work.
- Ajit -> you: the OCR output contract (by P1 13:00) + the implemented
  step-01 body (P3) + the step-06 Granite body (P6). You wire both into the
  orchestrator.
- Vrajesh -> you: the seed spec for /run?seed=trap (P7).

Who consumes you:
- Vrajesh consumes /run + RunResponse + the frozen schemas. His screen
  renders your output verbatim. Keep the contract stable after P1.
- Ajit consumes your orchestrator (he plugs his 01/06 bodies into it) and
  your audit/hold events (for the screen + his QA).
- Manas consumes nothing from you directly, but his rule-book only matters
  because your engine reads it.

Rule: if a handoff TO you is late, work your NEXT independent task; never
sit idle; never rebuild the missing piece yourself.

---

## 11. IBM stack mapping you own (for the proposal + code comments)

| Pramaan component | IBM component | Where (your code) |
|---|---|---|
| 6-step agent flow | watsonx Orchestrate / Agent Lab | pipeline/orchestrator.ts |
| Tool calls (rule-book, hold) | MCP (watsonx.data managed server) | mcp/server.ts |
| Consent + audit + governance | AgentOps | audit/audit_log.ts + /consent |
| Plain-language + draft | IBM Granite | steps/06_draft.ts (Ajit's call; you wire) |

Mention MCP + watsonx Orchestrate + Granite + AgentOps by name in the
proposal's Technical Stack, and map each in code comments (your P6 task).
For the template's "if using RAG or Agentic, specify IBM or AWS": the answer
is IBM for both (RAG = retrieval over the rule corpus via MCP; Agentic =
watsonx Orchestrate + MCP tools).

---

## 12. Your on-stage Q&A (you own these — say them in one line)

Q: "Walk us through the architecture."
A: "A thin Ionic client captures the bill and renders the verdict; the brain
   runs a six-step trunk — read, lookup, compare, prove, act, draft — on
   watsonx Orchestrate, with the compare done by deterministic code, not a model."

Q: "How is the verdict grounded / why won't it hallucinate?"
A: "The verdict is arithmetic over two cited numbers — your bill and the
   official rule — computed by code with no model in the path. Every card
   carries three anchors: your source, the official source, and the exact
   subtraction. Anyone can re-run it."

Q: "How does the hold work? Does the agent act on its own?"
A: "It places a provisional, reversible hold via an MCP tool, only on
   high-confidence gaps, and it auto-releases in 72 hours if unconfirmed.
   Nothing permanent happens without a logged user tap. The audit trail
   shows exactly what was auto versus tapped."

Q: "Is this a real integration or a mock?"
A: "The billing gateway is a mock for the sprint — real hospital APIs are
   out of scope for 36 hours. But the action is real: the agent mutates
   external state through MCP, which is the production pattern."

Keep your answers under 20 seconds. Vrajesh owns innovation/business/liability;
Ajit owns OCR/hallucination-from-read; Manas owns sources/curation. You own
architecture + grounding + the hold.

---

## 13. What you do NOT do (boundaries — respect these)

- The screens, components, the beat flow, the deck, the pitch — Vrajesh.
  You advise; you don't build the UI.
- The OCR model call (step 01 body) and the Granite model call (step 06
  body) — Ajit implements. You define the I/O and wire them. Do not write
  the model calls yourself; that's the overlap we designed out.
- The rule-book content + the letter/notice wording — Manas. You consume
  his JSON and templates; you don't curate them. (You MAY tell him a row is
  malformed or a match_terms list is too thin — that's a contract issue,
  not content ownership.)
- You do not weaken the deterministic compare or the two-tier hold for
  speed or "cool factor." Those are the product's integrity. If you think
  they should change, raise it with Vrajesh; don't silently change them.

---

## 14. Your first tasks, today

1. Enroll in + start the IBM GLE course "Future Forward: AI for Innovation";
   get your certificate (Round-1 requirement; yours goes in the PPT).
2. Scaffold the monorepo with Vrajesh (C7): workspaces, tsconfig.base,
   .env.example. Confirm you can both push.
3. Draft the three schemas + RunResponse + RuleRow in packages/contracts
   (C5), even rough — so P1 is "freeze," not "invent."
4. Confirm IBM/watsonx creds + Agent Lab access (hello-world agent runs).
5. Read the RuleRow shape above and agree the match_terms convention with
   Manas.

Those five, done this week, mean you walk into the sprint with the contract
already drafted and the creds already working — and the sprint becomes what
it should be: freeze the schemas in P1, then build the trunk top to bottom.
You are the person who makes the verdict true and the action real. The
screen shows it; you make it correct. Build the trunk.

Pramaan · TRUNK role brief · HackVerse Track 3
Murgesh — the engine the whole tree grows from.