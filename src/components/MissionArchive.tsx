import React, { useState, useEffect } from 'react';
import { chroniclerFirebase, MissionRecord } from '../lib/chroniclerFirebase';
import { Download, CheckCircle, XCircle, Clock, Database } from 'lucide-react';
import { ChroniclerTelemetry } from '../hooks/useChroniclerTelemetry';

interface MissionArchiveProps {
  telemetry: ChroniclerTelemetry;
}

export const MissionArchive: React.FC<MissionArchiveProps> = ({ telemetry }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [records, setRecords] = useState<MissionRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      chroniclerFirebase.getMissionRecords().then(setRecords);
    }
  }, [isOpen, telemetry.pdfExportTriggers]); // Refresh when new PDF is generated

  return (
    <div className="absolute top-4 right-4 z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-900/80 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg font-mono text-sm shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:bg-slate-800 transition-all flex items-center gap-2 backdrop-blur-md"
      >
        <Database className="w-4 h-4" />
        Mission Archive
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-[600px] bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
            <h3 className="text-white font-mono font-bold">Sovereign Task Archive</h3>
            <div className="flex gap-4 text-xs font-mono text-slate-400">
              <span>Write Latency: <span className="text-amber-400">{telemetry.firebaseWriteLatency}ms</span></span>
              <span>Status: <span className={telemetry.documentGenerationStatus === 'GENERATING' ? 'text-cyan-400 animate-pulse' : 'text-green-400'}>{telemetry.documentGenerationStatus}</span></span>
            </div>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 font-mono text-xs border-b border-slate-800">
                  <th className="p-2 font-normal">TASK ID</th>
                  <th className="p-2 font-normal">TYPE</th>
                  <th className="p-2 font-normal">TIME</th>
                  <th className="p-2 font-normal">STATUS</th>
                  <th className="p-2 font-normal">REPORT</th>
                </tr>
              </thead>
              <tbody>
                {records.sort((a, b) => b.timestamp - a.timestamp).map(record => (
                  <tr key={record.taskId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors text-sm font-mono text-slate-300">
                    <td className="p-2 text-cyan-400">{record.taskId}</td>
                    <td className="p-2">{record.type}</td>
                    <td className="p-2 text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-2">
                      {record.status === 'Success' ? (
                        <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-3 h-3" /> Success</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400"><XCircle className="w-3 h-3" /> Error</span>
                      )}
                    </td>
                    <td className="p-2">
                      <a href={record.pdfUrl} download={`SAVIS_REPORT_${record.taskId}.pdf`} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        <Download className="w-3 h-3" /> PDF
                      </a>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-mono text-sm">
                      No missions archived yet. Awaiting swarm events.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
