import React from 'react';
import './HoldChip.css';

export type HoldStatus = 'staged' | 'placed' | 'released';

interface HoldChipProps {
  status: HoldStatus;
  amount: string;
  onTap?: () => void;
}

export const HoldChip: React.FC<HoldChipProps> = ({ status, amount, onTap }) => {
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [currentStatus, setCurrentStatus] = React.useState(status);

  React.useEffect(() => {
    if (status === 'placed' && currentStatus === 'staged') {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentStatus(status);
      }, 1000); // 1s animation duration
      return () => clearTimeout(timer);
    } else {
      setCurrentStatus(status);
    }
  }, [status, currentStatus]);

  const handleTap = () => {
    if (onTap) {
      onTap();
    }
  };

  return (
    <div 
      className={`hold-chip ${isTransitioning ? 'transitioning' : ''}`} 
      data-status={currentStatus}
      onClick={handleTap}
    >
      <div className="chip-glass">
        <div className="glass-filter"></div>
        <div className="glass-overlay"></div>
        <div className="glass-specular"></div>
        <div className="glass-content">
          <div className="chip-indicator"></div>
          <div className="chip-text">
            <span className="chip-amount">{amount}</span>
            <span className="chip-status">
              {currentStatus === 'staged' && !isTransitioning ? 'Tap to Freeze' : 
               (isTransitioning ? 'Freezing...' : 'Frozen for 72h')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
