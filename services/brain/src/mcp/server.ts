// IBM: MCP (watsonx.data managed server) — tool discovery layer
// Built with IBM Bob — AI SDLC Partner

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { lookupRule } from "./tools/lookup_rule.js";
import { placeHold } from "./tools/place_hold.js";
import { getHoldStatus } from "./tools/get_hold_status.js";
import { releaseHold } from "./tools/release_hold.js";

const server = new McpServer({
  name: "pramaan-brain",
  version: "1.0.0",
});

// ── Tool 1: lookup_rule ──────────────────────────────────────────────────────
// @ts-ignore — zod v4 + MCP SDK type-depth collision; runtime behaviour is correct
server.tool(
  "lookup_rule",
  "Search the rulebook for rows matching the given text. Returns [] on no match — not an error.",
  {
    domain: z.enum(["bill", "lease"]).describe("Document domain"),
    text: z.string().describe("Text extracted from the document to match against"),
  },
  async ({ domain, text }) => {
    const rows = lookupRule(domain, text);
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
    };
  }
);

// ── Tool 2: place_hold ───────────────────────────────────────────────────────
// @ts-ignore — zod v4 + MCP SDK type-depth collision
server.tool(
  "place_hold",
  "Place a provisional hold on an invoice. Idempotent — same (invoice_id, evidence_pack_id) always returns the same hold.",
  {
    invoice_id:        z.string().describe("Invoice identifier"),
    amount:            z.number().describe("Amount to hold in rupees"),
    evidence_pack_id:  z.string().describe("Evidence pack identifier"),
  },
  async ({ invoice_id, amount, evidence_pack_id }) => {
    const result = placeHold(invoice_id, amount, evidence_pack_id);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }
);

// ── Tool 3: get_hold_status ──────────────────────────────────────────────────
// @ts-ignore — zod v4 + MCP SDK type-depth collision
server.tool(
  "get_hold_status",
  "Get the current status of a hold by its hold_id.",
  {
    hold_id: z.string().describe("Hold identifier returned by place_hold"),
  },
  async ({ hold_id }) => {
    const hold = getHoldStatus(hold_id);
    return {
      content: [{ type: "text", text: JSON.stringify(hold) }],
    };
  }
);

// ── Tool 4: release_hold ─────────────────────────────────────────────────────
// @ts-ignore — zod v4 + MCP SDK type-depth collision
server.tool(
  "release_hold",
  "Release a hold. Returns the updated HoldEvent with status 'released'.",
  {
    hold_id: z.string().describe("Hold identifier"),
    reason:  z.enum(["auto_expiry", "user_withdraw", "confirmed_then_resolved"]).describe("Reason for release"),
  },
  async ({ hold_id, reason }) => {
    const hold = releaseHold(hold_id, reason);
    return {
      content: [{ type: "text", text: JSON.stringify(hold) }],
    };
  }
);

// ── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
