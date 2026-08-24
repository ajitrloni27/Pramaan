// Built with IBM Bob — AI SDLC Partner

import type { HoldEvent } from "@pramaan/contracts";

class BillingGateway {
  // Primary store: hold_id → HoldEvent
  private holds = new Map<string, HoldEvent>();

  // Idempotency index: "invoice_id::pack_id" → hold_id
  private idempotencyKeys = new Map<string, string>();

  /**
   * Place a hold.
   * IDEMPOTENT: same (invoice_id, pack_id) pair always returns the same HoldEvent.
   * Never creates a second freeze for the same pair.
   */
  placeHold(
    invoice_id: string,
    amount: number,
    pack_id: string,
    confidence_floor = 1.0
  ): HoldEvent {
    const iKey = `${invoice_id}::${pack_id}`;
    const existingId = this.idempotencyKeys.get(iKey);
    if (existingId !== undefined) {
      return this.holds.get(existingId)!;
    }

    const hold_id = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const hold: HoldEvent = {
      hold_id,
      invoice_id,
      amount,
      status: "placed",
      reversible: true,
      expires_at,
      placed_by: "auto",
      confidence_floor,
    };

    this.holds.set(hold_id, hold);
    this.idempotencyKeys.set(iKey, hold_id);
    return hold;
  }

  /**
   * Return the HoldEvent for a given hold_id.
   * Throws if not found.
   */
  getStatus(hold_id: string): HoldEvent {
    const hold = this.holds.get(hold_id);
    if (!hold) throw new Error("Hold not found: " + hold_id);
    return hold;
  }

  /**
   * Release a hold. Sets status to "released".
   * Throws if not found.
   */
  release(
    hold_id: string,
    _reason: "auto_expiry" | "user_withdraw" | "confirmed_then_resolved"
  ): HoldEvent {
    const hold = this.holds.get(hold_id);
    if (!hold) throw new Error("Hold not found: " + hold_id);
    hold.status = "released";
    return hold;
  }

  /**
   * Confirm a hold — human tap.
   * Keeps status "placed", sets placed_by "user".
   * Throws if not found.
   */
  confirm(hold_id: string): HoldEvent {
    const hold = this.holds.get(hold_id);
    if (!hold) throw new Error("Hold not found: " + hold_id);
    hold.placed_by = "user";
    return hold;
  }

  /**
   * Auto-expire any "placed" holds whose expires_at is before now.
   * Called on a timer to simulate 72h auto-release.
   */
  tick(now: Date): void {
    const nowIso = now.toISOString();
    for (const [hold_id, hold] of this.holds) {
      if (
        hold.status === "placed" &&
        hold.expires_at !== null &&
        hold.expires_at < nowIso
      ) {
        this.release(hold_id, "auto_expiry");
      }
    }
  }
}

export { BillingGateway };
export const billingGateway = new BillingGateway();
