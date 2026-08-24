// STUB — replace when Manas delivers packages/rulebooks/lease_rules.json
// IBM: Data Prep Kit — rulebook fixtures
// Built with IBM Bob — AI SDLC Partner

import type { LeaseRuleRow } from "@pramaan/contracts";

export const LEASE_RULEBOOK_STUB: LeaseRuleRow[] = [
  {
    rule_id: "LR-001",
    domain: "lease",
    clause_type: "deposit",
    match_terms: ["non-refundable deposit", "non refundable", "non-refundable", "forfeiture of deposit"],
    legal_status: "illegal",
    law_ref: "Maharashtra Rent Control Act 1999, Section 14",
    law_ref_url: "https://maharerait.mahaonline.gov.in/",
    rule_says_plain:
      "A landlord cannot legally declare a security deposit as non-refundable. The deposit must be returned within 30 days of vacating after deducting legitimate dues.",
    suggested_fix_plain:
      "Replace 'non-refundable deposit' with 'refundable security deposit, subject to deductions for damage and dues'.",
    status: "VERIFIED",
  },
  {
    rule_id: "LR-002",
    domain: "lease",
    clause_type: "access",
    match_terms: ["landlord entry", "owner entry", "right of entry", "entry without notice", "inspect at any time"],
    legal_status: "illegal",
    law_ref: "Transfer of Property Act 1882, Section 108(e)",
    law_ref_url: "https://indiacode.nic.in/handle/123456789/2338",
    rule_says_plain:
      "A landlord must provide at least 24 hours' written notice before entering the premises except in genuine emergencies.",
    suggested_fix_plain:
      "Add: 'Landlord shall provide minimum 24 hours written/WhatsApp notice before entry, except in case of emergency.'",
    status: "VERIFIED",
  },
  {
    rule_id: "LR-003",
    domain: "lease",
    clause_type: "repairs",
    match_terms: ["tenant pays structural", "tenant responsible for repairs", "lessee shall bear all repairs", "tenant bears maintenance"],
    legal_status: "illegal",
    law_ref: "Transfer of Property Act 1882, Section 108(m)",
    law_ref_url: "https://indiacode.nic.in/handle/123456789/2338",
    rule_says_plain:
      "Structural repairs and major maintenance are the landlord's responsibility. The tenant is responsible only for minor day-to-day upkeep.",
    suggested_fix_plain:
      "Specify: 'Structural and major repairs are the landlord's responsibility. Tenant is responsible only for minor maintenance (e.g. broken fixtures, paint touch-ups below ₹5,000).'",
    status: "VERIFIED",
  },
  {
    rule_id: "LR-004",
    domain: "lease",
    clause_type: "notice_period",
    match_terms: ["notice period", "vacate notice", "termination notice", "one month notice", "30 days notice"],
    legal_status: "risky",
    law_ref: "Model Tenancy Act 2021, Section 21",
    law_ref_url: "https://mohua.gov.in/upload/uploadfiles/files/ModelTenancyAct2021.pdf",
    rule_says_plain:
      "Under the Model Tenancy Act 2021, a minimum of one month's notice is required from either party to terminate the tenancy.",
    suggested_fix_plain:
      "Ensure notice period is at least one calendar month for both parties.",
    status: "VERIFIED",
  },
  {
    rule_id: "LR-005",
    domain: "lease",
    clause_type: "rent_increase",
    match_terms: ["rent increase", "rent hike", "annual increment", "landlord may revise rent", "unilateral rent"],
    legal_status: "risky",
    law_ref: "Model Tenancy Act 2021, Section 9",
    law_ref_url: "https://mohua.gov.in/upload/uploadfiles/files/ModelTenancyAct2021.pdf",
    rule_says_plain:
      "Rent can only be revised as agreed in the tenancy agreement. Unilateral revision by the landlord without tenant consent is not valid.",
    suggested_fix_plain:
      "Cap rent increase: 'Rent shall not increase by more than [X]% per year and only upon mutual written agreement.'",
    status: "VERIFIED",
  },
];
