import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as tf from '@tensorflow/tfjs';

export interface ModelConfig {
  name: string;
  description: string;
  isEnabled: boolean;
}

interface VisionContextType {
  activeModel: string;
  setActiveModel: (model: string) => void;
  telemetryLogs: any[];
  dispatchTelemetry: (log: any) => void;
  feeds: any[];
  registeredModels: ModelConfig[];
  toggleModelEnabled: (name: string) => void;
  memoryStats: { numBytes: number; numTensors: number };
}

const VisionContext = createContext<VisionContextType | undefined>(undefined);

export function VisionProvider({ children }: { children: ReactNode }) {
  // Global Model Registry
  const [registeredModels, setRegisteredModels] = useState<ModelConfig[]>([
    { name: 'YOLOv26 (Detect)', description: 'Ultra-fast object detection optimized for edge devices. Prioritizes bounding box accuracy and high FPS.', isEnabled: true },
    { name: 'YOLOv26-Seg (Segment)', description: 'Instance segmentation model. Provides pixel-perfect masks for detected objects.', isEnabled: true },
    { name: 'YOLOv26-Pose (Pose)', description: 'Human pose estimation. Tracks keypoints for skeletal analysis and action recognition.', isEnabled: true },
    { name: 'COCO-SSD', description: 'Standard object detection model for 80 classes. Reliable baseline for general surveillance.', isEnabled: true }
  ]);

  const [activeModel, setActiveModel] = useState<string>('YOLOv26-Seg (Segment)');
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);
  const [memoryStats, setMemoryStats] = useState({ numBytes: 0, numTensors: 0 });

  // Centralized Hardware Monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const mem = tf.memory();
        setMemoryStats({ numBytes: mem.numBytes, numTensors: mem.numTensors });
      } catch (e) {
        // tf environment not ready
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Global Toggle Logic
  const toggleModelEnabled = (name: string) => {
    setRegisteredModels(prev => {
      const next = prev.map(m => m.name === name ? { ...m, isEnabled: !m.isEnabled } : m);
      
      // Safety Lock: If the user disables the currently active model, fallback to the first available active model to prevent crashing.
      const targetModel = next.find(m => m.name === name);
      if (targetModel && !targetModel.isEnabled && activeModel === name) {
        const firstActive = next.find(m => m.isEnabled);
        if (firstActive) setActiveModel(firstActive.name);
      }
      return next;
    });
  };

  const feeds = [
    { id: "CAM_01", name: "Human Analytics", mp4Url: "/Human_Analytics.mp4", type: "HUMAN", skill: "Body Language & Emotion" },
    { id: "CAM_02", name: "Animal Behavior", mp4Url: "/Animals.mp4", type: "ANIMAL", skill: "Species Tracking" },
    { id: "CAM_03", name: "Urban Analytics", mp4Url: "/urban-traffic.mp4", type: "URBAN", skill: "Vehicles & Pedestrians" },
    { id: "CAM_04", name: "Retail Analytics", mp4Url: "/Convenience_Store_Video_Generation.mp4", type: "RETAIL", skill: "Shopper Demographics" }
  ];

  const dispatchTelemetry = (log: any) => {
    setTelemetryLogs(prev => [log, ...prev].slice(0, 100));
  };

  return (
    <VisionContext.Provider value={{
      activeModel, setActiveModel,
      telemetryLogs, dispatchTelemetry,
      feeds, registeredModels, toggleModelEnabled, memoryStats
    }}>
      {children}
    </VisionContext.Provider>
  );
}

export function useVision() {
  const context = useContext(VisionContext);
  if (context === undefined) throw new Error('useVision must be used within a VisionProvider');
  return context;
}