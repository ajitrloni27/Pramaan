// IBM: Data Prep Kit — rulebook fixtures
// Built with IBM Bob — AI SDLC Partner
// Deterministic control seed — clean bill, zero gaps, zero hold.
// Used for the P7 restraint beat: proves the engine does NOT flag a clean bill.

import type { ExtractedField } from "@pramaan/contracts";

export const FIXED_CONTROL_RUN_ID = "demo-control-001";

/**
 * CONTROL_SEED_FIELDS: 6 items, all confidence >= 0.95, all matching rulebook_stub entries
 * exactly so gap = 0 for every field.
 * No hold, no draft needed — the orchestrator produces hold: null naturally when no gaps exist.
 */
export const CONTROL_SEED_FIELDS: ExtractedField[] = [
  {
    text: "MRI Brain scan",
    value: 6400, // exactly the official CGHS rate — gap = 0
    unit: "per scan",
    bbox: [50, 120, 300, 20],
    confidence: 0.98,
    low_conf: false,
  },
  {
    text: "Paracetamol 500mg tablet x 10",
    value: 2, // exactly the official DPCO rate — gap = 0
    unit: "per tablet",
    bbox: [50, 160, 300, 20],
    confidence: 0.97,
    low_conf: false,
  },
  {
    text: "CBC / Complete Blood Count",
    value: 150, // exactly the official CGHS rate — gap = 0
    unit: "per test",
    bbox: [50, 200, 300, 20],
    confidence: 0.96,
    low_conf: false,
  },
  {
    text: "Consultation fee",
    value: 500,
    unit: null, // no matching rule → skipped silently by compare
    bbox: [50, 240, 300, 20],
    confidence: 0.99,
    low_conf: false,
  },
  {
    text: "Bandage and dressing",
    value: 120,
    unit: null, // no matching rule → skipped silently
    bbox: [50, 280, 300, 20],
    confidence: 0.95,
    low_conf: false,
  },
  {
    text: "Room charges (general ward)",
    value: 1200,
    unit: null, // no matching rule → skipped silently
    bbox: [50, 320, 300, 20],
    confidence: 0.97,
    low_conf: false,
  },
];
