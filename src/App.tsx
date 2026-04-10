import React, { useState, useEffect } from "react";
import { EventLog } from "./components/EventLog";
import { LiveMonitor } from "./components/LiveMonitor";
import { AIAssistant } from "./components/AIAssistant";
import { ModelManager } from "./components/ModelManager";
import { WebcamAIWindow } from "./components/WebcamAIWindow";
import { VisionProvider } from "./context/VisionContext";
import { BattlefieldProvider, useBattlefield } from "./BattlefieldProvider";
import { Video, List, HardDrive, Sparkles, ShieldCheck, Camera, ExternalLink, Activity } from "lucide-react";

const AppContent = () => {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "platform";
  });
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const { launchBattlefield } = useBattlefield();

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

  const tabs = [
    { id: "platform", label: "Platform Monitor", icon: Video },
    { id: "webcam", label: "Live Webcam AI", icon: Camera },
    { id: "telemetry", label: "Telemetry Stream", icon: List },
    { id: "models", label: "Model Manager", icon: HardDrive },
    { id: "assistant", label: "AI Assistant", icon: Sparkles },
  ];

  return (
      <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex relative">
        
        {/* Cosmic Webcam Modal */}
        {showWebcamModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 bg-slate-900/80 backdrop-blur-2xl p-8 text-center z-10">
              
              {/* Lava Lamp Background */}
              <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none" style={{ filter: 'blur(60px)' }}>
                <div className="absolute w-[300px] h-[300px] rounded-full bg-teal-500/30 animate-blob1" style={{ top: '-10%', left: '-10%' }} />
                <div className="absolute w-[250px] h-[250px] rounded-full bg-purple-500/30 animate-blob2" style={{ top: '40%', right: '-10%' }} />
                <div className="absolute w-[280px] h-[280px] rounded-full bg-blue-500/30 animate-blob3" style={{ bottom: '-20%', left: '20%' }} />
              </div>

              <div className="mx-auto w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.3)] mb-6">
                <ExternalLink className="w-8 h-8 text-indigo-400" />
              </div>

              <h3 className="text-2xl font-black text-white tracking-tighter uppercase mb-3 drop-shadow-lg">
                Dedicated Window Required
              </h3>
              
              <p className="text-slate-300 text-sm leading-relaxed mb-8 drop-shadow-md">
                Live Webcam AI requires camera permissions which are restricted in this preview environment. Please launch the dedicated window to enable neural processing.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    window.open(window.location.pathname + '?tab=webcam', '_blank');
                    setShowWebcamModal(false);
                  }}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold tracking-wide uppercase transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" /> Launch Dedicated Window
                </button>
                <button
                  onClick={() => setShowWebcamModal(false)}
                  className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-bold tracking-wide uppercase transition-all border border-white/10"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Keyframe Animations for the Lava Lamp Backdrop */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes blob1 {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(30px, -50px) scale(1.1); }
                66% { transform: translate(-20px, 20px) scale(0.9); }
              }
              @keyframes blob2 {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(-30px, 30px) scale(0.9); }
                66% { transform: translate(30px, -20px) scale(1.2); }
              }
              @keyframes blob3 {
                0%, 100% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(10px, 40px) scale(1.2); }
                66% { transform: translate(-40px, -10px) scale(0.8); }
              }
              .animate-blob1 { animation: blob1 18s cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite; }
              .animate-blob2 { animation: blob2 22s cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite; }
              .animate-blob3 { animation: blob3 15s cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite; }
            `}} />
          </div>
        )}

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/50 backdrop-blur-md border-r border-slate-800/50 flex flex-col shadow-sm z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-800/50">
          <ShieldCheck className="w-6 h-6 text-indigo-400 mr-2" />
          <span className="font-bold text-lg tracking-tight text-white">OMEGA Ai Vision</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "webcam" && window.self !== window.top) {
                    setShowWebcamModal(true);
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
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

          <div className="mt-2 p-4 bg-slate-800/40 rounded-xl border border-cyan-500/20">
            <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Swarm Intelligence</h3>
            <button
              onClick={launchBattlefield}
              className="w-full py-2 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Live Battlefield
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

        {/* SOVEREIGN FIX: Expanded Viewport Padding */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          
          {/* SOVEREIGN FIX: Expanded Viewport Dimensions */}
          <div className="w-full max-w-[1800px] mx-auto h-full min-h-[85vh]">
            
            {/* SOVEREIGN FIX: Persistent Routing via CSS Hiding */}
            <div className={activeTab === "platform" ? "block h-full" : "hidden"}>
              <LiveMonitor isBuilderOpen={isBuilderOpen} setIsBuilderOpen={setIsBuilderOpen} />
            </div>
            
            <div className={activeTab === "webcam" ? "block h-full" : "hidden"}>
              <WebcamAIWindow />
            </div>
            
            <div className={activeTab === "telemetry" ? "block h-full" : "hidden"}>
              <EventLog />
            </div>
            
            <div className={activeTab === "models" ? "block h-full" : "hidden"}>
              <ModelManager />
            </div>
            
            <div className={activeTab === "assistant" ? "block h-full" : "hidden"}>
              <AIAssistant />
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <VisionProvider>
      <BattlefieldProvider>
        <AppContent />
      </BattlefieldProvider>
    </VisionProvider>
  );
}