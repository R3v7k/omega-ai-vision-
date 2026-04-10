export interface MissionRecord {
  taskId: string;
  type: string;
  timestamp: number;
  status: 'Success' | 'Error';
  agentLogs: string[];
  resultSummary: string;
  pdfUrl: string;
}

// In-memory store for the archive to act as a decoupled observer layer
let mockDatabase: MissionRecord[] = [];
let activeListeners: Function[] = [];

export const chroniclerFirebase = {
  async saveMissionRecord(record: MissionRecord): Promise<{ latency: number }> {
    const start = performance.now();
    
    // Simulate network latency (300ms - 800ms)
    const latency = Math.floor(Math.random() * 500) + 300;
    await new Promise(resolve => setTimeout(resolve, latency));
    
    mockDatabase.unshift(record);
    
    const end = performance.now();
    return { latency: Math.round(end - start) };
  },

  async getMissionRecords(): Promise<MissionRecord[]> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 200));
    return [...mockDatabase];
  },

  subscribe(callback: (records: MissionRecord[]) => void) {
    activeListeners.push(callback);
    return () => {
      activeListeners = activeListeners.filter(l => l !== callback);
    };
  },

  closeAllListeners() {
    activeListeners = [];
    console.log('[CHRONICLER] All Firebase listeners closed.');
  }
};
