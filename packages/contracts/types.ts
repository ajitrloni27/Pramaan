// Pramaan Contracts — 6-Domain Multi-Regulatory Architecture
// Domain Types: bill, lease, gig_payslip, insurance, medicine, challan

export type Domain = "bill" | "lease" | "gig_payslip" | "insurance" | "medicine" | "challan";

export interface ExtractedField {
  text: string;
  value: number | null;
  unit: string | null;
  bbox: [number, number, number, number]; // [x, y, w, h]
  confidence: number; // 0..1
  low_conf: boolean;
}

// RuleRow — discriminated union on domain
export type RuleRow =
  | BillRuleRow
  | LeaseRuleRow
  | GigPayslipRuleRow
  | InsuranceRuleRow
  | MedicineRuleRow
  | ChallanRuleRow;

export interface BillRuleRow {
  rule_id: string;
  domain: "bill";
  item_category: string;
  match_terms: string[];
  procedure_code: string;
  official_value: number;
  official_unit: string;
  official_source: string;
  official_source_url: string;
  rule_says_plain: string;
  severity: "high" | "medium";
  status: "VERIFIED" | "UNVERIFIED";
  notes?: string;
}

export interface LeaseRuleRow {
  rule_id: string;
  domain: "lease";
  clause_type: string;
  match_terms: string[];
  legal_status: "illegal" | "risky" | "info";
  law_ref: string;
  law_ref_url: string;
  rule_says_plain: string;
  suggested_fix_plain: string;
  status: "VERIFIED" | "UNVERIFIED";
}

export interface GigPayslipRuleRow {
  rule_id: string;
  domain: "gig_payslip";
  rule_category: string;
  match_terms: string[];
  clause_ref: string;
  clause_ref_url: string;
  mandate_type: "min_driver_share" | "surge_cap" | "cancellation_cap" | "deadhead_pay" | "insurance";
  official_threshold: number; // e.g. 0.80 for 80% driver share, 1.5 for surge cap
  rule_says_plain: string;
  suggested_fix_plain: string;
  status: "VERIFIED" | "UNVERIFIED";
}

export interface InsuranceRuleRow {
  rule_id: string;
  domain: "insurance";
  rule_category: string;
  match_terms: string[];
  circular_ref: string;
  circular_ref_url: string;
  mandate_type: "moratorium" | "cashless_tat" | "proportionate_deduction" | "ombudsman_limit";
  official_value?: number;
  rule_says_plain: string;
  suggested_fix_plain: string;
  status: "VERIFIED" | "UNVERIFIED";
}

export interface MedicineRuleRow {
  rule_id: string;
  domain: "medicine";
  drug_name: string;
  match_terms: string[];
  nppa_ceiling_price?: number;
  nsq_batch_numbers?: string[];
  recall_status?: "NSQ_RECALL" | "PRICE_CAPPED" | "COMPLIANT";
  source_authority: "NPPA" | "CDSCO";
  source_url: string;
  rule_says_plain: string;
  status: "VERIFIED" | "UNVERIFIED";
}

export interface ChallanRuleRow {
  rule_id: string;
  domain: "challan";
  violation_code: string;
  match_terms: string[];
  section_ref: string;
  section_ref_url: string;
  statutory_fine: number;
  electronic_evidence_mandate: boolean;
  rule_says_plain: string;
  suggested_fix_plain: string;
  status: "VERIFIED" | "UNVERIFIED";
}

export interface ProofCard {
  item: string;
  your_value: number;
  official_value: number;
  gap: number;
  status: "gap" | "ok" | "unverified";
  source_anchor: {
    ref: string;
    bbox?: [number, number, number, number];
    ocr_confidence?: number;
    url?: string;
  };
  rule_anchor: {
    ref: string;
    url?: string;
  };
  compute_anchor: string; // e.g. "8500 - 6400" or "4000 - 2800"
  rule_says_plain: string;
}

export interface HoldEvent {
  hold_id: string;
  invoice_id: string;
  amount: number;
  status: "staged" | "placed" | "released";
  reversible: boolean;
  expires_at: string | null;
  placed_by: "auto" | "user";
  confidence_floor: number;
}

export interface AuditEvent {
  t:
    | "ocr"
    | "lookup"
    | "compare"
    | "prove"
    | "hold_placed"
    | "hold_staged"
    | "hold_released"
    | "draft"
    | "consent"
    | "error";
  run_id: string;
  ts: string;
  payload: object;
}

export interface RunRequest {
  image: string;
  domain: Domain;
}

export interface RunResponse {
  run_id: string;
  domain: string;
  extracted_fields: ExtractedField[];
  proof_cards: ProofCard[];
  hold: HoldEvent | null;
  draft: { text: string; banner: string };
  audit: AuditEvent[];
}

export interface CompareResult {
  field: ExtractedField;
  your_value: number;
  official_value: number;
  gap: number;
  status: "gap" | "ok" | "unverified";
}

export interface Draft {
  text: string;
  banner: string;
}
