// IBM: Data Prep Kit — rulebook fixtures
// Built with IBM Bob — AI SDLC Partner
// Deterministic trap seed — byte-identical across runs.
// All timestamps, run_id, and hold_id are FIXED CONSTANTS — no Date.now(), no randomUUID().

import type { ExtractedField, HoldEvent, Draft, RunResponse } from "@pramaan/contracts";

export const FIXED_RUN_ID = "demo-trap-001";

// Fixed trap fields: MRI overcharge (high-conf gap) + paracetamol (low-conf gap)
export const SEED_TRAP_FIELDS: ExtractedField[] = [
  {
    text: "MRI Brain scan",
    value: 8500,
    unit: "per scan",
    bbox: [50, 120, 300, 20],
    confidence: 0.97,
    low_conf: false,
  },
  {
    text: "Paracetamol 500mg tablet x 10",
    value: 45,
    unit: "per tablet",
    bbox: [50, 160, 300, 20],
    confidence: 0.81,
    low_conf: true,
  },
  {
    text: "CBC / Complete Blood Count",
    value: 150,
    unit: "per test",
    bbox: [50, 200, 300, 20],
    confidence: 0.95,
    low_conf: false,
  },
];

// Pre-baked hold — fixed for byte-identity
export const FIXED_HOLD: HoldEvent = {
  hold_id: "demo-hold-trap-001",
  invoice_id: "demo-invoice-trap-001",
  amount: 2100, // MRI gap: 8500-6400=2100; paracetamol goes to staged so not included in placed
  status: "placed",
  reversible: true,
  expires_at: "2026-08-12T18:00:00.000Z",
  placed_by: "auto",
  confidence_floor: 0.97,
};

// Pre-baked draft — fixed for byte-identity
export const FIXED_DRAFT: Draft = {
  text: [
    "To Whom It May Concern,",
    "",
    "I am writing to dispute the following charges on my medical bill:",
    "",
    "- MRI Brain scan: charged ₹8500 vs official ₹6400 (gap: ₹2100). MRI scan rate under CGHS 2023 is ₹6,400 per scan at empanelled hospitals.",
    "",
    "A provisional hold of ₹2100 has been placed on invoice demo-invoice-trap-001, set to auto-release in 72 hours unless confirmed (hold ID: demo-hold-trap-001).",
    "",
    "Kindly review and issue a corrected bill.",
    "",
    "Yours sincerely.",
  ].join("\n"),
  banner: "AI-generated — review before sending",
};

// Fixed audit trail timestamps
const TS_BASE = "2026-08-09T18:00:00.000Z";
const TS_01 = "2026-08-09T18:00:00.100Z";
const TS_02 = "2026-08-09T18:00:00.200Z";
const TS_03 = "2026-08-09T18:00:00.300Z";
const TS_04 = "2026-08-09T18:00:00.400Z";
const TS_05 = "2026-08-09T18:00:00.500Z";
const TS_06 = "2026-08-09T18:00:00.600Z";
void TS_BASE;

export const FIXED_AUDIT_TIMESTAMPS = {
  ocr: TS_01,
  lookup: TS_02,
  compare: TS_03,
  prove: TS_04,
  hold: TS_05,
  draft: TS_06,
};

// Pre-baked full response (used as shape reference; PATH B assembles it dynamically)
export const DETERMINISTIC_TRAP_RESPONSE_SHAPE: Omit<RunResponse, "proof_cards" | "extracted_fields"> = {
  run_id: FIXED_RUN_ID,
  domain: "bill",
  hold: FIXED_HOLD,
  draft: FIXED_DRAFT,
  audit: [
    { t: "ocr",         run_id: FIXED_RUN_ID, ts: TS_01, payload: { step: "ocr",     field_count: 3 } },
    { t: "lookup",      run_id: FIXED_RUN_ID, ts: TS_02, payload: { step: "lookup",  field_count: 3 } },
    { t: "compare",     run_id: FIXED_RUN_ID, ts: TS_03, payload: { step: "compare", card_count: 0 } },
    { t: "prove",       run_id: FIXED_RUN_ID, ts: TS_04, payload: { step: "prove",   card_count: 0 } },
    { t: "hold_placed", run_id: FIXED_RUN_ID, ts: TS_05, payload: { hold_id: FIXED_HOLD.hold_id, amount: 2100 } },
    { t: "draft",       run_id: FIXED_RUN_ID, ts: TS_06, payload: { step: "draft" } },
  ],
};
