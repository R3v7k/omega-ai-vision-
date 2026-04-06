import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Activity, Timer, RefreshCw, Download, ArrowUpDown } from "lucide-react";
import { eventBus } from "../lib/EventBus"; // INJECTED: Direct Swarm Connection

export function EventLog() {
  // SAVIS State: Direct Swarm Connection instead of laggy context
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);
  
  const [isCapturing, setIsCapturing] = useState(true);
  const [timeLeft, setTimeLeft] = useState(180);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // --- SAVIS™ DIRECT DATA PIPE (RESTORED) ---
  useEffect(() => {
    if (!isCapturing) return;

    // Listen to '*' to intercept EVERYTHING from the inference engine
    const unsubTelemetry = eventBus.subscribe('*', (event: any) => {
      // The wildcard publisher wraps data in { type, payload }
      const payload = event.payload || event;
      
      // Robust Sniffing: Only render if it's a valid detection payload with targets
      if (payload && Array.isArray(payload.detections) && payload.detections.length > 0) {
        setTelemetryLogs(prev => [
          { id: Date.now() + Math.random(), timestamp: Date.now(), ...payload },
          ...prev
        ].slice(0, 150)); // Keep a healthy buffer of the last 150 events
      }
    });

    return () => {
      unsubTelemetry();
    };
  }, [isCapturing]);

  // Timer Logic
  useEffect(() => {
    if (!isCapturing) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsCapturing(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isCapturing]);

  const handleReload = () => {
    setTimeLeft(180);
    setIsCapturing(true);
    setTelemetryLogs([]); // Clear logs on fresh reload
  };

  const handleDownloadCSV = () => {
    const headers = ['Date', 'Time', 'Source Feed', 'Detections', 'Avg Confidence'];
    const rows = telemetryLogs.map(event => {
      const date = format(new Date(event.timestamp), "yyyy-MM-dd");
      const time = format(new Date(event.timestamp), "HH:mm:ss.SSS");
      const detections = event.detections.map((d: any) => d.class).join(', ');
      const conf = event.detections.length > 0 
        ? Math.round(event.detections.reduce((acc: number, d: any) => acc + d.conf, 0) / event.detections.length) + '%'
        : '0%';
      return [date, time, event.sourceFeed || 'SYS', `"${detections}"`, conf].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `telemetry_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sort latest at top
  let events = isCapturing ? [...telemetryLogs] : [];
  if (sortOrder === 'oldest') {
    events.reverse();
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Activity className={`w-4 h-4 ${isCapturing ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          Live Telemetry Stream
        </h3>
        <div className="flex items-center gap-4">
          <div className={`text-xs font-mono flex items-center gap-1 ${isCapturing ? 'text-emerald-400' : 'text-red-400'}`}>
            <Timer className="w-3 h-3" />
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {events.length} events
          </div>
          <button 
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
          >
            <ArrowUpDown className="w-3 h-3" />
            Sort: {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
          </button>
          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
          <button 
            onClick={handleReload}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Reload
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1 p-4">
        <table className="w-full text-left text-xs font-mono">
          <thead className="text-slate-500 border-b border-slate-800">
            <tr>
              <th className="pb-2">Date</th>
              <th className="pb-2">Time</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Detection Type</th>
              <th className="pb-2">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {events.map((event) => (
              <tr key={event.id} className="text-slate-300 hover:bg-slate-800/50">
                <td className="py-3">{format(new Date(event.timestamp), "yyyy-MM-dd")}</td>
                <td className="py-3">{format(new Date(event.timestamp), "HH:mm:ss.SSS")}</td>
                <td className="py-3 text-emerald-400">[{event.sourceFeed || 'FEED'}]</td>
                <td className="py-3">{event.detections.map((d: any) => d.class).join(', ')}</td>
                <td className="py-3 text-indigo-400 font-bold">
                  {event.detections.length > 0 ? Math.round(event.detections.reduce((acc: number, d: any) => acc + d.conf, 0) / event.detections.length) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && (
          <div className="text-center text-slate-600 py-12 font-mono text-sm">
            {isCapturing ? "Awaiting telemetry data..." : "Capture stopped. Click Reload to start."}
          </div>
        )}
      </div>
    </div>
  );
}