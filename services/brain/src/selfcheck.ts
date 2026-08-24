import { compare } from './pipeline/steps/03_compare.js';
import { act } from './pipeline/steps/05_act.js';
import type { ExtractedField, RuleRow, ProofCard } from '@pramaan/contracts';

// CHECK 5 — unit normalization
const fields: ExtractedField[] = [
  { text: 'paracetamol', value: 200, unit: 'per strip', bbox: [0,0,1,1], confidence: 0.95, low_conf: false }
];
const rules = new Map<string, RuleRow>([[
  '0',
  { rule_id: 'test', domain: 'bill', item_category: 'med', match_terms: ['paracetamol'],
    procedure_code: 'X', official_value: 2, official_unit: 'per tablet',
    official_source: 'test', official_source_url: 'test', rule_says_plain: 'test',
    severity: 'high', status: 'VERIFIED', notes: '' }
]]);
const results = compare(fields, rules);
console.log('CHECK 5 — unit normalization per strip→tablet:', results[0]?.gap === 18 ? 'PASS' : 'FAIL', `(gap=${results[0]?.gap})`);

// CHECK 7 — low-conf gap → staged
const cards: ProofCard[] = [{
  item: 'test', your_value: 45, official_value: 2, gap: 43,
  status: 'gap',
  source_anchor: { ref: 'line1', ocr_confidence: 0.70 },
  rule_anchor: { ref: 'CGHS' }, compute_anchor: '45 - 2', rule_says_plain: 'test'
}];
const hold = await act(cards, 'inv-test');
console.log('CHECK 7 — low-conf gap → staged:', hold?.status === 'staged' ? 'PASS' : 'FAIL', `(status=${hold?.status})`);

// CHECK 8 — high-conf gap → placed
const cards2: ProofCard[] = [{
  item: 'MRI', your_value: 8500, official_value: 6400, gap: 2100,
  status: 'gap',
  source_anchor: { ref: 'line1', ocr_confidence: 0.97 },
  rule_anchor: { ref: 'CGHS' }, compute_anchor: '8500 - 6400', rule_says_plain: 'test'
}];
const hold2 = await act(cards2, 'inv-test2');
console.log('CHECK 8 — high-conf gap → placed:', hold2?.status === 'placed' ? 'PASS' : 'FAIL', `(status=${hold2?.status})`);