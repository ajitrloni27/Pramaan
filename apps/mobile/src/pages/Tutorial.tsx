import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHistory } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { ArrowRight, Scale, CheckCircle2, Zap, ShieldCheck } from 'lucide-react';

interface Slide {
  badge: string;
  title: string;
  description: string;
  visual: React.ReactNode;
}

const SlideScanVisual = () => (
  <div style={{ width: '100%', maxWidth: 320, margin: '0 auto' }}>
    <div style={{
      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(20px)',
      borderRadius: 18,
      padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 8px rgba(255, 255, 255, 0.6)' }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', color: '#ffffff' }}>HOSPITAL INVOICE #8921</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 10 }}>
          <span style={{ fontSize: 13, color: '#ffffff', fontWeight: 600 }}>Brain MRI (3.0 Tesla)</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--c-danger)', fontFamily: 'IBM Plex Mono, monospace' }}>₹45,000</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 10 }}>
          <span style={{ fontSize: 13, color: '#ffffff', fontWeight: 600 }}>Consultation Fee</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-2)', fontFamily: 'IBM Plex Mono, monospace' }}>₹500</span>
        </div>
      </div>

      <div style={{
        border: '1px solid var(--c-danger-border)',
        background: 'var(--c-danger-bg)',
        borderRadius: 10,
        padding: '9px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>CGHS Statutory Ceiling</span>
        <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--c-danger)', fontFamily: 'IBM Plex Mono, monospace' }}>+ ₹27,000 GAP</span>
      </div>
    </div>
  </div>
);

const SlideRulesVisual = () => (
  <div style={{ width: '100%', maxWidth: 320, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{
      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
      borderRadius: 16,
      padding: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Scale size={20} color="#ffffff" />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>CGHS Official Ceiling</div>
        <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginTop: 2 }}>Cap is fixed at ₹18,000 max</div>
      </div>
    </div>

    <div style={{
      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
      borderRadius: 16,
      padding: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ShieldCheck size={20} color="var(--c-success)" />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>10,000+ Legal Rules</div>
        <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginTop: 2 }}>Model Rent Act & Tariff Schedules</div>
      </div>
    </div>
  </div>
);

const SlideActionVisual = () => (
  <div style={{ width: '100%', maxWidth: 320, margin: '0 auto' }}>
    <div style={{
      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.14)',
      boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      borderRadius: 18,
      padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <CheckCircle2 size={16} color="var(--c-success)" />
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--c-success)' }}>72H REVERSIBLE PROTECTION</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: '#ffffff', marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>₹27,000 Held</div>
      <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.5 }}>
        Legal notice automatically drafted & ready to send with 1 tap.
      </div>
    </div>
  </div>
);

const slides: Slide[] = [
  {
    badge: 'Step 1 of 3',
    title: 'Scan or Upload\nYour Bill or Lease',
    description: 'Photograph an invoice or lease agreement. The OCR extracts all items, amounts, and legal clauses in seconds.',
    visual: <SlideScanVisual />,
  },
  {
    badge: 'Step 2 of 3',
    title: 'Instant Audit\nAgainst Laws',
    description: 'We verify prices against government statutory rates (CGHS, Rent Acts) to find exact illegal overcharges.',
    visual: <SlideRulesVisual />,
  },
  {
    badge: 'Step 3 of 3',
    title: 'Freeze Funds &\nSend Legal Notice',
    description: 'Safeguard your money with a 72h reversible hold while sending an audit dispute notice directly.',
    visual: <SlideActionVisual />,
  },
];

export const Tutorial: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const history = useHistory();
  const { completeTutorial } = useSession();

  const isLast = idx === slides.length - 1;
  const currentSlide = slides[idx];

  const handleNext = () => {
    if (isLast) {
      completeTutorial();
      history.push('/dashboard');
    } else {
      setIdx(p => p + 1);
    }
  };

  const handleSkip = () => {
    completeTutorial();
    history.push('/dashboard');
  };

  return (
    <IonPage>
      <IonContent fullscreen scrollX={false}>
        <div className="mobile-shell" style={{ justifyContent: 'space-between', padding: '24px 20px', paddingTop: 'calc(var(--sat) + 16px)', paddingBottom: 'calc(var(--sab) + 20px)' }}>

          {/* Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 8px rgba(255, 255, 255, 0.6)' }} />
              <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.8px', color: '#ffffff' }}>PRAMAAN</span>
            </div>
            <button
              onClick={handleSkip}
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--c-text-2)',
                padding: '6px 14px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
          </div>

          {/* Visual Showcase */}
          <div style={{ padding: '20px 0', width: '100%' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                {currentSlide.visual}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Description */}
          <div style={{ width: '100%' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`text-${idx}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}>
                  <Zap size={11} color="#ffffff" />
                  {currentSlide.badge}
                </div>

                <h1 style={{
                  fontSize: 28,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  letterSpacing: '-0.6px',
                  color: '#ffffff',
                  margin: '0 0 10px 0',
                  whiteSpace: 'pre-line',
                }}>
                  {currentSlide.title}
                </h1>

                <p style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--c-text-2)',
                  margin: 0,
                }}>
                  {currentSlide.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Progress & Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', marginTop: 20 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {slides.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    width: i === idx ? 28 : 8,
                    background: i === idx ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
                  }}
                  transition={{ duration: 0.3 }}
                  style={{ height: 4, borderRadius: 2 }}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="btn-primary"
            >
              {isLast ? 'Get Started' : 'Continue'}
              <ArrowRight size={16} />
            </button>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};
