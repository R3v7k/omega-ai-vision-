import React, { useState } from 'react';
import { X, Bot, Settings2, Activity, Play, AlertTriangle, RefreshCw } from 'lucide-react'; // INJECTED: RefreshCw
import { eventBus } from '../lib/EventBus';
import { OmniMediaIngest } from './OmniMediaIngest';
import { useVision } from '../context/VisionContext';
import { parseVisionPrompt } from '../utils/nlpParser';
import { AutonomousVisionAgent } from './AutonomousVisionAgent';
import { VisionConfig } from '../lib/yolo';

interface CustomBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CustomBuilderModal({ isOpen, onClose }: CustomBuilderModalProps) {
  const [engineType, setEngineType] = useState<string>('YOLOv26 (Detect)');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isAnalysisStarted, setIsAnalysisStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackingGoals, setTrackingGoals] = useState('');
  const [visionConfig, setVisionConfig] = useState<any>(null);

  const onEngineSwitch = (type: string) => {
    setEngineType(type);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // NEW: Hard Reset for the Sandbox
  const handleReset = () => {
    setIsAnalysisStarted(false);
    setIsPlaying(false);
    setMediaUrl(null);
    setTrackingGoals('');
    setVisionConfig(null);
  };

  const getTargetModelString = () => {
    return engineType;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-8">
      {/* Liquid Lava Lamp Background */}
      <div className="fixed inset-0 z-[-1] overflow-hidden" style={{ filter: 'blur(60px)' }}>
        <div className="absolute w-[60vw] h-[60vw] rounded-full bg-teal-500/40 animate-blob1" style={{ top: '10%', left: '10%' }} />
        <div className="absolute w-[50vw] h-[50vw] rounded-full bg-purple-500/40 animate-blob2" style={{ top: '40%', right: '10%' }} />
        <div className="absolute w-[40vw] h-[40vw] rounded-full bg-blue-500/40 animate-blob3" style={{ bottom: '10%', left: '30%' }} />
      </div>

      {/* GlassWorkspaceContainer */}
      <div 
        className="relative z-10 border border-white/10 overflow-hidden flex flex-col md:flex-row shadow-2xl transition-all duration-300 w-full h-full max-w-[1600px]"
        style={{
          borderRadius: '24px',
          background: 'rgba(10, 15, 30, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-2 bg-black/50 hover:bg-red-500/80 text-white rounded-full backdrop-blur-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Pane: AI Guide & Controls */}
        <div className="w-full md:w-[400px] bg-black/40 border-r border-white/10 flex flex-col p-6 overflow-y-auto z-10 relative shrink-0">
          
          {/* HEADER: Added Reset Button */}
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <Settings2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">AI Vision Builder</h2>
            </div>
            <button 
              onClick={handleReset}
              className="p-2 bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700/50"
              title="Reset Sandbox"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Agentic Chat Window */}
          <div className="flex flex-col bg-slate-900/60 border border-white/5 rounded-xl shadow-inner shrink-0 mb-6 max-h-[350px]">
            <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-white/5 shrink-0">
              <Bot className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-[0.85rem] uppercase tracking-[0.1em] text-emerald-400">Vision Guide</span>
            </div>
            <div className="overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <div className="text-white font-sans">
                <h3 className="font-semibold text-[1.1rem] mb-3">Welcome to the Custom Builder!</h3>
                <ol className="space-y-4 text-[0.95rem] leading-relaxed text-white/80">
                  <li><strong className="text-white">1.</strong> Describe what you want to track or analyze in the scene.</li>
                  <li><strong className="text-white">2.</strong> Select an Edge Vision model below.</li>
                  <li><strong className="text-white">3.</strong> Upload a video file or connect a stream to begin testing.</li>
                </ol>
              </div>
            </div>
            <div className="p-4 border-t border-white/5 bg-slate-950/50 shrink-0 rounded-b-xl">
              <input 
                type="text" 
                value={trackingGoals}
                onChange={(e) => setTrackingGoals(e.target.value)}
                placeholder="Describe your tracking goals..." 
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg py-2.5 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-500/80 font-mono">
                <AlertTriangle className="w-3 h-3" />
                <span>NLP bypassed on Edge Models. Requires Zero-Shot VLM.</span>
              </div>
            </div>
          </div>

          {/* Active Edge Models */}
          <div className="mb-4 shrink-0 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Edge Vision Models
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {['YOLOv26 (Detect)', 'YOLOv26-Seg (Segment)', 'YOLOv26-Pose (Pose)'].map((type) => (
                <button
                  key={type}
                  onClick={() => onEngineSwitch(type as any)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${engineType === type ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Pending Zero-Shot Bridge */}
          <div className="mb-6 shrink-0 space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <button
                disabled
                className="px-3 py-2.5 rounded-lg text-xs font-semibold border border-dashed border-slate-700 bg-slate-900/30 text-slate-500 cursor-not-allowed flex items-center justify-between"
              >
                <span>Grounding DINO (Zero-Shot)</span>
                <span className="text-[9px] uppercase tracking-wider text-amber-500/70 bg-amber-500/10 px-2 py-0.5 rounded">Pending Bridge</span>
              </button>
            </div>
          </div>

          {/* Media Ingestion */}
          <div className="shrink-0">
            <OmniMediaIngest onMediaReady={(url: string) => setMediaUrl(url)} />
          </div>

          {/* Start / Update Vision Analysis Button */}
          <button
            // NEW LOGIC: Only disabled if no media. Unlocked for re-triggering.
            disabled={!mediaUrl}
            onClick={() => {
              let finalConfig: VisionConfig = { 
                targetModel: getTargetModelString(), 
                confidenceThreshold: 0.5,
                allowedClasses: [],
                ignoredClasses: [],
                // INJECTED: Unique timestamp forces the agent to completely remount and restart the video
                _timestamp: Date.now() 
              } as any;
              
              setVisionConfig(finalConfig);
              setIsAnalysisStarted(true);
              setIsPlaying(true);
            }}
            className={`w-full mt-6 py-4 rounded-xl font-bold text-[15px] shrink-0 transition-all duration-300 flex items-center justify-center gap-2
              ${mediaUrl 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:-translate-y-1' 
                : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/50'}`}
          >
            {isAnalysisStarted ? <RefreshCw className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isAnalysisStarted ? 'Update Vision Analysis' : 'Start Vision Analysis'}
          </button>
        </div>

        {/* Right Pane: The Canvas */}
        <div className="flex-1 relative flex items-center justify-center p-4 md:p-8 z-10 overflow-hidden">
          {mediaUrl && isAnalysisStarted && visionConfig ? (
            <div className="w-full max-w-5xl flex items-center justify-center animate-in fade-in duration-1000">
               <div className="w-full">
                 <AutonomousVisionAgent 
                   // NEW LOGIC: The timestamp key forces React to destroy the old agent and build a fresh one
                   key={visionConfig._timestamp || 'agent'}
                   feed={{ id: 'CUSTOM', name: 'Custom Builder Sandbox', mp4Url: mediaUrl, type: 'CUSTOM', skill: trackingGoals || 'Custom Analysis' }}
                   config={visionConfig}
                   isPlaying={isPlaying}
                   onPlay={() => setIsPlaying(true)}
                   onPause={() => setIsPlaying(false)}
                   isActive={true}
                 />
               </div>
            </div>
          ) : (
            <div className="text-center space-y-4 transition-opacity duration-500">
              <div className="w-20 h-20 mx-auto bg-slate-800/30 rounded-full flex items-center justify-center border border-slate-700/50 backdrop-blur-sm">
                <Activity className={`w-8 h-8 ${mediaUrl ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              </div>
              <h3 className="text-xl font-semibold text-slate-200">
                {mediaUrl ? 'Media Ready for Analysis' : 'Awaiting Media'}
              </h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                {mediaUrl 
                  ? 'Click "Start Vision Analysis" in the left panel to begin processing the stream.' 
                  : 'Upload a video or connect a stream from the left panel to begin testing Vision AI models.'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 30px) scale(0.9); }
          66% { transform: translate(30px, -20px) scale(1.2); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(10px, 40px) scale(1.2); }
          66% { transform: translate(-40px, -10px) scale(0.8); }
        }
        .animate-blob1 { animation: blob1 18s cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite; }
        .animate-blob2 { animation: blob2 22s cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite; }
        .animate-blob3 { animation: blob3 15s cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite; }
      `}} />
    </div>
  );
}