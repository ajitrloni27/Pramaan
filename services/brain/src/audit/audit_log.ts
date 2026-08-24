// IBM: AgentOps — consent + audit + governance layer
// Built with IBM Bob — AI SDLC Partner

import type { AuditEvent } from "@pramaan/contracts";

class AuditLog {
  private readonly _log: AuditEvent[] = [];

  /**
   * Append an event. APPEND-ONLY — never update, never delete.
   * A release/confirm is a NEW event, not an edit to a prior one.
   */
  append(event: AuditEvent): void {
    this._log.push(event);
  }

  /**
   * Return all events for a run_id, in insertion order.
   */
  list(run_id: string): AuditEvent[] {
    return this._log.filter((e) => e.run_id === run_id);
  }
}

export const auditLog = new AuditLog();
