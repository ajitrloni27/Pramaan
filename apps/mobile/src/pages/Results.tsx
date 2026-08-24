import React, { useEffect, useState, useCallback } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import {
  ChevronLeft, TriangleAlert, Lock, Unlock, Send,
  FileSpreadsheet, Eye, ShieldCheck, Clock, FileText,
  CheckCircle2, AlertCircle, RefreshCw, Info, Trash2, RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchRun, consent, fetchAudit, PramaanError } from '../data/dataSource';
import { RunResponse, AuditEvent } from '../data/mockRun';
import { BBoxOverlay } from '../components/BBoxOverlay';

// ─── V-IH-1: Toast for user-friendly error messages ─────────────────────────
const ErrorToast: React.FC<{ message: string; onDismiss: () => void }> = ({ message, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0, y: -12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    style={{
      position: 'fixed',
      top: 'calc(var(--sat, 24px) + 56px)',
      left: 16,
      right: 16,
      maxWidth: 408,
      margin: '0 auto',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      borderRadius: 14,
      background: 'rgba(251, 113, 133, 0.14)',
      border: '1px solid var(--c-danger-border)',
      backdropFilter: 'blur(20px)',
      cursor: 'pointer',
    }}
    onClick={onDismiss}
    role="alert"
    aria-live="assertive"
  >
    <AlertCircle size={16} color="var(--c-danger)" style={{ flexShrink: 0 }} />
    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-danger)', flex: 1 }}>{message}</span>
    <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>tap to dismiss</span>
  </motion.div>
);

// ─── V-IH-3: Button-level loading spinner ────────────────────────────────────
const BtnSpinner: React.FC = () => (
  <motion.div
    aria-label="Loading"
    role="status"
    animate={{ rotate: 360 }}
    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
    style={{
      width: 16, height: 16, borderRadius: '50%',
      border: '2px solid rgba(255,255,255,0.4)',
      borderTopColor: '#ffffff',
      flexShrink: 0,
    }}
  />
);

// ─── V-IH-3: Audit skeleton loader ───────────────────────────────────────────
const AuditSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 14px' }}>
    {[0.9, 0.7, 0.8].map((w, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
        <div style={{ flex: 1, height: 12, borderRadius: 6, background: `rgba(255,255,255,${w * 0.08})` }} />
      </div>
    ))}
  </div>
);

// ─── V-6 audit label map ─────────────────────────────────────────────────────
const AUDIT_LABELS: Record<string, string> = {
  ocr:          'Document scanned',
  lookup:       'Rules matched',
  compare:      'Gaps computed',
  prove:        'Proof cards built',
  hold_placed:  'Hold placed (auto)',
  hold_staged:  'Hold staged (low confidence)',
  consent:      'User confirmed/withdrew/sent',
  draft:        'Letter drafted',
};

// ─── Main Results Screen ─────────────────────────────────────────────────────
export const Results: React.FC = () => {
  const [data, setData]           = useState<RunResponse | null>(null);
  const [viewMode, setViewMode]   = useState<'proofs' | 'ocr' | 'letter'>('proofs');
  const [error, setError]         = useState<string | null>(null);
  // V-IH-3: per-operation loading flags
  const [loadingRun, setLoadingRun]           = useState(true);
  const [loadingHold, setLoadingHold]         = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);
  const [loadingLetter, setLoadingLetter]     = useState(false);
  const [loadingAudit, setLoadingAudit]       = useState(false);
  // V-IH-5: retrying message
  const [retryMsg, setRetryMsg]   = useState<string | null>(null);

  const { state, resetSession, saveToVault, updateVaultItemHold, deleteFromVault } = useSession();
  const history = useHistory();

  // V-IH-1: show friendly error toast, never raw objects or stack traces
  const showError = useCallback((err: unknown) => {
    if (err instanceof PramaanError) {
      const pe = err as PramaanError;
      setError(pe.userMessage);
    } else if (err instanceof Error) {
      setError('Something went wrong. Please try again.');
    } else {
      setError('Something went wrong. Please try again.');
    }
    console.error('[Results] error:', err);
  }, []);

  // V-IH-5: onRetry callback → "Retrying (2/3)…" banner
  const handleRetry = useCallback((attempt: number) => {
    setRetryMsg(`Retrying… (attempt ${attempt}/3)`);
  }, []);

  useEffect(() => {
    setLoadingRun(true);
    setRetryMsg(null);
    fetchRun(
      { domain: state.domain, captureType: state.captureType, captureData: state.captureData },
      { onRetry: handleRetry },
    ).then((res) => {
      setData(res);
      setRetryMsg(null);
      console.log('[Results] RunResponse received:', res);

      // Auto-sync into persistent vault
      try {
        const gapProofs = res.proofs?.filter((p) => p.status === 'gap') ?? [];
        const rawAmtStr = res.hold?.amount ? String(res.hold.amount) : '';
        const numVal = rawAmtStr ? parseInt(rawAmtStr.replace(/[^0-9]/g, ''), 10) || 0 : 0;
        const firstItem = res.proofs?.[0]?.itemName || res.fields?.[0]?.value;
        const dynamicTitle = firstItem ? firstItem : (state.domain === 'bill' ? 'Medical Invoice Audit' : 'Residential Lease Agreement');
        saveToVault({
          id: res.id,
          title: dynamicTitle,
          domain: state.domain,
          captureType: state.captureType,
          captureData: state.captureData,
          createdAt: new Date().toISOString(),
          disputedAmount: res.hold?.amount ?? '₹0',
          disputedNumber: numVal,
          holdStatus: res.hold?.status ?? 'released',
          proofsCount: res.proofs?.length ?? 0,
          gapCount: gapProofs.length,
          hash: `0x${res.id.slice(-8)}a91e`,
          summary: gapProofs.length > 0 ? gapProofs[0].summaryText : 'All amounts match statutory ceilings.',
        });
      } catch (vaultErr) {
        console.warn('[Results] saveToVault error:', vaultErr);
      }
    }).catch(showError).finally(() => {
      setLoadingRun(false);
      setRetryMsg(null);
    });
  }, []);

  // V-IH-6: re-fetch audit after every consent action
  const refreshAudit = async (runId: string) => {
    setLoadingAudit(true);
    try {
      const events = await fetchAudit(runId, { onRetry: handleRetry });
      if (events.length > 0) {
        setData(prev => prev ? { ...prev, audit: events } : prev);
      }
    } catch (err) {
      showError(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // ── V-IH-4 + V-4: confirm hold
  // staged hold = DISABLED; placed hold = enabled to withdraw
  const handleHold = async () => {
    // V-IH-4: staged holds CANNOT be confirmed — the button should never be reachable
    // but guard here as a safety net
    if (!data || data.hold?.status !== 'placed') return;
    setLoadingHold(true);
    try {
      const res = await consent(data.id, 'confirm_hold');
      setData({ ...data, hold: { ...data.hold!, status: 'placed' }, audit: [...(data.audit ?? []), res.audit] });
      updateVaultItemHold(data.id, 'placed');
      await refreshAudit(data.id);
    } catch (err) { showError(err); }
    finally { setLoadingHold(false); }
  };

  const handleWithdraw = async () => {
    if (!data || data.hold?.status !== 'placed') return;
    setLoadingWithdraw(true);
    try {
      const res = await consent(data.id, 'withdraw_hold');
      setData({ ...data, hold: { ...data.hold!, status: 'released' }, audit: [...(data.audit ?? []), res.audit] });
      updateVaultItemHold(data.id, 'released');
      await refreshAudit(data.id);
    } catch (err) { showError(err); }
    finally { setLoadingWithdraw(false); }
  };

  const handleSendLetter = async () => {
    if (!data) return;
    setLoadingLetter(true);
    try {
      const res = await consent(data.id, 'send_letter');
      setData({ ...data, audit: [...(data.audit ?? []), res.audit] });
      await refreshAudit(data.id);
    } catch (err) { showError(err); }
    finally { setLoadingLetter(false); }
  };

  const back = () => { resetSession(); history.push('/dashboard'); };

  // V-IH-2: null-safe derived state
  const gapCount  = data?.proofs?.filter(p => p.status === 'gap').length ?? 0;
  const isStaged  = data?.hold?.status === 'staged';
  const isPlaced  = data?.hold?.status === 'placed';
  const hasHold   = data?.hold != null;
  const hasDraft  = !!(data?.draftText);
  const hasFields = (data?.fields?.length ?? 0) > 0;

  return (
    <IonPage>
      <IonContent fullscreen scrollX={false} scrollY={true}>
        <div className="mobile-shell" style={{ paddingBottom: hasHold ? 200 : 120 }}>

          {/* V-IH-1: Error Toast */}
          <AnimatePresence>
            {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
          </AnimatePresence>

          {/* V-IH-5: Retry banner */}
          <AnimatePresence>
            {retryMsg && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  top: 'calc(var(--sat, 24px) + 56px)',
                  left: 0, right: 0,
                  textAlign: 'center',
                  zIndex: 199,
                  padding: '6px 16px',
                  background: 'rgba(251, 191, 36, 0.12)',
                  borderBottom: '1px solid rgba(251, 191, 36, 0.25)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--c-warn)',
                }}
                aria-live="polite"
              >
                <RefreshCw size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                {retryMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 'calc(var(--sat) + 12px)',
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 16,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(5, 5, 8, 0.85)',
            backdropFilter: 'blur(20px)',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}>
            <button
              onClick={back}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--c-text-1)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={18} />
              Dashboard
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {data && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear this analysis and reset session?')) {
                      if (data?.id) {
                        deleteFromVault(data.id);
                      }
                      resetSession();
                      history.push('/dashboard');
                    }
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 12,
                    padding: '6px 12px',
                    color: 'var(--c-text-2)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease',
                  }}
                  title="Clear this analysis"
                >
                  <Trash2 size={13} color="var(--c-text-3)" />
                  Clear
                </button>
              )}

              {data && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 11px',
                  borderRadius: 20,
                  background: gapCount > 0 ? 'var(--c-danger-bg)' : 'var(--c-success-bg)',
                  border: `1px solid ${gapCount > 0 ? 'var(--c-danger-border)' : 'var(--c-success-border)'}`,
                  color: gapCount > 0 ? 'var(--c-danger)' : 'var(--c-success)',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                }}>
                  {gapCount > 0 ? `${gapCount} Discrepancy Found` : '100% Compliant'}
                </span>
              )}
            </div>
          </div>

          {/* V-IH-3: Full-screen run spinner */}
          {loadingRun && (
            <div
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 48 }}
              role="status"
              aria-label="Analyzing your bill"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.6)', borderTopColor: 'transparent' }}
              />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-2)', margin: 0 }}>
                Analyzing your bill…
              </p>
            </div>
          )}

          {/* Fallback state if no data after analysis */}
          {!loadingRun && !data && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 24px', textAlign: 'center' }}>
              <AlertCircle size={40} color="var(--c-danger)" />
              <p style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', margin: 0 }}>Analysis unavailable</p>
              <p style={{ fontSize: 13, color: 'var(--c-text-2)', margin: 0 }}>{error || 'Could not complete the document audit. Please retry your scan.'}</p>
              <button onClick={back} className="btn-primary" style={{ marginTop: 8, maxWidth: 220 }}>
                <ChevronLeft size={16} /> Back to Dashboard
              </button>
            </div>
          )}

          {data && (
            <div>
              {/* Hero Banner */}
              <div style={{ padding: '16px 20px 0' }}>
                <div style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                  border: `1px solid ${gapCount > 0 ? 'var(--c-danger-border)' : 'var(--c-success-border)'}`,
                  boxShadow: '0 20px 40px -15px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 20,
                  padding: 22,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    {gapCount > 0
                      ? <TriangleAlert size={18} color="var(--c-danger)" />
                      : <ShieldCheck size={18} color="var(--c-success)" />}
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', color: gapCount > 0 ? 'var(--c-danger)' : 'var(--c-success)' }}>
                      {gapCount > 0 ? 'Statutory Overcharge Detected' : 'Deterministic Audit Passed'}
                    </span>
                  </div>

                  <div style={{ fontSize: 30, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.8px', lineHeight: 1.1, marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {gapCount > 0 ? `${data.hold?.amount ?? '₹0'} Disputed Gap` : '₹0 Gap Detected'}
                  </div>

                  <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--c-text-2)', margin: 0 }}>
                    {gapCount > 0
                      ? 'Statutory rate schedule violated. A 72-hour reversible protection hold and dispute letter are ready.'
                      : 'All charges match government tariff schedules perfectly.'}
                  </p>
                </div>
              </div>

              {/* View Mode Switcher */}
              <div style={{ padding: '14px 20px 0' }}>
                <div style={{
                  display: 'flex',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: 3,
                  gap: 3,
                }}>
                  {[
                    { id: 'proofs' as const, icon: <FileSpreadsheet size={15} />, label: `Verified Proofs (${data.proofs?.length ?? 0})` },
                    { id: 'ocr'    as const, icon: <Eye size={15} />,             label: 'OCR Scanner' },
                    { id: 'letter' as const, icon: <FileText size={15} />,        label: 'Notice Letter' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setViewMode(tab.id)}
                      style={{
                        flex: 1, height: 38, borderRadius: 9, fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        cursor: 'pointer',
                        border: viewMode === tab.id ? '1px solid rgba(255,255,255,0.16)' : '1px solid transparent',
                        background: viewMode === tab.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                        color: viewMode === tab.id ? '#ffffff' : 'var(--c-text-3)',
                      }}
                    >
                      {tab.icon}{tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Content Pane */}
              <div style={{ padding: '14px 20px 0' }}>

                {/* V-3 / V-IH-2: BBox Overlay — no fields empty state */}
                {viewMode === 'ocr' && (
                  <div style={{
                    background: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12)',
                    borderRadius: 18,
                    overflow: 'hidden',
                  }}>
                    {/* V-IH-2: extracted_fields === [] → "No text detected" */}
                    {!hasFields ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 20px' }}>
                        <AlertCircle size={32} color="var(--c-warn)" />
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', margin: 0 }}>No text detected</p>
                        <p style={{ fontSize: 13, color: 'var(--c-text-2)', margin: 0, textAlign: 'center' }}>
                          Please retake the photo with better lighting.
                        </p>
                      </div>
                    ) : (
                      <BBoxOverlay
                        captureType={state.captureType}
                        captureData={state.captureData}
                        fields={data.fields ?? []}
                      />
                    )}
                  </div>
                )}

                {/* V-5 / V-IH-2: Draft + mandatory AI banner */}
                {viewMode === 'letter' && (
                  <div style={{
                    background: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12)',
                    borderRadius: 18,
                    padding: 18,
                  }}>
                    {/* MANDATORY AI banner — IBM Granite policy, non-negotiable */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                      padding: '8px 12px', borderRadius: 10,
                      background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
                    }}>
                      <span style={{ fontSize: 14 }}>⚠️</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-warn)' }}>
                        {data.draftBanner || 'AI-generated — review before sending'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <CheckCircle2 size={16} color="var(--c-success)" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>Statutory Notice Draft</span>
                    </div>
                    {/* V-IH-2: empty draft → "No draft available" */}
                    {data.draftText ? (
                      <pre style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: 1.6, color: 'var(--c-text-2)', whiteSpace: 'pre-wrap', margin: 0 }}>
                        {data.draftText}
                      </pre>
                    ) : (
                      <p style={{ fontSize: 13, color: 'var(--c-text-3)', margin: 0, fontStyle: 'italic' }}>
                        No draft available. Proof cards shown above.
                      </p>
                    )}
                  </div>
                )}

                {/* V-2 / V-IH-2: Proof cards + empty state */}
                {viewMode === 'proofs' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* V-IH-2: empty proof_cards[] → "No issues found" */}
                    {(data.proofs?.length ?? 0) === 0 && (
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                        padding: '40px 20px',
                        background: 'rgba(52,211,153,0.06)', border: '1px solid var(--c-success-border)', borderRadius: 18,
                      }}>
                        <ShieldCheck size={36} color="var(--c-success)" />
                        <p style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', margin: 0 }}>No issues found! Your bill looks correct.</p>
                        <p style={{ fontSize: 13, color: 'var(--c-text-2)', margin: 0, textAlign: 'center' }}>
                          All charges match government tariff schedules. Nothing to dispute.
                        </p>
                      </div>
                    )}

                    {(data.proofs ?? []).map((proof, i) => {
                      const statusColor =
                        proof.status === 'gap' ? 'var(--c-danger)' :
                        proof.status === 'ok'  ? 'var(--c-success)' :
                        'var(--c-text-3)';
                      const statusBorder =
                        proof.status === 'gap' ? 'var(--c-danger-border)' :
                        proof.status === 'ok'  ? 'var(--c-success-border)' :
                        'rgba(255,255,255,0.1)';
                      const statusBg =
                        proof.status === 'gap' ? 'var(--c-danger-bg)' :
                        proof.status === 'ok'  ? 'var(--c-success-bg)' :
                        'rgba(255,255,255,0.05)';
                      const statusLabel =
                        proof.status === 'gap' ? 'OVERCHARGE' :
                        proof.status === 'ok'  ? 'VERIFIED' :
                        'UNVERIFIED';

                      return (
                        <motion.div
                          key={proof.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          style={{
                            background: 'rgba(255,255,255,0.035)',
                            border: `1px solid ${statusBorder}`,
                            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: 18, padding: 18,
                            position: 'relative', overflow: 'hidden',
                          }}
                        >
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: statusColor }} />

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: '#ffffff' }}>{proof.itemName}</span>
                            <span style={{
                              padding: '3px 8px', borderRadius: 10,
                              background: statusBg, color: statusColor,
                              fontSize: 10, fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase',
                            }}>{statusLabel}</span>
                          </div>

                          {/* 3-Column Grid */}
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
                            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)',
                            padding: 12, borderRadius: 12, marginBottom: 12,
                          }}>
                            <div style={{ textAlign: 'left' }}>
                              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: 'var(--c-text-3)', display: 'block', marginBottom: 2 }}>{proof.sourceLabel}</span>
                              <span style={{ fontSize: 16, fontWeight: 900, color: '#ffffff', fontFamily: 'IBM Plex Mono, monospace' }}>{proof.sourceValue}</span>
                              {proof.sourceRefUrl ? (
                                <a href={proof.sourceRefUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: 'var(--c-text-3)', display: 'block', marginTop: 1, textDecoration: 'underline' }}>{proof.sourceRef}</a>
                              ) : (
                                <span style={{ fontSize: 10, color: 'var(--c-text-3)', display: 'block', marginTop: 1 }}>{proof.sourceRef}</span>
                              )}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: 'var(--c-text-3)', display: 'block', marginBottom: 2 }}>{proof.computeLabel}</span>
                              <span style={{ fontSize: 16, fontWeight: 900, color: statusColor, fontFamily: 'IBM Plex Mono, monospace' }}>{proof.computeValue}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: 'var(--c-text-3)', display: 'block', marginBottom: 2 }}>{proof.ruleLabel}</span>
                              <span style={{ fontSize: 16, fontWeight: 900, color: '#ffffff', fontFamily: 'IBM Plex Mono, monospace' }}>{proof.ruleValue}</span>
                              {proof.ruleRefUrl ? (
                                <a href={proof.ruleRefUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: 'var(--c-text-2)', textDecoration: 'underline', display: 'block', marginTop: 1 }}>{proof.ruleRefText}</a>
                              ) : (
                                <span style={{ fontSize: 10, color: 'var(--c-text-2)', textDecoration: 'underline', display: 'block', marginTop: 1 }}>{proof.ruleRefText}</span>
                              )}
                            </div>
                          </div>

                          <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--c-text-2)', margin: 0, paddingLeft: 10, borderLeft: `2px solid ${statusColor}` }}>
                            {proof.summaryText}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* V-6: Audit Trail Timeline */}
              <div style={{ padding: '16px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Clock size={13} color="var(--c-text-3)" />
                  <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--c-text-3)', margin: 0 }}>
                    Governance Audit Trail
                  </p>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)', borderRadius: 14,
                }}>
                  {/* V-IH-3: audit skeleton while re-fetching */}
                  {loadingAudit ? <AuditSkeleton /> : (
                    <>
                      {/* V-IH-2: audit === [] → informational placeholder */}
                      {(data.audit?.length ?? 0) === 0 && (
                        <p style={{ padding: '12px 14px', fontSize: 12, color: 'var(--c-text-3)', fontStyle: 'italic', margin: 0 }}>
                          Audit trail will appear after analysis.
                        </p>
                      )}
                      <div style={{ padding: '0 14px' }}>
                        {(data.audit ?? []).map((ev, i) => (
                          <div key={ev.id} style={{
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                            padding: '10px 0',
                            borderBottom: i < (data.audit?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0, paddingRight: 10 }}>
                              <div style={{
                                width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                                background: ev.t === 'consent' ? 'var(--c-success)' : ev.t?.startsWith('hold') ? 'var(--c-warn)' : 'rgba(255,255,255,0.4)',
                              }} />
                              <div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', display: 'block' }}>
                                  {AUDIT_LABELS[ev.t] ?? ev.t}
                                </span>
                                <p style={{ fontSize: 11, color: 'var(--c-text-2)', margin: '2px 0 0 0' }}>{ev.payload}</p>
                              </div>
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--c-text-3)', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>
                              {new Date(ev.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* V-IH-4 + V-4: Sticky Bottom Action Bar */}
          {data && (
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              margin: '0 auto', maxWidth: 440,
              padding: '14px 20px', paddingBottom: 'calc(var(--sab) + 12px)',
              background: 'rgba(5, 5, 8, 0.92)',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              display: 'flex', flexDirection: 'column', gap: 8,
              zIndex: 100,
            }}>

              {/* V-IH-2: hold === null → "No protective hold needed" */}
              {!hasHold && (
                <div style={{
                  width: '100%', padding: '10px 16px', borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={18} color="var(--c-text-3)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--c-text-2)' }}>No protective hold needed</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>No statutory violations detected</div>
                  </div>
                </div>
              )}

              {/* V-IH-4: hold.status === "staged" → DISABLED chip with advisory tooltip */}
              {isStaged && (
                <div style={{
                  width: '100%', padding: '12px 16px', borderRadius: 14,
                  border: '1px solid rgba(251,191,36,0.3)',
                  background: 'rgba(251,191,36,0.08)',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  {/* Amber chip row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Unlock size={18} color="var(--c-warn)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {data.hold?.amount} — Advisory Only
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-warn)' }}>
                        Hold staged (low confidence)
                      </div>
                    </div>
                  </div>
                  {/* V-IH-4: tooltip explaining why button is disabled */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px',
                    borderRadius: 10, background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <Info size={13} color="var(--c-text-3)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 11, color: 'var(--c-text-2)', lineHeight: 1.5 }}>
                      Confidence too low to auto-freeze. Retake photo for higher confidence.
                    </span>
                  </div>
                  {/* V-IH-4: Confirm Hold button DISABLED for staged */}
                  <button
                    disabled
                    aria-disabled="true"
                    title="Cannot confirm hold — confidence too low. Retake photo."
                    style={{
                      width: '100%', padding: '11px 16px', borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      color: 'var(--c-text-3)',
                      fontSize: 13, fontWeight: 700,
                      cursor: 'not-allowed', opacity: 0.5,
                    }}
                  >
                    <Lock size={14} />
                    Confirm Hold — Retake Photo First
                  </button>
                </div>
              )}

              {/* V-4: hold.status === "placed" → green "Frozen — Withdraw" */}
              {isPlaced && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleWithdraw}
                  disabled={loadingWithdraw}
                  aria-label="Withdraw protection hold"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 14,
                    border: '1px solid var(--c-success-border)',
                    background: 'rgba(52,211,153,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: loadingWithdraw ? 'not-allowed' : 'pointer',
                    opacity: loadingWithdraw ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050508' }}>
                      <Lock size={18} strokeWidth={2.4} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {data.hold?.amount} Frozen
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text-2)' }}>
                        Frozen — auto-releases in 72h · tap to withdraw
                      </div>
                    </div>
                  </div>
                  {/* V-IH-3: button-level spinner */}
                  {loadingWithdraw ? <BtnSpinner /> : <Unlock size={18} color="var(--c-success)" />}
                </motion.button>
              )}

              {/* V-4: Send Letter — always show if draft exists */}
              {hasDraft && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSendLetter}
                  disabled={loadingLetter}
                  aria-label="Send dispute letter"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: loadingLetter ? 'not-allowed' : 'pointer',
                    opacity: loadingLetter ? 0.7 : 1,
                    color: '#ffffff', fontSize: 13, fontWeight: 700,
                  }}
                >
                  {/* V-IH-3: button-level spinner */}
                  {loadingLetter ? <BtnSpinner /> : <Send size={16} />}
                  {loadingLetter ? 'Sending…' : 'Send Letter'}
                </motion.button>
              )}

              {/* Clear & Reset Option */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
                <button
                  onClick={() => {
                    if (data?.id) {
                      deleteFromVault(data.id);
                    }
                    resetSession();
                    history.push('/capture');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--c-text-3)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                  }}
                >
                  <RotateCcw size={13} />
                  Clear & Scan Another Document
                </button>
              </div>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};
