# AJIT — SAP
### Reliability · Capture + Ingestion + the Safety Valve + the Demo-Breaker
### Pramaan · HackVerse Track 3
### Team: Vrajesh (Lead) · Murgesh (Tech Co-Lead) · Ajit (SAP) · Manas (ROOTS)

Read once, keep open while you build. This is shorter than the others on
purpose — your lane is focused, so this doc is too. Everything you need is
here; nothing you don't.

---

## 0. Your seat, in one line

You own the part that touches the real, messy world: the camera, the OCR,
the confidence scores, the Granite draft — and, just as important, you own
BREAKING the demo on purpose so it doesn't break on stage. Two of the
product's trust signals are yours: the yellow "tap to confirm" box (the
system admitting it's unsure) and the "AI-generated — review before sending"
banner. You don't build the verdict (that's Murgesh's deterministic math);
you build the EYES and the VOICE, and you make sure neither lies.

---

## 1. Your lane — the files you touch

- apps/mobile/src/lib/camera.ts        — Capacitor camera + permissions
- apps/mobile/src/screens/ReadScreen.tsx (the ingest wiring + bbox overlay)
- services/brain/pipeline/steps/01_read.ts   — YOU write the OCR/vision call
- services/brain/pipeline/steps/06_draft.ts  — YOU write the Granite call + fallback
- data/samples/adversarial/            — your 5 nasty test bills

You CONSUME (don't rebuild): the schemas in packages/contracts (Murgesh
publishes them), the templates in packages/templates (Manas writes them),
the orchestrator (Murgesh wires your two steps into it).

---

## 2. The one split you must understand (with Murgesh)

Steps 01 and 06 are shared, cleanly:

- Murgesh writes the FILE SKELETON + the input/output types for 01_read.ts
  and 06_draft.ts, and wires them into the orchestrator.
- YOU replace the stub body with the real model call (OCR in 01, Granite in
  06). You never edit the orchestrator; he never edits your model call.
- Result: you two never touch the same lines. That's the whole point.

So when you open 01_read.ts or 06_draft.ts, the signature is already there.
Fill the body. Return the right shape. Done.

---

## 3. Your four jobs (what / done-when / the one rule)

### Job 1 — OCR + per-field confidence (step 01)
- What: read the bill image; return extracted_fields[] = { text, value, unit,
  bbox, confidence }. The bbox is what draws the rectangles on the screen.
- Done-when: 3 sample bills extract with a confidence PER field, and the
  rectangles line up on the image in ReadScreen.
- The one rule: report the number you read, exactly. Never "fix" a shaky
  read here. The GATE (Job 2) decides what to do with low confidence — the
  reader just reports honestly.

### Job 2 — The confidence gate (your signature feature)
- What: set low_conf = true on any field with confidence < 0.90 (THRESHOLD).
  The screen paints those fields YELLOW with "tap to confirm: <value>".
  And in step 05 (Murgesh's), a low_conf field CANNOT auto-place a hold —
  it only stages. So a bad read can never freeze a real invoice.
- Done-when: a low-confidence field shows yellow on screen AND cannot
  trigger an auto-hold in a test.
- The one rule: when unsure, downgrade (yellow / staged), never assert.
  Silence over a false alarm. This yellow box is the most trust-building
  thing on the screen — it's the system saying "I'm not sure, you check."

### Job 3 — Granite draft + the fallback (step 06)
- What: fill Manas's template with Granite; attach the banner string
  "AI-generated — review before sending".
- Done-when: the letter renders with the banner; AND if Granite is slow or
  down, the FALLBACK fills the same template from the same data with no
  model — the letter still renders, banner intact.
- The one rule: Granite touches WORDING only, never the numbers. The
  numbers in the letter come from the proof cards (Murgesh's deterministic
  output), not from the model. The fallback must exist so the demo never
  depends on a live model call.

### Job 4 — Camera + bbox into the UI, and the demo-breaker / QA
- What: the Capacitor camera wrapper + permissions; feed OCR bbox/confidence
  into ReadScreen so the rectangles + the yellow gate show. Then, in P9,
  run your 5 adversarial bills (tilt / blur / blank / weird table / mixed
  language), log every break, retest after fixes.
- Done-when: camera captures on a device; the overlay animates from the
  returned coordinates; and on Day 3 your bug list is empty or cut.
- The one rule: P9 is YOUR phase. No new features those hours — only break
  and fix. A flawless demo of 80% beats 100% that glitches.

---

## 4. The confidence gate — one worked example

What step 01 returns for one line (this is the shape the screen reads):

    {
      "text": "Paracetamol 500 x30",
      "value": 45,
      "unit": "per tablet",
      "bbox": [312, 884, 410, 906],     // draws the rectangle
      "confidence": 0.81,               // < 0.90 ...
      "low_conf": true                  // ... so this is true
    }

What happens because low_conf is true:
- ReadScreen paints that rectangle YELLOW + "tap to confirm: 45".
- Step 05 sees low_conf and STAGES the hold instead of placing it.
- Only after the human taps "confirm" does that field become eligible.

Contrast a confident read (confidence 0.97, low_conf false): rectangle
stays normal, and its gap CAN drive an auto-hold. That contrast — yellow
when unsure, normal when sure — is the whole safety story, and you built it.

---

## 5. Your day plan (checklist form — tick as you go)

PRE-SPRINT (this week):
[ ] Take the OCR handoff from Vrajesh; run his existing pipeline on 1 sample.
[ ] Set up Granite access; make one call work.
[ ] Install Tesseract.js (or your chosen OCR) + @capacitor/camera.
[ ] (Optional resilience) install Ollama + pull a Granite model as a local
    fallback, so a slow watsonx.ai at the venue can't kill the draft.
[ ] Complete the IBM GLE course + get YOUR certificate (Round-1 requirement).

DAY 1 (8 Aug):
[ ] P0: OCR returns text+bbox+conf on 1 image; Granite access works.
[ ] P1: write the OCR output contract (per field: text, value, bbox,
    confidence) and share it with Vrajesh by 13:00 — he builds the left box
    to it. (You block his P2 until this is shared.)
[ ] P2: harden OCR (tables, tilted images, per-field confidence); wire the
    confidence-gate flag (low_conf below threshold).
[ ] P3: feed your OCR into Murgesh's pipeline (align field names); wire
    Granite to fill Manas's template + add the banner.
[ ] P4: build the Granite fallback (template fill, no model); prepare your
    5 adversarial bills. Sleep by 00:30.

DAY 2 (9 Aug):
[ ] P5: make OCR + Granite production-clean; a blank photo returns
    "unverified", never a crash.
[ ] P6: wire your OCR + Granite into the live /run flow end-to-end with
    Vrajesh (screen shows your bbox + your draft live).
[ ] P7: build the control-bill path with Manas (all-correct bill -> all
    green = the restraint beat).
[ ] P8: light QA on the happy path; log oddities. Sleep by 00:30.

DAY 3 (10 Aug):
[ ] P9 (YOUR PHASE): run the 5 adversarial bills + tilt/blur/blank; log
    every break; retest after Murgesh/Vrajesh fix. Happy path stays green.
[ ] P10: own your Q&A; final sanity run of ingestion. Breathe.

---

## 6. Your on-stage Q&A (one line each)

Q: "What if the OCR misreads a number?"
A: "Every field carries a confidence; below 90% we show a yellow 'tap to
   confirm' and that field can't auto-freeze anything. A bad read downgrades
   to a question, never to a wrong verdict."

Q: "Why won't it hallucinate?"
A: "The verdict is subtraction over two cited numbers — no model in that
   path. The model only writes the letter's wording, and if it's down we
   fall back to a filled template. The numbers never come from the LLM."

Q: "What's the banner for?"
A: "The letter is AI-drafted, so we label it and require a human review
   before it sends. The agent prepares; the person decides."

---

## 7. What you do NOT do

- The verdict / compare / hold logic / schemas / orchestrator — Murgesh.
  You wire your two steps into his orchestrator; you don't change it.
- The screens' layout, the demo flow, the pitch — Vrajesh. You feed his
  ReadScreen the bbox + confidence; you don't design the screen.
- The rule-book content + the template wording — Manas. You FILL his
  template with Granite; you don't write the wording.
- You don't "fix" a low-confidence read in the OCR. Report it; let the gate
  handle it. A confident wrong number is worse than an honest yellow box.

---

## 8. Your first tasks, today

1. Take the OCR handoff from Vrajesh; get it running on 1 sample bill.
2. Make one Granite call work (and set up the Ollama fallback if you can).
3. Write the OCR output contract (the per-field shape above) and send it to
   Vrajesh — it unblocks his whole left box.

Those three done this week mean Day 1 is "harden and wire," not "figure out
the shape." You own the eyes, the voice, and the safety valve — and the
habit of breaking it before the judge does. That's a load-bearing seat.

Pramaan · SAP role brief · HackVerse Track 3
Ajit — the eyes, the voice, and the one who breaks it first.