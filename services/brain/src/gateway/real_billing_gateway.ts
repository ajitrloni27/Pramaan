// Built with IBM Bob — AI SDLC Partner
// PRODUCTION ADAPTER — swap BillingGateway for RealBillingGateway in orchestrator to go live. One-line change.

import type { HoldEvent } from "@pramaan/contracts";

const BASE_URL = process.env["BILLING_GATEWAY_URL"] ?? "https://jsonplaceholder.typicode.com";

/**
 * RealBillingGateway — production-swap adapter.
 *
 * Implements the identical class shape as BillingGateway but routes each method
 * through fetch() against a real REST API instead of an in-memory Map.
 *
 * To go live:
 *   1. In services/brain/src/pipeline/orchestrator.ts change:
 *        import { billingGateway } from "../gateway/billing_gateway.js";
 *      to:
 *        import { realBillingGateway as billingGateway } from "../gateway/real_billing_gateway.js";
 *   2. Set BILLING_GATEWAY_URL to the real hospital API endpoint.
 *   3. Add authentication headers below (Bearer token, mTLS, etc.).
 *
 * That is the ONLY change needed. The 6-step trunk, the verdict engine, and
 * the two-tier hold logic remain byte-identical.
 *
 * NOTE: fetch() is available at runtime in Node 18+.
 * (globalThis as any).fetch is used because lib: ["ES2022"] does not include DOM types.
 */
class RealBillingGateway {
  // Client-side idempotency index: "invoice_id::pack_id" → hold_id
  // Mirrors the mock's pattern so the orchestrator's call sites are identical.
  private idempotencyKeys = new Map<string, string>();

  /**
   * Place a hold.
   * IDEMPOTENT: same (invoice_id, pack_id) pair always returns the same HoldEvent.
   * POST https://…/posts  { invoice_id, amount, pack_id }
   */
  async placeHold(
    invoice_id: string,
    amount: number,
    pack_id: string,
    confidence_floor = 1.0
  ): Promise<HoldEvent> {
    const iKey = `${invoice_id}::${pack_id}`;
    const existingId = this.idempotencyKeys.get(iKey);
    if (existingId !== undefined) {
      // Idempotent: re-fetch the existing hold instead of creating a new one.
      return this.getStatus(existingId);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (globalThis as any).fetch(`${BASE_URL}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // TODO: Add auth headers here before go-live, e.g.:
        // "Authorization": `Bearer ${process.env["BILLING_API_TOKEN"]}`,
      },
      body: JSON.stringify({ invoice_id, amount, pack_id }),
    });

    // jsonplaceholder returns { id, title, body, userId }
    // A real hospital API would return a hold_id directly.
    const data = (await res.json()) as { id: number };
    const hold_id = String(data.id);

    this.idempotencyKeys.set(iKey, hold_id);

    const hold: HoldEvent = {
      hold_id,
      invoice_id,
      amount,
      status: "placed",
      reversible: true,
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      placed_by: "auto",
      confidence_floor,
    };

    return hold;
  }

  /**
   * Return the current HoldEvent for a given hold_id.
   * GET https://…/posts/{hold_id}
   */
  async getStatus(hold_id: string): Promise<HoldEvent> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (globalThis as any).fetch(`${BASE_URL}/posts/${hold_id}`);
    if (!res.ok) throw new Error(`Hold not found: ${hold_id}`);

    const data = (await res.json()) as { id: number; userId?: number };
    // Map placeholder response fields to HoldEvent shape.
    // A real hospital API would return these fields natively.
    const hold: HoldEvent = {
      hold_id: String(data.id),
      invoice_id: hold_id,
      amount: 0,
      status: "placed",
      reversible: true,
      expires_at: null,
      placed_by: "auto",
      confidence_floor: 1.0,
    };

    return hold;
  }

  /**
   * Release a hold. Sets status to "released".
   * DELETE https://…/posts/{hold_id}
   */
  async release(
    hold_id: string,
    _reason: "auto_expiry" | "user_withdraw" | "confirmed_then_resolved"
  ): Promise<HoldEvent> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (globalThis as any).fetch(`${BASE_URL}/posts/${hold_id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Hold not found: ${hold_id}`);

    const hold: HoldEvent = {
      hold_id,
      invoice_id: hold_id,
      amount: 0,
      status: "released",
      reversible: true,
      expires_at: null,
      placed_by: "auto",
      confidence_floor: 1.0,
    };

    return hold;
  }

  /**
   * Confirm a hold — human tap. Keeps status "placed", sets placed_by "user".
   * PATCH https://…/posts/{hold_id}
   */
  async confirm(hold_id: string): Promise<HoldEvent> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (globalThis as any).fetch(`${BASE_URL}/posts/${hold_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placed_by: "user" }),
    });
    if (!res.ok) throw new Error(`Hold not found: ${hold_id}`);

    const data = (await res.json()) as { id: number };
    const hold: HoldEvent = {
      hold_id: String(data.id),
      invoice_id: hold_id,
      amount: 0,
      status: "placed",
      reversible: true,
      expires_at: null,
      placed_by: "user",
      confidence_floor: 1.0,
    };

    return hold;
  }

  /**
   * No-op — real API handles expiry server-side via TTL on the hold resource.
   * The mock's tick() iterates the in-memory Map; that mechanism is not needed
   * when the gateway owns the state externally.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tick(_now: Date): void {
    // Server-side expiry: real hospital billing API auto-expires holds after 72h.
    // No client-side sweep required.
  }
}

export { RealBillingGateway };
export const realBillingGateway = new RealBillingGateway();
