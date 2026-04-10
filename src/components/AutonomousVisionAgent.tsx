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

// --- SOVEREIGN FIX: PHASE 2 POSTURAL HEURISTICS ---
const derivePosturalState = (keypoints?: any[]): string => {
  if (!keypoints || keypoints.length < 13) return '[NEUTRAL]';

  const kp = (idx: number) => keypoints[idx]?.score > 0.3 ? keypoints[idx] : null;
  
  const nose = kp(0);
  const lShoulder = kp(5); const rShoulder = kp(6);
  const lElbow = kp(7); const rElbow = kp(8);
  const lWrist = kp(9); const rWrist = kp(10);
  const lHip = kp(11); const rHip = kp(12);

  // [JOY/LAUGHTER]: Wrists elevated above shoulders (Y-axis is inverted)
  if (lWrist && rWrist && lShoulder && rShoulder) {
    if (lWrist.y < lShoulder.y && rWrist.y < rShoulder.y) return '[JOY/LAUGHTER]';
  }

  // [AFRAID/ANXIOUS]: Arms tightly crossed (wrists close together, centralized)
  if (lWrist && rWrist && lShoulder && rShoulder) {
    const shoulderDistX = Math.abs(lShoulder.x - rShoulder.x);
    const wristDistX = Math.abs(lWrist.x - rWrist.x);
    const shoulderCenterX = (lShoulder.x + rShoulder.x) / 2;
    const wristCenterX = (lWrist.x + rWrist.x) / 2;
    
    if (wristDistX < shoulderDistX * 0.5 && Math.abs(wristCenterX - shoulderCenterX) < shoulderDistX * 0.4) {
      return '[AFRAID/ANXIOUS]';
    }
  }

  // [ANGER/ANNOY]: Aggressive forward lean OR wide rigid elbow placement
  if (lShoulder && rShoulder) {
    const shoulderDistX = Math.abs(lShoulder.x - rShoulder.x) || 10;
    
    if (nose && lHip && rHip) {
      const hipCenterX = (lHip.x + rHip.x) / 2;
      if (Math.abs(nose.x - hipCenterX) > shoulderDistX * 0.8) return '[ANGER/ANNOY]';
    }
    
    if (lElbow && rElbow) {
      const elbowDistX = Math.abs(lElbow.x - rElbow.x);
      if (elbowDistX > shoulderDistX * 1.8) return '[ANGER/ANNOY]';
    }
  }

  return '[NEUTRAL]';
};

// --- SOVEREIGN FIX: PHASE 3.5 O(1) OFFSCREEN CROP ---
const colorCanvas = document.createElement('canvas');
colorCanvas.width = 1; colorCanvas.height = 1;
const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });

const getDominantColor = (video: HTMLVideoElement, bx: number, by: number, bw: number, bh: number): string | null => {
  try {
    if (!colorCtx) return null;
    // The Windshield Trap: offset Y downwards to cy + (h * 0.25)
    const sampleX = bx + bw / 2;
    const sampleY = by + bh / 2 + (bh * 0.25);
    
    colorCtx.clearRect(0, 0, 1, 1);
    colorCtx.drawImage(video, sampleX, sampleY, 1, 1, 0, 0, 1, 1);
    const pixel = colorCtx.getImageData(0, 0, 1, 1).data;
    
    if (pixel[3] === 0) return null; 
    
    const toHex = (c: number) => c.toString(16).padStart(2, '0');
    return `#${toHex(pixel[0])}${toHex(pixel[1])}${toHex(pixel[2])}`.toUpperCase();
  } catch (e) {
    // Catch "Tainted Canvas" errors silently
    return null;
  }
};

const calculateIoU = (box1: number[], box2: number[]) => {
  const [x1, y1, w1, h1] = box1; const [x2, y2, w2, h2] = box2;
  const xA = Math.max(x1, x2); const yA = Math.max(y1, y2);
  const xB = Math.min(x1 + w1, x2 + w2); const yB = Math.min(y1 + h1, y2 + h2);
  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  if (interArea === 0) return 0;
  const box1Area = w1 * h1; const box2Area = w2 * h2;
  return interArea / (box1Area + box2Area - interArea);
};

export const AutonomousVisionAgent = memo(function AutonomousVisionAgent({ feed, config, isPlaying, onPlay, onPause }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTelemetryRef = useRef<number>(0); 
  const trackerRef = useRef<Map<string, any>>(new Map());
  const kinematicRef = useRef<Map<string, any>>(new Map());
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

      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const sX = rect.width / video.videoWidth; const sY = rect.height / video.videoHeight;

      // --- SOVEREIGN FIX: PHASE 3 COLOR EXTRACTION ---
      if (feed.id.includes('CAM_03')) {
        dets.forEach((det: any) => {
          const [bx, by, bw, bh] = det.bbox;
          det.color = getDominantColor(video, bx, by, bw, bh);
        });
      }

      // --- SOVEREIGN FIX: PHASE 4 RETAIL ANALYTICS ---
      if (feed.id.includes('CAM_04')) {
        const now = Date.now();
        const currentMap = trackerRef.current;
        const newMap = new Map();
        let nextId = currentMap.size > 0 ? Math.max(...Array.from(currentMap.keys()).map(k => parseInt(k))) + 1 : 0;

        const people = dets.filter(d => d.class.toLowerCase() === 'person');
        const CONSUMABLES = ['bottle', 'cup', 'apple', 'sandwich', 'orange', 'pizza', 'donut', 'cake'];
        const items = dets.filter(d => CONSUMABLES.includes(d.class.toLowerCase()));
        const allItems = dets.filter(d => d.class.toLowerCase() !== 'person');

        people.forEach(p => {
          const [bx, by, bw, bh] = p.bbox;
          const cx = bx + bw/2; const cy = by + bh/2;
          let bestMatchId: string | null = null;
          let bestIoU = 0.3;
          currentMap.forEach((track, id) => {
            if (track.class === 'person') {
              const iou = calculateIoU(p.bbox, track.bbox);
              if (iou > bestIoU) { bestIoU = iou; bestMatchId = id; }
            }
          });

          let track;
          if (bestMatchId !== null) {
            track = currentMap.get(bestMatchId);
            currentMap.delete(bestMatchId);
            const dist = Math.hypot(track.cx - cx, track.cy - cy);
            if (dist > 30) track.stationaryStart = now;
            track.bbox = p.bbox; track.cx = cx; track.cy = cy; track.lastSeen = now;
          } else {
            track = { id: String(nextId++), class: 'person', bbox: p.bbox, cx, cy, firstSeen: now, lastSeen: now, stationaryStart: now, intersectingItems: new Set(), concealmentFrames: 0 };
          }
          newMap.set(track.id, track);
          p.track = track;
        });

        currentMap.forEach((track, id) => {
          if (now - track.lastSeen < 1000) newMap.set(id, track);
        });
        trackerRef.current = newMap;

        people.forEach(p => {
          const [bx, by, bw, bh] = p.bbox;
          const headBox = [bx, by, bw, bh * 0.25];
          let state = '[NEUTRAL]';
          let isAlert = false;

          const isEating = items.some(item => calculateIoU(headBox, item.bbox) > 0);
          if (isEating) state = '[BEHAVIOR: EATING]';
          else if (p.track.stationaryStart && (now - p.track.stationaryStart > 3000)) state = '[BEHAVIOR: BROWSING]';

          let isChild = false;
          let adultNear = false;
          const bottomY = by + bh;
          people.forEach(other => {
            if (p === other) return;
            const [ox, oy, ow, oh] = other.bbox;
            const otherBottomY = oy + oh;
            if (Math.abs(bottomY - otherBottomY) < 50) {
              if (bh < oh * 0.6) isChild = true;
              if (oh >= bh / 0.6) {
                const dist = Math.hypot((bx+bw/2) - (ox+ow/2), bottomY - otherBottomY);
                if (dist < 300) adultNear = true;
              }
            }
          });
          if (isChild && !adultNear) { state = '[WARNING: UNSUPERVISED CHILD]'; isAlert = true; }

          const currentIntersecting = new Set<string>();
          allItems.forEach(item => {
            if (calculateIoU(p.bbox, item.bbox) > 0) currentIntersecting.add(item.class);
          });
          
          let concealed = false;
          p.track.intersectingItems.forEach((itemClass: string) => {
            if (!currentIntersecting.has(itemClass)) {
              const inScene = allItems.some(i => i.class === itemClass);
              if (!inScene) {
                p.track.concealmentFrames++;
                if (p.track.concealmentFrames > 15) concealed = true;
              } else {
                p.track.intersectingItems.delete(itemClass);
                p.track.concealmentFrames = 0;
              }
            }
          });
          currentIntersecting.forEach(i => p.track.intersectingItems.add(i));

          if (concealed) { state = '[ALERT: CONCEALMENT]'; isAlert = true; }

          p.derivedState = state;
          p.isAlert = isAlert;
        });
      }

      // --- SOVEREIGN FIX: PHASE 5 ATHLETIC TRACKER ---
      if (feed.id.includes('CAM_05')) {
        const perfNow = performance.now();
        const currentMap = kinematicRef.current;
        const newMap = new Map();
        let nextId = currentMap.size > 0 ? Math.max(...Array.from(currentMap.keys()).map(k => parseInt(k))) + 1 : 0;

        const athletes = dets.filter(d => d.class.toLowerCase() === 'person' || d.class.toLowerCase() === 'athlete');

        athletes.forEach(p => {
          const [bx, by, bw, bh] = p.bbox;
          const cx = bx + bw / 2;
          
          let bestMatchId: string | null = null;
          let bestIoU = 0.3;
          currentMap.forEach((track, id) => {
            const iou = calculateIoU(p.bbox, track.bbox);
            if (iou > bestIoU) { bestIoU = iou; bestMatchId = id; }
          });

          let track;
          if (bestMatchId !== null) {
            track = currentMap.get(bestMatchId);
            currentMap.delete(bestMatchId);
            
            const dt = (perfNow - track.lastTime) / 1000;
            if (dt > 0) {
              const S = 1.7 / bh;
              const dx = Math.abs(cx - track.cx) * S;
              const rawSpeed = dx / dt;
              track.speeds.push(rawSpeed);
              if (track.speeds.length > 15) track.speeds.shift();
            }
            
            track.bbox = p.bbox; track.cx = cx; track.lastTime = perfNow;
          } else {
            track = { id: String(nextId++), bbox: p.bbox, cx, lastTime: perfNow, speeds: [] };
          }
          newMap.set(track.id, track);
          
          let smaSpeed = 0;
          if (track.speeds.length > 0) {
            smaSpeed = track.speeds.reduce((a: number, b: number) => a + b, 0) / track.speeds.length;
          }
          
          p.track = track;
          p.speedKmh = smaSpeed * 3.6;
        });

        currentMap.forEach((track, id) => {
          if (perfNow - track.lastTime < 1000) newMap.set(id, track);
        });
        kinematicRef.current = newMap;
      }

      const now = Date.now();
      if (now - lastTelemetryRef.current >= 1000 && dets.length > 0) {
        eventBus.publish('TELEMETRY_EVENT', {
          sourceFeed: feed.id,
          detections: dets.map((d: any) => {
            const [bx, by, bw, bh] = d.bbox;
            const payload: any = {
              class: d.class,
              conf: d.conf,
              bbox_xywh: d.bbox,
              center_xy: [bx + bw / 2, by + bh / 2],
              keypoints: d.keypoints
            };
            if (d.color) payload.color = d.color;
            if (d.speedKmh !== undefined) payload.speedKmh = d.speedKmh;
            return payload;
          })
        });
        lastTelemetryRef.current = now;
      }

      dets.forEach((det: any) => {
        const [x, y, w, h] = det.bbox.map((v: number, i: number) => i % 2 === 0 ? v * sX : v * sY);
        
        // 1. RAW BOUNDING BOX
        if (!feed.id.includes('CAM_02')) {
          ctx.strokeStyle = theme.stroke; 
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
        }
        
        // 2. RAW SKELETON (IF POSE DATA EXISTS)
        if (det.keypoints) {
          ctx.strokeStyle = feed.id.includes('CAM_05') ? '#fde047' : theme.stroke; 
          ctx.lineWidth = 1.5;
          SKELETON_CONNECTIONS.forEach(([i, j]) => {
            const p1 = det.keypoints[i]; const p2 = det.keypoints[j];
            if (p1?.score > 0.3 && p2?.score > 0.3) {
              ctx.beginPath(); ctx.moveTo(p1.x * sX, p1.y * sY);
              ctx.lineTo(p2.x * sX, p2.y * sY); ctx.stroke();
            }
          });
        }
        
        // 3. ARCHITECTURAL TELEMETRY LABELS
        if (!feed.id.includes('CAM_02')) {
          const confidence = Math.round(det.conf * 100);

          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          let labelMain = `${det.class.toUpperCase()} [${confidence}%]`;
          let labelSub = '';
          
          // --- SOVEREIGN FIX: PHASE 2 UI OVERRIDE ---
          if (feed.id.includes('CAM_01')) {
            const normalizedClass = det.class.toLowerCase();
            if (normalizedClass === 'person' || normalizedClass === 'athlete') {
              const posturalState = derivePosturalState(det.keypoints);
              labelMain = `HUMAN_NODE ${posturalState} [${confidence}%]`;
            }
          }

          // --- SOVEREIGN FIX: PHASE 3 URBAN ANALYTICS ---
          if (feed.id.includes('CAM_03')) {
            const type = det.class.toUpperCase();
            const color = det.color || 'UNKNOWN';
            labelSub = `[TYPE:${type}] [COLOR:${color}]`;
          }

          // --- SOVEREIGN FIX: PHASE 4 RETAIL ANALYTICS ---
          let currentFill = theme.fill;
          let currentMainText = theme.mainText;
          
          if (feed.id.includes('CAM_04') && det.class.toLowerCase() === 'person' && det.derivedState) {
            labelSub = det.derivedState;
            if (det.isAlert) {
              currentFill = 'rgba(220, 38, 38, 0.95)'; // Red alert
              currentMainText = '#ffffff';
            }
          }

          // --- SOVEREIGN FIX: PHASE 5 ATHLETIC TRACKER ---
          if (feed.id.includes('CAM_05') && (det.class.toLowerCase() === 'person' || det.class.toLowerCase() === 'athlete')) {
            labelMain = `[ATHLETE] [RUNNING]`;
            if (det.speedKmh !== undefined) {
              labelSub = `[SPEED: ${det.speedKmh.toFixed(1)} km/h]`;
            }
          }
          
          const tw = Math.max(ctx.measureText(labelMain).width, labelSub ? ctx.measureText(labelSub).width : 0);
          const boxHeight = labelSub ? 34 : 20;
          const labelY = y < boxHeight ? y + 2 : y - boxHeight;
          
          ctx.fillStyle = currentFill;
          ctx.fillRect(x, labelY, tw + 12, boxHeight);
          ctx.fillStyle = currentMainText; 
          ctx.fillText(labelMain, x + 6, labelY + 14);
          
          if (labelSub) {
            ctx.fillStyle = '#ffffff';
            ctx.fillText(labelSub, x + 6, labelY + 28);
          }
        }
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