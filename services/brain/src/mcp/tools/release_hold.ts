// Built with IBM Bob — AI SDLC Partner

import type { HoldEvent } from "@pramaan/contracts";
import { billingGateway } from "../../gateway/billing_gateway.js";

export function releaseHold(
  hold_id: string,
  reason: "auto_expiry" | "user_withdraw" | "confirmed_then_resolved"
): HoldEvent {
  return billingGateway.release(hold_id, reason);
}
