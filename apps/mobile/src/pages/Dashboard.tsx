import React from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useSession, Domain } from '../context/SessionContext';
import { 
  ScanLine, 
  ChevronRight, 
  Clock, 
  TrendingUp, 
  FileCheck, 
  Scale, 
  Building2, 
  Hospital, 
  Pill, 
  ArrowUpRight, 
  Lock, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  Zap,
  FileSpreadsheet,
  Trash2,
  Car,
  ShieldAlert,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DomainMeta {
  id: Domain;
  label: string;
  shortLabel: string;
  tag: string;
  icon: React.ElementType;
  heroTitle: string;
  heroDesc: string;
  sampleInput: string;
}

const DOMAINS: DomainMeta[] = [
  {
    id: 'bill',
    label: 'Medical Bills',
    shortLabel: 'Medical (CGHS)',
    tag: 'CGHS & NPPA',
    icon: Hospital,
    heroTitle: 'Scan & Verify Medical Invoice',
    heroDesc: 'Cross-reference hospital line items against CGHS tariff schedules, find unbilled caps, and place 72h protection holds.',
    sampleInput: `HOSPITAL INVOICE #8921\n1. Brain MRI with Contrast (3.0 Tesla): ₹8,500 (CGHS Ceiling: ₹6,400)\n2. Paracetamol 500mg Tablets x 10: ₹45\n3. Complete Blood Count (CBC): ₹150`,
  },
  {
    id: 'lease',
    label: 'Rental Leases',
    shortLabel: 'Leases (Act)',
    tag: 'Tenancy Act 2021',
    icon: Building2,
    heroTitle: 'Scan & Verify Rental Lease',
    heroDesc: 'Audit draft agreements against the Model Tenancy Act 2021 (max 2-month deposit ceiling, notice rules, and illegal clauses).',
    sampleInput: `RESIDENTIAL LEASE AGREEMENT\n1. Monthly Rent: ₹35,000\n2. Security Deposit Demanded: ₹3,50,000 (10 Months Demanded - Legal Cap is 2 Months: ₹70,000)`,
  },
  {
    id: 'gig_payslip',
    label: 'Gig Payslips',
    shortLabel: 'Gig Payslips',
    tag: 'MoRTH 2025',
    icon: Car,
    heroTitle: 'Scan & Verify Gig Payslip',
    heroDesc: 'Cross-examine platform fare splits against MoRTH 2025 Aggregator Guidelines (minimum 80% driver share & 1.5x surge caps).',
    sampleInput: `AGGREGATOR WEEKLY SETTLEMENT\n1. Gross Customer Fare Billed: ₹5,000\n2. Driver Net Remuneration: ₹2,800 (56%)\n3. Statutory Mandate: Clause 17 mandates min 80% driver payout (₹4,000)`,
  },
  {
    id: 'insurance',
    label: 'Insurance Claims',
    shortLabel: 'Insurance',
    tag: 'IRDAI 2024',
    icon: ShieldCheck,
    heroTitle: 'Scan & Verify Insurance Claim',
    heroDesc: 'Check claim deductions against IRDAI 2024 Master Circulars, 60-month moratorium rules, cashless TAT, and Ombudsman caps.',
    sampleInput: `TPA CLAIM SETTLEMENT SUMMARY\n1. Total Hospital Incurred Bill: ₹1,20,000\n2. Approved Claim Amount: ₹85,000\n3. Disallowed Room Rent Proportionate Deduction: ₹35,000 (Violates IRDAI 2024)`,
  },
  {
    id: 'medicine',
    label: 'Medicines & NSQ',
    shortLabel: 'Medicines',
    tag: 'CDSCO & NPPA',
    icon: Pill,
    heroTitle: 'Scan & Verify Pharmacy / Rx',
    heroDesc: 'Verify drug prices against NPPA DPCO price ceiling list and scan batch numbers against CDSCO Not of Standard Quality recalls.',
    sampleInput: `PHARMACY CASH MEMO\n1. Paracetamol 650mg Strip of 10: ₹45 (NPPA DPCO Cap: ₹22)\n2. Azithromycin 500mg Batch AYC-2407: ₹185 (CDSCO NSQ Recall June 2025)`,
  },
  {
    id: 'challan',
    label: 'Traffic Challans',
    shortLabel: 'Challans',
    tag: 'MV Act 1988',
    icon: Scale,
    heroTitle: 'Scan & Verify Traffic Challan',
    heroDesc: 'Audit traffic e-challans against Motor Vehicles Act Section 136A electronic enforcement and speed camera calibration rules.',
    sampleInput: `TRAFFIC E-CHALLAN NOTICE\n1. Vehicle No: KA-01-MJ-4412\n2. Alleged Violation: Section 183 MV Act (Over-speeding)\n3. Fine Demanded: ₹2,000 (Lacks mandatory Section 136A electronic calibration proof)`,
  },
];

export const Dashboard: React.FC = () => {
  const history = useHistory();
  const { state, setDomain, setCapture, clearVault } = useSession();

  const activeDomainMeta = DOMAINS.find(d => d.id === state.domain) || DOMAINS[0];

  const handleQuickTool = (domain: Domain, prefill?: string) => {
    setDomain(domain);
    if (prefill) {
      setCapture('text', prefill);
      history.push('/analyze');
    } else {
      history.push('/capture');
    }
  };

  // Derive live statistics dynamically from user's vault items
  const totalDisputedFunds = state.vault.reduce((acc, v) => acc + (v.disputedNumber || 0), 0);

  return (
    <IonPage>
      <IonContent fullscreen scrollX={false} scrollY={true}>
        <div className="mobile-shell" style={{ paddingBottom: 110 }}>

          {/* ──── Sticky Header ──── */}
          <div style={{
            paddingTop: 'calc(var(--sat) + 12px)',
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(5, 5, 8, 0.85)',
            backdropFilter: 'blur(20px)',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-text-1)', boxShadow: '0 0 8px rgba(255, 255, 255, 0.6)' }} />
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--c-text-3)' }}>
                  PRAMAAN ENGINE
                </span>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--c-text-1)', margin: 0, lineHeight: 1.1 }}>
                Evidence Engine
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {state.vault.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear all stored audits and reset disputed capital?')) {
                      clearVault();
                    }
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 20,
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
                  title="Clear all stored evidence"
                >
                  <Trash2 size={12} color="var(--c-text-3)" />
                  Clear
                </button>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}>
                <ShieldCheck size={14} color="var(--c-success)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text-2)' }}>Deterministic</span>
              </div>
            </div>
          </div>

          {/* ──── Dynamic 6-Domain Scrollable Horizontal Track ──── */}
          <div style={{ padding: '16px 20px 0' }}>
            <div 
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 4,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {DOMAINS.map(d => {
                const active = state.domain === d.id;
                const IconComponent = d.icon;
                return (
                  <button
                    key={d.id}
                    onClick={() => setDomain(d.id)}
                    style={{
                      flexShrink: 0,
                      height: 42,
                      padding: '0 14px',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      background: active ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.035)',
                      color: active ? '#ffffff' : 'var(--c-text-2)',
                      border: active ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: active ? '0 4px 14px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                    }}
                  >
                    <IconComponent size={15} color={active ? '#ffffff' : 'var(--c-text-3)'} />
                    <span>{d.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ──── Hero Obsidian Scanner Card ──── */}
          <div style={{ padding: '14px 20px 0' }}>
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => history.push('/capture')}
              style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(24px)',
                borderRadius: 20,
                padding: 22,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top specular accent shimmer */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: '20%',
                right: '20%',
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
              }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(255, 255, 255, 0.25)',
                }}>
                  <ScanLine size={22} color="#050508" strokeWidth={2.4} />
                </div>

                <span style={{
                  padding: '5px 11px',
                  borderRadius: 20,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: 'var(--c-text-2)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}>
                  <Sparkles size={12} color="#ffffff" />
                  {activeDomainMeta.tag}
                </span>
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px', color: '#ffffff', margin: '0 0 6px 0', lineHeight: 1.2 }}>
                {activeDomainMeta.heroTitle}
              </h2>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--c-text-2)', margin: '0 0 16px 0' }}>
                {activeDomainMeta.heroDesc}
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 12,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                  Launch Camera or Upload Document
                </span>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ArrowUpRight size={15} color="#ffffff" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* ──── Key Stat Metrics ──── */}
          <div style={{ padding: '14px 20px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.035)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '14px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <TrendingUp size={13} color="var(--c-danger)" />
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--c-text-3)', letterSpacing: '0.4px' }}>Disputed</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px', fontFamily: 'IBM Plex Mono, monospace' }}>
                  ₹{totalDisputedFunds.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>In active holds</div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.035)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '14px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <FileCheck size={13} color="var(--c-success)" />
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--c-text-3)', letterSpacing: '0.4px' }}>Audit Proof</span>
                </div>
                <div style={{ fontSize: 19, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px', fontFamily: 'IBM Plex Mono, monospace' }}>100%</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>Deterministic</div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.035)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '14px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <Scale size={13} color="var(--c-text-2)" />
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--c-text-3)', letterSpacing: '0.4px' }}>Tariffs</span>
                </div>
                <div style={{ fontSize: 19, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px', fontFamily: 'IBM Plex Mono, monospace' }}>6 Domains</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>Statutory rules</div>
              </div>
            </div>
          </div>

          {/* ──── 6-Domain Forensic Presets (Instant Test) ──── */}
          <div style={{ padding: '18px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--c-text-3)', margin: 0 }}>
                1-Tap Forensic Presets
              </p>
              <span style={{ fontSize: 11, color: 'var(--c-text-3)', fontWeight: 600 }}>Instant Test</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* 1. Hospital MRI Cap */}
              <button
                onClick={() => handleQuickTool('bill', DOMAINS[0].sampleInput)}
                style={{
                  background: 'rgba(255, 255, 255, 0.035)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  padding: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(251, 113, 133, 0.12)', border: '1px solid rgba(251, 113, 133, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hospital size={16} color="var(--c-danger)" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>Hospital MRI Cap</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>CGHS ceiling check</div>
                </div>
              </button>

              {/* 2. Rental Deposit Cap */}
              <button
                onClick={() => handleQuickTool('lease', DOMAINS[1].sampleInput)}
                style={{
                  background: 'rgba(255, 255, 255, 0.035)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  padding: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} color="#ffffff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>Rental Deposit Cap</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>2-Month legal ceiling</div>
                </div>
              </button>

              {/* 3. Gig Driver Fare Split */}
              <button
                onClick={() => handleQuickTool('gig_payslip', DOMAINS[2].sampleInput)}
                style={{
                  background: 'rgba(255, 255, 255, 0.035)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  padding: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car size={16} color="#38bdf8" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>Driver Fare Share</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>80% MoRTH mandate</div>
                </div>
              </button>

              {/* 4. Health Claim Deduction */}
              <button
                onClick={() => handleQuickTool('insurance', DOMAINS[3].sampleInput)}
                style={{
                  background: 'rgba(255, 255, 255, 0.035)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  padding: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(52, 211, 153, 0.12)', border: '1px solid rgba(52, 211, 153, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={16} color="var(--c-success)" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>Claim Deduction</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>IRDAI 2024 policy</div>
                </div>
              </button>

              {/* 5. Medicine & NSQ Cap */}
              <button
                onClick={() => handleQuickTool('medicine', DOMAINS[4].sampleInput)}
                style={{
                  background: 'rgba(255, 255, 255, 0.035)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  padding: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pill size={16} color="var(--c-warn)" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>NPPA Drug Ceiling</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>DPCO & NSQ safety</div>
                </div>
              </button>

              {/* 6. Electronic Traffic Challan */}
              <button
                onClick={() => handleQuickTool('challan', DOMAINS[5].sampleInput)}
                style={{
                  background: 'rgba(255, 255, 255, 0.035)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  padding: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Scale size={16} color="#c084fc" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>Traffic e-Challan</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>MVA Sec 136A proof</div>
                </div>
              </button>
            </div>
          </div>

          {/* ──── Recent Verified Case Feed from Dynamic Vault ──── */}
          <div style={{ padding: '18px 20px 100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} color="var(--c-text-3)" />
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--c-text-3)', margin: 0 }}>
                  Recent Case Audits
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {state.vault.length > 0 && (
                  <button 
                    onClick={() => {
                      if (window.confirm('Clear all stored audits and reset disputed capital?')) {
                        clearVault();
                      }
                    }}
                    style={{ fontSize: 11, color: 'var(--c-text-3)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                )}
                <button 
                  onClick={() => history.push('/vault')}
                  style={{ fontSize: 11, color: 'var(--c-text-2)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  View Vault ({state.vault.length}) →
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {state.vault.length === 0 ? (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: '1px dashed rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  padding: '24px 16px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                  <Clock size={20} color="var(--c-text-3)" />
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text-2)' }}>No recent case audits</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)', maxWidth: 260, lineHeight: 1.4 }}>
                    Run your first scan using the forensic OCR camera above to generate statutory proofs.
                  </div>
                </div>
              ) : (
                state.vault.slice(0, 5).map((item) => {
                  const hasGap = item.gapCount > 0;
                  const domainLabel = DOMAINS.find(d => d.id === item.domain)?.label || 'Document Audit';
                  return (
                    <motion.div
                      key={item.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => history.push('/vault')}
                      style={{
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.045) 0%, rgba(255, 255, 255, 0.015) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                        borderRadius: 14,
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)' }}>
                          {domainLabel} · {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          background: hasGap ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                          color: hasGap ? 'var(--c-success)' : 'var(--c-text-3)',
                          border: hasGap ? '1px solid rgba(52, 211, 153, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
                        }}>
                          {hasGap ? '72H FROZEN' : 'COMPLIANT'}
                        </span>
                      </div>

                      <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>
                        {item.title}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Lock size={12} color="var(--c-text-3)" />
                          <span style={{ fontSize: 11, color: 'var(--c-text-2)', fontWeight: 600 }}>
                            {hasGap ? '72h Reversible Protection' : 'Verified Legally Sound'}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-2)', display: 'flex', alignItems: 'center', gap: 2 }}>
                          Inspect Evidence <ChevronRight size={12} />
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};
