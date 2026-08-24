import React from 'react';
import './ProofCard.css';

export type ProofStatus = 'gap' | 'ok' | 'unverified';

interface ProofCardProps {
  status: ProofStatus;
  itemName: string;
  sourceLabel: string;
  sourceValue: string;
  sourceRef: string;
  computeLabel: string;
  computeValue: string;
  computeMath?: string;
  ruleLabel: string;
  ruleValue: string;
  ruleRefText: string;
  ruleRefUrl?: string;
  summaryText: string;
}

export const ProofCard: React.FC<ProofCardProps> = ({
  status,
  itemName,
  sourceLabel,
  sourceValue,
  sourceRef,
  computeLabel,
  computeValue,
  computeMath,
  ruleLabel,
  ruleValue,
  ruleRefText,
  ruleRefUrl,
  summaryText
}) => {
  return (
    <div className="glass-proof-card" data-status={status}>
      <div className="glass-filter"></div>
      <div className="glass-overlay"></div>
      <div className="glass-specular"></div>
      <div className="glass-content">
        <div className="status-strip"></div>
        
        <h3 className="proof-item">{itemName}</h3>
        
        <div className="anchor-grid">
          {/* Source Anchor */}
          <div className="anchor source">
            <span className="anchor-label">{sourceLabel}</span>
            <span className="anchor-value">{sourceValue}</span>
            <span className="anchor-ref">{sourceRef}</span>
          </div>
          
          {/* Compute Anchor */}
          <div className="anchor compute">
            <span className="anchor-label">{computeLabel}</span>
            <span className="anchor-value">{computeValue}</span>
            {computeMath && <span className="anchor-math">{computeMath}</span>}
          </div>
          
          {/* Rule Anchor */}
          <div className="anchor rule">
            <span className="anchor-label">{ruleLabel}</span>
            <span className="anchor-value">{ruleValue}</span>
            {ruleRefUrl ? (
              <a className="anchor-ref" href={ruleRefUrl} target="_blank" rel="noreferrer">{ruleRefText}</a>
            ) : (
              <span className="anchor-ref">{ruleRefText}</span>
            )}
          </div>
        </div>
        
        <p className="rule-says">{summaryText}</p>
      </div>
    </div>
  );
};
