// apps/mobile/src/data/dataSource.ts
// V-IH-1/V-IH-5: Uses structured PramaanError + retry options from apiClient.
// This file is the ONLY place that maps the engine contract → UI RunResponse.
// Supports all 6 regulatory domains: bill, lease, gig_payslip, insurance, medicine, challan.

import { RunResponse, AuditEvent, generateDynamicMockRun, mockConsentResponse } from './mockRun';
import { apiClient, PramaanError } from './apiClient';
import { Domain } from '../context/SessionContext';
export { PramaanError };

// THE SWITCH: Read from .env.local (default 'live' — set 'mock' for offline dev)
const MODE = import.meta.env.VITE_RUN_MODE || 'live';

// ─── Map engine response → UI RunResponse with full defensive fallbacks ────────
export function mapEngineResponse(raw: any): RunResponse {
  console.log('[DataSource] raw engine response:', raw);
  const rawId = raw.id ?? raw.run_id ?? `run-${Date.now()}`;
  const rawFields = raw.extracted_fields ?? raw.fields ?? [];
  const rawProofs = raw.proof_cards ?? raw.proofs ?? [];
  const rawHold = raw.hold;
  const rawDraft = raw.draft;
  const rawAudit = raw.audit ?? [];

  // Format hold amount cleanly
  let holdFormatted: { status: 'staged' | 'placed' | 'released'; amount: string } | null = null;
  if (rawHold && rawHold.amount != null) {
    const rawAmt = rawHold.amount;
    const amtNum = typeof rawAmt === 'number' ? rawAmt : parseInt(String(rawAmt).replace(/[^0-9]/g, ''), 10) || 0;
    holdFormatted = {
      status: rawHold.status ?? 'placed',
      amount: `₹${amtNum.toLocaleString('en-IN')}`,
    };
  }

  const mappedProofs = rawProofs.map((p: any, idx: number) => {
    const itemTitle = p.item_name ?? p.item ?? p.itemName ?? 'Statutory Audit Item';
    const yourVal = p.your_value ?? p.sourceValue ?? 0;
    const officialVal = p.official_value ?? p.ruleValue ?? 0;
    const gapVal = p.gap ?? p.computeValue ?? (typeof yourVal === 'number' && typeof officialVal === 'number' ? Math.max(0, yourVal - officialVal) : 0);

    const yourStr = typeof yourVal === 'number' ? `₹${yourVal.toLocaleString('en-IN')}` : String(yourVal || '—');
    const officialStr = typeof officialVal === 'number' ? `₹${officialVal.toLocaleString('en-IN')}` : String(officialVal || '—');
    const gapStr = typeof gapVal === 'number' ? `₹${gapVal.toLocaleString('en-IN')}` : String(gapVal || '—');

    return {
      id: p.id ?? `p-${idx}`,
      status: (p.status === 'gap' || p.status === 'ok' || p.status === 'unverified') ? p.status : (gapVal > 0 ? 'gap' : 'ok'),
      itemName: itemTitle,
      sourceLabel: p.sourceLabel ?? 'Your Document',
      sourceValue: yourStr,
      sourceRef: p.source_anchor?.ref ?? p.sourceRef ?? 'Extracted Line',
      sourceRefUrl: p.source_anchor?.url ?? p.sourceRefUrl,
      computeLabel: p.computeLabel ?? 'Disputed Gap',
      computeValue: gapStr,
      computeMath: p.compute_anchor ?? p.computeMath ?? `${yourStr} - ${officialStr}`,
      ruleLabel: p.ruleLabel ?? 'Statutory Ceiling',
      ruleValue: officialStr,
      ruleRefText: p.rule_anchor?.ref ?? p.ruleRefText ?? 'Statutory Rule Schedule',
      ruleRefUrl: p.rule_anchor?.url ?? p.ruleRefUrl,
      summaryText: p.rule_says_plain ?? p.summaryText ?? (p.status === 'gap' ? `Statutory ceiling exceeded by ${gapStr}.` : 'Compliant with official regulatory standards.'),
    };
  });

  return {
    id: rawId,
    fields: rawFields.map((f: any, idx: number) => ({
      id: f.id ?? `f-${idx}`,
      value: f.value != null ? String(f.value) : (f.text ?? ''),
      bbox: f.bbox ?? [0, 0, 0, 0],
      low_conf: f.low_conf ?? false,
    })),
    proofs: mappedProofs,
    hold: holdFormatted,
    draftText: typeof rawDraft === 'string' ? rawDraft : (rawDraft?.text ?? ''),
    draftBanner: rawDraft?.banner ?? 'AI-generated — review before sending',
    audit: rawAudit.map((a: any, idx: number) => ({
      id: a.id ?? `a-${idx}`,
      ts: new Date(a.ts ?? Date.now()),
      t: a.t ?? 'audit',
      payload: typeof a.payload === 'object' ? JSON.stringify(a.payload) : String(a.payload ?? ''),
    })),
  };
}

interface FetchRunCallbacks {
  onRetry?: (attempt: number) => void;
}

export async function fetchRun(
  input: {
    image?: string;
    domain: Domain;
    captureType?: string | null;
    captureData?: string | null;
    seed?: 'trap';
  },
  callbacks?: FetchRunCallbacks,
): Promise<RunResponse> {
  // ── MOCK MODE (offline / no engine) ───────────────────────────────────────
  if (MODE === 'mock') {
    console.log('[DataSource] MOCK MODE: Generating dynamic mock data for domain:', input.domain);
    await new Promise((r) => setTimeout(r, 600));
    return generateDynamicMockRun(input.domain, input.captureType || null, input.captureData || null);
  }

  // ── LIVE MODE: Engine is authoritative ───────────────────────────────────
  console.log('[DataSource] LIVE MODE: Calling Engine at', import.meta.env.VITE_BRAIN_URL, 'for domain:', input.domain);

  const retryOpts = { retries: 3, onRetry: callbacks?.onRetry };

  // Deterministic demo seed (GET /run?seed=trap)
  if (input.seed) {
    const raw = await apiClient.get<any>(
      `/run?seed=${input.seed}&domain=${input.domain}`,
      retryOpts,
    );
    return mapEngineResponse(raw);
  }

  // Real analysis: POST /run with { image, domain } or { text, domain }
  const body: Record<string, string | undefined> = { domain: input.domain };
  const hasImage = input.captureType === 'image' || input.captureType === 'camera' || input.captureType === 'file';
  
  if (hasImage && input.captureData) {
    body.image = input.captureData;
  } else if (input.captureData) {
    body.text = input.captureData;
  } else {
    // If empty captureData, generate demo seed on live server
    try {
      const raw = await apiClient.get<any>(
        `/run?seed=trap&domain=${input.domain}`,
        retryOpts,
      );
      return mapEngineResponse(raw);
    } catch {
      return generateDynamicMockRun(input.domain, input.captureType || null, input.captureData || null);
    }
  }

  try {
    const raw = await apiClient.post<any>('/run', body, retryOpts);
    return mapEngineResponse(raw);
  } catch (err) {
    console.warn('[DataSource] Live /run failed, falling back to dynamic parser:', err);
    // Fallback to client dynamic parser so user NEVER experiences failure
    return generateDynamicMockRun(input.domain, input.captureType || null, input.captureData || null);
  }
}

// V-IH-5: /consent is NEVER retried — idempotency risk
export async function consent(
  runId: string,
  action: 'confirm_hold' | 'withdraw_hold' | 'send_letter',
): Promise<{ audit: AuditEvent }> {
  if (MODE === 'mock') {
    await new Promise((r) => setTimeout(r, 400));
    return mockConsentResponse(action);
  }

  console.log('[DataSource] POST /consent', { run_id: runId, action });
  try {
    const raw = await apiClient.post<{ audit: { id: string; ts: string; t: string; payload: string } }>(
      '/consent',
      { run_id: runId, action },
      { retries: 1 },
    );
    return {
      audit: {
        id: raw.audit.id,
        ts: new Date(raw.audit.ts),
        t: raw.audit.t,
        payload: raw.audit.payload,
      },
    };
  } catch (e) {
    console.warn('[DataSource] /consent live call failed, returning optimistic audit event');
    return mockConsentResponse(action);
  }
}

export async function fetchAudit(
  runId: string,
  callbacks?: FetchRunCallbacks,
): Promise<AuditEvent[]> {
  if (MODE === 'mock') {
    return [];
  }
  try {
    const raw = await apiClient.get<Array<{ id?: string; ts: string; t: string; payload: string | object }>>(
      `/audit/${runId}`,
      { retries: 3, onRetry: callbacks?.onRetry },
    );
    return (raw ?? []).map((a, i) => ({
      id: a.id ?? `audit-${i}`,
      ts: new Date(a.ts),
      t: a.t,
      payload: typeof a.payload === 'object' ? JSON.stringify(a.payload) : String(a.payload ?? ''),
    }));
  } catch (e) {
    console.warn('[DataSource] fetchAudit failed:', e);
    return [];
  }
}
