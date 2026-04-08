import React, { useState, useEffect } from "react";
import { Camera, ShieldAlert, Cpu, Radio, Zap } from "lucide-react";
import { ChromiumWindow } from "./ChromiumWindow";
import { AutonomousVisionAgent } from "./AutonomousVisionAgent";
import { CustomBuilderModal } from "./CustomBuilderModal";
import { useVision } from '../context/VisionContext';

interface LiveMonitorProps {
  isBuilderOpen?: boolean;
  setIsBuilderOpen?: (val: boolean) => void;
}

export function LiveMonitor({ isBuilderOpen, setIsBuilderOpen }: LiveMonitorProps) {
  const { feeds, memoryStats } = useVision();
  const [playingFeeds, setPlayingFeeds] = useState<string[]>([]);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (playingFeeds.length >= 6) {
      setShowWarning(true);
      const timer = setTimeout(() => setShowWarning(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [playingFeeds.length]);

  const togglePlayback = (id: string) => {
    setPlayingFeeds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  // --- SOVEREIGN FIX: DECENTRALIZED NEURAL ASSIGNMENT ---
  const getNodeModel = (feedId: string) => {
    if (feedId === 'CAM_01') return 'YOLOv26-Pose (Pose)'; // Human Analytics -> Skeletal Math
    if (feedId === 'CAM_02') return 'YOLOv26-Seg (Segment)'; // Animal Behavior -> Polygon Masks
    if (feedId === 'CAM_03') return 'YOLOv26 (Detect)'; // Urban Traffic -> Fast NMS-Free
    if (feedId === 'CAM_04') return 'COCO-SSD'; // Retail Analytics -> Spatial Zonal Tracking
    return 'YOLOv26-Pose (Pose)'; // Default Athlete Node
  };

  return (
    <div className="relative space-y-6">
      
      {/* INFERENCE BUILDER MODAL CONNECTION */}
      {isBuilderOpen && setIsBuilderOpen && (
        <CustomBuilderModal 
          isOpen={isBuilderOpen} 
          onClose={() => setIsBuilderOpen(false)} 
        />
      )}

      {/* PERFORMANCE TOAST */}
      {showWarning && (
        <div className="fixed top-24 right-6 z-[100] animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="bg-indigo-600 text-white px-5 py-3 rounded-2xl shadow-[0_0_50px_rgba(79,70,229,0.4)] flex items-center gap-4 border border-white/20">
            <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            <div>
              <p className="font-black text-[10px] uppercase tracking-widest leading-none">Experimental Swarm Active</p>
              <p className="text-[9px] font-bold opacity-80 mt-1.5">6+ Neural Cores engaged. Monitoring system thermals.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <Camera className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tighter uppercase flex items-center gap-2 leading-none">
              Sovereign Swarm Monitor
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
            </h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Status: Decentralized Neural Array Online</p>
          </div>
        </div>
        
        {/* SOVEREIGN FIX: The Global Overwrite Dropdown has been purged. Nodes are now independent. */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {feeds.map((feed: any) => (
          <div key={feed.id} className={feed.id === "CAM_05" ? "md:col-span-2" : ""}>
            <ChromiumWindow 
              title={`NODE_${feed.id}: ${feed.name.toUpperCase()}`}
              infoContent={
                <div className="space-y-1.5 text-[9px] font-mono">
                  <p className="text-emerald-400">ANALYTICS: <span className="text-white">{feed.skill}</span></p>
                  <p className="text-emerald-400">HARDWARE ENGINE: <span className="text-white">{getNodeModel(feed.id)}</span></p>
                </div>
              }
            >
              <AutonomousVisionAgent 
                feed={feed} 
                // SOVEREIGN FIX: Hardwired independent model assignment per node
                config={{ targetModel: getNodeModel(feed.id), confidenceThreshold: 0.5 }} 
                isPlaying={playingFeeds.includes(feed.id)}
                onPlay={() => togglePlayback(feed.id)}
                onPause={() => togglePlayback(feed.id)}
              />
            </ChromiumWindow>
          </div>
        ))}
      </div>

      {/* HARDWARE INTELLIGENCE FOOTER */}
      <div className="bg-slate-900/60 backdrop-blur-2xl rounded-2xl p-5 border border-white/5 shadow-2xl flex flex-col justify-center max-w-[220px] ml-auto">
        <div className="flex items-center gap-2.5 mb-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hardware Intelligence</p>
        </div>
        <div className="text-2xl font-black text-white tracking-tighter flex items-baseline gap-1">
          {((memoryStats?.numBytes || 0) / 1048576).toFixed(1)} 
          <span className="text-[10px] text-indigo-500 uppercase font-bold tracking-widest ml-1">MB_VRAM</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-1000" 
              style={{ width: `${Math.min((memoryStats?.numTensors || 0) / 10, 100)}%` }}
            />
          </div>
          <span className="text-[8px] font-mono text-indigo-300 uppercase whitespace-nowrap">{memoryStats?.numTensors || 0} Tensors</span>
        </div>
      </div>
    </div>
  );
}