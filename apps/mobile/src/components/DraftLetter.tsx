import React from 'react';
import './DraftLetter.css';

interface DraftLetterProps {
  previewText: string;
}

export const DraftLetter: React.FC<DraftLetterProps> = ({ previewText }) => {
  return (
    <div className="glass-letter-preview">
      <div className="glass-filter"></div>
      <div className="glass-overlay"></div>
      <div className="glass-specular"></div>
      <div className="glass-content">
        <div className="letter-header">
          <span className="letter-banner">⚠️ AI-Generated — Review Before Sending</span>
        </div>
        <div className="letter-body">
          {previewText}
        </div>
      </div>
    </div>
  );
};
