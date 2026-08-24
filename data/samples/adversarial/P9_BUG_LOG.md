# P9 Bug Log — Pramaan Adversarial Testing
> **Phase:** P9 — The Breaker Phase (Day 3, 06:30–09:00)
> **Rule:** Ajit logs bugs here. Murgesh patches engine side only. Re-run after each fix.
> **Cut rule:** If a bug is not fixed by 09:00 Day 3, it goes to the Cut List and is narrated around in Q&A. The happy path (seed trap + control) must always remain green.

## P9 RUN RESULT — FINAL
> **Run date:** 09 Aug 2026
> **Result:** 🟢 5/5 scenarios PASS · Seed regression PASS · Bug list EMPTY
>
> | Scenario | Images used | Result |
> |---|---|---|
> | S1 Tilted Bill | `tilted_bill.jpg` (4 494 bytes) | ✅ PASS — hold null, banner present |
> | S2 Blurred Bill | `blurred_bill.jpg` (11 546 bytes) | ✅ PASS — hold null, low_conf flagged |
> | S3 Blank Image | empty string + 1×1 white PNG | ✅ PASS — fields=[], hold=null |
> | S4 Weird Table | `weird_table_bill.jpg` (4 490 bytes) | ✅ PASS — null values → unverified |
> | S5 Mixed Language | `mixed_language_bill.jpg` (4 511 bytes) | ✅ PASS — no crash, banner present |
> | Seed regression | `GET /run?seed=trap` ×2 | ✅ PASS — byte-identical, run_id=demo-trap-001 |
>
> **P9 gate: CLOSED. Phase 2 gate: OPEN.**

---

## ✅ P9 OFFICIALLY CLOSED — Day 3

> **Closed by:** Ajit (OCR + Granite lane)
> **Verified by:** Murgesh (TRUNK)
> **Status: ALL PASS — zero bugs — Phase 2 gate OPEN**

### Final Scorecard (Real Images)

| Scenario | Image | Result | Detail |
|---|---|---|---|
| S1 Tilted Bill | `tilted_bill.jpg` | ✅ PASS | hold=null, banner present |
| S2 Blurred Bill | `blurred_bill.jpg` | ✅ PASS | hold=null, low_conf flagged |
| S3 Blank Image | empty string + 1×1 PNG | ✅ PASS | fields=[], hold=null |
| S4 Weird Table | `weird_table_bill.jpg` | ✅ PASS | null values → unverified, no gap |
| S5 Mixed Language | `mixed_language_bill.jpg` | ✅ PASS | no crash, banner always present |
| Seed Regression | `GET /run?seed=trap` ×2 | ✅ PASS | byte-identical, run_id=demo-trap-001 |

**Active bugs: 0 · Fixed bugs: 0 · Cut list: 0**
Freeze tag `freeze-trunk-v1` applied. Ajit's lane frozen.


---

## How to Add a Bug Entry

Copy the template below, fill in the fields, and paste it under **Active Bugs**.

```
### BUG-XXX: [short title]
- **Scenario:** S1 / S2 / S3 / S4 / S5
- **Severity:** CRASH | WRONG_DATA | SAFETY_VIOLATION | COSMETIC
- **Reported by:** Ajit
- **Time:** HH:MM Day 3
- **Input:** [what image / payload was sent]
- **Expected:** [what the pass criterion says should happen]
- **Actual:** [what actually happened — paste the response or error]
- **Failing check:** [copy the check label from run_adversarial.ts output]
- **Status:** OPEN
```

**Severity guide:**
- `CRASH` — engine returned 500 or threw — highest priority, fix immediately
- `SAFETY_VIOLATION` — blurred/tilted image got a PLACED hold (must always be STAGED/null)
- `WRONG_DATA` — gap/unverified status incorrect
- `COSMETIC` — banner missing or audit trail incomplete

---

## Active Bugs

*(none — P9 closed clean)*

---

## Fixed Bugs

*(none — no bugs were filed during P9)*

---

## Cut List
> Bugs that could not be fixed by 09:00 Day 3. Narrate around these in Q&A.

*(none — all scenarios passed first run)*

---

## P9 Pass Criteria Reference

| Scenario | Must NOT happen | Must happen |
|---|---|---|
| S1 Tilted | 500 crash; PLACED hold | 200 OK; hold null or STAGED |
| S2 Blurred | 500 crash; PLACED hold | 200 OK; hold STAGED or null; low_conf=true if fields present |
| S3 Blank | 500 crash; non-empty fields; non-null hold | 200 OK; fields=[]; hold=null |
| S4 Weird Table | 500 crash; gap card from null value | 200 OK; null-value fields → unverified |
| S5 Mixed Lang | 500 crash; missing banner | 200 OK; banner always present |
| Seed Regression | run_id ≠ demo-trap-001; non-identical bytes | Byte-identical; run_id=demo-trap-001 |

---

## Notes for Murgesh

When Ajit reports a bug:
1. Read the Actual response carefully — the engine side is `services/brain/src/`
2. **Never edit inside Ajit's seam markers** (`AJIT SEAM — START/END` in `01_read.ts` and `06_draft.ts`)
3. Fix only what is broken — no refactoring during P9
4. Run `npx tsc --noEmit` after every fix
5. Tell Ajit which file changed and what the fix was so he can re-run the specific scenario
6. Check seed regression after every fix: `curl http://localhost:3000/run?seed=trap` twice, diff output

---

*Pramaan · HackVerse Track 3 · P9 Bug Log*
