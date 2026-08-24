import React, { useEffect, useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShieldAlert, Cpu, Database, ScanSearch, FileCheck2 } from 'lucide-react';

interface Step {
  label: string;
  detail: string;
  icon: React.ElementType;
}

const steps: Step[] = [
  { label: 'Optical Entity Recognition', detail: 'Extracting line items, rate codes & totals…', icon: ScanSearch },
  { label: 'Rule Graph Matching', detail: 'Cross-examining against 10,000+ legal schedules…', icon: Database },
  { label: 'Discrepancy Calculation', detail: 'Computing mathematical gaps & overcharge bounds…', icon: Cpu },
  { label: 'Evidence Sealing', detail: 'Generating cryptographic proof anchor hash…', icon: ShieldAlert },
  { label: 'Notice Generation', detail: 'Drafting structured dispute notice…', icon: FileCheck2 },
];

const STEP_DURATION = 750;

export const Analyze: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  const history = useHistory();

  useEffect(() => {
    if (current < steps.length) {
      const t = setTimeout(() => {
        setDone(p => [...p, current]);
        setCurrent(p => p + 1);
      }, STEP_DURATION);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => history.push('/results'), 400);
      return () => clearTimeout(t);
    }
  }, [current, history]);

  const pct = Math.round((done.length / steps.length) * 100);

  return (
    <IonPage>
      <IonContent fullscreen scrollX={false}>
        <div className="mobile-shell" style={{ justifyContent: 'space-between', padding: '24px 20px', paddingTop: 'calc(var(--sat) + 20px)', paddingBottom: 'calc(var(--sab) + 20px)' }}>

          {/* Central Holographic Progress Ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 16 }}>
            <div style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              marginBottom: 18,
            }}>
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{
                  position: 'absolute',
                  inset: -6,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(255, 255, 255, 0.4)',
                }}
              />
              <Cpu size={36} color="#ffffff" />
            </div>

            <h1 style={{
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: '-0.5px',
              color: '#ffffff',
              margin: '0 0 6px 0',
            }}>
              Auditing Evidence…
            </h1>
            <p style={{ fontSize: 13, color: 'var(--c-text-2)', margin: 0 }}>
              Deterministic statutory verification in progress
            </p>
          </div>

          {/* Stepper Obsidian Glass Card */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.015) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(20px)',
            borderRadius: 18,
            padding: '12px 16px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            {steps.map((step, i) => {
              const isDone = done.includes(i);
              const isActive = current === i;
              const StepIcon = step.icon;

              return (
                <React.Fragment key={i}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 6px',
                    opacity: isDone || isActive ? 1 : 0.35,
                    transition: 'all 0.25s ease',
                  }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isDone ? 'rgba(52, 211, 153, 0.15)' : isActive ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${isDone ? 'rgba(52, 211, 153, 0.35)' : isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
                    }}>
                      <AnimatePresence mode="wait">
                        {isDone ? (
                          <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                            <Check size={16} color="var(--c-success)" strokeWidth={2.6} />
                          </motion.div>
                        ) : isActive ? (
                          <motion.div
                            key="spin"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #ffffff', borderTopColor: 'transparent' }}
                          />
                        ) : (
                          <StepIcon size={15} color="var(--c-text-3)" />
                        )}
                      </AnimatePresence>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: isDone || isActive ? '#ffffff' : 'var(--c-text-3)',
                      }}>
                        {step.label}
                      </div>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text-2)', marginTop: 2 }}
                        >
                          {step.detail}
                        </motion.div>
                      )}
                    </div>
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)', marginLeft: 44 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Pipeline Progress
              </span>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#ffffff', fontFamily: 'IBM Plex Mono, monospace' }}>
                {pct}%
              </span>
            </div>
            <div style={{ width: '100%', height: 4, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', background: '#ffffff', borderRadius: 2 }}
              />
            </div>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};
