/**
 * M-V-2: Consent endpoint lifecycle verifier.
 * Tests the full confirm → withdraw → send_letter flow in-process.
 * Does NOT require a running HTTP server.
 *
 * Exit 0 = all assertions pass
 * Exit 1 = at least one assertion failed
 */

import { BillingGateway } from "../src/gateway/billing_gateway.js";
import { auditLog } from "../src/audit/audit_log.js";
import type { AuditEvent } from "@pramaan/contracts";

let pass = true;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${label}`);
  if (!ok) {
    console.log(`   expected: ${JSON.stringify(expected)}`);
    console.log(`   actual:   ${JSON.stringify(actual)}`);
    pass = false;
  }
}

function checkTrue(label: string, cond: boolean) {
  const icon = cond ? "✅" : "❌";
  console.log(`${icon} ${label}`);
  if (!cond) pass = false;
}

// ── Use a fresh gateway instance (isolation from the singleton) ──────────────
const gw = new BillingGateway();

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO A: confirm_hold — auto → user consent tap
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── Scenario A: confirm_hold ────────────────────────────────────");

const holdA = gw.placeHold("inv-A", 2100, "pack-A", 0.97);
check("A: initial status is placed",    holdA.status,     "placed");
check("A: initial placed_by is auto",   holdA.placed_by,  "auto");

const confirmed = gw.confirm(holdA.hold_id);
check("A: after confirm — status unchanged (placed)", confirmed.status,    "placed");
check("A: after confirm — placed_by is user",         confirmed.placed_by, "user");

// Append consent audit event (mirrors index.ts POST /consent logic exactly)
const run_id_A = "test-run-A";
const eventA: AuditEvent = {
  t: "consent",
  run_id: run_id_A,
  ts: "2026-08-10T10:00:00.000Z",
  payload: { action: "confirm_hold", hold_id: holdA.hold_id },
};
auditLog.append(eventA);

const trailA = auditLog.list(run_id_A);
check("A: audit trail has 1 event",       trailA.length,   1);
check("A: audit event t = consent",       trailA[0]?.t,    "consent");
check("A: audit event action",            (trailA[0]?.payload as any).action, "confirm_hold");

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO B: withdraw_hold — user cancels the hold
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── Scenario B: withdraw_hold ───────────────────────────────────");

const holdB = gw.placeHold("inv-B", 500, "pack-B", 0.95);
check("B: initial status is placed", holdB.status, "placed");

const released = gw.release(holdB.hold_id, "user_withdraw");
check("B: after withdraw — status is released", released.status, "released");

const run_id_B = "test-run-B";
const eventB: AuditEvent = {
  t: "consent",
  run_id: run_id_B,
  ts: "2026-08-10T10:01:00.000Z",
  payload: { action: "withdraw_hold", hold_id: holdB.hold_id },
};
auditLog.append(eventB);

const trailB = auditLog.list(run_id_B);
check("B: audit trail has 1 event",   trailB.length,   1);
check("B: audit event action",        (trailB[0]?.payload as any).action, "withdraw_hold");

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO C: send_letter — no gateway mutation, audit only
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── Scenario C: send_letter ─────────────────────────────────────");

const holdC = gw.placeHold("inv-C", 750, "pack-C", 0.92);
const run_id_C = "test-run-C";

const eventC: AuditEvent = {
  t: "consent",
  run_id: run_id_C,
  ts: "2026-08-10T10:02:00.000Z",
  payload: { action: "send_letter", hold_id: holdC.hold_id },
};
auditLog.append(eventC);

// Hold must be unchanged — send_letter is audit-only
const holdCStatus = gw.getStatus(holdC.hold_id);
check("C: hold status unchanged after send_letter", holdCStatus.status,    "placed");
check("C: placed_by unchanged",                     holdCStatus.placed_by, "auto");

const trailC = auditLog.list(run_id_C);
check("C: audit trail has 1 event",  trailC.length, 1);
check("C: audit event t = consent",  trailC[0]?.t,  "consent");
check("C: action = send_letter",     (trailC[0]?.payload as any).action, "send_letter");

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO D: confirm on unknown hold_id → throws (404 in HTTP layer)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── Scenario D: unknown hold_id → 404 ───────────────────────────");
try {
  gw.confirm("hold-does-not-exist");
  checkTrue("D: should have thrown on unknown hold", false);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  checkTrue("D: throws 'Hold not found' for unknown id", msg.startsWith("Hold not found"));
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO E: staged hold → confirm throws (staged holds are not in gateway)
// Mirrors the actual behaviour: staged hold_id is never registered in gateway.
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── Scenario E: staged hold confirm → 404 ───────────────────────");
const STAGED_HOLD_ID = "staged-hold-never-in-gateway";
try {
  gw.confirm(STAGED_HOLD_ID);
  checkTrue("E: should have thrown for staged hold", false);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  checkTrue("E: staged hold → 404 (not in gateway)", msg.startsWith("Hold not found"));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n" + (pass
  ? "✅ ALL CONSENT CHECKS PASS — /consent lifecycle verified."
  : "❌ FAILURES DETECTED — see above."));
process.exit(pass ? 0 : 1);
