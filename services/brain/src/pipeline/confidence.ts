// Built with IBM Bob — AI SDLC Partner

import type { ExtractedField } from "@pramaan/contracts";

export const THRESHOLD = 0.90;

/**
 * Apply the confidence gate to a list of extracted fields.
 * Sets low_conf = true for any field with confidence < THRESHOLD.
 * NEVER modifies the value field — report reads exactly as received.
 * There is exactly ONE confidence gate in this codebase. Do not reimplement.
 */
export function applyConfidenceGate(fields: ExtractedField[]): ExtractedField[] {
  return fields.map((f) => ({
    ...f,
    low_conf: f.confidence < THRESHOLD,
  }));
}
