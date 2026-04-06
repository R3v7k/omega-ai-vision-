import React from 'react';
import { HardDrive, Database, CheckCircle2, XCircle, Activity, Cpu } from 'lucide-react';
import { useVision } from '../context/VisionContext';

export function ModelManager() {
  const { registeredModels, toggleModelEnabled, memoryStats } = useVision();

  return (
    <div className="bg-slate-900 rounded-[32px] border border-white/5 p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <HardDrive className="w-8 h-8 text-indigo-400" />
            </div>
            Model Repository
          </h2>
          <p className="text-slate-400 mt-2 max-w-xl">View the AI inference nodes and sensory weights supported by the sovereign server for low-latency dispatch.</p>
        </div>
      </div>

      {/* Interactive Swarm Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {registeredModels.map((model) => (
          <div key={model.name} className={`bg-slate-950/50 border ${model.isEnabled ? 'border-indigo-500/30' : 'border-white/5 opacity-60'} rounded-[28px] p-8 flex flex-col justify-between group transition-all duration-500 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Database className={`w-20 h-20 ${model.isEnabled ? 'text-indigo-500' : 'text-slate-600'}`} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className={`font-bold text-lg uppercase tracking-tight ${model.isEnabled ? 'text-white' : 'text-slate-400'}`}>{model.name}</h3>
                
                {/* Interactive Toggle Switch */}
                <button 
                  onClick={() => toggleModelEnabled(model.name)}
                  className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border uppercase tracking-widest transition-all duration-300 ${
                    model.isEnabled 
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20' 
                      : 'text-slate-400 bg-slate-800 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {model.isEnabled ? <><CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE</> : <><XCircle className="w-3.5 h-3.5" /> INACTIVE</>}
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed min-h-[60px]">{model.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Live Analytics Dashboard (Red Annotated Box) */}
      <div className="mt-8 pt-8 border-t border-slate-800/50 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 bg-slate-950/50 rounded-2xl border border-white/5 p-6">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> System Health & Routing
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-mono p-3 bg-slate-900 rounded-lg border border-slate-800 text-emerald-400">
              <span>[SYS_OK] Global Telemetry Pipeline</span>
              <span>Status: Active</span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono p-3 bg-slate-900 rounded-lg border border-slate-800 text-emerald-400">
              <span>[SYS_OK] Edge Inference Node Routing</span>
              <span>Uptime: 99.9%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-950/50 rounded-2xl border border-white/5 p-6 flex flex-col justify-center">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" /> Global Allocation
          </h4>
          <div className="text-3xl font-bold text-indigo-400 mb-1">
            {(memoryStats.numBytes / 1048576).toFixed(2)} <span className="text-sm text-indigo-500">MB</span>
          </div>
          <div className="text-xs font-mono text-slate-500">{memoryStats.numTensors} Active Tensors</div>
        </div>
      </div>
    </div>
  );
}