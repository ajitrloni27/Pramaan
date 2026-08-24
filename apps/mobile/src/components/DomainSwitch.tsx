import React from 'react';
import './DomainSwitch.css';

export type Domain = 'bill' | 'lease';

interface DomainSwitchProps {
  activeDomain: Domain;
  onChange: (domain: Domain) => void;
}

export const DomainSwitch: React.FC<DomainSwitchProps> = ({ activeDomain, onChange }) => {
  return (
    <div className="glass-tree-toggle">
      <div className="glass-filter"></div>
      <div className="glass-overlay"></div>
      <div className="glass-specular"></div>
      <div className="glass-content toggle-container">
        
        <div 
          className="toggle-active-bg" 
          style={{ transform: activeDomain === 'lease' ? 'translateX(100%)' : 'translateX(0)' }}
        ></div>

        <button 
          className={`toggle-option ${activeDomain === 'bill' ? 'active' : ''}`}
          onClick={() => onChange('bill')}
        >
          <span>Medical Bill</span>
        </button>
        
        <button 
          className={`toggle-option ${activeDomain === 'lease' ? 'active' : ''}`}
          onClick={() => onChange('lease')}
        >
          <span>Rental Lease</span>
        </button>
      </div>
    </div>
  );
};
