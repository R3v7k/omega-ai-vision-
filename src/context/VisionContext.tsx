import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as tf from '@tensorflow/tfjs';

export interface ModelConfig { name: string; description: string; isEnabled: boolean; }
interface VisionContextType {
  activeModel: string; setActiveModel: (m: string) => void;
  telemetryLogs: any[]; setTelemetryLogs: React.Dispatch<React.SetStateAction<any[]>>;
  dispatchTelemetry: (log: any) => void;
  feeds: any[]; registeredModels: ModelConfig[];
  toggleModelEnabled: (name: string) => void;
  memoryStats: { numBytes: number; numTensors: number };
}

const VisionContext = createContext<VisionContextType | undefined>(undefined);

export function VisionProvider({ children }: { children: ReactNode }) {
  const [registeredModels, setRegisteredModels] = useState<ModelConfig[]>([
    { name: 'YOLOv26 (Detect)', description: 'Fast detection.', isEnabled: true },
    { name: 'YOLOv26-Seg (Segment)', description: 'Instance masks.', isEnabled: true },
    { name: 'YOLOv26-Pose (Pose)', description: 'Skeletal tracking.', isEnabled: true },
    { name: 'COCO-SSD', description: 'Baseline.', isEnabled: true }
  ]);

  const [activeModel, setActiveModel] = useState<string>('YOLOv26-Seg (Segment)');
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);
  const [memoryStats, setMemoryStats] = useState({ numBytes: 0, numTensors: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      try { 
        const mem = tf.memory(); 
        setMemoryStats({ numBytes: mem.numBytes, numTensors: mem.numTensors }); 
      } catch (e) { /* Engine Warming */ }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const feeds = [
    { id: "CAM_01", name: "Human Analytics", mp4Url: "/humananalytics.mp4", skill: "Kinetic Behavior" },
    { id: "CAM_02", name: "Animal Behavior", mp4Url: "/animals.mp4", skill: "Species ID" },
    { id: "CAM_03", name: "Urban Analytics", mp4Url: "/urbantraffic.mp4", skill: "Flow Density" },
    { id: "CAM_04", name: "Retail Analytics", mp4Url: "/conveniencestore.mp4", skill: "Shopper Demographics" },
    { id: "CAM_05", name: "Athletic tracker Analytics", mp4Url: "/athleticmovement.mp4", skill: "High-Fidelity Pose" }
  ];

  const dispatchTelemetry = (log: any) => {
    setTelemetryLogs(prev => [log, ...prev].slice(0, 100));
  };

  const toggleModelEnabled = (name: string) => {
    setRegisteredModels(prev => prev.map(m => m.name === name ? { ...m, isEnabled: !m.isEnabled } : m));
  };

  return (
    <VisionContext.Provider value={{ 
      activeModel, setActiveModel, telemetryLogs, setTelemetryLogs, 
      dispatchTelemetry, feeds, registeredModels, toggleModelEnabled, memoryStats 
    }}>
      {children}
    </VisionContext.Provider>
  );
}

export const useVision = () => {
  const context = useContext(VisionContext);
  if (!context) throw new Error('Vision Context Missing');
  return context;
};