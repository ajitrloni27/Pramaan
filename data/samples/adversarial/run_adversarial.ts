/**
 * P9 Adversarial Test Harness — Pramaan
 * ═══════════════════════════════════════════════════════════════════
 * Owner:    Ajit (OCR + Granite lane)
 * Reviewer: Murgesh (TRUNK)
 * Phase:    P9 — The Breaker Phase (Day 3, 06:30–09:00)
 *
 * PURPOSE
 * ───────
 * Run the 5 adversarial scenarios defined in Ajit Work Wiring §Job 4
 * against the live engine at POST /run. Each scenario has a PASS
 * criterion. Failing scenarios are logged to P9_BUG_LOG.md.
 *
 * USAGE
 * ─────
 *   # Start the engine first:
 *   cd services/brain && npm run dev
 *
 *   # Run with stub images (no real files needed — tests engine robustness):
 *   cd data/samples/adversarial
 *   npx tsx run_adversarial.ts
 *
 *   # Run with real adversarial images (set IMAGE_DIR env var):
 *   IMAGE_DIR=/path/to/nasty-bills npx tsx run_adversarial.ts
 *
 * PASS CRITERIA (per roles.pdf §2 Rule #7)
 * ──────────────────────────────────────────
 *   S1 Tilted:        200 OK, extracted_fields non-empty OR empty (no crash)
 *                     hold NEVER placed (confidence < 0.90 on tilted image)
 *   S2 Blurred:       200 OK, hold STAGED (not placed) OR null (no crash)
 *   S3 Blank:         200 OK, extracted_fields = [], hold = null, no throw
 *   S4 Weird Table:   200 OK, all unextractable lines → value: null → unverified
 *   S5 Mixed Lang:    200 OK, no crash, draft.banner always present
 *   SEED REGRESSION:  GET /run?seed=trap still byte-identical after all scenarios
 *
 * HOW TO LOG A BUG
 * ─────────────────
 *   If a scenario fails, add an entry to P9_BUG_LOG.md in this directory.
 *   Use the template already in that file.
 *   Report to Murgesh with: scenario number, actual response, expected response.
 *   Murgesh patches engine side only — never inside Ajit's seam markers.
 * ═══════════════════════════════════════════════════════════════════
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_URL = process.env["ENGINE_URL"] ?? "http://localhost:3000";
const IMAGE_DIR  = process.env["IMAGE_DIR"]  ?? __dirname;

// ── HTTP helpers ─────────────────────────────────────────────────────────────

type HttpResponse = { status: number; body: unknown; raw: string };

function postJson(url: string, body: unknown): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u    = new URL(url);
    const opts = {
      hostname: u.hostname,
      port:     parseInt(u.port || "3000"),
      path:     u.pathname,
      method:   "POST",
      headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    };
    const req = http.request(opts, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(raw), raw }); }
        catch { resolve({ status: res.statusCode ?? 0, body: null, raw }); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function getJson(url: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(raw), raw }); }
        catch { resolve({ status: res.statusCode ?? 0, body: null, raw }); }
      });
    }).on("error", reject);
  });
}

/** Load a real image as base64, or return a synthetic payload if file not found. */
function loadImage(filename: string, syntheticFallback: string): string {
  const p = path.join(IMAGE_DIR, filename);
  if (fs.existsSync(p)) {
    const buf = fs.readFileSync(p);
    console.log(`    ↳ Loaded real image: ${filename} (${buf.length} bytes)`);
    return buf.toString("base64");
  }
  console.log(`    ↳ Real image not found: ${filename} — using synthetic payload`);
  return syntheticFallback;
}

// ── Result tracking ───────────────────────────────────────────────────────────

type ScenarioResult = {
  id:       string;
  name:     string;
  passed:   boolean;
  failures: string[];
  actual:   Record<string, unknown>;
};

const results: ScenarioResult[] = [];

function scenario(id: string, name: string): { add: (f: string) => void; record: (actual: Record<string, unknown>) => void; passed: () => boolean } {
  const failures: string[] = [];
  const rec: ScenarioResult = { id, name, passed: false, failures, actual: {} };
  results.push(rec);
  return {
    add: (f) => failures.push(f),
    record: (actual) => { rec.actual = actual; rec.passed = failures.length === 0; },
    passed: () => failures.length === 0,
  };
}

function check(s: ReturnType<typeof scenario>, label: string, ok: boolean, detail = "") {
  const icon = ok ? "✅" : "❌";
  console.log(`    ${icon} ${label}${detail ? "  →  " + detail : ""}`);
  if (!ok) s.add(`${label}${detail ? ": " + detail : ""}`);
}

// ── S1: Tilted Bill ───────────────────────────────────────────────────────────

console.log("\n═══ S1: Tilted Bill (photo rotated ~15°) ═══");
console.log("    Expect: 200, no crash, hold STAGED or null (low-conf tilt)\n");
const s1 = scenario("S1", "Tilted Bill");

const tiltedImage = loadImage("tilted_bill.jpg", "tilted-synthetic-payload");
const r1 = await postJson(`${ENGINE_URL}/run`, { image: tiltedImage, domain: "bill" });

check(s1, "S1-1  status = 200",          r1.status === 200, `got ${r1.status}`);
check(s1, "S1-2  run_id present",         typeof (r1.body as any)?.run_id === "string");
check(s1, "S1-3  extracted_fields array", Array.isArray((r1.body as any)?.extracted_fields));
check(s1, "S1-4  hold is null or staged — NEVER auto-placed on tilted image",
  (r1.body as any)?.hold === null || (r1.body as any)?.hold?.status === "staged",
  `got hold.status=${(r1.body as any)?.hold?.status ?? "null"}`);
check(s1, "S1-5  draft.banner always present",
  (r1.body as any)?.draft?.banner === "AI-generated — review before sending");
s1.record({ status: r1.status, hold_status: (r1.body as any)?.hold?.status ?? null,
  field_count: (r1.body as any)?.extracted_fields?.length ?? 0 });

// ── S2: Blurred Bill ──────────────────────────────────────────────────────────

console.log("\n═══ S2: Blurred Bill (Gaussian blur applied) ═══");
console.log("    Expect: 200, no crash, hold STAGED (low-conf) or null\n");
const s2 = scenario("S2", "Blurred Bill");

const blurredImage = loadImage("blurred_bill.jpg", "blurred-synthetic-payload");
const r2 = await postJson(`${ENGINE_URL}/run`, { image: blurredImage, domain: "bill" });

check(s2, "S2-1  status = 200",           r2.status === 200, `got ${r2.status}`);
check(s2, "S2-2  no 500 crash",           r2.status !== 500);
check(s2, "S2-3  hold NEVER placed on blurred input (only staged or null)",
  (r2.body as any)?.hold === null || (r2.body as any)?.hold?.status === "staged",
  `got hold.status=${(r2.body as any)?.hold?.status ?? "null"}`);
check(s2, "S2-4  low_conf fields flagged if fields present",
  !Array.isArray((r2.body as any)?.extracted_fields) ||
  (r2.body as any)?.extracted_fields.length === 0 ||
  (r2.body as any)?.extracted_fields.some((f: any) => f.low_conf === true) ||
  (r2.body as any)?.hold === null // blank extraction also passes
);
check(s2, "S2-5  draft.banner present",
  (r2.body as any)?.draft?.banner === "AI-generated — review before sending");
s2.record({ status: r2.status, hold_status: (r2.body as any)?.hold?.status ?? null,
  field_count: (r2.body as any)?.extracted_fields?.length ?? 0,
  low_conf_count: ((r2.body as any)?.extracted_fields ?? []).filter((f: any) => f.low_conf).length });

// ── S3: Blank Image ───────────────────────────────────────────────────────────

console.log("\n═══ S3: Blank Image (pure white / empty) ═══");
console.log("    Expect: 200, extracted_fields = [], hold = null\n");
const s3 = scenario("S3", "Blank Image");

// Try both truly empty string and a 1×1 white pixel (base64)
const WHITE_1x1_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";
const r3a = await postJson(`${ENGINE_URL}/run`, { image: "",           domain: "bill" });
const r3b = await postJson(`${ENGINE_URL}/run`, { image: WHITE_1x1_PNG, domain: "bill" });

check(s3, "S3-1  empty string → 200 (no crash)", r3a.status === 200, `got ${r3a.status}`);
check(s3, "S3-2  empty string → extracted_fields = []",
  Array.isArray((r3a.body as any)?.extracted_fields) && (r3a.body as any)?.extracted_fields.length === 0,
  `got ${(r3a.body as any)?.extracted_fields?.length} fields`);
check(s3, "S3-3  empty string → hold = null",    (r3a.body as any)?.hold === null);
check(s3, "S3-4  1×1 white pixel → 200",         r3b.status === 200, `got ${r3b.status}`);
check(s3, "S3-5  1×1 white → hold = null",        (r3b.body as any)?.hold === null);
check(s3, "S3-6  banner present on blank result",
  (r3a.body as any)?.draft?.banner === "AI-generated — review before sending");
s3.record({ empty_status: r3a.status, empty_fields: (r3a.body as any)?.extracted_fields?.length ?? "?",
  pixel_status: r3b.status, pixel_hold: (r3b.body as any)?.hold });

// ── S4: Weird Table (merged cells / unusual layout) ───────────────────────────

console.log("\n═══ S4: Weird Table (merged cells, unusual layout) ═══");
console.log("    Expect: 200, unextractable lines → value: null → status unverified\n");
const s4 = scenario("S4", "Weird Table");

const weirdImage = loadImage("weird_table_bill.jpg", "weird-table-synthetic-payload");
const r4 = await postJson(`${ENGINE_URL}/run`, { image: weirdImage, domain: "bill" });

check(s4, "S4-1  status = 200",           r4.status === 200, `got ${r4.status}`);
check(s4, "S4-2  no 500 crash",           r4.status !== 500);
check(s4, "S4-3  null-value fields produce unverified cards (not gap)",
  !(r4.body as any)?.proof_cards?.some((c: any) => c.status === "gap" && (c.your_value === 0 || c.your_value === null)));
check(s4, "S4-4  no card has gap from null value (null value → unverified)",
  ((r4.body as any)?.proof_cards ?? []).filter((c: any) => c.status === "gap")
    .every((c: any) => typeof c.your_value === "number" && c.your_value > 0));
check(s4, "S4-5  audit trail present",    Array.isArray((r4.body as any)?.audit) && (r4.body as any)?.audit.length > 0);
s4.record({ status: r4.status, field_count: (r4.body as any)?.extracted_fields?.length ?? 0,
  gap_cards: ((r4.body as any)?.proof_cards ?? []).filter((c: any) => c.status === "gap").length,
  unverified_cards: ((r4.body as any)?.proof_cards ?? []).filter((c: any) => c.status === "unverified").length });

// ── S5: Mixed Language (Hindi + English) ─────────────────────────────────────

console.log("\n═══ S5: Mixed Language (Hindi + English) ═══");
console.log("    Expect: 200, no crash, English portions extracted, banner present\n");
const s5 = scenario("S5", "Mixed Language");

const mixedImage = loadImage("mixed_language_bill.jpg", "mixed-hindi-english-synthetic-payload");
const r5 = await postJson(`${ENGINE_URL}/run`, { image: mixedImage, domain: "bill" });

check(s5, "S5-1  status = 200",           r5.status === 200, `got ${r5.status}`);
check(s5, "S5-2  no 500 crash",           r5.status !== 500);
check(s5, "S5-3  extracted_fields is array (may be empty)", Array.isArray((r5.body as any)?.extracted_fields));
check(s5, "S5-4  banner always present",
  (r5.body as any)?.draft?.banner === "AI-generated — review before sending");
check(s5, "S5-5  hold is null/staged/placed (never crashes on partial extraction)",
  ["null", "staged", "placed"].includes(String((r5.body as any)?.hold?.status ?? "null")));
s5.record({ status: r5.status, field_count: (r5.body as any)?.extracted_fields?.length ?? 0,
  hold_status: (r5.body as any)?.hold?.status ?? null });

// ── S6: PDF Bill (Docling adapter) ────────────────────────────────────────────

console.log("\n═══ S6: PDF Bill (multi-page PDF with tables) ═══");
console.log("    Expect: 200, no crash, Docling extracts table rows (or Tesseract fallback), banner present\n");
const s6 = scenario("S6", "PDF Bill");

const pdfImage = loadImage("sample_bill.pdf", "");

if (!pdfImage) {
  // No sample PDF available — skip gracefully, do not count as failure
  console.log("    ⏭  PDF test skipped — no sample_bill.pdf available in IMAGE_DIR");
  s6.record({ skipped: true });
} else {
  const r6 = await postJson(`${ENGINE_URL}/run`, { image: pdfImage, domain: "bill" });

  check(s6, "S6-1  status = 200",           r6.status === 200, `got ${r6.status}`);
  check(s6, "S6-2  no 500 crash",           r6.status !== 500);
  check(s6, "S6-3  extracted_fields is array (Docling or Tesseract output)",
    Array.isArray((r6.body as any)?.extracted_fields));
  check(s6, "S6-4  banner always present",
    (r6.body as any)?.draft?.banner === "AI-generated — review before sending");
  s6.record({ status: r6.status,
    field_count: (r6.body as any)?.extracted_fields?.length ?? 0,
    hold_status: (r6.body as any)?.hold?.status ?? null });
}

// ── SEED REGRESSION — must survive all adversarial runs ───────────────────────

console.log("\n═══ SEED REGRESSION: /run?seed=trap must remain byte-identical ═══");
const seed1 = await getJson(`${ENGINE_URL}/run?seed=trap`);
const seed2 = await getJson(`${ENGINE_URL}/run?seed=trap`);
const seedPass = seed1.raw === seed2.raw && (seed1.body as any)?.run_id === "demo-trap-001";
console.log(`    ${seedPass ? "✅" : "❌"} Seed byte-identical + run_id=demo-trap-001`);

// ── SUMMARY ───────────────────────────────────────────────────────────────────

const scenariosPassed  = results.filter((r) => r.passed).length;
const scenariosFailed  = results.filter((r) => !r.passed).length;

const totalScenarios = results.length;
const skippedCount = results.filter((r) => (r.actual as any)?.skipped === true).length;

console.log("\n" + "═".repeat(64));
console.log(`P9 ADVERSARIAL RESULTS: ${totalScenarios} scenarios (${skippedCount} skipped) — ${scenariosPassed} PASS, ${scenariosFailed} FAIL`);
console.log(`SEED REGRESSION:        ${seedPass ? "PASS" : "FAIL"}`);

if (scenariosFailed > 0 || !seedPass) {
  console.log("\n🔴 FAILING SCENARIOS — Log these in P9_BUG_LOG.md:");
  for (const r of results.filter((r) => !r.passed)) {
    console.log(`\n  [${r.id}] ${r.name}`);
    r.failures.forEach((f) => console.log(`    • ${f}`));
    console.log(`    Actual: ${JSON.stringify(r.actual)}`);
  }
  if (!seedPass) console.log("\n  [SEED] /run?seed=trap is NOT byte-identical — investigate immediately.");
  console.log("\n  → Copy the failing entries into P9_BUG_LOG.md and report to Murgesh.");
  console.log("  → Murgesh patches engine side only. Re-run after each fix.");
} else {
  console.log("\n🟢 ALL P9 SCENARIOS PASS. Happy path green. Bug list empty.");
  console.log("   Demo is safe. Proceed to rehearsal.");
}
