import React, { useState } from "react";
import { Camera, AlertCircle, Cpu } from "lucide-react";
import { ChromiumWindow } from "./ChromiumWindow";
import { AutonomousVisionAgent } from "./AutonomousVisionAgent";
import { useVision } from '../context/VisionContext';
import { CustomBuilderModal } from "./CustomBuilderModal";

export function LiveMonitor({ isBuilderOpen, setIsBuilderOpen }: { isBuilderOpen: boolean, setIsBuilderOpen: (open: boolean) => void }) {
  const { 
    feeds, 
    activeModel, 
    setActiveModel, 
    registeredModels, // Globally managed models
    memoryStats       // Globally managed GPU telemetry
  } = useVision();

  const [playingFeedId, setPlayingFeedId] = useState<string | null>(feeds[0]?.id || null);

  // --- Engine Switching UI & State Manager ---
  const handleEngineSwitch = (value: string) => {
    setActiveModel(value);
  };

  return (
    <div className="space-y-6">
      {/* Top Command Deck UI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
            <Camera className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white tracking-tight">Live AI Vision Feeds (Synchronized)</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ fontWeight: 800, letterSpacing: '0.05em', color: '#00ffaa', textShadow: '0 0 8px rgba(0, 255, 170, 0.6)' }}>AI Vision Models:</span>
            <select 
              value={activeModel}
              onChange={(e) => handleEngineSwitch(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold tracking-widest"
            >
              {/* Dynamically render only enabled models */}
              {registeredModels.filter(m => m.isEnabled).map(model => (
                <option key={model.name} value={model.name}>{model.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Synchronized Swarm Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {feeds.map((feed: any) => (
          <ChromiumWindow
            key={feed.id}
            title={`Vision AI: ${feed.name}`}
            infoContent={
              <>
                <p><strong>Analytics Type:</strong> Real-time Edge Inference</p>
                <p><strong>Engine:</strong> {activeModel}</p>
              </>
            }
          >
            {/* The Hardened Muscle Node is Injected Here */}
            <AutonomousVisionAgent 
              feed={feed} 
              config={{ targetModel: activeModel, confidenceThreshold: 0.5 }} 
              isPlaying={playingFeedId === feed.id}
              onPlay={() => setPlayingFeedId(feed.id)}
              onPause={() => setPlayingFeedId(null)}
              isActive={playingFeedId === feed.id}
            />
          </ChromiumWindow>
        ))}
      </div>

      {/* Footer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-white/5 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300 leading-relaxed">
            <strong className="text-white">Real-Time AI Vision Active:</strong> The system is utilizing edge inference ({activeModel}) to detect, segment, and correlate kinetic behavior across multiple environments simultaneously.
          </p>
        </div>

        <div className="bg-slate-800/40 rounded-xl p-4 border border-white/5 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GPU Memory Usage</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-indigo-400 font-medium mt-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            {/* Safely calculate MBs from global state */}
            {((memoryStats?.numBytes || 0) / 1048576).toFixed(2)} MB
          </div>
          <p className="text-xs text-slate-500 mt-1">{memoryStats?.numTensors || 0} Active Tensors</p>
        </div>
      </div>

      <CustomBuilderModal isOpen={isBuilderOpen} onClose={() => setIsBuilderOpen(false)} />
    </div>
  );
}