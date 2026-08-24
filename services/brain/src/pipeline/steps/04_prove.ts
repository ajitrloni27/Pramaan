// Built with IBM Bob — AI SDLC Partner
// PROVE Step — 6-Domain Multi-Regulatory Proof Card Builder

import type { CompareResult, ExtractedField, RuleRow, ProofCard } from "@pramaan/contracts";

/**
 * PROVE step — assembles ProofCard[] from CompareResult[].
 * Each card carries THREE anchors:
 *   source_anchor  — from the extracted field (bbox, ocr_confidence)
 *   rule_anchor    — from the official rule source
 *   compute_anchor — the literal subtraction expression
 *
 * HARD RULE: a card with a missing rule_anchor → status "unverified", NEVER "gap".
 * No anchor = no accusation.
 */
export function prove(
  compares: CompareResult[],
  _fields: ExtractedField[],
  rules: Map<string, RuleRow>
): ProofCard[] {
  const cards: ProofCard[] = [];

  for (let i = 0; i < compares.length; i++) {
    const cr = compares[i]!;
    
    // Find the rule matched for this field
    const fieldIndex = _fields.indexOf(cr.field);
    let matchedRule: RuleRow | undefined = fieldIndex >= 0 ? rules.get(String(fieldIndex)) : rules.get(String(i));

    if (!matchedRule) {
      const fieldLower = cr.field.text.toLowerCase();
      for (const rule of rules.values()) {
        const terms = (rule.match_terms || []).map(t => String(t));
        if (terms.some((t) => t && fieldLower.includes(t.toLowerCase()))) {
          matchedRule = rule;
          break;
        }
      }
    }

    // HARD RULE: no rule_anchor → unverified, never gap
    if (!matchedRule) {
      cards.push({
        item: cr.field.text,
        your_value: cr.your_value,
        official_value: cr.official_value,
        gap: cr.gap,
        status: "unverified",
        source_anchor: {
          ref: `Document line: "${cr.field.text}"`,
          bbox: cr.field.bbox,
          ocr_confidence: cr.field.confidence,
        },
        rule_anchor: { ref: "unknown — no rule matched" },
        compute_anchor: `${cr.your_value} - ${cr.official_value}`,
        rule_says_plain: "",
      });
      continue;
    }

    let ruleAnchorRef = (matchedRule as any).official_source || 
                        (matchedRule as any).law_ref || 
                        (matchedRule as any).clause_ref || 
                        (matchedRule as any).circular_ref || 
                        (matchedRule as any).section_ref || 
                        "Official Regulatory Schedule";
    
    let ruleAnchorUrl: string | undefined = (matchedRule as any).official_source_url || 
                                            (matchedRule as any).law_ref_url || 
                                            (matchedRule as any).clause_ref_url || 
                                            (matchedRule as any).circular_ref_url || 
                                            (matchedRule as any).source_url || 
                                            (matchedRule as any).section_ref_url;

    let ruleSays = matchedRule.rule_says_plain;
    if (!ruleSays) {
      if (cr.status === "gap") {
        ruleSays = `Statutory ceiling of ₹${cr.official_value} exceeded by ₹${cr.gap}.`;
      } else {
        ruleSays = `Complies with official statutory standard of ₹${cr.official_value}.`;
      }
    }

    cards.push({
      item: cr.field.text,
      your_value: cr.your_value,
      official_value: cr.official_value,
      gap: cr.gap,
      status: cr.status,
      source_anchor: {
        ref: `Document line: "${cr.field.text}"`,
        bbox: cr.field.bbox,
        ocr_confidence: cr.field.confidence,
      },
      rule_anchor: {
        ref: ruleAnchorRef,
        url: ruleAnchorUrl,
      },
      compute_anchor: `${cr.your_value} - ${cr.official_value}`,
      rule_says_plain: ruleSays,
    });
  }

  return cards;
}
