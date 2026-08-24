# PRAMAAN — 36-Hour Sprint Playbook
### Grand Prototype Challenge · MAHE, Bengaluru · 8-10 Aug 2026
### Team: Vrajesh (BARK) · Murgesh (TRUNK) · Ajit (SAP) · Manas (ROOTS)

One engine. Proof, not opinions. Built once, branches forever.
This document is the single source of truth for the build. Print it. Tape it up.
When in doubt at 2 AM, the rules in Section 2 win.

---

## 0. Pre-Sprint Checklist (must be GREEN before 09:00 on 8 Aug)

The sprint plan below assumes a prepared team. If any row is red at 09:00,
you are already ~6 hours behind — do NOT start P1; use P0 to catch up and
apply the cut list (Section 6). The prep phase exists so this list is green.

| # | Item | Owner | Green when... |
|---|------|-------|---------------|
| C1 | IBM cert done (Agent Lab + RAG lab) | Vrajesh | both activities show complete |
| C2 | Idea submitted + accepted (31 Jul gate) | Vrajesh | confirmation email in hand |
| C3 | Bill rulebook v0 (10-15 rules + citations) drafted | Manas | JSON file exists, every row has a source ref |
| C4 | Planted-trap values agreed (which line, official number, gap) | Manas + Vrajesh | written down, both signed off |
| C5 | JSON schemas drafted (proof-card, hold-event, audit-log) | Murgesh | 3 schema files exist, even if rough |
| C6 | OCR pipeline handed off (Vrajesh -> Ajit) | Vrajesh + Ajit | Ajit can run it on 1 sample bill |
| C7 | Tech stack + repo scaffolded | Murgesh + Vrajesh | empty repo, both can push |
| C8 | One-line + flipped-arrow line memorized by all four | all | each can say it without the doc |

> Mentor note (read this): the single biggest risk to this whole plan is
> treating the prep phase as infinite and showing up with C3/C5/C6 red.
> Manas's rulebook and the OCR handoff are the long poles. Start them NOW,
> not on 8 Aug. A green checklist on arrival is worth more than a clever idea.

---

## 1. The Shared Clock (master timeline)

Sprint-hours = cumulative build time (sleep excluded). Wall-clock is what you
actually live by. Net build per day is wall minus meals/setup.

| Phase | Day | Wall-clock | Build-hrs | Sync points | Phase milestone (done when...) |
|-------|-----|------------|-----------|-------------|--------------------------------|
| P0 Arrival & Setup | 1 | 09:00-10:30 | 1.5 | all-hands 10:15 | wifi, repo, envs, IBM creds work; standup format agreed |
| P1 Contract & Skeleton | 1 | 10:30-13:00 | 2.5 | V-M 10:30 (schemas) | schemas FROZEN; V screen skeleton on mock; M mock API up |
| -- lunch -- | 1 | 13:00-13:45 | -- | -- | eat together, no screens |
| P2 Core Build (parallel) | 1 | 13:45-18:00 | 4.0 | none (heads down) | each lane has a working slice on its own data |
| P3 Wedge Integration | 1 | 18:00-22:00 | 4.0 | V-M 18:00, 20:30 | bill wedge runs end-to-end on REAL engine (mock data ok for letter) |
| -- dinner -- | 1 | 19:30 inline 20 min | -- | -- | short, standing |
| P4 First E2E + sleep call | 1 | 22:00-24:00 | 2.0 | all-hands 23:30 | one full flow recorded on phone; sleep decision made |
| SLEEP Night 1 | 1-2 | 00:30-07:00 | 0 | -- | all four sleep, no exceptions |
| P5 Harden + ACT + lease stub | 2 | 07:00-12:00 | 5.0 | V-M 07:30 | Dispute Hold fires + auto-release works; lease stub switches on same screen |
| -- lunch -- | 2 | 12:00-12:45 | -- | -- | eat |
| P6 Granite + audit + full wire | 2 | 12:45-18:00 | 5.0 | V-A 14:00, V-M 16:30 | Granite draft + banner live; audit viewer shows full trail |
| P7 Demo determinism + rehearse #1 | 2 | 18:00-22:00 | 4.0 | all-hands 21:30 | demo runs on pre-seeded data, 90-sec flow hits every beat |
| -- dinner -- | 2 | 19:30 inline 20 min | -- | -- | short |
| P8 Rehearse #2 + freeze candidate | 2 | 22:00-24:00 | 2.0 | all-hands 23:45 | a tagged "freeze" commit exists; deck v1 done |
| SLEEP Night 2 | 2-3 | 00:30-06:30 | 0 | -- | all four sleep |
| P9 Ajit breaks it; others fix only | 3 | 06:30-09:00 | 2.5 | V-A live | bug list closed or cut; no new features |
| P10 Final rehearse + Q&A + deck lock | 3 | 09:00-jury | ~2.5 | all-hands 09:00 | 3 clean runs back-to-back; Q&A dry-run done; deck locked |

> Uncertainty handled honestly: the exact jury slot on 10 Aug is not published.
> This plan freezes the build at 09:00 Day 3 and assumes jury ~10:30-11:00.
> If jury is EARLIER, move the P9 break-test into late P8 (Night 2) and use
> Day 3 purely for rehearsal. Confirm the slot the moment you arrive.

---

## 2. Sprint Rules (non-negotiable — these beat any argument)

1. Schema-first. Murgesh freezes the 3 schemas in P1. Vrajesh builds the screen
   against a MOCK from P1. Frontend never blocks on backend. The schema is the
   contract; changing it needs a 2-min V-M sync, never a surprise.
2. One data source, one switch. Vrajesh puts all data behind a single module
   (dataSource) with two modes: mock | live. Flip one env var in P3 to merge
   Murgesh's real engine. No find-and-replace across the UI.
3. DRI. Your lane, your decision. Others advise, they do not override. A
   committed wrong call beats an uncommitted right one at a hackathon.
4. Two alphas, two syncs. Vrajesh and Murgesh meet 10 min, twice a build-day
   (phase start + a mid sync). No more, no less.
5. Citation gate. No rule, no on-screen number, no slide stat ships without
   Manas's sign-off. The team waits 10 minutes for a correct citation rather
   than demoing a wrong number. This is the integrity of the product.
6. Deterministic demo. The stage flow runs on PRE-SEEDED data that looks live.
   No live OCR gamble, no live LLM gamble, no live network call in the 90 seconds.
   Live calls happen in the build; the demo is a rehearsed script.
7. Last 4 hours = Ajit. No new features. Only breaking and fixing. A flawless
   demo of 80% beats 100% that glitches.
8. Sleep both nights. All four. The person who pulls an all-nighter writes the
   bug that breaks the 11 AM demo. This is evidence, not vibes.
9. One voice per question on stage. The owner (Section 8) answers. Others stay
   quiet unless tagged. Four people talking = a team that didn't rehearse.
10. The tree stays a tree. The Dispute Hold and the 3-box screen are the TRUNK.
    The lease is a config, not a second app. If you find yourself copy-pasting
    the engine for the lease, STOP — you are amputating the tree.

---

## 3. Sprint Risk Register (the 3 things that eat time — pre-decided fixes)

| Risk | Owner | Mitigation (already decided) | Kill-switch if it still fails |
|------|-------|------------------------------|-------------------------------|
| OCR misreads a number on stage | Ajit | confidence gate: <90% -> yellow "tap to confirm"; demo uses a clean pre-seeded bill, never a real crumpled photo | if OCR layer is flaky, demo the bill as a pre-extracted JSON and narrate "in production this is the OCR step" — show the engine, not the camera |
| Granite slow / wrong draft onsite | Ajit + Manas | Manas writes TEMPLATE drafts; Granite only FILLS them; if Granite fails, the filled template still renders with the banner | drop live Granite entirely; demo the template path; mention Granite as the production model in Q&A |
| Schema drift between Murgesh and Vrajesh | Murgesh + Vrajesh | frozen schemas P1 + the dataSource switch + 2 daily syncs | if drift found late, Vrajesh adapts the UI to the engine (UI is cheaper to bend than the verdict logic) |

---

## 4. Per-Person Tracks (hour-by-hour, same phases for all four)

Legend: Time = wall-clock. "Done when" = exit criteria. Dep = what blocks you /
what you block. (V=Vrajesh, M=Murgesh, A=Ajit, N=Manas.)

### 4.1 VRAJESH — BARK (screen · demo · pitch · coordination)

| Phase | Time | Task | Done when | Dep |
|-------|------|------|-----------|-----|
| P0 | 09:00-10:30 | Venue/wifi/repo; load team doc on a shared screen; run 10-min all-hands (one-line + rules) | all four can say the one-line; repo cloned | blocks all |
| P1 | 10:30-11:30 | Sync w/ M: lock schemas. Build dataSource mock module + static 3-box skeleton | skeleton renders with mock cards | blocked-by M schemas |
| P1 | 11:30-13:00 | Build middle card component (your->official->gap->conf->ref) + red/green logic on mock | 5 mock cards render correctly | -- |
| P2 | 13:45-15:30 | Left box: doc image + bbox overlay + yellow confidence gate (consume A's output shape) | a low-conf field shows yellow + tap-to-confirm | blocked-by A output shape |
| P2 | 15:30-18:00 | Right box: letter slot + banner + consent tap button + hold-status chip (3 states) | tap button + chip render on mock hold event | blocked-by M hold schema |
| P3 | 18:00-20:00 | Sync w/ M; flip dataSource mock->live for proof cards; fix mismatches | real engine cards render on screen | blocked-by M engine |
| P3 | 20:00-22:00 | Wire the planted-trap bill (with N's values); make the trap card flip red on cue | trap bill shows 2 red cards deterministically | blocked-by N trap JSON |
| P4 | 22:00-23:30 | Wire hold chip to M's hold event; build audit-log viewer panel | full bill flow visible on screen | blocked-by M hold+audit |
| P4 | 23:30-24:00 | All-hands: record one phone video of the flow; sleep call | video saved; laptops closed by 00:30 | -- |
| P5 | 07:00-09:00 | Build the Bill/Lease dropdown; wire lease rulebook (N) into SAME screen | switching to Lease shows clause cards + counter-notice | blocked-by N lease JSON |
| P5 | 09:00-12:00 | Hold animation polish (amber->green + text); make the freeze the visual climax | hold chip animates cleanly on the trap | -- |
| P6 | 12:45-14:00 | Render A's Granite draft + banner in right box; layout the letter | letter + banner render; template fallback works | blocked-by A Granite |
| P6 | 14:00-18:00 | Audit viewer polish + full-flow timing pass; first 90-sec run-through alone | one solo run under 90s | -- |
| P7 | 18:00-20:00 | Lock demo to pre-seeded data (kill live calls in demo path); rehearse #1 w/ team | demo identical across 2 runs | -- |
| P7 | 20:00-22:00 | Build/finalize deck (6-8 slides); embed flipped-arrow + 3 bulletproof stats | deck v1 presentable | blocked-by N citation sheet |
| P8 | 22:00-24:00 | Rehearse #2 (pitch + screen + trap); write objection answers; tag freeze commit | 2 clean runs; freeze tag exists | -- |
| P9 | 06:30-09:00 | DO NOT add features. Watch A break it; fix only what he logs; re-rehearse after each fix | every logged bug fixed or cut | blocked-by A bug list |
| P10 | 09:00-jury | 3 back-to-back clean runs; Q&A dry-run (Section 8); deck lock; breathe | 3 flawless runs; team calm | -- |

### 4.2 MURGESH — TRUNK (engine · MCP · hold API · schemas)

| Phase | Time | Task | Done when | Dep |
|-------|------|------|-----------|-----|
| P0 | 09:00-10:30 | Repo + envs + IBM/watsonx creds; confirm Agent Lab access | a hello-world agent runs | blocks V, A |
| P1 | 10:30-11:30 | PUBLISH the 3 schemas (proof-card, hold-event, audit-log); freeze them | schema files committed; V notified | blocks V P1 |
| P1 | 11:30-13:00 | Stand up mock Billing Gateway API: place_hold / get_hold_status / release_hold | curl returns 200 + hold_id | -- |
| P2 | 13:45-16:00 | Build compare engine (deterministic: load N's rulebook JSON, subtract, emit gap) | given a bill JSON + rulebook, returns proof cards | blocked-by N rulebook |
| P2 | 16:00-18:00 | Wrap gateway as MCP tools (place_hold, get_hold_status, release_hold, lookup_rule) | an agent can call the tools via MCP | -- |
| P3 | 18:00-20:30 | Orchestration pipeline on watsonx Orchestrate: read->compare->prove->ACT->wait | pipeline returns proof cards + triggers hold | blocked-by A OCR output |
| P3 | 20:30-22:00 | Provisional hold logic: auto-place on conf>=threshold; 72h auto-release timer | hold auto-places + shows expiry; low-conf -> staged not placed | -- |
| P4 | 22:00-23:30 | Audit-log writer: append every event (ocr, lookup, gap, hold, tap) | audit API returns ordered trail | -- |
| P4 | 23:30-24:00 | All-hands; expose a /run endpoint V can call for the full flow; sleep | /run returns full payload; laptops closed 00:30 | blocks V P4 |
| P5 | 07:00-10:00 | Make ACT real: hold actually mutates gateway state; get_hold_status reflects it | status flips placed->released correctly | -- |
| P5 | 10:00-12:00 | Lease path on SAME pipeline (rulebook swap only; no engine copy) | /run with type=lease returns clause cards | blocked-by N lease JSON |
| P6 | 12:45-16:30 | Map every component to IBM stack in code comments + a one-page arch note | arch note lists watsonx/Granite/MCP/AgentOps per component | -- |
| P6 | 16:30-18:00 | Stability pass: timeouts, error shapes, no crashes on bad input | 10 /run calls, zero 500s | -- |
| P7 | 18:00-22:00 | Support V's determinism: a /run?seed=trap mode that returns the planted result | seeded mode byte-identical across runs | blocked-by V seed spec |
| P8 | 22:00-24:00 | Freeze engine; write a 1-paragraph "how the verdict is grounded" for Q&A | Q&A paragraph ready; freeze tag | -- |
| P9 | 06:30-09:00 | Fix only engine bugs A finds; do NOT refactor; keep /run stable | logged engine bugs closed | blocked-by A bug list |
| P10 | 09:00-jury | On standby for engine Q&A; do not touch code during rehearsal | engine untouched; answers sharp | -- |

### 4.3 AJIT — SAP (OCR · confidence · Granite · QA · demo-breaker)

| Phase | Time | Task | Done when | Dep |
|-------|------|------|-----------|-----|
| P0 | 09:00-10:30 | Take OCR handoff from V; run on 1 sample; set up Granite access | OCR returns text+bbox+conf on 1 image | blocked-by V handoff |
| P1 | 10:30-13:00 | Define OCR output contract (per field: text, value, bbox, confidence); share w/ V | contract doc shared; V builds left box to it | blocks V P2 |
| P2 | 13:45-16:00 | Harden OCR: table handling, tilted-image test, conf scoring per field | 3 sample bills extract with per-field conf | -- |
| P2 | 16:00-18:00 | Confidence-gate logic: emit low-conf flag below threshold for V's yellow UI | low-conf fields flagged in output | -- |
| P3 | 18:00-20:00 | Feed OCR output into M's pipeline; align field names | pipeline ingests your OCR without manual mapping | blocked-by M pipeline |
| P3 | 20:00-22:00 | Granite integration: summary + draft via templates (N's); add the banner string | Granite fills template; banner present | blocked-by N templates |
| P4 | 22:00-23:30 | Granite fallback: if model fails/latency high, return filled template (no model) | demo path never depends on a live model call | -- |
| P4 | 23:30-24:00 | All-hands; prepare 5 ADVERSARIAL test bills for P9; sleep | 5 nasty bills ready; laptops closed 00:30 | -- |
| P5 | 07:00-12:00 | Make OCR + Granite production-clean; handle empty/garbled fields gracefully | no crash on a blank photo; returns "unverified" | -- |
| P6 | 12:45-18:00 | Wire your OCR+Granite into the live /run flow end-to-end with V | screen shows your bbox + your draft live | blocked-by V screen |
| P7 | 18:00-22:00 | Build the demo's "clean control bill" path w/ N (all green = restraint beat) | control bill renders all-green deterministically | blocked-by N control JSON |
| P8 | 22:00-24:00 | Light QA pass on the happy path; log anything odd; sleep | oddities logged | -- |
| P9 | 06:30-09:00 | YOUR PHASE: run the 5 adversarial bills + tilt/blur/blank; log every break; retest after fixes | bug list empty or cut; happy path still green | blocks V, M (they fix) |
| P10 | 09:00-jury | Own the OCR/Granite/hallucination Q&A; final sanity run of ingestion | answers sharp; ingestion clean | -- |

### 4.4 MANAS — ROOTS (rulebook · data · citations · planted-trap · templates)

| Phase | Time | Task | Done when | Dep |
|-------|------|------|-----------|-----|
| P0 | 09:00-10:30 | Load rulebook v0; confirm citation format with V; print the citation sheet | citation sheet printed; format agreed | -- |
| P1 | 10:30-13:00 | Finalize planted-trap values w/ V (trap line, official number, gap); write to JSON | trap JSON committed; V has the numbers | blocks V P3 |
| P2 | 13:45-16:00 | Complete bill rulebook to 10-15 rules; every row: code, official value, SOURCE ref, plain-language "rule says" text | rulebook JSON complete + cited | blocks M compare |
| P2 | 16:00-18:00 | Write the complaint DRAFT TEMPLATE (filled by Granite or fallback) w/ plain wording | template file ready for A | blocks A P3 |
| P3 | 18:00-20:00 | Build the CONTROL bill JSON (all-correct -> all green) w/ A | control JSON committed | blocks A P7 |
| P3 | 20:00-22:00 | Build the lease rulebook stub: 5 clauses, 3 illegal, each w/ law ref + plain text | lease JSON committed | blocks V, M P5 |
| P4 | 22:00-23:30 | Write the counter-notice TEMPLATE for the lease path | lease template ready | -- |
| P4 | 23:30-24:00 | All-hands; verify every number in V's current screen vs source; sleep | zero unsourced numbers on screen; laptops closed 00:30 | -- |
| P5 | 07:00-12:00 | Write plain-language "what the rule says" strings for every card (UI shows these) | all cards have a human-readable rule line | blocks V P5 |
| P6 | 12:45-18:00 | Build the citation one-pager for Q&A (the 6 bulletproof stats + sources) | one-pager printed; V puts 3 in deck | blocks V deck |
| P7 | 18:00-22:00 | Sit with V during rehearse #1; catch any wrong number/wording live | notes handed to V | -- |
| P8 | 22:00-24:00 | Final source audit of deck + screen; prepare your Q&A answers (Section 8) | deck stats all cited; answers written | -- |
| P9 | 06:30-09:00 | Verify on-screen numbers one last time after A's break-fixes; update rulebook if a value was wrong | screen numbers == source, post-fix | -- |
| P10 | 09:00-jury | Own the sources/curation/scale Q&A; keep the citation sheet at the table | answers sharp; sheet in hand | -- |

---

## 5. Handoff / Dependency Matrix (who blocks whom, and when)

| Handoff | From -> To | Phase | Artifact |
|---------|-----------|-------|----------|
| Schemas frozen | M -> V | P1 (10:30) | 3 JSON schema files |
| OCR output contract | A -> V | P1 (by 13:00) | field contract doc |
| OCR handoff | V -> A | P0 | existing OCR code + 1 sample |
| Rulebook v0 complete | N -> M | P2 (by 16:00) | bill rulebook JSON |
| Planted-trap values | N -> V | P1 (by 13:00) | trap JSON |
| Draft template | N -> A | P2 (by 18:00) | complaint template |
| Engine /run live | M -> V | P3 (18:00) | /run endpoint |
| Hold + audit events | M -> V | P4 | hold + audit API |
| Granite + banner | A -> V | P6 (by 14:00) | draft render path |
| Lease JSON | N -> V, M | P3 (by 22:00) | lease rulebook JSON |
| Citation one-pager | N -> V | P6 (by 18:00) | stats + sources sheet |
| Adversarial bills | A -> all | P9 | 5 nasty bills + bug list |

Rule: if a handoff is late, the receiver works on their NEXT independent task,
never sits idle, never rebuilds the missing piece themselves.

---

## 6. Cut List (what to drop, phase by phase, if you fall behind)

Use this the instant a phase milestone is missed. Cutting early beats cutting
on stage. The wedge (bill + hold + proof + tap) is LAST to cut.

| If behind at... | Cut this FIRST | Then this | NEVER cut |
|-----------------|----------------|-----------|-----------|
| end P2 | lease stub entirely | audit viewer polish | bill compare + proof cards |
| end P3 | live Granite (use template) | hold animation (static chip ok) | the hold actually firing |
| end P5 | lease stub (if still not done) | control-bill restraint beat | deterministic trap flow |
| end P7 | deck to 4 slides | audit viewer (mention in Q&A) | the 90-sec demo + tap |
| P9 (bugs remain) | the unfixed edge case (narrate around it) | any last-minute visual | the happy-path demo |

> The lease stub is the first thing to sacrifice because it proves the tree but
> is not the judged wedge. If you must, prove the tree with WORDS + one static
> screenshot in the deck instead of a live switch. The bill wedge, the hold, and
> the tap are the product; everything else is evidence that the product scales.

---

## 7. Demo Rehearsal Schedule + 90-Second Beat Sheet

Rehearsals: P6 (solo, V), P7 #1 (team), P8 #2 (team), P10 x3 (team, back-to-back).
Every rehearsal is filmed on a phone and watched once for timing.

| Beat | Time | Vrajesh says / does | Screen shows |
|------|------|---------------------|--------------|
| Hook | 0:00-0:12 | the hospital-counter line + "nobody does the subtraction" | title slide / black |
| Flip | 0:12-0:22 | "everyone checks YOU; we check the system FOR you" | the flipped-arrow line |
| Scan | 0:22-0:35 | point camera / load bill; "watch it read" | left box: bboxes appear; one yellow tap-to-confirm |
| Prove | 0:35-0:55 | "now the subtraction no human can do at the counter" | middle: cards populate green, then 2 red |
| Trap | 0:55-1:05 | point at the subtle MRP trap; "a human misses this" | the subtle red card + its 2 source links |
| Act | 1:05-1:18 | "it doesn't just write a letter -- it freezes the money" | right: hold chip amber->green "frozen, 72h" |
| Consent | 1:18-1:25 | "and nothing permanent happens until I tap" | tap button; audit log writes |
| Tree | 1:25-1:30 | switch dropdown Bill->Lease; "same machine, different rulebook" | same screen, clause cards |

Target: 88-92 seconds. If over, cut the Tree beat to a verbal line (no live switch).

---

## 8. Q&A Ownership + Dry-Run

Each owner says their answers OUT LOUD once in P8 and once in P10. No overlap.

| Question family | Owner | Core answer (one line) |
|-----------------|-------|------------------------|
| Architecture / grounding / how the hold works | Murgesh | deterministic compare + MCP hold, every verdict anchored to 2 sources |
| Innovation / why this / moat / business model / what's next | Vrajesh | the flip + the tree; citizen-side proof; B2B legal wedge |
| OCR failure / low confidence / why no hallucination | Ajit | confidence gate + silence-over-false-alarm + template fallback |
| Sources / how you know the official number / scale to all laws | Manas | curated cited rulebook; engine free, each domain ~a day of curation |
| Liability / does it act on its own | Vrajesh | provisional reversible hold on high-conf only; permanent actions need a tap |

Dry-run format (15 min, P10): one person plays a hostile judge, fires 5 questions
in random order to the 4 owners. Time each answer to <20 seconds. If an answer
rambles, rewrite it to one line.

---

## 9. Definition of Demo-Ready (the gate before the P8 freeze tag)

All must be true, or you do not freeze — you cut (Section 6):

- [ ] Trap bill shows exactly the planned red cards, deterministically, 3 runs in a row.
- [ ] Hold chip flips to green with the frozen amount + 72h text.
- [ ] Tap button writes a visible audit-log entry.
- [ ] One yellow confidence-gate moment is in the flow (proves the safety story).
- [ ] The "AI-generated, review before sending" banner is visible.
- [ ] Every on-screen number is signed off by Manas against a source.
- [ ] The 90-sec flow is under 92 seconds with the pitch spoken aloud.
- [ ] No live network/LLM call in the demo path (seeded/template only).
- [ ] Lease switch works OR is honestly cut and replaced by a deck screenshot.

---

## 10. If Everything Is On Fire (emergency protocol)

If at P7 the wedge does not run end-to-end, stop all four, 20-minute war room:

1. Murgesh reduces /run to the smallest path that returns 3 proof cards + 1 hold
   from a hardcoded bill (bypass OCR, bypass Granite).
2. Ajit stands down on OCR/Granite and helps Vrajesh hardcode the demo data.
3. Manas hand-writes the 3 cards' numbers + sources on paper for V to type.
4. Vrajesh rebuilds the screen against that hardcoded payload only.
   Goal: a working, honest, NARROW demo by P8. A narrow working demo that you
   can explain ("we scoped to the verdict engine for the sprint") beats a wide
   broken one. Then narrate OCR/Granite as "the production path" in Q&A.

This is not failure. This is the team choosing the demo over the architecture
for 36 hours, which is the correct trade. The architecture is in your proposal
and your repo; the demo is what the jury sees.

---

Pramaan · 36-Hour Sprint Playbook · HackVerse Track 3 · 8-10 Aug 2026
Vrajesh · Murgesh · Ajit · Manas — one trunk, many branches, one demo.