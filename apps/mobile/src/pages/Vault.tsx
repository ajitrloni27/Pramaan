import React, { useState, useMemo } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useSession, VaultItem, Domain } from '../context/SessionContext';
import { 
  ShieldCheck, 
  Search, 
  Lock, 
  Unlock, 
  Hospital, 
  Building2, 
  Clock, 
  Trash2, 
  ChevronRight, 
  ScanLine, 
  Layers, 
  Scale, 
  TrendingUp, 
  FileCheck, 
  Plus, 
  Filter,
  AlertCircle,
  Car,
  Pill,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FilterTab = 'all' | 'holds' | Domain;

const DOMAIN_LABELS: Record<Domain, { label: string; icon: React.ElementType }> = {
  bill: { label: 'Medical Bill', icon: Hospital },
  lease: { label: 'Rental Lease', icon: Building2 },
  gig_payslip: { label: 'Gig Payslip', icon: Car },
  insurance: { label: 'Insurance Claim', icon: ShieldCheck },
  medicine: { label: 'Medicine & NSQ', icon: Pill },
  challan: { label: 'Traffic Challan', icon: Scale },
};

export const Vault: React.FC = () => {
  const history = useHistory();
  const { state, setDomain, setCapture, deleteFromVault, clearVault, selectVaultItem } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Dynamic calculations
  const totalProtectedFunds = useMemo(() => {
    return state.vault.reduce((acc, item) => acc + (item.disputedNumber || 0), 0);
  }, [state.vault]);

  const activeHoldsCount = useMemo(() => {
    return state.vault.filter(i => i.holdStatus === 'placed').length;
  }, [state.vault]);

  const totalProofsCount = useMemo(() => {
    return state.vault.reduce((acc, item) => acc + (item.proofsCount || 0), 0);
  }, [state.vault]);

  // Filtered list
  const filteredItems = useMemo(() => {
    return state.vault.filter(item => {
      // Filter by tab
      if (activeFilter === 'holds' && item.holdStatus !== 'placed') return false;
      if (activeFilter !== 'all' && activeFilter !== 'holds' && item.domain !== activeFilter) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.disputedAmount.toLowerCase().includes(q) ||
          item.hash.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [state.vault, activeFilter, searchQuery]);

  const handleOpenCase = (item: VaultItem) => {
    setDomain(item.domain);
    setCapture(item.captureType || 'text', item.captureData || item.title);
    selectVaultItem(item.id);
    history.push('/results');
  };

  const handleCreateNew = () => {
    history.push('/capture');
  };

  return (
    <IonPage>
      <IonContent fullscreen scrollY={true} scrollX={false}>
        <div className="mobile-shell" style={{ paddingBottom: 110 }}>

          {/* ──── Header ──── */}
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
            zIndex: 30,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-text-1)', boxShadow: '0 0 8px rgba(255, 255, 255, 0.6)' }} />
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--c-text-3)' }}>
                  SECURE VAULT
                </span>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--c-text-1)', margin: 0, lineHeight: 1.1 }}>
                Evidence Registry
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {state.vault.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear all evidence records and reset protected capital?')) {
                      clearVault();
                    }
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 10,
                    padding: '6px 10px',
                    color: 'var(--c-text-3)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Clear all stored evidence"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              )}

              <button
                onClick={handleCreateNew}
                style={{
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#050508',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255, 255, 255, 0.25)',
                }}
              >
                <Plus size={16} strokeWidth={2.4} />
                New Audit
              </button>
            </div>
          </div>

          {/* ──── Capital Protection Card ──── */}
          <div style={{ padding: '16px 20px 0' }}>
            <div style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(24px)',
              borderRadius: 20,
              padding: 20,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: 0, left: '20%', right: '20%', height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
              }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={16} color="var(--c-success)" />
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--c-success)' }}>
                    6-Domain Protection
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--c-text-3)', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {state.vault.length} Stored Cases
                </span>
              </div>

              <div style={{ fontSize: 32, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.8px', fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1.1, marginBottom: 8 }}>
                ₹{totalProtectedFunds.toLocaleString('en-IN')}
              </div>
              <p style={{ fontSize: 13, color: 'var(--c-text-2)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Total disputed capital protected across medical bills, leases, gig payslips, insurance claims, medicines, and traffic challans.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                paddingTop: 14,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--c-text-3)', marginBottom: 2 }}>
                    Active 72h Holds
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--c-success)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {activeHoldsCount} Locked
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--c-text-3)', marginBottom: 2 }}>
                    Statutory Clauses
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {totalProofsCount} Verified Proofs
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ──── Search Bar ──── */}
          <div style={{ padding: '16px 20px 0' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: '10px 14px',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.6)',
            }}>
              <Search size={16} color="var(--c-text-3)" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search cases, statutory rules, or proof hash..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
              {searchQuery.length > 0 && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ fontSize: 11, color: 'var(--c-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ──── Filter Pills ──── */}
          <div style={{ padding: '12px 20px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <div style={{ display: 'flex', gap: 6, minWidth: 'max-content' }}>
              {[
                { id: 'all' as const, label: `All Evidence (${state.vault.length})` },
                { id: 'holds' as const, label: `Active Holds (${activeHoldsCount})` },
                { id: 'bill' as const, label: 'Medical' },
                { id: 'lease' as const, label: 'Leases' },
                { id: 'gig_payslip' as const, label: 'Gig Payslip' },
                { id: 'insurance' as const, label: 'Insurance' },
                { id: 'medicine' as const, label: 'Medicines' },
                { id: 'challan' as const, label: 'Challans' },
              ].map(tab => {
                const active = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: active ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.06)',
                      background: active ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      color: active ? '#ffffff' : 'var(--c-text-3)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ──── Dynamic Case Cards List ──── */}
          <div style={{ padding: '16px 20px 0' }}>
            {filteredItems.length === 0 ? (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px dashed rgba(255, 255, 255, 0.12)',
                borderRadius: 18,
                padding: '40px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <AlertCircle size={24} color="var(--c-text-3)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>
                    No Evidence Records Found
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--c-text-3)', margin: 0 }}>
                    {searchQuery ? 'Try adjusting your search query' : 'Scan any document from the 6 statutory domains to seal your first proof.'}
                  </p>
                </div>
                {!searchQuery && (
                  <button
                    onClick={handleCreateNew}
                    className="btn-primary"
                    style={{ maxWidth: 200, height: 42, fontSize: 13, marginTop: 6 }}
                  >
                    Scan Document Now
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AnimatePresence>
                  {filteredItems.map((item, idx) => {
                    const DomainIcon = DOMAIN_LABELS[item.domain]?.icon || Hospital;
                    const domainTitle = DOMAIN_LABELS[item.domain]?.label || 'Document Audit';

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.035)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: '0 16px 36px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: 18,
                          padding: 16,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Top status rail */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: item.holdStatus === 'placed' ? 'var(--c-success)' : 'var(--c-warn)',
                        }} />

                        {/* Header Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <DomainIcon size={14} color="var(--c-text-2)" />
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', textTransform: 'uppercase' }}>
                              {domainTitle} • {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 8,
                            background: item.holdStatus === 'placed' ? 'rgba(52, 211, 153, 0.12)' : 'rgba(251, 191, 36, 0.12)',
                            border: `1px solid ${item.holdStatus === 'placed' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                            color: item.holdStatus === 'placed' ? 'var(--c-success)' : 'var(--c-warn)',
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: '0.4px',
                            textTransform: 'uppercase',
                          }}>
                            {item.holdStatus === 'placed' ? '72H FROZEN' : 'DISPUTED'}
                          </span>
                        </div>

                        {/* Title & Amount */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.3 }}>
                            {item.title}
                          </h3>
                          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--c-danger)', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>
                            {item.disputedAmount}
                          </div>
                        </div>

                        {/* Summary */}
                        <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--c-text-2)', margin: '0 0 12px 0' }}>
                          {item.summary}
                        </p>

                        {/* Footer Actions */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: 10,
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--c-text-3)' }}>
                              HASH: {item.hash}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFromVault(item.id);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 4,
                                color: 'var(--c-text-3)',
                                cursor: 'pointer',
                              }}
                              title="Delete evidence"
                            >
                              <Trash2 size={15} />
                            </button>

                            <button
                              onClick={() => handleOpenCase(item)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: 8,
                                padding: '5px 10px',
                                color: '#ffffff',
                                fontSize: 12,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                cursor: 'pointer',
                              }}
                            >
                              Inspect Proofs
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};
