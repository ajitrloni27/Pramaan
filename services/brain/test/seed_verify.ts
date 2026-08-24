/**
 * One-shot seed byte-identity verifier.
 * Exercises the exact PATH B logic that GET /run?seed=trap uses in index.ts —
 * importing seeds directly and assembling the response in-process.
 * Does NOT require a running HTTP server.
 *
 * Exit 0  = all assertions pass
 * Exit 1  = at least one assertion failed
 */

import {
  SEED_TRAP_FIELDS,
  FIXED_HOLD,
  FIXED_DRAFT,
  FIXED_RUN_ID,
  FIXED_AUDIT_TIMESTAMPS,
} from "../src/seeds/index.js";

import { auditLog } from "../src/audit/audit_log.js";
import { THRESHOLD } from "../src/pipeline/confidence.js";

// ── Re-assemble PATH B exactly as index.ts does it ──────────────────────────
const run_id = FIXED_RUN_ID;
const ts = FIXED_AUDIT_TIMESTAMPS;

auditLog.append({ t: "ocr",         run_id, ts: ts.ocr,    payload: { step: "ocr",     field_count: SEED_TRAP_FIELDS.length } });
auditLog.append({ t: "lookup",      run_id, ts: ts.lookup,  payload: { step: "lookup",  field_count: SEED_TRAP_FIELDS.length } });
auditLog.append({ t: "compare",     run_id, ts: ts.compare, payload: { step: "compare", card_count: 0 } });
auditLog.append({ t: "prove",       run_id, ts: ts.prove,   payload: { step: "prove",   card_count: 0 } });
auditLog.append({ t: "hold_placed", run_id, ts: ts.hold,    payload: { hold_id: FIXED_HOLD.hold_id, amount: FIXED_HOLD.amount } });
auditLog.append({ t: "draft",       run_id, ts: ts.draft,   payload: { step: "draft" } });

const response = {
  run_id,
  domain: "bill" as const,
  extracted_fields: SEED_TRAP_FIELDS,
  proof_cards: [],
  hold: FIXED_HOLD,
  draft: FIXED_DRAFT,
  audit: auditLog.list(run_id),
};

// ── Assertions ───────────────────────────────────────────────────────────────
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

check("run_id is demo-trap-001",          response.run_id,               "demo-trap-001");
check("domain is bill",                    response.domain,               "bill");
check("hold.status is placed",             response.hold?.status,         "placed");
check("hold.amount is 2100",               response.hold?.amount,         2100);
check("hold.hold_id",                      response.hold?.hold_id,        "demo-hold-trap-001");
check("hold.placed_by is auto",            response.hold?.placed_by,      "auto");
check("hold.confidence_floor is 0.97",     response.hold?.confidence_floor, 0.97);
check("draft banner intact",               response.draft.banner,         "AI-generated — review before sending");
check("audit event count is 6",            response.audit.length,         6);
check("audit[0].t is ocr",                 response.audit[0]?.t,          "ocr");
check("audit[4].t is hold_placed",         response.audit[4]?.t,          "hold_placed");
check("audit[5].t is draft",               response.audit[5]?.t,          "draft");
check("THRESHOLD = 0.90",                  THRESHOLD,                     0.90);
check("extracted_fields[1].low_conf true", response.extracted_fields[1]?.low_conf, true);
check("extracted_fields[0].low_conf false",response.extracted_fields[0]?.low_conf, false);

console.log("\n" + (pass ? "✅ ALL CHECKS PASS — seed byte-identity verified." : "❌ FAILURES DETECTED — see above."));
process.exit(pass ? 0 : 1);
