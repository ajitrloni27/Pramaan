# PRAMAAN — The 4 Traps (and How We Beat Each One)
### Pre-Mortem Stress Test · HackVerse Track 3 · 24 July 2026
*The idea is locked. This is where we try to break it before the judges do.*

---

## Trap 1 — The "Garbage In, Garbage Out" OCR Reality

**The Assumption:** Pramaan "reads the paper" and extracts the numbers perfectly.

**The Reality:** Indian hospital bills and rental agreements are nightmares — faded thermal paper, tilted photos, complex nested tables, mixed languages. If OCR fails on stage and reads ₹4,500 instead of ₹45,000, our "deterministic math" will confidently tell the user they *underpaid*. One bad extraction and a judge disqualifies us.

**The Fix:**
1. **The Demo Cheat** — For the live 90-second demo, use a cleanly printed, digitally generated "mock" bill that looks 100% authentic but is optimized for OCR. Never demo on a real crumpled receipt.
2. **The UI Fallback** — Build a "Human-in-the-Loop" correction step. If OCR confidence is below 90%, the middle box highlights the number in yellow: *"Agent unsure. Tap to confirm: ₹45,000?"* This turns a technical failure into a **trust-and-safety feature**. Judges love systems that know when they're unsure.

---

## Trap 2 — The "Action" Deficit (The Agentic Illusion)

**The Assumption:** "Getting a letter ready and waiting for a tap" counts as an agentic action.

**The Reality:** To a hardcore IBM engineer, generating a PDF complaint letter is just a mail-merge — not "Agentic AI." The winners we studied (NexusGuardAI) *actually altered system states*: locked accounts, blocked payments. Drafting a document doesn't clear that bar.

**The Fix:** Pramaan must do more than draft a letter — it must use **MCP (Model Context Protocol)** to interact with a mock external system.
- **The BillCheck flow:** After finding the overcharge, the agent doesn't just draft a letter. It uses an MCP tool to ping a mock "Hospital Billing Gateway API" and places a **"Programmatic Dispute Hold"** on that specific Invoice ID.
- **The pitch:** *"Pramaan doesn't just write a complaint; it integrates with billing gateways to freeze the disputed amount at the source while the human reviews the evidence."* **That** is an agent.

---

## Trap 3 — The "Rule-Book" Time Sink

**The Assumption:** "We just teach it a new rule-book."

**The Reality:** Curating a comprehensive database of CGHS medical rates or the entire Model Tenancy Act will take the team 4 days. We have 36 hours. Spend 20 hours scraping PDFs and there's no time left for the UI or the agent orchestration.

**The Fix — Ruthless Scoping:** Don't build a comprehensive rule-book. Build a **"Highlight Reel" rule-book.**
- Hardcode exactly **10–15 high-impact rules** into a clean JSON file.
- **For Bills:** 5 common overcharged procedures (MRI, Cardiac, Room Rent) + 5 common consumables (Paracetamol, Gloves).
- **For Leases:** 5 illegal clauses (non-refundable deposit, 6-month lock-in, landlord entry without notice).
- **When a judge asks** "Does it know all laws?" → *"The engine supports infinite rules. For this 36-hour sprint, we curated the 15 most financially damaging violations to prove the architecture."*

---

## Trap 4 — The IBM Stack "Fake-Out"

**The Assumption:** Slapping the Watsonx logo on the slide is enough.

**The Reality:** IBM judges spot a fake integration in 10 seconds. If we just use LangChain + OpenAI and say "we used IBM," they will penalize us.

**The Fix — Architectural Alignment:** Map the components explicitly to the IBM stack, in code *and* in the proposal:

| Component | IBM Stack |
|---|---|
| Orchestration | **watsonx Orchestrate** (or IBM Agent Lab) to chain Extractor → Comparator → Drafter |
| LLM Drafting | **IBM Granite** (Granite-3.0-8B-Instruct) for plain-language summaries + letters — open, sovereign, fast |
| Tool Calling | **MCP (Model Context Protocol)** to connect the agent to the rule-book JSON + mock Billing API |

> Mentioning MCP explicitly in the proposal is massive bait for 2026 judges.

---

## The Bottom Line

Pramaan is a **Tier-S hackathon idea** — emotional hook, technical depth, scalability (the Tree), and a defensive moat (proof, not opinions).

But to win, we move from **Philosophy → Execution**:
- The **"Tree"** metaphor is for the team's sanity.
- The **Hospital Bill (Branch 1)** is for the judge's eyes.

Beat these 4 traps and the idea survives contact with the stage.