// Built with IBM Bob — AI SDLC Partner

import type { ExtractedField, RuleRow, Domain } from "@pramaan/contracts";
import { lookupRule } from "../../mcp/tools/lookup_rule.js";

/**
 * LOOKUP step — calls lookup_rule for each field and builds a rules map.
 * Map key = field array index (string) — ExtractedField has no id field.
 * A field with no match simply has no entry in the map (silence over a false alarm).
 */
export async function lookup(
  fields: ExtractedField[],
  domain: Domain
): Promise<Map<string, RuleRow>> {
  const rules = new Map<string, RuleRow>();

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!;
    // Skip null/empty text fields — OCR sometimes emits blank lines
    if (!field.text || field.text.trim().length === 0) continue;
    const matches = lookupRule(domain, field.text);
    if (matches.length > 0) {
      // Use the first (most specific) match per field
      rules.set(String(i), matches[0]!);
    }
    // No match → no entry in map → compare() will skip this field silently
  }

  return rules;
}
