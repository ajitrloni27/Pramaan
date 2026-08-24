// apps/mobile/src/components/AuditViewer.tsx
// V-6: Audit log viewer with timeline labels.
// Renders governance trail — proves what was auto vs what was tapped.

import React from 'react';
import './AuditViewer.css';

export interface AuditEvent {
  id: string;
  ts: Date;
  t: string;
  payload: string;
}

// V-6: human-readable labels for the engine's t: values
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

interface AuditViewerProps {
  audit: AuditEvent[];
}

export const AuditViewer: React.FC<AuditViewerProps> = ({ audit }) => {
  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="glass-audit-viewer">
      <div className="glass-filter"></div>
      <div className="glass-overlay"></div>
      <div className="glass-specular"></div>
      <div className="glass-content">
        <h3 className="audit-title">Governance Audit Trail</h3>

        {audit.length === 0 && (
          <p className="audit-empty">No audit events yet.</p>
        )}

        <div className="audit-timeline">
          {audit.map((event, i) => (
            <div
              key={event.id}
              className={`audit-entry ${event.t === 'consent' ? 'entry-consent' : event.t.startsWith('hold') ? 'entry-hold' : ''}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="entry-dot"></div>
              {i !== audit.length - 1 && <div className="entry-line"></div>}
              <div className="entry-content">
                <span className="entry-time">{formatTime(event.ts)}</span>
                {/* V-6: map t: value to human-readable label */}
                <span className="entry-type">{AUDIT_LABELS[event.t] ?? event.t}</span>
                <span className="entry-detail">{event.payload}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
