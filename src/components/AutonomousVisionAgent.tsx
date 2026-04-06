import React, { useRef, useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { eventBus } from '../lib/EventBus';
import { loadModel, detectObjects } from '../lib/yolo';

export function AutonomousVisionAgent({ feed, config, isPlaying, onPlay, onPause }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState<any>(null);
  const [hudData, setHudData] = useState<any[]>([]);
  const lastTelemetryTime = useRef<number>(0);

  // Load the target model based on global state
  useEffect(() => {
    loadModel(config.targetModel).then(setModel);
  }, [config.targetModel]);

  // Handle Play/Pause State
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => onPause());
    } else {
      video.pause();
    }
  }, [isPlaying, onPause]);

  // --- PRIORITY ALPHA FIX: ResizeObserver for Canvas-to-Video Sync ---
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        canvas.width = entry.contentRect.width;
        canvas.height = entry.contentRect.height;
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // --- The Inference Loop ---
  useEffect(() => {
    let frameId: number;
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const loop = async () => {
      if (!videoRef.current || !canvasRef.current || !containerRef.current || !model || !isPlaying) {
        frameId = requestAnimationFrame(loop);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.videoWidth === 0 || canvas.width === 0) {
        frameId = requestAnimationFrame(loop);
        return;
      }

      const detections = await detectObjects(model, video, config);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;

      detections.forEach((det: any) => {
        const drawX = det.bbox[0] * scaleX;
        const drawY = det.bbox[1] * scaleY;
        const drawW = det.bbox[2] * scaleX;
        const drawH = det.bbox[3] * scaleY;

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(drawX, drawY, drawW, drawH);
        
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        const labelText = `${det.class} ${Math.round(det.conf * 100)}%`;
        const textWidth = ctx.measureText(labelText).width;
        
        ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
        ctx.fillRect(drawX, drawY - 18, textWidth + 8, 18);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, drawX + 4, drawY - 5);
      });

      const now = Date.now();
      if (now - lastTelemetryTime.current > 1000) {
        setHudData(detections);
        lastTelemetryTime.current = now;
        if (detections.length > 0) {
          eventBus.publish('TELEMETRY_EVENT', { 
            sourceFeed: feed.name || 'Vision Node', 
            detections 
          });
        }
      }

      await sleep(50); 
      frameId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, model, config, feed.name]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden group border border-white/5 shadow-2xl transition-all hover:border-emerald-500/20"
    >
      <video 
        ref={videoRef} 
        src={feed.mp4Url} 
        className="absolute inset-0 w-full h-full object-fill" 
        muted
        loop 
        playsInline 
        crossOrigin="anonymous" 
        onError={() => {
          console.error(`[SYSTEM_RECOVERY] Video source failed: ${feed.mp4Url}`);
          eventBus.publish('TELEMETRY_EVENT', { 
            sourceFeed: feed.name || 'Vision Node', 
            detections: [],
            message: 'System Recovery: Video source failed, attempting fallback.'
          });
        }}
      />
      
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none z-10" 
      />
      
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-md cursor-pointer z-50" onClick={onPlay}>
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all hover:scale-110 active:scale-95">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 min-w-[150px] shadow-2xl z-40 opacity-0 group-hover:opacity-100 transition-all transform translate-y-[-10px] group-hover:translate-y-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">NODE_ACTIVE</span>
        </div>
        {hudData.length > 0 ? (
          <div className="space-y-1.5">
            {hudData.slice(0, 2).map((d, i) => (
              <div key={i} className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-emerald-400 font-bold uppercase">{d.class}</span>
                <span className="text-white/40">{Math.round(d.conf * 100)}%</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] font-mono text-slate-500 italic">Scanning...</div>
        )}
      </div>
    </div>
  );
}