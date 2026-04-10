import React, { useEffect, useRef } from 'react';
import { SwarmMetrics, SwarmHistory } from '../hooks/useSwarmTelemetry';

interface BattlefieldConsoleProps {
  logs: string[];
  metrics: SwarmMetrics;
  activeCount: number;
  history: SwarmHistory;
}

const ArcGauge = ({ value, max, label, historyData, color }: { value: number, max: number, label: string, historyData: number[], color: string }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(value, max) / max) * circumference;

  // Sparkline points
  const maxHist = Math.max(...historyData, 1);
  const minHist = Math.min(...historyData, 0);
  const range = maxHist - minHist || 1;
  
  const points = historyData.map((d, i) => {
    const x = (i / (historyData.length - 1 || 1)) * 40 + 20;
    const y = 50 - ((d - minHist) / range) * 20;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center justify-center relative w-24 h-24">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#0f172a" strokeWidth="6" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" className="transition-all duration-500" />
        {historyData.length > 1 && (
          <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" transform="rotate(90 40 40)" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-sm font-bold font-mono" style={{ color }}>{Math.round(value)}</span>
      </div>
      <span className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
};

export const BattlefieldConsole: React.FC<BattlefieldConsoleProps> = ({ logs, metrics, activeCount, history }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-[800px] h-[240px] bg-slate-900/80 border border-green-500/30 rounded-lg shadow-[0_0_30px_rgba(34,197,94,0.15)] flex overflow-hidden backdrop-blur-md z-50">
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(240px); }
        }
        .animate-scanline {
          animation: scanline 3s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 197, 94, 0.3);
          border-radius: 2px;
        }
      `}</style>
      
      {/* Scanning Line */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-transparent via-green-400/10 to-transparent animate-scanline pointer-events-none" />

      {/* Terminal Logs */}
      <div className="flex-1 p-4 font-mono text-xs text-green-400 overflow-y-auto custom-scrollbar relative">
        <div className="sticky top-0 bg-slate-900/90 pb-2 mb-2 border-b border-green-500/30 z-10">
          <span className="text-green-300 font-bold tracking-widest uppercase">Omega Intelligence Layer // Live Feed</span>
        </div>
        <div className="space-y-1 opacity-90">
          {logs.map((log, i) => (
            <div key={i} className="break-all">{log}</div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Gauges Sidebar */}
      <div className="w-64 bg-slate-950/80 border-l border-green-500/30 p-4 grid grid-cols-2 gap-2 place-items-center">
        <ArcGauge value={metrics.swarmHealth} max={100} label="Health" historyData={history.health} color="#22c55e" />
        <ArcGauge value={activeCount} max={20} label="Active" historyData={history.active} color="#06b6d4" />
        <ArcGauge value={metrics.purgeCount} max={100} label="Purged" historyData={history.purged} color="#ef4444" />
        <ArcGauge value={metrics.neuralLoad} max={100} label="Load" historyData={history.load} color="#fbbf24" />
      </div>
    </div>
  );
};
