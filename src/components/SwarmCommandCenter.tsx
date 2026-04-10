import React from 'react';
import { eventBus } from '../lib/EventBus';
import { Agent } from '../hooks/useSwarmTelemetry';

interface SwarmCommandCenterProps {
  agents: Agent[];
}

const NODES = [
  { id: 'Node_01', label: 'Human Analytics' },
  { id: 'Node_02', label: 'Animal Behavior' },
  { id: 'Node_03', label: 'Urban Analytics' },
  { id: 'Node_04', label: 'Retail Analytics' },
  { id: 'Node_05', label: 'Athletic Tracker' },
];

export const SwarmCommandCenter: React.FC<SwarmCommandCenterProps> = ({ agents }) => {
  const handleToggle = (nodeId: string, isActive: boolean) => {
    if (isActive) {
      eventBus.publish('FORCE_PURGE', { targetNode: nodeId });
    } else {
      eventBus.publish('FORCE_SPAWN', { targetNode: nodeId });
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/90 border border-slate-700 p-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl flex gap-6 z-50">
      {NODES.map(node => {
        const isActive = agents.some(a => a.targetNode === node.id && a.status !== 'PURGING');
        return (
          <div key={node.id} className="flex flex-col items-center gap-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest text-center w-20 leading-tight h-6">
              {node.label}
            </span>
            <button
              onClick={() => handleToggle(node.id, isActive)}
              className={`w-16 h-16 rounded-full font-mono text-xs font-bold transition-all duration-300 border-2 flex items-center justify-center ${
                isActive 
                  ? 'bg-cyan-900/40 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.5)] animate-pulse' 
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500 hover:text-slate-200 shadow-inner'
              }`}
            >
              {isActive ? 'STOP' : 'START'}
            </button>
          </div>
        );
      })}
    </div>
  );
};
