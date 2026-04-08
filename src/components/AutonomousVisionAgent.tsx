import React, { useRef, useEffect, useState, memo } from 'react';
import { Play, Pause, Timer, Radio } from 'lucide-react';
import { eventBus } from '../lib/EventBus';
import { loadModel, detectObjects } from '../lib/yolo';

const SKELETON_CONNECTIONS = [[5, 6], [5, 7], [7, 9], [6, 8], [8, 10], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]];

// --- SOVEREIGN FIX: HONEST COLOR THEMING ---
const getCanvasTheme = (feedId: string) => {
  if (feedId === 'NODE_CAM_01') return { stroke: '#a5b4fc', fill: 'rgba(30, 27, 75, 0.95)', mainText: '#a5b4fc' }; 
  if (feedId === 'NODE_CAM_02') return { stroke: '#f59e0b', fill: 'rgba(69, 26, 3, 0.95)', mainText: '#fcd34d' }; 
  if (feedId === 'NODE_CAM_03') return { stroke: '#06b6d4', fill: 'rgba(8, 51, 68, 0.95)', mainText: '#67e8f9' }; 
  if (feedId === 'NODE_CAM_04') return { stroke: '#ec4899', fill: 'rgba(83, 25, 56, 0.95)', mainText: '#f9a8d4' }; 
  return { stroke: '#10b981', fill: 'rgba(15, 23, 42, 0.95)', mainText: '#6ee7b7' }; 
};

export const AutonomousVisionAgent = memo(function AutonomousVisionAgent({ feed, config, isPlaying, onPlay, onPause }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTelemetryRef = useRef<number>(0); 
  const [model, setModel] = useState<any>(null);
  const [detections, setDetections] = useState<any[]>([]);

  useEffect(() => { loadModel(config.targetModel).then(setModel); }, [config.targetModel]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current; if (!video) return;
    isPlaying ? video.play().catch(() => onPause()) : video.pause();
  }, [isPlaying, onPause]);

  useEffect(() => {
    let frameId: number;
    const theme = getCanvasTheme(feed.id);

    const loop = async () => {
      if (!videoRef.current || !canvasRef.current || !model || !isPlaying) {
        frameId = requestAnimationFrame(loop); return;
      }
      const video = videoRef.current; const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
      if (!ctx || video.videoWidth === 0) { frameId = requestAnimationFrame(loop); return; }

      const dets = await detectObjects(model, video, config);
      setDetections(dets);

      const now = Date.now();
      if (now - lastTelemetryRef.current >= 1000 && dets.length > 0) {
        eventBus.publish('TELEMETRY_EVENT', {
          sourceFeed: feed.id,
          detections: dets.map((d: any) => ({ class: d.class, conf: d.conf }))
        });
        lastTelemetryRef.current = now;
      }

      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const sX = rect.width / video.videoWidth; const sY = rect.height / video.videoHeight;

      dets.forEach((det: any) => {
        const [x, y, w, h] = det.bbox.map((v: number, i: number) => i % 2 === 0 ? v * sX : v * sY);
        
        // 1. RAW BOUNDING BOX
        ctx.strokeStyle = theme.stroke; 
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        
        // 2. RAW SKELETON (IF POSE DATA EXISTS)
        if (det.keypoints) {
          ctx.strokeStyle = theme.stroke; ctx.lineWidth = 1.5;
          SKELETON_CONNECTIONS.forEach(([i, j]) => {
            const p1 = det.keypoints[i]; const p2 = det.keypoints[j];
            if (p1?.score > 0.3 && p2?.score > 0.3) {
              ctx.beginPath(); ctx.moveTo(p1.x * sX, p1.y * sY);
              ctx.lineTo(p2.x * sX, p2.y * sY); ctx.stroke();
            }
          });
        }
        
        // 3. ARCHITECTURAL TELEMETRY LABELS
        const cx = Math.round(x + w / 2);
        const cy = Math.round(y + h / 2);
        const confidence = Math.round(det.conf * 100);

        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        const labelMain = `${det.class.toUpperCase()} [${confidence}%]`;
        const labelSub = `XY:[${cx},${cy}] DIM:${Math.round(w)}x${Math.round(h)}`;
        
        const tw = Math.max(ctx.measureText(labelMain).width, ctx.measureText(labelSub).width);
        const labelY = y < 35 ? y + 2 : y - 34;
        
        ctx.fillStyle = theme.fill;
        ctx.fillRect(x, labelY, tw + 12, 34);
        ctx.fillStyle = theme.mainText; 
        ctx.fillText(labelMain, x + 6, labelY + 14);
        ctx.fillStyle = '#ffffff'; 
        ctx.fillText(labelSub, x + 6, labelY + 28);
      });
      frameId = requestAnimationFrame(loop);
    };
    loop(); return () => cancelAnimationFrame(frameId);
  }, [isPlaying, model, config, feed.id]);

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-white/5 group shadow-2xl">
      <video ref={videoRef} src={feed.mp4Url} controls className="absolute inset-0 w-full h-full object-contain bg-black" loop playsInline crossOrigin="anonymous" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
      
      <div className="absolute top-3 right-3 w-44 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-2.5 z-40 opacity-0 group-hover:opacity-100 transition-all">
        <div className="flex items-center gap-2 mb-1">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-[8px] font-black text-white uppercase tracking-widest">Core_Active</span>
        </div>
        <div className="text-[7px] font-mono text-white/40 uppercase font-bold tracking-tighter">Engine: {config.targetModel}</div>
      </div>

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm cursor-pointer z-50" onClick={onPlay}>
          <div className="w-16 h-16 bg-emerald-500/90 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all hover:scale-110 active:scale-95">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </div>
        </div>
      )}
      
      {isPlaying && (
        <button onClick={onPause} className="absolute bottom-4 left-4 p-2 bg-slate-900/80 rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-emerald-500 shadow-2xl">
          <Pause className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});