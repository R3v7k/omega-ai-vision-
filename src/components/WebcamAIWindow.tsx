import React, { useState, useRef, useEffect } from "react";
import { Camera, VideoOff, Settings, Play, Square, Sparkles } from "lucide-react";
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

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setIsCameraActive(true);
      setIsPlaying(true);
    } catch (err: any) {
      console.error("Error accessing webcam:", err);
      setError("Failed to access camera. Please ensure permissions are granted.");
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
    <div className="flex flex-col h-full space-y-6">
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
          <div className="flex items-center gap-2 px-2">
            <Settings className="w-4 h-4 text-slate-400" />
            <select
              value={selectedModelIndex}
              onChange={(e) => setSelectedModelIndex(Number(e.target.value))}
              className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer"
              disabled={isCameraActive}
            >
              {AVAILABLE_MODELS.map((model, idx) => (
                <option key={idx} value={idx} className="bg-slate-800">
                  {model.label}
                </option>
              ))}
            </select>
          </div>
          
          {!isCameraActive ? (
            <button
              onClick={startCamera}
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
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="flex-1 bg-slate-900/40 rounded-3xl border border-white/5 overflow-hidden relative flex items-center justify-center">
        {!isCameraActive ? (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto border border-white/5">
              <VideoOff className="w-8 h-8 text-slate-500" />
            </div>
            <div>
              <p className="text-slate-300 font-medium">Camera is offline</p>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Select an AI model from the dropdown and click "Start Camera" to begin live inference. Camera permissions will only be requested when you start the feed.
              </p>
            </div>
          </div>
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
