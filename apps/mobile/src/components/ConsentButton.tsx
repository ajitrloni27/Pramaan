import React from 'react';
import './ConsentButton.css';

interface ConsentButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  icon?: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
}

export const ConsentButton: React.FC<ConsentButtonProps> = ({
  label,
  variant = 'primary',
  icon,
  onClick,
  fullWidth = false,
}) => {
  return (
    <button 
      className={`glass-button ${variant} ${fullWidth ? 'full-width' : ''}`}
      onClick={onClick}
    >
      <div className="glass-filter"></div>
      <div className="glass-overlay"></div>
      <div className="glass-specular"></div>
      <div className="glass-content button-content">
        {icon && <span className="button-icon">{icon}</span>}
        <span>{label}</span>
      </div>
    </button>
  );
};
