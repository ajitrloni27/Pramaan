// Built with IBM Bob — AI SDLC Partner

import type { HoldEvent } from "@pramaan/contracts";
import { billingGateway } from "../../gateway/billing_gateway.js";

export function placeHold(
  invoice_id: string,
  amount: number,
  evidence_pack_id: string
): Pick<HoldEvent, "hold_id" | "status" | "expires_at" | "reversible"> {
  const hold = billingGateway.placeHold(invoice_id, amount, evidence_pack_id);
  return {
    hold_id: hold.hold_id,
    status: hold.status,
    expires_at: hold.expires_at,
    reversible: hold.reversible,
  };
}
