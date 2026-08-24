// Built with IBM Bob — AI SDLC Partner

import type { HoldEvent } from "@pramaan/contracts";
import { billingGateway } from "../../gateway/billing_gateway.js";

export function getHoldStatus(hold_id: string): HoldEvent {
  return billingGateway.getStatus(hold_id);
}
