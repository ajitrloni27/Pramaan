// Built with IBM Bob — AI SDLC Partner

import type { ProofCard, HoldEvent } from "@pramaan/contracts";
import { billingGateway } from "../../gateway/billing_gateway.js";
import { auditLog } from "../../audit/audit_log.js";

const THRESHOLD = parseFloat(process.env["THRESHOLD"] ?? "0.90");

/**
 * ACT step — two-tier hold logic.
 *
 * EXACT ALGORITHM (order is critical — do NOT reorder):
 *   Step 1: collect ALL gap cards
 *   Step 2: sum totalDisputed across ALL gap cards (no exclusions yet)
 *   Step 3: confFloor = min(ocr_confidence) across ALL gap cards (including low-conf)
 *   Step 4: if totalDisputed <= 0 → null
 *   Step 5: if confFloor >= THRESHOLD → PLACE via MCP → "placed", reversible, +72h
 *   Step 6: if confFloor < THRESHOLD → STAGE (computed, NOT placed in gateway)
 *   Step 7: append audit event
 *
 * WHY: excluding low-conf cards BEFORE computing confFloor makes staged branch unreachable.
 * That kills the trust model. Always compute confFloor across ALL gap cards first.
 */
export async function act(
  cards: ProofCard[],
  invoice_id: string
): Promise<HoldEvent | null> {
  // Step 1: all gap cards
  const gapCards = cards.filter((c) => c.status === "gap");

  // Step 2: total disputed amount across ALL gap cards
  const totalDisputed = gapCards.reduce((sum, c) => sum + c.gap, 0);

  // Step 3: confidence floor across ALL gap cards (not filtered)
  const confidences = gapCards.map(
    (c) => c.source_anchor.ocr_confidence ?? 1.0
  );
  const confFloor = confidences.length > 0 ? Math.min(...confidences) : 1.0;

  // Step 4: no disputed amount → no hold
  if (totalDisputed <= 0) return null;

  const run_id = invoice_id; // use invoice_id as a proxy run_id for audit
  const ts = new Date().toISOString();

  // Step 5: high confidence → place via gateway
  if (confFloor >= THRESHOLD) {
    const evidencePackId = crypto.randomUUID();
    const hold = billingGateway.placeHold(
      invoice_id,
      totalDisputed,
      evidencePackId,
      confFloor
    );

    // Step 7: audit
    auditLog.append({
      t: "hold_placed",
      run_id,
      ts,
      payload: {
        hold_id: hold.hold_id,
        amount: totalDisputed,
        conf_floor: confFloor,
        gap_card_count: gapCards.length,
      },
    });

    return hold;
  }

  // Step 6: low confidence → stage (NOT placed in gateway)
  const stagedHold: HoldEvent = {
    hold_id: crypto.randomUUID(),
    invoice_id,
    amount: totalDisputed,
    status: "staged",
    reversible: true,
    expires_at: null, // not placed, no expiry
    placed_by: "auto",
    confidence_floor: confFloor,
  };

  // Step 7: audit
  auditLog.append({
    t: "hold_staged",
    run_id,
    ts,
    payload: {
      hold_id: stagedHold.hold_id,
      amount: totalDisputed,
      conf_floor: confFloor,
      gap_card_count: gapCards.length,
      reason: `confFloor ${confFloor} < THRESHOLD ${THRESHOLD}`,
    },
  });

  return stagedHold;
}
