import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { BattlefieldMap } from './components/BattlefieldMap';
import { useSwarmTelemetry } from './hooks/useSwarmTelemetry';
import { chroniclerFirebase } from './lib/chroniclerFirebase';
import { ShieldAlert } from 'lucide-react';

interface BattlefieldContextType {
  isBattlefieldOpen: boolean;
  launchBattlefield: () => void;
  TERMINATE_BATTLEFIELD: () => void;
}

const BattlefieldContext = createContext<BattlefieldContextType | null>(null);

export const useBattlefield = () => {
  const ctx = useContext(BattlefieldContext);
  if (!ctx) throw new Error('useBattlefield must be used within BattlefieldProvider');
  return ctx;
};

// Isolated container that manages the lifecycle of Swarm Telemetry and Chronicler
const BattlefieldContainer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { agents, metrics, logs, history } = useSwarmTelemetry();
  const [isFadingOut, setIsFadingOut] = useState(false);

  const handleTerminate = () => {
    setIsFadingOut(true);
    
    // Graceful Kill-Switch Execution
    chroniclerFirebase.closeAllListeners();
    
    setTimeout(() => {
      onClose();
    }, 500); // Wait for fade-out animation
  };

  return (
    <div className={`fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 backdrop-blur-2xl transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`w-[96vw] h-[96vh] relative rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(34,211,238,0.15)] border border-slate-700/50 transition-transform duration-500 ${isFadingOut ? 'scale-95' : 'scale-100'}`}>
        
        {/* The core visualization unmounts when this container unmounts, clearing D3 and Ghost buffers */}
        <BattlefieldMap agents={agents} metrics={metrics} logs={logs} history={history} />
        
        {/* Global Kill-Switch */}
        <button 
          onClick={handleTerminate}
          className="absolute top-4 right-4 z-50 bg-red-950/80 text-red-400 border border-red-500/50 px-4 py-2 rounded-lg font-mono text-sm hover:bg-red-900 hover:text-red-300 transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center gap-2 backdrop-blur-md"
        >
          <ShieldAlert className="w-4 h-4" />
          TERMINATE_BATTLEFIELD
        </button>
      </div>
    </div>
  );
};

export const BattlefieldProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBattlefieldOpen, setIsBattlefieldOpen] = useState(false);

  const launchBattlefield = useCallback(() => setIsBattlefieldOpen(true), []);
  const TERMINATE_BATTLEFIELD = useCallback(() => setIsBattlefieldOpen(false), []);

  return (
    <BattlefieldContext.Provider value={{ isBattlefieldOpen, launchBattlefield, TERMINATE_BATTLEFIELD }}>
      {children}
      {isBattlefieldOpen && <BattlefieldContainer onClose={TERMINATE_BATTLEFIELD} />}
    </BattlefieldContext.Provider>
  );
};
