// STUB — replace when Manas delivers packages/rulebooks/bill_rules.json
// IBM: Data Prep Kit — rulebook fixtures
// Built with IBM Bob — AI SDLC Partner

import type { BillRuleRow } from "@pramaan/contracts";

export const BILL_RULEBOOK_STUB: BillRuleRow[] = [
  {
    rule_id: "BR-001",
    domain: "bill",
    item_category: "medication",
    match_terms: ["paracetamol", "paracetmol", "pcm", "crocin", "dolo"],
    procedure_code: "MED-PCT-500",
    official_value: 2,
    official_unit: "per tablet",
    official_source: "NPPA Drug Price Control Order 2013",
    official_source_url: "https://www.nppa.gov.in/drug-price-control-order",
    rule_says_plain:
      "Paracetamol 500mg tablet is price-capped at ₹2 per tablet under DPCO 2013.",
    severity: "high",
    status: "VERIFIED",
    notes: "Common overcharge item. MRP on strip should not exceed ₹20 for 10 tablets.",
  },
  {
    rule_id: "BR-002",
    domain: "bill",
    item_category: "radiology",
    match_terms: ["mri", "mri scan", "magnetic resonance", "mri brain", "mri spine"],
    procedure_code: "RAD-MRI-001",
    official_value: 6400,
    official_unit: "per scan",
    official_source: "CGHS Rate List 2023 — Radiology",
    official_source_url:
      "https://cghs.gov.in/ShowWriteup.aspx?id=rate-list-radiology",
    rule_says_plain:
      "MRI scan rate under CGHS 2023 is ₹6,400 per scan at empanelled hospitals.",
    severity: "high",
    status: "VERIFIED",
    notes: "Private hospitals frequently charge ₹8,000–₹15,000 for the same scan.",
  },
  {
    rule_id: "BR-003",
    domain: "bill",
    item_category: "pathology",
    match_terms: ["blood test", "cbc", "complete blood count", "haemogram", "blood count"],
    procedure_code: "PATH-CBC-001",
    official_value: 150,
    official_unit: "per test",
    official_source: "CGHS Rate List 2023 — Pathology",
    official_source_url:
      "https://cghs.gov.in/ShowWriteup.aspx?id=rate-list-pathology",
    rule_says_plain:
      "Complete Blood Count (CBC) / Haemogram rate under CGHS 2023 is ₹150.",
    severity: "medium",
    status: "VERIFIED",
    notes: "Commonly billed as ₹300–₹600 at private labs.",
  },
];
