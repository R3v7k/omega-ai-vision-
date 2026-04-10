import React, { useState, useRef, useEffect } from "react";
import { Camera, VideoOff, Settings, Play, Square, Sparkles, X, ExternalLink } from "lucide-react";
import { AutonomousVisionAgent } from "./AutonomousVisionAgent";

const WEBCAM_FEED_MOCK = {
  id: "CAM_WEBCAM",
  name: "Live Webcam Feed",
  skill: "Dynamic Analytics",
  mp4Url: "" // Not used when webcamStream is active
};

const AVAILABLE_MODELS = [
  { id: "YOLOv26-Pose (Pose)", feedId: "CAM_01", label: "Human Analytics (Pose & Gestures)" },
  { id: "YOLOv26-Seg (Segment)", feedId: "CAM_02", label: "Animal Behavior (Segmentation)" },
  { id: "YOLOv26 (Detect)", feedId: "CAM_03", label: "Urban Traffic (Color Sampling)" },
  { id: "COCO-SSD", feedId: "CAM_04", label: "Retail Analytics (Behavior/Theft)" },
  { id: "YOLOv26-Pose (Pose)", feedId: "CAM_05", label: "Athletic Tracker (Speed Kinematics)" }
];

export function WebcamAIWindow() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const handleStartClick = () => {
    setShowPermissionModal(true);
  };

  const handleAllowCamera = async () => {
    setShowPermissionModal(false);
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setIsCameraActive(true);
      setIsPlaying(true);
    } catch (err: any) {
      console.error("Error accessing webcam:", err);
      if (err.name === 'NotAllowedError') {
        setError("Camera access was denied or is blocked by the preview environment. If blocked, please open the app in a new tab.");
      } else {
        setError("Failed to access camera. Please ensure permissions are granted.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="flex flex-col h-full space-y-6 relative">
      {/* Custom Camera Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#222222] text-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Camera access request</h3>
              <button 
                onClick={() => setShowPermissionModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-300 mb-8 leading-relaxed">
              This app requests access to Camera to work properly. Do you want to allow Camera access?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowPermissionModal(false)} 
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Disallow
              </button>
              <button 
                onClick={handleAllowCamera} 
                className="px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                Allow Camera access
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-[0_0_20px_rgba(79,70,229,0.1)]">
            <Camera className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tighter uppercase flex items-center gap-2 leading-none">
              Live Webcam AI
              {isCameraActive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            </h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
              On-Demand Neural Processing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/60 p-2 rounded-xl border border-white/5 backdrop-blur-md">
          <div className="flex flex-col justify-center px-3 border-r border-white/10 mr-2 pr-5">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.15em] mb-1">
              Active Neural Pipeline
            </label>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              <select
                value={selectedModelIndex}
                onChange={(e) => setSelectedModelIndex(Number(e.target.value))}
                className="bg-transparent text-base md:text-lg text-white font-bold tracking-wide focus:outline-none cursor-pointer hover:text-indigo-300 transition-colors"
              >
                {AVAILABLE_MODELS.map((model, idx) => (
                  <option key={idx} value={idx} className="bg-slate-800 text-sm font-medium text-white">
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {!isCameraActive ? (
            <button
              onClick={handleStartClick}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)]"
            >
              <Play className="w-4 h-4" /> Start Camera
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)]"
            >
              <Square className="w-4 h-4" /> Stop Camera
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 bg-slate-900/80 backdrop-blur-2xl p-8 text-center z-10">
            
            {/* Lava Lamp Background */}
            <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none" style={{ filter: 'blur(60px)' }}>
              <div className="absolute w-[300px] h-[300px] rounded-full bg-teal-500/30 animate-blob1" style={{ top: '-10%', left: '-10%' }} />
              <div className="absolute w-[250px] h-[250px] rounded-full bg-purple-500/30 animate-blob2" style={{ top: '40%', right: '-10%' }} />
              <div className="absolute w-[280px] h-[280px] rounded-full bg-blue-500/30 animate-blob3" style={{ bottom: '-20%', left: '20%' }} />
            </div>

            <div className="mx-auto w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.3)] mb-6">
              <ExternalLink className="w-8 h-8 text-indigo-400" />
            </div>

            <h3 className="text-2xl font-black text-white tracking-tighter uppercase mb-3 drop-shadow-lg">
              Dedicated Window Required
            </h3>
            
            <p className="text-slate-300 text-sm leading-relaxed mb-8 drop-shadow-md">
              {error}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  window.open(window.location.href, '_blank');
                  setError(null);
                }}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold tracking-wide uppercase transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> Launch Dedicated Window
              </button>
              <button
                onClick={() => setError(null)}
                className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-bold tracking-wide uppercase transition-all border border-white/10"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Keyframe Animations for the Lava Lamp Backdrop */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes blob1 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              33% { transform: translate(30px, -50px) scale(1.1); }
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
      )}

      <div className="flex-1 bg-slate-900/40 rounded-3xl border border-white/5 overflow-hidden relative flex items-center justify-center">
        {!isCameraActive ? (
          <>
            {/* Bright White Arrow Pointing to Top Right */}
            <div className="absolute top-4 right-8 md:top-8 md:right-16 w-32 h-32 md:w-48 md:h-48 pointer-events-none text-white animate-pulse drop-shadow-[0_0_20px_rgba(255,255,255,1)] z-10">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 20 90 Q 30 40 90 10" />
                <polyline points="60 10 90 10 90 40" />
              </svg>
            </div>

            <div className="text-center space-y-8 relative max-w-2xl mx-auto z-20 p-6">
              <div className="w-28 h-28 bg-slate-800/80 rounded-full flex items-center justify-center mx-auto border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                <VideoOff className="w-12 h-12 text-slate-400" />
              </div>
              <div className="bg-slate-900/80 p-8 md:p-10 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl">
                <p className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg uppercase mb-6">
                  Camera is offline
                </p>
                <p className="text-lg md:text-xl text-slate-200 max-w-xl mx-auto leading-relaxed font-medium drop-shadow-md">
                  Select an AI model from the <span className="text-indigo-400 font-bold">Active Neural Pipeline</span> dropdown and click <span className="text-white font-bold bg-indigo-600/80 border border-indigo-400/50 px-3 py-1.5 rounded-lg mx-1 shadow-[0_0_15px_rgba(79,70,229,0.4)]">Start Camera</span> to begin live inference.
                </p>
                <p className="text-sm text-slate-400 mt-8 font-medium uppercase tracking-wider">
                  Camera permissions will only be requested when you start the feed.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full max-w-5xl mx-auto p-4 flex flex-col">
            <AutonomousVisionAgent
              feed={{ ...WEBCAM_FEED_MOCK, id: AVAILABLE_MODELS[selectedModelIndex].feedId }}
              config={{ targetModel: AVAILABLE_MODELS[selectedModelIndex].id, confidenceThreshold: 0.5 }}
              isPlaying={isPlaying}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              webcamStream={stream}
            />
          </div>
        )}
      </div>
    </div>
  );
}
