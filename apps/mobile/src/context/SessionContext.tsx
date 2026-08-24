import React, { createContext, useContext, useState, useEffect } from 'react';

export type CaptureType = 'image' | 'text' | 'file' | 'camera';
export type Domain = 'bill' | 'lease' | 'gig_payslip' | 'insurance' | 'medicine' | 'challan';

export interface VaultItem {
  id: string;
  title: string;
  domain: Domain;
  captureType: CaptureType | null;
  captureData: string | null;
  createdAt: string;
  disputedAmount: string;
  disputedNumber: number;
  holdStatus: 'staged' | 'placed' | 'released' | 'resolved';
  proofsCount: number;
  gapCount: number;
  hash: string;
  summary: string;
}

interface SessionState {
  captureType: CaptureType | null;
  captureData: string | null; // Base64 image, text string, or filename
  domain: Domain;
  isTutorialComplete: boolean;
  vault: VaultItem[];
  selectedVaultItemId: string | null;
}

interface SessionContextProps {
  state: SessionState;
  setCapture: (type: CaptureType, data: string) => void;
  setDomain: (domain: Domain) => void;
  completeTutorial: () => void;
  resetSession: () => void;
  saveToVault: (item: VaultItem) => void;
  updateVaultItemHold: (id: string, status: 'staged' | 'placed' | 'released' | 'resolved') => void;
  deleteFromVault: (id: string) => void;
  clearVault: () => void;
  selectVaultItem: (id: string | null) => void;
}

const DEFAULT_VAULT_ITEMS: VaultItem[] = [];

const loadVaultFromStorage = (): VaultItem[] => {
  try {
    const saved = localStorage.getItem('pramaan_evidence_vault');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load vault from localStorage', e);
  }
  return DEFAULT_VAULT_ITEMS;
};

const initialState: SessionState = {
  captureType: null,
  captureData: null,
  domain: 'bill',
  isTutorialComplete: localStorage.getItem('pramaan_tutorial_completed') === 'true',
  vault: loadVaultFromStorage(),
  selectedVaultItemId: null,
};

const SessionContext = createContext<SessionContextProps | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SessionState>(initialState);

  useEffect(() => {
    try {
      localStorage.setItem('pramaan_evidence_vault', JSON.stringify(state.vault));
    } catch (e) {
      console.error('Failed to save vault to localStorage', e);
    }
  }, [state.vault]);

  const setCapture = (type: CaptureType, data: string) => {
    setState(prev => ({ ...prev, captureType: type, captureData: data }));
  };

  const setDomain = (domain: Domain) => {
    setState(prev => ({ ...prev, domain }));
  };

  const completeTutorial = () => {
    localStorage.setItem('pramaan_tutorial_completed', 'true');
    setState(prev => ({ ...prev, isTutorialComplete: true }));
  };

  const resetSession = () => {
    setState(prev => ({ ...prev, captureType: null, captureData: null, selectedVaultItemId: null }));
  };

  const saveToVault = (item: VaultItem) => {
    setState(prev => {
      const existsIndex = prev.vault.findIndex(v => v.id === item.id);
      let updated: VaultItem[];
      if (existsIndex >= 0) {
        updated = [...prev.vault];
        updated[existsIndex] = item;
      } else {
        updated = [item, ...prev.vault];
      }
      return { ...prev, vault: updated };
    });
  };

  const updateVaultItemHold = (id: string, status: 'staged' | 'placed' | 'released' | 'resolved') => {
    setState(prev => {
      const updated = prev.vault.map(v => v.id === id ? { ...v, holdStatus: status } : v);
      return { ...prev, vault: updated };
    });
  };

  const deleteFromVault = (id: string) => {
    setState(prev => ({
      ...prev,
      vault: prev.vault.filter(v => v.id !== id),
    }));
  };

  const clearVault = () => {
    setState(prev => ({ ...prev, vault: [] }));
  };

  const selectVaultItem = (id: string | null) => {
    setState(prev => ({ ...prev, selectedVaultItemId: id }));
  };

  return (
    <SessionContext.Provider value={{ 
      state, 
      setCapture, 
      setDomain, 
      completeTutorial, 
      resetSession, 
      saveToVault, 
      updateVaultItemHold, 
      deleteFromVault, 
      clearVault,
      selectVaultItem
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
};
