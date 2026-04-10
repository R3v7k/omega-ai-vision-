import { jsPDF } from 'jspdf';
import { chroniclerFirebase } from './chroniclerFirebase';
import { Agent, SwarmMetrics } from '../hooks/useSwarmTelemetry';

export class ChroniclerAgent {
  private updateTelemetry: (updates: any) => void;
  private eventLog: string[] = [];
  
  constructor(updateTelemetry: (updates: any) => void) {
    this.updateTelemetry = updateTelemetry;
  }

  public processSwarmData(agents: Agent[], metrics: SwarmMetrics, logs: string[]) {
    // Reasoning Loop: Identify Significant Events
    // Look for successful task terminations
    const newEvents = logs.filter(log => log.includes('[PURGING]> [Terminating Task]'));
    
    newEvents.forEach(event => {
      if (!this.eventLog.includes(event)) {
        this.eventLog.push(event);
        this.triggerSignificantEvent(event, agents, metrics);
      }
    });
  }

  private async triggerSignificantEvent(eventLog: string, agents: Agent[], metrics: SwarmMetrics) {
    this.updateTelemetry({ documentGenerationStatus: 'GENERATING' });
    
    // 1. Generate PDF
    const taskId = `TSK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const pdfUrl = await this.generateSovereignReport(taskId, eventLog, metrics);
    
    this.updateTelemetry((prev: any) => ({ 
      documentGenerationStatus: 'COMPLETE',
      pdfExportTriggers: prev.pdfExportTriggers + 1,
      lastExportUrl: pdfUrl
    }));

    // 2. Save to Firebase
    const record = {
      taskId,
      type: 'Kinematic Mapping',
      timestamp: Date.now(),
      status: 'Success' as const,
      agentLogs: [eventLog],
      resultSummary: `Task completed successfully with Swarm Health at ${Math.round(metrics.swarmHealth)}%`,
      pdfUrl
    };

    const { latency } = await chroniclerFirebase.saveMissionRecord(record);
    
    this.updateTelemetry({ firebaseWriteLatency: latency });
    
    setTimeout(() => {
      this.updateTelemetry({ documentGenerationStatus: 'IDLE' });
    }, 2000);
  }

  private async generateSovereignReport(taskId: string, eventLog: string, metrics: SwarmMetrics): Promise<string> {
    return new Promise((resolve) => {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Dark theme background
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 297, 'F');

      // Header
      doc.setTextColor(34, 211, 238); // cyan-400
      doc.setFont('courier', 'bold');
      doc.setFontSize(24);
      doc.text('SAVIS', 20, 30);
      
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFontSize(12);
      doc.text('SOVEREIGN MISSION REPORT', 20, 40);
      
      // Divider
      doc.setDrawColor(51, 65, 85); // slate-700
      doc.line(20, 45, 190, 45);

      // Metadata
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(`TASK ID: ${taskId}`, 20, 60);
      doc.text(`TIMESTAMP: ${new Date().toISOString()}`, 20, 68);
      doc.text(`STATUS: SUCCESS`, 20, 76);

      // Metrics
      doc.setTextColor(34, 197, 94); // green-500
      doc.text(`SWARM HEALTH: ${Math.round(metrics.swarmHealth)}%`, 120, 60);
      doc.text(`NEURAL LOAD: ${Math.round(metrics.neuralLoad)}%`, 120, 68);
      doc.text(`VELOCITY: ${Math.round(metrics.velocity)} FPS`, 120, 76);

      // Logs
      doc.setTextColor(148, 163, 184);
      doc.text('AGENT LOGS:', 20, 95);
      doc.setTextColor(255, 255, 255);
      doc.setFont('courier', 'normal');
      doc.text(eventLog, 20, 105, { maxWidth: 170 });

      // Footer
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text('OMEGA AI VISION - DECENTRALIZED NEURAL ARRAY', 20, 280);

      // Generate Blob URL
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      resolve(url);
    });
  }
}
