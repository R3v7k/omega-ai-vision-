import React, { useState } from "react";
import { EventLog } from "./components/EventLog";
import { LiveMonitor } from "./components/LiveMonitor";
import { AIAssistant } from "./components/AIAssistant";
import { ModelManager } from "./components/ModelManager";
import { VisionProvider } from "./context/VisionContext";
import { Video, List, HardDrive, Sparkles, ShieldCheck } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("platform");
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const tabs = [
    { id: "platform", label: "Platform Monitor", icon: Video },
    { id: "telemetry", label: "Telemetry Stream", icon: List },
    { id: "models", label: "Model Manager", icon: HardDrive },
    { id: "assistant", label: "AI Assistant", icon: Sparkles },
  ];

  return (
    <VisionProvider>
      <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/50 backdrop-blur-md border-r border-slate-800/50 flex flex-col shadow-sm z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-800/50">
          <ShieldCheck className="w-6 h-6 text-indigo-400 mr-2" />
          <span className="font-bold text-lg tracking-tight text-white">OMEGA V10X2</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-slate-800/80 text-indigo-400 border border-white/5 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${activeTab === tab.id ? "text-indigo-400" : "text-slate-500"}`} />
                {tab.label}
              </button>
            );
          })}
          
          <div className="mt-6 p-4 bg-slate-800/40 rounded-xl border border-indigo-500/20">
            <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Inference Builder</h3>
            <button
              onClick={() => setIsBuilderOpen(true)}
              className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-lg transition-all"
            >
              Launch Builder
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <div className="bg-slate-800/40 rounded-lg p-3 border border-white/5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">System Status</p>
            <div className="flex items-center gap-2 text-sm text-indigo-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Vision Core Online
            </div>
            <p className="text-xs text-slate-500 mt-2">Telemetry Active</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800/50 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-xl font-semibold text-white">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">
              {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="w-8 h-8 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center text-indigo-400 font-semibold text-sm shadow-sm">
              AI
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === "platform" && <LiveMonitor isBuilderOpen={isBuilderOpen} setIsBuilderOpen={setIsBuilderOpen} />}
            {activeTab === "telemetry" && <EventLog />}
            {activeTab === "models" && <ModelManager />}
            {activeTab === "assistant" && <AIAssistant />}
          </div>
        </div>
      </main>
    </div>
    </VisionProvider>
  );
}