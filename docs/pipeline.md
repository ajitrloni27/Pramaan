# PRAMAAN — Pipeline & Data Flow
### How a request travels from the camera to the frozen rupee · HackVerse Track 3

This document traces ONE request end to end, names the contract at every
boundary, and explains the branches (confidence gate, seeded demo, hold
state machine). Read it top to bottom once; keep it open when wiring /run.

---

## 0. The two paths in, one pipeline through

There are exactly two ways a request enters the brain, and they converge on
the same six steps immediately:

  PATH A — LIVE (build & Q&A):  camera/photo  ->  POST /run  { image, domain }
  PATH B — SEEDED (stage demo): no image      ->  GET  /run?seed=trap
                                  (brain loads data/samples/trap + seeds/trap.ts)

Both paths produce the SAME run_response shape. The app cannot tell them
apart, and that is the point: the stage demo exercises the real pipeline,
just with deterministic input. Seeded mode bypasses step 01's OCR (it loads
pre-extracted fields) so the demo never gambles on a live read.

---

## 1. The boundary contract (the only thing the app and brain share)

Request (path A):
    POST /run
    { "image": "<base64 or url>", "domain": "bill" | "lease" }

Request (path B):
    GET /run?seed=trap&domain=bill

Response (both) — run_response:
    {
      "run_id": "uuid",
      "domain": "bill",
      "extracted_fields": [ ExtractedField... ],   # from step 01
      "proof_cards":      [ ProofCard... ],        # from steps 02-04
      "hold":             HoldEvent | null,        # from step 05
      "draft":            { text, banner },        # from step 06
      "audit":            [ AuditEvent... ]        # appended across all steps
    }

The app renders this verbatim. It does NOT recompute gaps, does NOT decide
hold status, does NOT rewrite the draft. The brain is authoritative; the
app is a renderer + the place the human taps. (See technical reference §3
for the field-by-field schema.)

---

## 2. The six-step trunk (what travels, step by step)

    [image or seed]
          |
          v
    +-------------+   reads image        writes extracted_fields[]
    | 01 READ     | --------------------> (text, value, unit, bbox, confidence)
    +-------------+                            |
          |                                    v
    +-------------+   reads fields +     writes matched rule rows
    | 02 LOOKUP   |   rule-book (MCP)    (which rule each field hits)
    +-------------+   lookup_rule              |
          |                                    v
    +-------------+   reads fields +     writes gaps (DETERMINISTIC)
    | 03 COMPARE  |   matched rules      your_value - official_value
    +-------------+   NO LLM HERE              |
          |                                    v
    +-------------+   reads gaps +       writes proof_cards[]
    | 04 PROVE    |   anchors            (3 anchors each: source/rule/compute)
    +-------------+                            |
          |                                    v
    +-------------+   reads cards +      writes hold (placed | staged | null)
    | 05 ACT      |   confidence   --MCP--> place_hold on billing gateway
    +-------------+                            |
          |                                    v
    +-------------+   reads cards +      writes draft { text, banner }
    | 06 DRAFT    |   template     --Granite--> fills {{placeholders}}
    +-------------+                            |
          v                                    v
      run_response  <-------------------  audit[] (every step appended)

Each step is a pure-ish function: (input state) -> (input state + its
output). The orchestrator threads the state through 01..06. A step never
reaches back into an earlier step's internals; it reads the accumulated
state. That is what makes the trunk re-runnable and testable per step.

---

## 3. Step specs (inputs / outputs / the one rule each step obeys)

### 01 READ — `steps/01_read.ts` (OCR/vision; Ajit owns the model call)
- Input: image (path A) or nothing (path B -> load pre-extracted fields).
- Output: extracted_fields[] = { text, value, unit, bbox, confidence }.
- Rule: emit a confidence PER field. Never "fix" a low-confidence value here.
  The number you read is the number you report; the GATE decides what to do
  with low confidence, not the reader. (Trap 1 fix lives in the gate, not
  here.)
- In seeded mode this step is a no-op load; the bbox/confidence come from
  the seed so the ReadScreen still animates rectangles on stage.

### 02 LOOKUP — `steps/02_lookup.ts` (MCP tool: lookup_rule)
- Input: extracted_fields[] + domain.
- Action: for each field, call MCP `lookup_rule(domain, field.text)` which
  scans packages/rulebooks/<domain>_rules.json `match_terms` and returns the
  matching rule row(s) with official_value, official_unit, source anchors.
- Output: a mapping field -> matched rule row (or NO_MATCH).
- Rule: matching is by `match_terms` synonyms (Manas's lever). If no rule
  matches, the field is NOT an error — it simply produces no card (silence
  over a false alarm).

### 03 COMPARE — `steps/03_compare.ts` (DETERMINISTIC; no model)
- Input: fields + matched rules.
- Action: like-for-like subtraction using official_unit (per-tablet vs
  per-tablet, per-scan vs per-scan — never per-tablet vs line-total).
  gap = charged - official (normalized to the same unit).
- Output: per matched field: { your_value, official_value, gap, status }.
  status = "gap" if gap > tolerance else "ok".
- Rule: THIS STEP CONTAINS NO LANGUAGE MODEL. The verdict is arithmetic over
  cited numbers. This is the hallucination defense made structural: the
  model is physically not in the verdict path. (Truth 2, in code.)

### 04 PROVE — `steps/04_prove.ts`
- Input: compare results + the original field bbox + the rule row.
- Output: proof_cards[] each carrying the THREE anchors:
    source_anchor  = "bill line N" + bbox + ocr confidence
    rule_anchor    = rule.official_source (+ url)
    compute_anchor = the literal expression, e.g. "45000 - 18000"
  plus rule_says_plain (the human line Manas wrote).
- Rule: a card with a missing rule_anchor is emitted as status "unverified",
  never as "gap". No anchor -> no accusation.

### 05 ACT — `steps/05_act.ts` (MCP tool: place_hold; the agentic step)
- Input: proof_cards[] + per-field confidence.
- Decision (the two-tier model):
    total_disputed = sum of gaps over HIGH-confidence gap cards.
    if total_disputed > 0 AND min confidence over those cards >= THRESHOLD:
        call MCP place_hold(invoice_id, total_disputed, evidence_pack_id)
        hold.status = "placed"; hold.reversible = true; hold.expires_at = +72h
    else:
        hold.status = "staged"   (computed, NOT placed — waits for the tap)
    if total_disputed == 0: hold = null
- Output: hold event + an audit event "hold_placed" or "hold_staged".
- Rule: the auto-action is PROVISIONAL and REVERSIBLE and only on HIGH
  confidence. A misread number can at worst stage a hold (nothing freezes)
  or place a 72h hold that auto-releases. Permanent consequences never
  happen without the tap (step outside the pipeline: POST /consent).

### 06 DRAFT — `steps/06_draft.ts` (Granite; Ajit owns the model call)
- Input: proof_cards[] + hold + packages/templates/<domain>_*.txt.
- Action: Granite FILLS the template placeholders (Manas's wording). If
  Granite is slow/down, the FALLBACK fills the same template from the same
  data with no model — the letter still renders, banner intact.
- Output: draft = { text, banner: "AI-generated - review before sending" }.
- Rule: the LLM touches WORDING only, never the numbers. The numbers in the
  letter come from the proof cards (deterministic), not from the model.

---

## 4. The confidence gate (where Trap 1 actually lives)

    field.confidence >= THRESHOLD (default 0.90)
        -> the field's gap may drive an AUTO hold (step 05 "placed")
    field.confidence <  THRESHOLD
        -> the field is flagged low_conf = true
        -> ReadScreen paints it YELLOW with "tap to confirm: <value>"
        -> its gap is shown but CANNOT auto-place a hold (step 05 "staged")
        -> only after the human confirms does it become eligible

So a bad OCR read cannot freeze a legitimate invoice. The worst case of a
misread is a yellow box asking the human to look. That is the system
admitting uncertainty on purpose — and it is the single most trust-building
thing on the screen.

---

## 5. The hold state machine (the thing that makes it "agentic")

                 +-------------------+
                 |  (no disputed $)  |  -> hold = null
                 +-------------------+

    high-conf gap $ present
                 |
                 v
          [ STAGED ]  ----human tap (POST /consent)---->  [ PLACED, permanent-ish ]
                 |                                                |
                 | (no tap)                                       | release_hold (tap "withdraw")
                 v                                                v
          (stays a draft only)                              [ RELEASED ]
                 ^
                 |
    auto-place on high-conf --------------------------------> [ PLACED, provisional ]
                                                                  |
                                              72h no confirm ----> [ RELEASED ]
                                              tap "confirm"  ----> [ PLACED, permanent-ish ]

Transitions are the ONLY way hold.status changes, and every transition
writes an audit event. The mock gateway (services/brain/gateway) holds the
state in memory; get_hold_status reads it. On stage, the seeded path
returns a pre-baked "placed" hold so the chip animates deterministically.

---

## 6. The audit trail (written by every step, read by the screen)

Every step appends to audit[] (and the server persists the same events):
    { t: "ocr",        run_id, field_count, low_conf_count, ts }
    { t: "lookup",     run_id, matched, unmatched, ts }
    { t: "compare",    run_id, gap_count, ok_count, ts }
    { t: "prove",      run_id, card_count, unverified_count, ts }
    { t: "hold_placed" | "hold_staged", run_id, hold_id, amount, reversible, ts }
    { t: "draft",      run_id, model: "granite" | "fallback", ts }
    { t: "consent",    run_id, action, by: "user", ts }   # from POST /consent
The trail is append-only (audit_log.ts never updates or deletes). This is
the governance layer (AgentOps story) and the answer to "did the agent act
on its own?": the trail shows exactly what was auto vs what was tapped.

---

## 7. Sequence, end to end (one happy path, live)

    App(Vrajesh)        Brain/Murgesh         MCP tools         Gateway(mock)     Granite
       |  POST /run {image,bill}  |                |                 |              |
       |------------------------->|                |                 |              |
       |                          | 01 read(OCR)   |                 |              |
       |                          | 02 lookup_rule |                 |              |
       |                          |--------------->|                 |              |
       |                          |   rule rows    |                 |              |
       |                          |<---------------|                 |              |
       |                          | 03 compare (deterministic)       |              |
       |                          | 04 prove (3 anchors)             |              |
       |                          | 05 place_hold  |                 |              |
       |                          |--------------->|  hold(amount)   |              |
       |                          |                |---------------->|              |
       |                          |                |   hold_id,exp   |              |
       |                          |<---------------|<----------------|              |
       |                          | 06 draft       |                 |   fill tmpl  |
       |                          |----------------------------------------------->|
       |                          |   text+banner  |                 |              |
       |                          |<-----------------------------------------------|
       |   run_response (cards,hold,draft,audit)    |                 |              |
       |<-------------------------|                |                 |              |
       |  [user taps] POST /consent                 |                 |              |
       |------------------------->|  confirm hold / send letter      |              |
       |                          |  release_hold? |                 |              |
       |   audit += consent       |                |                 |              |
       |<-------------------------|                |                 |              |

Seeded path collapses the left arrow to GET /run?seed=trap and the brain
short-circuits 01 (loads seed fields) and returns a fixed hold+draft; the
right-hand calls may be stubbed to canned values so the response is
byte-identical across runs.

---

## 8. Where each pipeline concern is defended (traceability)

| Concern | Defended at | How |
|---|---|---|
| Hallucinated verdict | step 03 | no model in compare; arithmetic only |
| Bad OCR -> false accusation | step 01 + gate (§4) | per-field confidence; low-conf cannot auto-hold |
| Missing source -> false gap | step 04 | no rule_anchor => "unverified", not "gap" |
| Agent acting without consent | step 05 | auto only provisional+reversible+high-conf; permanent needs tap |
| Wrong number on screen | rule-book + citation gate | Manas signs every official_value; unsigned => no number |
| Demo breaks on stage | seeded path (§0,§7) | /run?seed=trap; no live OCR/LLM/network in 90s |
| "It's just a mail-merge" | step 05 + gateway | place_hold mutates external state via MCP = real action |

Pramaan · Pipeline & Data Flow · HackVerse Track 3