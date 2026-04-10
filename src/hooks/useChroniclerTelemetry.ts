import { useState, useCallback } from 'react';

export interface ChroniclerTelemetry {
  documentGenerationStatus: 'IDLE' | 'GENERATING' | 'COMPLETE' | 'ERROR';
  firebaseWriteLatency: number; // ms
  pdfExportTriggers: number;
  lastExportUrl: string | null;
}

export const useChroniclerTelemetry = () => {
  const [telemetry, setTelemetry] = useState<ChroniclerTelemetry>({
    documentGenerationStatus: 'IDLE',
    firebaseWriteLatency: 0,
    pdfExportTriggers: 0,
    lastExportUrl: null,
  });

  const updateTelemetry = useCallback((updates: Partial<ChroniclerTelemetry> | ((prev: ChroniclerTelemetry) => Partial<ChroniclerTelemetry>)) => {
    setTelemetry(prev => {
      const newUpdates = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...newUpdates };
    });
  }, []);

  return { telemetry, updateTelemetry };
};
