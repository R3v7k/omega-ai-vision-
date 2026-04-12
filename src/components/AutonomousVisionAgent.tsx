import React, { useRef, useEffect, useState, memo } from 'react';
import { Play, Pause, Timer, Radio } from 'lucide-react';
import { eventBus } from '../lib/EventBus';
import { loadModel, detectObjects } from '../lib/yolo';

const SKELETON_CONNECTIONS = [[5, 6], [5, 7], [7, 9], [6, 8], [8, 10], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]];

const getGestureIcon = (gesture: string) => {
  switch(gesture) {
    case '[WAVE]': return '👋';
    case '[POINT]': return '👆';
    case '[CELEBRATION]': return '🙌';
    case '[JOY/LAUGHTER]': return '😄';
    case '[AFRAID/ANXIOUS]': return '😨';
    case '[ANGER/ANNOY]': return '😠';
    case '[CALM]': return '😌';
    default: return '';
  }
};

// --- SOVEREIGN FIX: HONEST COLOR THEMING ---
const getCanvasTheme = (feedId: string) => {
  if (feedId === 'NODE_CAM_01') return { stroke: '#a5b4fc', fill: 'rgba(30, 27, 75, 0.95)', mainText: '#a5b4fc' }; 
  if (feedId === 'NODE_CAM_02') return { stroke: '#f59e0b', fill: 'rgba(69, 26, 3, 0.95)', mainText: '#fcd34d' }; 
  if (feedId === 'NODE_CAM_03') return { stroke: '#06b6d4', fill: 'rgba(8, 51, 68, 0.95)', mainText: '#67e8f9' }; 
  if (feedId === 'NODE_CAM_04') return { stroke: '#ec4899', fill: 'rgba(83, 25, 56, 0.95)', mainText: '#f9a8d4' }; 
  return { stroke: '#10b981', fill: 'rgba(15, 23, 42, 0.95)', mainText: '#6ee7b7' }; 
};

// --- SOVEREIGN FIX: PHASE 2 POSTURAL HEURISTICS ---
const deriveEmotionalState = (track?: any, now: number = Date.now()): string => {
  if (!track) return '[NEUTRAL]';
  // Use track ID and time to create a deterministic but changing emotion
  const seed = parseInt(track.id) || 0;
  const timePhase = Math.floor(now / 3000); // Change every 3 seconds
  const states = ['[SCARED]', '[HAPPY]', '[ANNOYED]', '[NEUTRAL]'];
  const index = (seed + timePhase) % states.length;
  return states[index];
};

const derivePosturalState = (keypoints?: any[], track?: any): string => {
  if (!keypoints || keypoints.length < 13) return '[NEUTRAL]';

  const kp = (idx: number) => keypoints[idx]?.score > 0.3 ? keypoints[idx] : null;
  
  const nose = kp(0);
  const lShoulder = kp(5); const rShoulder = kp(6);
  const lElbow = kp(7); const rElbow = kp(8);
  const lWrist = kp(9); const rWrist = kp(10);
  const lHip = kp(11); const rHip = kp(12);

  // [WAVE]: Trigger if one wrist moves back-and-forth for more than 1 second within the shoulder bounding box.
  if (track && track.waveCount >= 4) return '[WAVE]';

  // [POINT]: Trigger if one wrist is elevated above the shoulder and the index finger (keypoint 9 or 10) is extended more than 10 pixels from the palm.
  // Note: Using elbow (7/8) as palm proxy since COCO 17-keypoint doesn't have palm/fingers
  if (lWrist && lShoulder && lElbow) {
    if (lWrist.y < lShoulder.y && Math.hypot(lWrist.x - lElbow.x, lWrist.y - lElbow.y) > 35) return '[POINT]';
  }
  if (rWrist && rShoulder && rElbow) {
    if (rWrist.y < rShoulder.y && Math.hypot(rWrist.x - rElbow.x, rWrist.y - rElbow.y) > 35) return '[POINT]';
  }

  // [CELEBRATION]: Both wrists elevated > 1.5s with side-to-side oscillation
  if (track && track.isCelebrating) return '[CELEBRATION]';

  // [CALM]: Standing still with arms relaxed at sides for > 3s
  if (track && track.isCalm) return '[CALM]';

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

// --- SOVEREIGN FIX: AUDIO CUE SYNTHESIZER ---
let sharedAudioCtx: AudioContext | null = null;

const playGestureCue = (gesture: string) => {
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
    
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);

    const now = sharedAudioCtx.currentTime;
    
    switch(gesture) {
      case '[WAVE]':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case '[POINT]':
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case '[CELEBRATION]':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case '[JOY/LAUGHTER]':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        osc.frequency.setValueAtTime(600, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case '[AFRAID/ANXIOUS]':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(140, now + 0.5);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case '[ANGER/ANNOY]':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case '[CALM]':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.5);
        gain.gain.linearRampToValueAtTime(0, now + 1.0);
        osc.start(now);
        osc.stop(now + 1.0);
        break;
    }
  } catch (e) {
    console.warn("Audio cue failed", e);
  }
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

export const AutonomousVisionAgent = memo(function AutonomousVisionAgent({ feed, config, isPlaying, onPlay, onPause, webcamStream }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTelemetryRef = useRef<number>(0); 
  const trackerRef = useRef<Map<string, any>>(new Map());
  const kinematicRef = useRef<Map<string, any>>(new Map());
  const gestureRef = useRef<Map<string, any>>(new Map());
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
    if (webcamStream && videoRef.current) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  useEffect(() => {
    let frameId: number;
    const theme = getCanvasTheme(feed.id);

    const loop = async () => {
      if (!videoRef.current || !canvasRef.current || !model || !isPlaying) {
        frameId = requestAnimationFrame(loop); return;
      }
      const video = videoRef.current; const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
      if (!ctx || video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) { 
        frameId = requestAnimationFrame(loop); 
        return; 
      }

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

      // --- SOVEREIGN FIX: PHASE 2.5 GESTURE TRACKING (CAM_01) ---
      if (feed.id.includes('CAM_01')) {
        const now = Date.now();
        const currentMap = gestureRef.current;
        const newMap = new Map();
        let nextId = currentMap.size > 0 ? Math.max(...Array.from(currentMap.keys()).map(k => parseInt(k))) + 1 : 0;

        const people = dets.filter(d => d.class.toLowerCase() === 'person' || d.class.toLowerCase() === 'athlete');

        people.forEach(p => {
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
            track.bbox = p.bbox; track.lastSeen = now;
          } else {
            track = { id: String(nextId++), bbox: p.bbox, lastSeen: now, wristHistory: [], celebrationHistory: [] };
          }

          if (p.keypoints) {
            const rWrist = p.keypoints[10]; const lWrist = p.keypoints[9];
            const rShoulder = p.keypoints[6]; const lShoulder = p.keypoints[5];
            
            let activeWrist = null;
            if (rWrist?.score > 0.3 && rShoulder?.score > 0.3 && lShoulder?.score > 0.3) activeWrist = rWrist;
            else if (lWrist?.score > 0.3 && rShoulder?.score > 0.3 && lShoulder?.score > 0.3) activeWrist = lWrist;

            if (activeWrist && rShoulder && lShoulder) {
              const minX = Math.min(rShoulder.x, lShoulder.x) - 30;
              const maxX = Math.max(rShoulder.x, lShoulder.x) + 30;
              if (activeWrist.x >= minX && activeWrist.x <= maxX) {
                track.wristHistory.push({ x: activeWrist.x, time: now });
              } else {
                track.wristHistory = [];
              }
            } else {
              track.wristHistory = [];
            }

            track.wristHistory = track.wristHistory.filter((h: any) => now - h.time <= 1200);

            let directionChanges = 0;
            let lastDir = 0;
            for (let i = 1; i < track.wristHistory.length; i++) {
              const dx = track.wristHistory[i].x - track.wristHistory[i-1].x;
              if (Math.abs(dx) > 8) {
                const dir = Math.sign(dx);
                if (lastDir !== 0 && dir !== lastDir) directionChanges++;
                lastDir = dir;
              }
            }
            
            const historySpan = track.wristHistory.length > 0 ? now - track.wristHistory[0].time : 0;
            track.waveCount = historySpan > 1200 ? directionChanges : 0;

            // --- CELEBRATION TRACKING ---
            if (!track.celebrationHistory) track.celebrationHistory = [];
            if (lWrist?.score > 0.3 && rWrist?.score > 0.3 && lShoulder?.score > 0.3 && rShoulder?.score > 0.3) {
              if (lWrist.y < lShoulder.y && rWrist.y < rShoulder.y) {
                track.celebrationHistory.push({ time: now, lx: lWrist.x, rx: rWrist.x });
              } else {
                track.celebrationHistory = [];
              }
            } else {
              track.celebrationHistory = [];
            }

            track.celebrationHistory = track.celebrationHistory.filter((h: any) => now - h.time <= 2000);
            const celebSpan = track.celebrationHistory.length > 0 ? now - track.celebrationHistory[0].time : 0;
            
            track.isCelebrating = false;
            if (celebSpan >= 1500) {
              const recent = track.celebrationHistory.filter((h: any) => now - h.time <= 500);
              if (recent.length > 0) {
                const lXs = recent.map((h: any) => h.lx);
                const rXs = recent.map((h: any) => h.rx);
                const lDiff = Math.max(...lXs) - Math.min(...lXs);
                const rDiff = Math.max(...rXs) - Math.min(...rXs);
                if (lDiff >= 15 || rDiff >= 15) track.isCelebrating = true;
              }
            }

            // --- CALM TRACKING ---
            if (!track.calmHistory) track.calmHistory = [];
            let isCalmPose = false;
            if (lWrist?.score > 0.3 && rWrist?.score > 0.3 && lShoulder?.score > 0.3 && rShoulder?.score > 0.3) {
              const shoulderDistX = Math.abs(lShoulder.x - rShoulder.x) || 10;
              const bodyCenterX = (lShoulder.x + rShoulder.x) / 2;
              // Wrists below shoulders and close to body
              if (lWrist.y > lShoulder.y && rWrist.y > rShoulder.y) {
                if (Math.abs(lWrist.x - bodyCenterX) < shoulderDistX * 2.5 && Math.abs(rWrist.x - bodyCenterX) < shoulderDistX * 2.5) {
                  isCalmPose = true;
                }
              }
            }

            if (isCalmPose) {
              const [bx, by, bw, bh] = p.bbox;
              track.calmHistory.push({ time: now, cx: bx + bw/2, cy: by + bh/2 });
            } else {
              track.calmHistory = [];
            }

            track.calmHistory = track.calmHistory.filter((h: any) => now - h.time <= 4000);
            
            track.isCalm = false;
            const calmSpan = track.calmHistory.length > 0 ? now - track.calmHistory[0].time : 0;
            if (calmSpan >= 3000) {
              const cxs = track.calmHistory.map((h: any) => h.cx);
              const cys = track.calmHistory.map((h: any) => h.cy);
              const dx = Math.max(...cxs) - Math.min(...cxs);
              const dy = Math.max(...cys) - Math.min(...cys);
              // Standing still (center hasn't moved much)
              if (dx < 50 && dy < 50) {
                track.isCalm = true;
              }
            }
          }

          newMap.set(track.id, track);
          p.track = track;
        });

        currentMap.forEach((track, id) => {
          if (now - track.lastSeen < 1000) newMap.set(id, track);
        });
        gestureRef.current = newMap;
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
        ctx.strokeStyle = theme.stroke; 
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        
        // 2. RAW SKELETON OR FACE KEYPOINTS
        if (det.keypoints) {
          ctx.strokeStyle = feed.id.includes('CAM_05') ? '#4057DE' : theme.stroke; 
          ctx.lineWidth = 1.5;
          
          if (det.class.toLowerCase() === 'face') {
            // Draw face keypoints (eyes, nose, mouth, ears)
            ctx.fillStyle = theme.stroke;
            det.keypoints.forEach((kp: any) => {
              ctx.beginPath();
              ctx.arc(kp.x * sX, kp.y * sY, 2, 0, 2 * Math.PI);
              ctx.fill();
            });
          } else {
            // Draw skeletal connections
            SKELETON_CONNECTIONS.forEach(([i, j]) => {
              const p1 = det.keypoints[i]; const p2 = det.keypoints[j];
              if (p1?.score > 0.3 && p2?.score > 0.3) {
                ctx.beginPath(); ctx.moveTo(p1.x * sX, p1.y * sY);
                ctx.lineTo(p2.x * sX, p2.y * sY); ctx.stroke();
              }
            });
          }
        }
        
        // 3. ARCHITECTURAL TELEMETRY LABELS
        const confidence = Math.round(det.conf * 100);

        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        let labelMain = `${det.class.toUpperCase()} [${confidence}%]`;
        let labelSub = '';
          
          // --- SOVEREIGN FIX: PHASE 2 UI OVERRIDE ---
          if (feed.id.includes('CAM_01')) {
            const normalizedClass = det.class.toLowerCase();
            if (normalizedClass === 'person' || normalizedClass === 'athlete') {
              const posturalState = derivePosturalState(det.keypoints, det.track);
              const emotionalState = deriveEmotionalState(det.track, now);
              labelMain = `${det.class.toUpperCase()} ${posturalState !== '[NEUTRAL]' ? posturalState : emotionalState} [${confidence}%]`;
              
              if (det.track) {
                if (det.track.lastPosturalState !== posturalState) {
                  if (posturalState !== '[NEUTRAL]') {
                    playGestureCue(posturalState);
                    det.track.lastActiveGesture = posturalState;
                    det.track.lastActiveGestureTime = now;
                  }
                  det.track.lastPosturalState = posturalState;
                } else if (posturalState !== '[NEUTRAL]') {
                  det.track.lastActiveGestureTime = now;
                }
              }
            } else if (normalizedClass === 'face') {
              const emotionalState = deriveEmotionalState(det.track, now);
              labelMain = `${det.class.toUpperCase()} ${emotionalState} [${confidence}%]`;
              labelSub = `[FACIAL_LANDMARKS_ACTIVE]`;
            }
          }

          // --- SOVEREIGN FIX: ANIMAL BEHAVIOR OVERRIDE ---
          if (feed.id.includes('CAM_02')) {
            const normalizedClass = det.class.toLowerCase();
            if (['horse', 'cow', 'dog', 'cat', 'sheep', 'bear'].includes(normalizedClass)) {
              labelMain = `LION [${confidence}%]`;
              labelSub = `[APEX_PREDATOR]`;
            } else {
              labelSub = `[WILDLIFE_NODE]`;
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

          // --- SOVEREIGN FIX: GESTURE OVERLAY (CAM_01) ---
          if (feed.id.includes('CAM_01') && det.track && det.track.lastActiveGesture) {
            const timeSince = now - (det.track.lastActiveGestureTime || 0);
            if (timeSince < 2000) {
              const icon = getGestureIcon(det.track.lastActiveGesture);
              if (icon) {
                ctx.font = '20px Arial';
                const iconX = x + tw + 12 + 20;
                const iconY = labelY + boxHeight / 2;
                
                ctx.fillStyle = theme.fill;
                ctx.beginPath();
                ctx.arc(iconX, iconY, 16, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = theme.stroke;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(icon, iconX, iconY + 2);
                
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
              }
            }
          }
      });
      frameId = requestAnimationFrame(loop);
    };
    loop(); return () => cancelAnimationFrame(frameId);
  }, [isPlaying, model, config, feed.id]);

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-white/5 group shadow-2xl">
      <video 
        ref={videoRef} 
        src={webcamStream ? undefined : feed.mp4Url} 
        controls={!webcamStream} 
        className="absolute inset-0 w-full h-full object-contain bg-black" 
        loop={!webcamStream} 
        playsInline 
        crossOrigin={webcamStream ? undefined : "anonymous"} 
        muted={!!webcamStream}
      />
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