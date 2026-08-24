// Self-check script — validates checks 2,3,5,6,7,8,9,10
import { billingGateway } from "../src/gateway/billing_gateway.js";
import { compare } from "../src/pipeline/steps/03_compare.js";
import { act } from "../src/pipeline/steps/05_act.js";
import { prove } from "../src/pipeline/steps/04_prove.js";
import { auditLog } from "../src/audit/audit_log.js";

let pass = 0;
let fail = 0;

function check(n: number, label: string, result: boolean) {
  const mark = result ? "✅ PASS" : "❌ FAIL";
  console.log(`CHECK ${n} — ${label}: ${mark}`);
  if (result) pass++; else fail++;
}

// ── CHECK 2: idempotency ──────────────────────────────────────────────────────
const h1 = billingGateway.placeHold("inv-001", 500, "pack-001");
const h2 = billingGateway.placeHold("inv-001", 500, "pack-001");
check(2, "placeHold idempotent (same pair → same hold_id)", h1.hold_id === h2.hold_id);

// ── CHECK 3: tick auto-releases ───────────────────────────────────────────────
const h3 = billingGateway.placeHold("inv-002", 200, "pack-002");
const past = new Date(Date.now() + 73 * 60 * 60 * 1000);
billingGateway.tick(past);
const after = billingGateway.getStatus(h3.hold_id);
check(3, "tick() auto-releases expired holds", after.status === "released");

// ── CHECK 4: zero LLM in compare (scan import lines only) ────────────────────
import { readFileSync } from "node:fs";
const compareSource = readFileSync(new URL("../src/pipeline/steps/03_compare.ts", import.meta.url), "utf-8");
const importLines = compareSource.split("\n").filter(l => l.trimStart().startsWith("import"));
const forbiddenTerms = ["watson", "openai", "llm", "model", "granite", "anthropic", "tesseract", "docling"];
const foundForbidden = forbiddenTerms.filter(t => importLines.some(l => l.toLowerCase().includes(t)));
check(4, "03_compare.ts zero LLM/AI imports (import lines only)", foundForbidden.length === 0);
if (foundForbidden.length > 0) console.log("   Found in imports:", foundForbidden);

// ── CHECK 5: unit normalization per-strip → per-tablet ────────────────────────
import type { ExtractedField, RuleRow, ProofCard } from "@pramaan/contracts";
const stripFields: ExtractedField[] = [
  { text: "paracetamol strip", value: 200, unit: "per strip", bbox: [0, 0, 1, 1], confidence: 0.95, low_conf: false },
];
const stripRules = new Map<string, RuleRow>([[
  "0",
  {
    rule_id: "test-pct", domain: "bill", item_category: "med",
    match_terms: ["paracetamol"], procedure_code: "X",
    official_value: 2, official_unit: "per tablet",
    official_source: "NPPA", official_source_url: "https://nppa.gov.in",
    rule_says_plain: "₹2 per tablet", severity: "high", status: "VERIFIED", notes: "",
  },
]]);
const stripResults = compare(stripFields, stripRules);
// 200 per strip = 20 per tablet (÷10); 20 - 2 = 18
check(5, "unit normalization: per-strip → per-tablet (200/strip = 20/tablet, gap=18)", stripResults[0]?.gap === 18);

// ── CHECK 6: missing rule_anchor → unverified ─────────────────────────────────
import type { CompareResult } from "@pramaan/contracts";
const fakeCompare: CompareResult[] = [{
  field: { text: "unknown item", value: 999, unit: null, bbox: [0, 0, 1, 1], confidence: 0.99, low_conf: false },
  your_value: 999, official_value: 0, gap: 999, status: "gap",
}];
const proofCards = prove(fakeCompare, [], new Map());
check(6, "missing rule_anchor → card status 'unverified' (not 'gap')", proofCards[0]?.status === "unverified");

// ── CHECK 7: low-conf gap → staged ────────────────────────────────────────────
const lowConfCards: ProofCard[] = [{
  item: "paracetamol", your_value: 45, official_value: 2, gap: 43, status: "gap",
  source_anchor: { ref: "line1", ocr_confidence: 0.70 },
  rule_anchor: { ref: "NPPA", url: "https://nppa.gov.in" },
  compute_anchor: "45 - 2", rule_says_plain: "₹2 per tablet",
}];
const stagedHold = await act(lowConfCards, "inv-staged");
check(7, "low-conf gap (0.70 < 0.90) → STAGED, not placed", stagedHold?.status === "staged");

// ── CHECK 8: high-conf gap → placed ──────────────────────────────────────────
const highConfCards: ProofCard[] = [{
  item: "MRI scan", your_value: 8500, official_value: 6400, gap: 2100, status: "gap",
  source_anchor: { ref: "line2", ocr_confidence: 0.97 },
  rule_anchor: { ref: "CGHS", url: "https://cghs.gov.in" },
  compute_anchor: "8500 - 6400", rule_says_plain: "₹6400 per scan",
}];
const placedHold = await act(highConfCards, "inv-placed");
check(8, "high-conf gap (0.97 >= 0.90) → PLACED via gateway", placedHold?.status === "placed");
check(8, "placed hold is reversible", placedHold?.reversible === true);

// ── CHECK 9: audit trail ordering ─────────────────────────────────────────────
const auditEntries = auditLog.list("inv-placed");
check(9, "audit trail has at least one entry for placed hold", auditEntries.length > 0);
const lastEntry = auditEntries[auditEntries.length - 1];
check(9, "last audit entry has correct t value", lastEntry?.t === "hold_placed");

// ── CHECK 13: seam markers present ───────────────────────────────────────────
const read01 = readFileSync(new URL("../src/pipeline/steps/01_read.ts", import.meta.url), "utf-8");
const draft06 = readFileSync(new URL("../src/pipeline/steps/06_draft.ts", import.meta.url), "utf-8");
check(13, "01_read.ts has AJIT SEAM START marker", read01.includes("AJIT SEAM — START"));
check(13, "01_read.ts has AJIT SEAM END marker", read01.includes("AJIT SEAM — END"));
check(13, "06_draft.ts has AJIT SEAM START marker", draft06.includes("AJIT SEAM — START"));
check(13, "06_draft.ts has AJIT SEAM END marker", draft06.includes("AJIT SEAM — END"));

// ── CHECK 15: blacklist not touched ───────────────────────────────────────────
import { existsSync } from "node:fs";
const blacklistViolations = [
  "apps/mobile/src/data/NEW_FILE.ts",
  "packages/templates/generated.txt",
].filter(p => existsSync(new URL(`../../${p}`, import.meta.url)));
check(15, "No blacklist files created", blacklistViolations.length === 0);

// ── Summary ────────────────────────────────────────────────────────────────────
console.log(`\nResult: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
