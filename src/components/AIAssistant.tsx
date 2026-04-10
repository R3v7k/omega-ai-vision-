import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, ShieldAlert, BarChart2, AlertTriangle, Clock, Video, Loader2, Mic, MicOff, Volume2, Zap, Brain, Radio } from "lucide-react";
import { useVision } from "../context/VisionContext";
import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";

const QUICK_ACTIONS = [
  { label: "Kinetic Risk Assessment", icon: ShieldAlert, prompt: "Perform a kinetic risk assessment on the current athletic movement tracking." },
  { label: "Anomalous Traffic", icon: AlertTriangle, prompt: "Analyze recent urban traffic anomalies." },
  { label: "Telemetry Summary", icon: BarChart2, prompt: "Summarize the last 100 telemetry events across the swarm." },
  { label: "System Health", icon: Clock, prompt: "Query hardware metrics and tensor allocation status." }
];

export function AIAssistant() {
  const { telemetryLogs, memoryStats } = useVision();
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    {
      role: "ai",
      text: "STATUS REPORT: OMEGA V10X2 CORE OPERATIONAL. Swarm telemetry is being routed into my context window. How shall I assist with your facility analytics today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedVideo, setSelectedVideo] = useState<{ file: File, base64: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<"standard" | "fast" | "thinking">("standard");
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const playPCM = (base64Audio: string) => {
    if (!audioContextRef.current) return;
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const audioBuffer = audioContextRef.current.createBuffer(1, pcm16.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i++) {
      channelData[i] = pcm16[i] / 32768;
    }
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.start();
  };

  const toggleLiveSession = async () => {
    if (isLiveActive) {
      liveSessionRef.current?.close();
      setIsLiveActive(false);
      return;
    }

    try {
      // @ts-ignore
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) throw new Error("API_KEY_MISSING");

      const ai = new GoogleGenAI({ apiKey });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      source.connect(processor);
      processor.connect(audioContext.destination);

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are OMEGA V10X2, the Sovereign AI Reasoning Core. You analyze multi-node telemetry, kinetic skeletons, and environmental anomalies. Be concise, professional, and architecturally precise.",
        },
        callbacks: {
          onopen: () => {
            setIsLiveActive(true);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
              }
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
          },
          onmessage: async (message: any) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              playPCM(base64Audio);
            }
          },
          onclose: () => {
            setIsLiveActive(false);
            processor.disconnect();
            source.disconnect();
            stream.getTracks().forEach(t => t.stop());
          }
        }
      });
      
      liveSessionRef.current = await sessionPromise;

    } catch (error) {
      console.error("Live session error", error);
      setIsLiveActive(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        
        setLoading(true);
        try {
          // @ts-ignore
          const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
          const ai = new GoogleGenAI({ apiKey });
          
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: [
                { inlineData: { data: base64Data, mimeType: 'audio/webm' } },
                "Transcribe this audio exactly. Do not add any other text."
              ]
            });
            if (response.text) {
              setInput(prev => prev + (prev ? " " : "") + response.text);
            }
            setLoading(false);
          };
        } catch (e) {
          console.error(e);
          setLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error(e);
    }
  };

  const playTTS = async (text: string) => {
    try {
      // @ts-ignore
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: text,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          }
        }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        playPCM(base64Audio);
      }
    } catch (e) {
      console.error("TTS error", e);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedVideo({ file, base64: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() && !selectedVideo) return;
    
    const newMessages = [...messages, { role: "user" as const, text: textToSend + (selectedVideo ? `\n[Asset Injected: ${selectedVideo.file.name}]` : "") }];
    setMessages(newMessages);
    if (!overrideInput) setInput("");
    setLoading(true);

    try {
      // @ts-ignore
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY; 
      
      if (!apiKey || apiKey === 'undefined') {
        throw new Error("API_KEY_MISSING");
      }

      const ai = new GoogleGenAI({ apiKey });
      const lowerInput = textToSend.toLowerCase();
      let model = "gemini-3-flash-preview";
      if (mode === "fast") model = "gemini-3.1-flash-lite-preview";
      if (mode === "thinking" || selectedVideo || lowerInput.includes("analyze") || lowerInput.includes("kinetic") || lowerInput.includes("risk")) {
        model = "gemini-3.1-pro-preview";
      }

      let config: any = {
        systemInstruction: "You are OMEGA V10X2, the Sovereign AI Reasoning Core. You analyze multi-node telemetry, kinetic skeletons, and environmental anomalies. Be concise, professional, and architecturally precise.",
      };

      if (model === "gemini-3.1-pro-preview" && !selectedVideo) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const skeletalNodes = telemetryLogs.filter(l => l.raw?.some((d: any) => d.keypoints));
      
      const nodeStatus: Record<string, string[]> = {};
      telemetryLogs.slice(0, 50).forEach(log => {
        const src = log.source || 'UNKNOWN_NODE';
        if (!nodeStatus[src]) nodeStatus[src] = [];
        if (log.detections) nodeStatus[src].push(log.detections);
      });

      let recentLogs = "";
      if (Object.keys(nodeStatus).length === 0) {
        recentLogs = "No telemetry data available. The swarm is silent.";
      } else {
        for (const [node, detectionsList] of Object.entries(nodeStatus)) {
          const counts: Record<string, number> = {};
          detectionsList.forEach(dString => {
            const items = dString.split(', ');
            items.forEach(item => { if (item) counts[item] = (counts[item] || 0) + 1; });
          });
          const densityStr = Object.entries(counts).map(([item, count]) => `${count}x ${item}`).join(' | ');
          recentLogs += `[${node}]: ${densityStr || 'Active (No specific classes)'}\n`;
        }
      }

      const contextPrompt = `
SYSTEM TELEMETRY CONTEXT:
- Swarm Nodes Active: 5
- GPU VRAM Usage: ${(memoryStats.numBytes / 1048576).toFixed(2)} MB
- Kinetic Tracking Status: ${skeletalNodes.length > 0 ? 'HIGH-FIDELITY ACTIVE' : 'Inactive'}
- Live Density Map (Last 50 Events):
${recentLogs}

INSTRUCTION: Analyze the following request against this live context.
`;

      const history = newMessages.map(msg => ({
        role: msg.role === "ai" ? "model" : "user",
        parts: [{ text: msg.text }] as any[]
      }));

      history[history.length - 1].parts[0].text = `${contextPrompt}\n\nUSER_REQUEST: ${textToSend}`;

      if (selectedVideo) {
        const base64Data = selectedVideo.base64.split(',')[1];
        history[history.length - 1].parts.push({
          inlineData: { data: base64Data, mimeType: selectedVideo.file.type }
        });
        setSelectedVideo(null);
      }

      const response = await ai.models.generateContent({ model, contents: history, config });
      setMessages((prev) => [...prev, { role: "ai", text: response.text || "Diagnostic failed. No response generated." }]);
    
    } catch (error: any) {
      console.warn("[OMEGA_REASONING_WARNING]:", error.message);
      
      if (error.message === "API_KEY_MISSING") {
        setTimeout(() => {
          let simResponse = "I have analyzed the current swarm telemetry. ";
          if (telemetryLogs.length > 0) {
            simResponse += `Currently, the system is tracking highest activity on **${telemetryLogs[0].source}**, primarily detecting **${telemetryLogs[0].detections}**. The VRAM payload is stable at **${(memoryStats.numBytes / 1048576).toFixed(2)} MB**.`;
          } else {
            simResponse += "However, the telemetry pipe is currently empty. Please activate the Vision Nodes on the Platform Monitor.";
          }
          setMessages((prev) => [...prev, { role: "ai", text: simResponse }]);
          setLoading(false);
        }, 1200);
      } else {
        setMessages((prev) => [...prev, { role: "ai", text: "Reasoning Core interrupted. Check network or API authorization." }]);
        setLoading(false);
      }
    }
  };

  return (
    // SOVEREIGN UI FIX: Added relative wrapper, max-w-[1400px], and mx-auto for centering
    <div className="relative flex flex-col h-full w-full max-w-[1400px] mx-auto z-0 py-4">
      
      {/* SOVEREIGN UI FIX: The Liquid Lava Lamp Background */}
      <div className="absolute inset-0 z-[-1] overflow-hidden rounded-3xl pointer-events-none" style={{ filter: 'blur(80px)' }}>
        <div className="absolute w-[50vw] h-[50vw] rounded-full bg-teal-500/30 animate-blob1" style={{ top: '0%', left: '10%' }} />
        <div className="absolute w-[40vw] h-[40vw] rounded-full bg-purple-500/30 animate-blob2" style={{ top: '30%', right: '5%' }} />
        <div className="absolute w-[45vw] h-[45vw] rounded-full bg-blue-500/30 animate-blob3" style={{ bottom: '-10%', left: '20%' }} />
      </div>

      {/* SOVEREIGN UI FIX: Translucent Glass Container */}
      <div className="bg-slate-900/40 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col h-full w-full">
        
        {/* Header - OMEGA CANON */}
        <div className="p-5 border-b border-white/5 bg-slate-900/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/80 p-2 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.4)] backdrop-blur-md border border-indigo-400/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-tighter shadow-sm">Reasoning Core</h2>
              <p className="text-[10px] text-indigo-300 font-mono font-bold tracking-widest uppercase drop-shadow-md">Gemini 3.1 Pro Integrated</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-mono text-slate-300 uppercase font-bold">Live_Sync</span>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* The Welcome Hero Banner */}
          <div className="flex flex-col items-center justify-center pt-8 pb-12 text-center space-y-5 border-b border-white/5 mb-8">
            <div className="w-20 h-20 bg-indigo-600/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-[0_0_40px_rgba(79,70,229,0.2)]">
              <Bot className="w-10 h-10 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2 drop-shadow-lg">OMEGA Intelligence Core</h2>
              <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
                I am your Agentic Commander, natively synced with the Swarm's live telemetry pipe. Feel free to ask me anything—request kinetic risk assessments, cross-node anomaly checks, or strategic system adjustments. 
              </p>
            </div>
          </div>

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                msg.role === "user" ? "bg-slate-800/80 backdrop-blur-md border border-white/10" : "bg-indigo-600/90 backdrop-blur-md text-white border border-indigo-400/20"
              }`}>
                {msg.role === "user" ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm shadow-xl leading-relaxed backdrop-blur-md relative group ${
                msg.role === "user" 
                  ? "bg-indigo-600/80 text-white rounded-tr-none border border-indigo-500/30" 
                  : "bg-slate-900/60 border border-white/10 text-slate-100 rounded-tl-none"
              }`}>
                {msg.role === "ai" && (
                  <button 
                    onClick={() => playTTS(msg.text)}
                    className="absolute -right-10 top-2 p-1.5 bg-slate-800/80 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                    title="Read Aloud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
                {msg.text.split('\n').map((line, i) => (
                  <p key={i} className="mb-2 last:mb-0 drop-shadow-sm">
                    {line.split(/(\*\*.*?\*\*)/g).map((part, j) => 
                      part.startsWith('**') ? <strong key={j} className="text-emerald-400 drop-shadow-md">{part.slice(2, -2)}</strong> : part
                    )}
                  </p>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4 animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/90 text-white flex items-center justify-center shrink-0 shadow-lg backdrop-blur-md">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl rounded-tl-none px-5 py-4 shadow-xl flex gap-2 backdrop-blur-md">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Deck */}
        <div className="p-5 bg-slate-900/50 backdrop-blur-xl border-t border-white/5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setMode("standard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${mode === "standard" ? "bg-indigo-600/80 border-indigo-400 text-white shadow-[0_0_10px_rgba(79,70,229,0.5)]" : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white"}`}
              >
                <Bot className="w-3 h-3" /> Standard
              </button>
              <button
                onClick={() => setMode("fast")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${mode === "fast" ? "bg-yellow-500/80 border-yellow-400 text-white shadow-[0_0_10px_rgba(234,179,8,0.5)]" : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white"}`}
              >
                <Zap className="w-3 h-3" /> Fast
              </button>
              <button
                onClick={() => setMode("thinking")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${mode === "thinking" ? "bg-purple-600/80 border-purple-400 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]" : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white"}`}
              >
                <Brain className="w-3 h-3" /> Deep Think
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleLiveSession}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${isLiveActive ? "bg-red-500/80 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse" : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white"}`}
              >
                <Radio className="w-3 h-3" /> {isLiveActive ? "Live Active" : "Start Live"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={() => handleSend(action.prompt)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 border border-white/10 hover:border-indigo-500/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 backdrop-blur-sm shadow-sm"
              >
                <action.icon className="w-3 h-3" />
                {action.label}
              </button>
            ))}
          </div>

          <div className="relative flex items-center gap-3">
            <input type="file" accept="video/*,image/*" className="hidden" ref={fileInputRef} onChange={handleVideoUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-3.5 rounded-xl transition-all shadow-lg backdrop-blur-md ${selectedVideo ? 'bg-indigo-600 text-white animate-pulse border border-indigo-400/30' : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-white/10'}`}
              title="Upload Video for Analysis"
            >
              <Video className="w-5 h-5" />
            </button>
            <button
              onClick={toggleRecording}
              className={`p-3.5 rounded-xl transition-all shadow-lg backdrop-blur-md ${isRecording ? 'bg-red-500/80 text-white animate-pulse border border-red-400/50' : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-white/10'}`}
              title="Transcribe Audio"
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={selectedVideo ? `Analyzing ${selectedVideo.file.name}...` : "Command OMEGA..."}
                className="w-full pl-5 pr-14 py-3.5 bg-slate-950/60 backdrop-blur-md border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500 shadow-inner"
              />
              <button
                onClick={() => handleSend()}
                disabled={(!input.trim() && !selectedVideo) || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all disabled:opacity-30"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
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
  );
}