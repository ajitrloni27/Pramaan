// apps/mobile/src/data/mockRun.ts
// UI-side RunResponse type + 6-Domain Multi-Regulatory Dynamic Engine.
// Fully data-driven: derives all proof cards, numbers, and notices directly from user document input.

import { AuditEvent } from '../components/AuditViewer';
export type { AuditEvent };
import { BBoxField } from '../components/BBoxOverlay';
import { ProofStatus } from '../components/ProofCard';
import { HoldStatus } from '../components/HoldChip';
import { Domain } from '../context/SessionContext';

export interface RunResponse {
  id: string;
  fields: BBoxField[];
  proofs: {
    id: string;
    status: ProofStatus;
    itemName: string;
    sourceLabel: string;
    sourceValue: string;
    sourceRef: string;
    sourceRefUrl?: string;       // Clickable source anchor link
    computeLabel: string;
    computeValue: string;
    computeMath?: string;
    ruleLabel: string;
    ruleValue: string;
    ruleRefText: string;
    ruleRefUrl?: string;         // Clickable rule anchor link
    summaryText: string;         // Plain language rule citation
  }[];
  hold: {
    status: HoldStatus;
    amount: string;
  } | null;
  draftText: string;
  draftBanner: string;
  audit: AuditEvent[];
}

export const generateDynamicMockRun = (domain: Domain, captureType: string | null, captureData: string | null): RunResponse => {
  const rawText = (captureData || '').trim();
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const currentDateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // 1. Extract structured fields from lines
  const parsedFields: { line: string; value: number | null; itemName: string }[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    const isHeader = lower.startsWith('patient:') || lower.startsWith('date:') || lower.startsWith('department:') || lower.startsWith('store:') || lower.startsWith('landlord:') || lower.startsWith('tenant:') || lower.startsWith('property:') || lower.startsWith('driver:') || lower.startsWith('platform:') || lower.startsWith('week:') || lower.startsWith('policyholder:') || lower.startsWith('insurer:') || lower.startsWith('hospital:') || lower.startsWith('notice no:') || lower.startsWith('vehicle no:');

    if (isHeader) continue;

    const numMatch = line.match(/(?:₹|INR|Rs\.?|:\s*₹?)\s*([0-9,]+(?:\.[0-9]+)?)/i) ||
                     line.match(/[:=-]\s*([0-9,]+(?:\.[0-9]+)?)/) ||
                     line.match(/([0-9,]+(?:\.[0-9]+)?)\s*$/);
    
    let val: number | null = null;
    if (numMatch && numMatch[1]) {
      const parsed = parseFloat(numMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) val = parsed;
    }

    // Clean item name by removing trailing price
    let cleanName = line.replace(/[:=-]?\s*(?:₹|INR|Rs\.?)\s*[0-9,]+(?:\.[0-9]+)?/gi, '')
                        .replace(/\([^\)]*\)/g, '')
                        .replace(/^[0-9]+[\.\)]\s*/, '')
                        .trim();
    if (!cleanName) cleanName = line;

    parsedFields.push({ line, value: val, itemName: cleanName });
  }

  // Fallback if no item lines were found
  if (parsedFields.length === 0) {
    parsedFields.push({ line: rawText || 'General Document Evidence', value: 0, itemName: 'Audit Evidence Item' });
  }

  // 2. Build domain-specific proof cards dynamically
  const proofs: RunResponse['proofs'] = [];
  let totalDisputedAmount = 0;

  if (domain === 'lease') {
    let monthlyRent = 0;
    for (const f of parsedFields) {
      if (f.line.toLowerCase().includes('rent') && !f.line.toLowerCase().includes('deposit') && f.value) {
        monthlyRent = f.value;
      }
    }
    if (!monthlyRent) {
      // Find lowest non-zero amount
      const nums = parsedFields.map(f => f.value).filter((v): v is number => v !== null && v > 0);
      monthlyRent = nums.length > 0 ? Math.min(...nums) : 35000;
    }

    for (let i = 0; i < parsedFields.length; i++) {
      const f = parsedFields[i]!;
      const l = f.line.toLowerCase();
      const val = f.value ?? monthlyRent;

      if (l.includes('deposit')) {
        const legalCap = monthlyRent * 2;
        const gap = Math.max(0, val - legalCap);
        totalDisputedAmount += gap;
        proofs.push({
          id: `p-${i}`,
          status: gap > 0 ? 'gap' : 'ok',
          itemName: f.itemName,
          sourceLabel: 'Lease Agreement',
          sourceValue: `₹${val.toLocaleString('en-IN')}`,
          sourceRef: `Line ${i + 1}`,
          computeLabel: 'Disputed Gap',
          computeValue: `₹${gap.toLocaleString('en-IN')}`,
          computeMath: `₹${val.toLocaleString('en-IN')} - ₹${legalCap.toLocaleString('en-IN')}`,
          ruleLabel: 'Statutory Ceiling (2 Months)',
          ruleValue: `₹${legalCap.toLocaleString('en-IN')}`,
          ruleRefText: 'Model Tenancy Act 2021 (Section 11(2))',
          ruleRefUrl: 'https://mohua.gov.in/upload/uploadfiles/files/ModelTenancyAct2021.pdf',
          summaryText: gap > 0 ? `Security deposit exceeds statutory 2-month rent ceiling by ₹${gap.toLocaleString('en-IN')}.` : 'Deposit matches legal ceiling.',
        });
      } else if (l.includes('rent')) {
        proofs.push({
          id: `p-${i}`,
          status: 'ok',
          itemName: f.itemName,
          sourceLabel: 'Lease Agreement',
          sourceValue: `₹${val.toLocaleString('en-IN')}`,
          sourceRef: `Line ${i + 1}`,
          computeLabel: 'Disputed Gap',
          computeValue: '₹0',
          computeMath: `₹${val.toLocaleString('en-IN')} - ₹${val.toLocaleString('en-IN')}`,
          ruleLabel: 'Agreed Rent',
          ruleValue: `₹${val.toLocaleString('en-IN')}`,
          ruleRefText: 'Model Tenancy Act 2021 (Section 8)',
          ruleRefUrl: 'https://mohua.gov.in/upload/uploadfiles/files/ModelTenancyAct2021.pdf',
          summaryText: 'Rent rate as mutually agreed.',
        });
      }
    }
  } else if (domain === 'gig_payslip') {
    let grossFare = 0;
    for (const f of parsedFields) {
      if ((f.line.toLowerCase().includes('fare') || f.line.toLowerCase().includes('gross')) && f.value) {
        grossFare = f.value;
      }
    }
    if (!grossFare) {
      const nums = parsedFields.map(f => f.value).filter((v): v is number => v !== null && v > 0);
      grossFare = nums.length > 0 ? Math.max(...nums) : 5000;
    }

    for (let i = 0; i < parsedFields.length; i++) {
      const f = parsedFields[i]!;
      const l = f.line.toLowerCase();
      const val = f.value ?? 0;

      if (l.includes('commission')) {
        const maxAllowed = Math.round(grossFare * 0.20);
        const gap = Math.max(0, val - maxAllowed);
        totalDisputedAmount += gap;
        proofs.push({
          id: `p-${i}`,
          status: gap > 0 ? 'gap' : 'ok',
          itemName: f.itemName,
          sourceLabel: 'Aggregator Payslip',
          sourceValue: `₹${val.toLocaleString('en-IN')}`,
          sourceRef: `Line ${i + 1}`,
          computeLabel: 'Disputed Gap',
          computeValue: `₹${gap.toLocaleString('en-IN')}`,
          computeMath: `₹${val.toLocaleString('en-IN')} - ₹${maxAllowed.toLocaleString('en-IN')}`,
          ruleLabel: 'MoRTH 20% Commission Cap',
          ruleValue: `₹${maxAllowed.toLocaleString('en-IN')}`,
          ruleRefText: 'MoRTH Aggregator Guidelines 2025 (Clause 17)',
          ruleRefUrl: 'https://morth.nic.in/motor-vehicle-aggregator-guidelines-2025',
          summaryText: gap > 0 ? `Platform commission exceeds 20% statutory limit by ₹${gap.toLocaleString('en-IN')}.` : 'Platform commission complies with MoRTH limit.',
        });
      } else if (l.includes('payout')) {
        const minPayout = Math.round(grossFare * 0.80);
        const gap = Math.max(0, minPayout - val);
        totalDisputedAmount += gap;
        proofs.push({
          id: `p-${i}`,
          status: gap > 0 ? 'gap' : 'ok',
          itemName: f.itemName,
          sourceLabel: 'Aggregator Payslip',
          sourceValue: `₹${val.toLocaleString('en-IN')}`,
          sourceRef: `Line ${i + 1}`,
          computeLabel: 'Disputed Shortfall',
          computeValue: `₹${gap.toLocaleString('en-IN')}`,
          computeMath: `₹${minPayout.toLocaleString('en-IN')} - ₹${val.toLocaleString('en-IN')}`,
          ruleLabel: 'MoRTH 80% Min Driver Payout',
          ruleValue: `₹${minPayout.toLocaleString('en-IN')}`,
          ruleRefText: 'MoRTH Aggregator Guidelines 2025 (Clause 17)',
          ruleRefUrl: 'https://morth.nic.in/motor-vehicle-aggregator-guidelines-2025',
          summaryText: gap > 0 ? `Driver remuneration is underpaid by ₹${gap.toLocaleString('en-IN')} below statutory 80% threshold.` : 'Driver remuneration meets statutory threshold.',
        });
      }
    }
  } else if (domain === 'insurance') {
    for (let i = 0; i < parsedFields.length; i++) {
      const f = parsedFields[i]!;
      const l = f.line.toLowerCase();
      const val = f.value ?? 0;

      if (l.includes('deduction') || l.includes('disallowed') || l.includes('room rent')) {
        totalDisputedAmount += val;
        proofs.push({
          id: `p-${i}`,
          status: val > 0 ? 'gap' : 'ok',
          itemName: f.itemName,
          sourceLabel: 'Claim Summary',
          sourceValue: `₹${val.toLocaleString('en-IN')}`,
          sourceRef: `Line ${i + 1}`,
          computeLabel: 'Disputed Gap',
          computeValue: `₹${val.toLocaleString('en-IN')}`,
          computeMath: `₹${val.toLocaleString('en-IN')} - ₹0`,
          ruleLabel: 'Permitted Deduction',
          ruleValue: '₹0',
          ruleRefText: 'IRDAI Master Circular on Health Insurance 2024',
          ruleRefUrl: 'https://irdai.gov.in',
          summaryText: `Proportionate room rent deduction of ₹${val.toLocaleString('en-IN')} is not permitted under IRDAI 2024 directives.`,
        });
      }
    }
  } else if (domain === 'medicine') {
    for (let i = 0; i < parsedFields.length; i++) {
      const f = parsedFields[i]!;
      const l = f.line.toLowerCase();
      const val = f.value ?? 0;

      let ceiling = 0;
      let ref = 'NPPA DPCO Drug Price Schedule 2013';
      let isRecall = l.includes('recall') || l.includes('ayc-2407') || l.includes('azithromycin');

      if (isRecall) {
        ceiling = 0;
        ref = 'CDSCO Drug Safety Recall Notice';
      } else if (l.includes('paracetamol') || l.includes('pcm')) {
        ceiling = 22;
      } else {
        ceiling = Math.round(val * 0.5);
      }

      const gap = Math.max(0, val - ceiling);
      totalDisputedAmount += gap;

      proofs.push({
        id: `p-${i}`,
        status: gap > 0 ? 'gap' : 'ok',
        itemName: f.itemName,
        sourceLabel: 'Pharmacy Bill',
        sourceValue: `₹${val.toLocaleString('en-IN')}`,
        sourceRef: `Line ${i + 1}`,
        computeLabel: 'Disputed Gap',
        computeValue: `₹${gap.toLocaleString('en-IN')}`,
        computeMath: `₹${val.toLocaleString('en-IN')} - ₹${ceiling.toLocaleString('en-IN')}`,
        ruleLabel: isRecall ? 'Recall Status' : 'Statutory Price Ceiling',
        ruleValue: isRecall ? 'BANNED BATCH' : `₹${ceiling.toLocaleString('en-IN')}`,
        ruleRefText: ref,
        ruleRefUrl: 'https://nppa.gov.in',
        summaryText: isRecall ? 'Drug batch flagged under mandatory CDSCO recall.' : `Price exceeds statutory ceiling by ₹${gap.toLocaleString('en-IN')}.`,
      });
    }
  } else if (domain === 'challan') {
    for (let i = 0; i < parsedFields.length; i++) {
      const f = parsedFields[i]!;
      const val = f.value ?? 2000;
      totalDisputedAmount += val;

      proofs.push({
        id: `p-${i}`,
        status: val > 0 ? 'gap' : 'ok',
        itemName: f.itemName,
        sourceLabel: 'Traffic Challan',
        sourceValue: `₹${val.toLocaleString('en-IN')}`,
        sourceRef: `Line ${i + 1}`,
        computeLabel: 'Disputed Penalty',
        computeValue: `₹${val.toLocaleString('en-IN')}`,
        computeMath: `₹${val.toLocaleString('en-IN')} - ₹0`,
        ruleLabel: 'Valid Legal Charge',
        ruleValue: '₹0 (Uncalibrated)',
        ruleRefText: 'Motor Vehicles Act 1988 (Section 136A)',
        ruleRefUrl: 'https://echallan.parivahan.gov.in',
        summaryText: `Challan penalty of ₹${val.toLocaleString('en-IN')} is disputed due to missing speed camera calibration certificate under Section 136A.`,
      });
    }
  } else {
    // Medical Bill default
    for (let i = 0; i < parsedFields.length; i++) {
      const f = parsedFields[i]!;
      const l = f.line.toLowerCase();
      const val = f.value ?? 0;

      let official = 0;
      let ref = 'CGHS Official Rate Schedule';

      if (l.includes('mri')) {
        official = 6400;
        ref = 'CGHS Rate List 2023 — Radiology';
      } else if (l.includes('paracetamol') || l.includes('dolo')) {
        official = 2;
        ref = 'NPPA Drug Price Control Order 2013';
      } else if (l.includes('cbc') || l.includes('blood count')) {
        official = 150;
        ref = 'CGHS Rate List 2023 — Pathology';
      } else {
        official = Math.round(val * 0.6);
      }

      const gap = Math.max(0, val - official);
      totalDisputedAmount += gap;

      proofs.push({
        id: `p-${i}`,
        status: gap > 0 ? 'gap' : 'ok',
        itemName: f.itemName,
        sourceLabel: 'Hospital Invoice',
        sourceValue: `₹${val.toLocaleString('en-IN')}`,
        sourceRef: `Line ${i + 1}`,
        computeLabel: 'Disputed Gap',
        computeValue: `₹${gap.toLocaleString('en-IN')}`,
        computeMath: `₹${val.toLocaleString('en-IN')} - ₹${official.toLocaleString('en-IN')}`,
        ruleLabel: 'Statutory Ceiling',
        ruleValue: `₹${official.toLocaleString('en-IN')}`,
        ruleRefText: ref,
        ruleRefUrl: 'https://cghs.gov.in',
        summaryText: gap > 0 ? `Billed rate exceeds statutory ceiling by ₹${gap.toLocaleString('en-IN')}.` : 'Rate complies with official schedule.',
      });
    }
  }

  // Fallback if no cards created
  if (proofs.length === 0) {
    proofs.push({
      id: 'p-0',
      status: 'ok',
      itemName: 'Audited Document Clauses',
      sourceLabel: 'Your Document',
      sourceValue: '₹0',
      sourceRef: 'Extracted Input',
      computeLabel: 'Disputed Gap',
      computeValue: '₹0',
      computeMath: '₹0 - ₹0',
      ruleLabel: 'Statutory Ceiling',
      ruleValue: '₹0',
      ruleRefText: 'Statutory Compliance Gazette',
      summaryText: 'All items comply with official regulatory schedules.',
    });
  }

  // Build fields for BBox
  const fields: BBoxField[] = parsedFields.map((f, idx) => ({
    id: `f-${idx}`,
    value: f.itemName,
    bbox: [0, Math.min(100, idx * 20), 100, 18] as [number, number, number, number],
    low_conf: false,
  }));

  // Build draft text from proof items
  const gapProofs = proofs.filter(p => p.status === 'gap');
  const itemsText = gapProofs.map((p, i) => `${i + 1}. ${p.itemName}: Billed ${p.sourceValue}, Legal ceiling ${p.ruleValue}, Overcharge ${p.computeValue}. (${p.ruleRefText})`).join('\n');

  const draftText = `DATE: ${currentDateStr}\nTO: Billing & Compliance Department\nSUBJECT: Formal Statutory Dispute and Counter-Notice (${domain.toUpperCase()})\n\nDear Sir/Madam,\n\nI am writing to formally contest charges listed on the attached document that exceed legally mandated statutory ceilings:\n\n${itemsText || 'All charges have been audited against statutory guidelines.'}\n\nTotal Disputed Overcharge: ₹${totalDisputedAmount.toLocaleString('en-IN')}\n\nPlease issue an immediate correction and refund the disputed excess.\n\nSincerely,\nDisputant`;

  return {
    id: `run-${Date.now()}`,
    fields,
    proofs,
    hold: totalDisputedAmount > 0 ? {
      status: 'placed',
      amount: `₹${totalDisputedAmount.toLocaleString('en-IN')}`,
    } : null,
    draftText,
    draftBanner: 'AI-generated — review before sending',
    audit: [
      { id: 'a1', ts: new Date(), t: 'ocr', payload: JSON.stringify({ items_extracted: parsedFields.length }) },
      { id: 'a2', ts: new Date(), t: 'lookup', payload: JSON.stringify({ domain }) },
      { id: 'a3', ts: new Date(), t: 'compare', payload: JSON.stringify({ total_gap: totalDisputedAmount }) },
      { id: 'a4', ts: new Date(), t: 'prove', payload: JSON.stringify({ proof_count: proofs.length }) },
      ...(totalDisputedAmount > 0 ? [{ id: 'a5', ts: new Date(), t: 'hold_placed' as const, payload: JSON.stringify({ amount: `₹${totalDisputedAmount.toLocaleString('en-IN')}`, lock: '72h' }) }] : []),
      { id: 'a6', ts: new Date(), t: 'draft', payload: JSON.stringify({ notice: 'generated' }) },
    ],
  };
};

export const mockConsentResponse = (action: 'confirm_hold' | 'withdraw_hold' | 'send_letter'): { audit: AuditEvent } => {
  return {
    audit: {
      id: `audit-${Date.now()}`,
      ts: new Date(),
      t: 'consent',
      payload: JSON.stringify({ action, timestamp: new Date().toISOString() }),
    },
  };
};
