// Built with IBM Bob — AI SDLC Partner
// Express API Server — 6-Domain Multi-Regulatory Architecture

import express, { type Request, type Response, type NextFunction } from "express";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { orchestrate } from "./pipeline/orchestrator.js";
import { billingGateway } from "./gateway/billing_gateway.js";
import { auditLog } from "./audit/audit_log.js";
import { lookup } from "./pipeline/steps/02_lookup.js";
import { compare } from "./pipeline/steps/03_compare.js";
import { prove } from "./pipeline/steps/04_prove.js";
import {
  SEED_TRAP_FIELDS,
  FIXED_HOLD,
  FIXED_DRAFT,
  FIXED_RUN_ID,
  FIXED_AUDIT_TIMESTAMPS,
} from "./seeds/trap.js";
import { CONTROL_SEED_FIELDS, FIXED_CONTROL_RUN_ID } from "./seeds/control.js";
import type { Domain } from "@pramaan/contracts";

// Load .env and services/brain/.env
function loadEnv(): void {
  const paths = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "services", "brain", ".env"),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const text = readFileSync(p, "utf-8");
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).split("#")[0]?.trim() ?? "";
            if (key) process.env[key] = val;
          }
        }
      } catch {}
    }
  }
}
loadEnv();

function apiError(
  res: Response,
  status: number,
  code: string,
  message: string
): void {
  res.status(status).json({ error: message, code, status });
}

const app = express();

// ── CORS — allow local and web client connectivity ──────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Raise body limit to 10 MB for base64 images
app.use(express.json({ limit: "10mb" }));

// ── 413 handler ─────────────────────────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status: number }).status === 413
  ) {
    apiError(res, 413, "IMAGE_TOO_LARGE",
      "Image too large. Maximum payload is 10 MB (base64). Please resize the image before sending.");
    return;
  }
  next(err);
});

const PORT = parseInt(process.env["BRAIN_PORT"] ?? "3000", 10);

const VALID_DOMAINS = new Set(["bill", "lease", "gig_payslip", "insurance", "medicine", "challan"]);

// ── GET /health ──────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// ── POST /run — live pipeline ────────────────────────────────────────────────
app.post("/run", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image, text, domain } = req.body as { image?: unknown; text?: unknown; domain?: unknown };
    const domainStr = typeof domain === "string" ? domain : "bill";

    if (!VALID_DOMAINS.has(domainStr)) {
      apiError(res, 400, "INVALID_DOMAIN", `Invalid 'domain'. Must be one of: ${[...VALID_DOMAINS].join(", ")}`);
      return;
    }

    const inputPayload = typeof image === "string" ? image : (typeof text === "string" ? text : "");
    if (!inputPayload || inputPayload.trim() === "") {
      apiError(res, 400, "INVALID_INPUT", "Missing or empty payload. Send a base64 image or text string.");
      return;
    }

    const result = await orchestrate({ image: inputPayload, domain: domainStr as Domain });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// ── GET /run?seed=trap|control — deterministic seeded path (PATH B) ──────────
app.get("/run", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const seed = req.query["seed"] as string | undefined;
    const domain = ((req.query["domain"] as string | undefined) ?? "bill");

    if (!VALID_DOMAINS.has(domain)) {
      apiError(res, 400, "INVALID_DOMAIN", `domain must be one of: ${[...VALID_DOMAINS].join(", ")}`);
      return;
    }

    if (seed === "trap") {
      const rules = await lookup(SEED_TRAP_FIELDS, "bill");
      const gaps   = compare(SEED_TRAP_FIELDS, rules);
      const cards  = prove(gaps, SEED_TRAP_FIELDS, rules);

      const ts = FIXED_AUDIT_TIMESTAMPS;
      res.json({
        run_id: FIXED_RUN_ID,
        domain: "bill",
        extracted_fields: SEED_TRAP_FIELDS,
        proof_cards: cards,
        hold: FIXED_HOLD,
        draft: FIXED_DRAFT,
        audit: [
          { t: "ocr",         run_id: FIXED_RUN_ID, ts: ts.ocr,     payload: { step: "ocr",     field_count: SEED_TRAP_FIELDS.length } },
          { t: "lookup",      run_id: FIXED_RUN_ID, ts: ts.lookup,  payload: { step: "lookup",  rule_count: rules.size } },
          { t: "compare",     run_id: FIXED_RUN_ID, ts: ts.compare, payload: { step: "compare", gap_count: gaps.length } },
          { t: "prove",       run_id: FIXED_RUN_ID, ts: ts.prove,   payload: { step: "prove",   card_count: cards.length } },
          { t: "hold_placed", run_id: FIXED_RUN_ID, ts: ts.hold,    payload: { hold_id: FIXED_HOLD.hold_id, amount: FIXED_HOLD.amount } },
          { t: "draft",       run_id: FIXED_RUN_ID, ts: ts.draft,   payload: { step: "draft" } },
        ],
      });
      return;
    }

    if (seed === "control") {
      const rules = await lookup(CONTROL_SEED_FIELDS, "bill");
      const gaps   = compare(CONTROL_SEED_FIELDS, rules);
      const cards  = prove(gaps, CONTROL_SEED_FIELDS, rules);

      const ts = FIXED_AUDIT_TIMESTAMPS;
      res.json({
        run_id: FIXED_CONTROL_RUN_ID,
        domain: "bill",
        extracted_fields: CONTROL_SEED_FIELDS,
        proof_cards: cards,
        hold: null,
        draft: { text: "No overcharges detected. All billed amounts match official rates.", banner: "AI-generated — review before sending" },
        audit: [
          { t: "ocr",     run_id: FIXED_CONTROL_RUN_ID, ts: ts.ocr,     payload: { step: "ocr",     field_count: CONTROL_SEED_FIELDS.length } },
          { t: "lookup",  run_id: FIXED_CONTROL_RUN_ID, ts: ts.lookup,  payload: { step: "lookup",  rule_count: rules.size } },
          { t: "compare", run_id: FIXED_CONTROL_RUN_ID, ts: ts.compare, payload: { step: "compare", gap_count: gaps.length } },
          { t: "prove",   run_id: FIXED_CONTROL_RUN_ID, ts: ts.prove,   payload: { step: "prove",   card_count: cards.length } },
          { t: "draft",   run_id: FIXED_CONTROL_RUN_ID, ts: ts.draft,   payload: { step: "draft" } },
        ],
      });
      return;
    }

    apiError(res, 400, "INVALID_SEED", "Unknown seed. Use ?seed=trap or ?seed=control");
  } catch (e) {
    next(e);
  }
});

// ── POST /consent ────────────────────────────────────────────────────────────
app.post("/consent", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { run_id, hold_id, action } = req.body as {
      run_id?: unknown;
      hold_id?: unknown;
      action?: unknown;
    };

    if (typeof run_id !== "string" || run_id.trim() === "") {
      apiError(res, 400, "INVALID_REQUEST",
        "Required: { run_id: string, action: 'confirm_hold' | 'withdraw_hold' | 'send_letter' }");
      return;
    }
    if (action !== "confirm_hold" && action !== "withdraw_hold" && action !== "send_letter") {
      apiError(res, 400, "INVALID_REQUEST",
        "Required: { run_id: string, action: 'confirm_hold' | 'withdraw_hold' | 'send_letter' }");
      return;
    }

    const effectiveHoldId = typeof hold_id === "string" ? hold_id : `hold-${run_id}`;

    try {
      if (action === "confirm_hold") {
        billingGateway.confirm(effectiveHoldId);
      } else if (action === "withdraw_hold") {
        billingGateway.release(effectiveHoldId, "user_withdraw");
      }
      // send_letter: no gateway mutation, just audit
    } catch (gatewayErr) {
      const msg = gatewayErr instanceof Error ? gatewayErr.message : String(gatewayErr);
      if (msg.startsWith("Hold not found")) {
        console.warn(`[Gateway] Hold ${effectiveHoldId} not found during ${action}`);
      } else {
        throw gatewayErr;
      }
    }

    const event = {
      t: "consent" as const,
      run_id,
      ts: new Date().toISOString(),
      payload: { action, hold_id: effectiveHoldId },
    };
    auditLog.append(event);

    res.json({ audit: event });
  } catch (e) {
    next(e);
  }
});

// ── GET /audit/:run_id — governance trail export ─────────────────────────────
app.get("/audit/:run_id", (req: Request, res: Response) => {
  const { run_id } = req.params;
  res.json(auditLog.list(run_id));
});

// ── Global error handler ────────────────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal error";
  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`[pramaan-brain] listening on port ${PORT}`);
});

export { app };
