import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Download, Settings, ShieldAlert, BarChart2, AlertTriangle, Clock, Loader2, Video } from "lucide-react";
import { useVision } from "../context/VisionContext";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const QUICK_ACTIONS = [
  { label: "Create Risk Assessment", icon: ShieldAlert, prompt: "Create a comprehensive risk assessment based on recent parking lot activity." },
  { label: "Summarize Traffic", icon: BarChart2, prompt: "Summarize traffic patterns over the last 6 months." },
  { label: "Analyze Anomalies", icon: AlertTriangle, prompt: "Analyze recent anomalies and suspicious events." },
  { label: "Query Recent Events", icon: Clock, prompt: "Query the most recent gate events." }
];

export function AIAssistant() {
  const { telemetryLogs } = useVision();
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    {
      role: "ai",
      text: "Hello. I am the Gemini Pro intelligence agent for this facility. You can ask me to query recent events, analyze anomalies, summarize traffic patterns, or create risk assessments. How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const [selectedVideo, setSelectedVideo] = useState<{ file: File, base64: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const newMessages = [...messages, { role: "user" as const, text: textToSend + (selectedVideo ? `\n[Attached Video: ${selectedVideo.file.name}]` : "") }];
    setMessages(newMessages);
    if (!overrideInput) setInput("");
    setLoading(true);

    try {
      // @ts-ignore
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
      
      // @ts-ignore
      const apiKey = process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      const lowerInput = textToSend.toLowerCase();
      let model = "gemini-3-flash-preview";
      let config: any = {
        systemInstruction: "You are OMEGA V10X2, an advanced AI intelligence agent for a facility parking lot. You analyze telemetry logs, detect anomalies, create risk assessments, and summarize traffic. Be concise, professional, and analytical.",
      };

      // Determine model and config based on request complexity
      if (selectedVideo || lowerInput.includes("risk assessment") || lowerInput.includes("anomaly") || lowerInput.includes("complex") || lowerInput.includes("analyze") || lowerInput.includes("video")) {
        model = "gemini-3.1-pro-preview";
        if (!selectedVideo) {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
        }
      } else if (lowerInput.includes("search") || lowerInput.includes("current") || lowerInput.includes("today") || lowerInput.includes("news")) {
        model = "gemini-3-flash-preview";
        config.tools = [{ googleSearch: {} }];
      } else if (lowerInput.includes("fast") || lowerInput.includes("quick") || lowerInput.includes("hello") || lowerInput.includes("hi")) {
        model = "gemini-3.1-flash-lite-preview";
      }

      // Prepare context from telemetry logs
      const totalEvents = telemetryLogs.length;
      const entries = telemetryLogs.filter(e => e.sourceFeed.includes("Entry")).length;
      const exits = telemetryLogs.filter(e => e.sourceFeed.includes("Exit")).length;
      const unreadableCount = telemetryLogs.filter(e => e.detections.some(d => d.conf < 50)).length;
      const recentLogs = telemetryLogs.slice(0, 5).map(l => `${l.timestamp} [${l.sourceFeed}]: ${l.detections.map(d => `${d.class} (${d.conf}%)`).join(', ')}`).join('\n');

      const contextPrompt = `
Current Telemetry Data Context:
- Total Events: ${totalEvents}
- Entries: ${entries}
- Exits: ${exits}
- Low Confidence Detections: ${unreadableCount}
- Recent Logs:
${recentLogs}

Please answer the user's request based on this context if relevant.
`;

      const history = newMessages.map(msg => ({
        role: msg.role === "ai" ? "model" : "user",
        parts: [{ text: msg.text }] as any[]
      }));

      // Inject context into the last user message
      history[history.length - 1].parts[0].text = `${contextPrompt}\n\nUser Request: ${textToSend}`;

      if (selectedVideo) {
        const base64Data = selectedVideo.base64.split(',')[1];
        history[history.length - 1].parts.push({
          inlineData: {
            data: base64Data,
            mimeType: selectedVideo.file.type
          }
        });
        setSelectedVideo(null);
      }

      const response = await ai.models.generateContent({
        model,
        contents: history,
        config
      });

      let responseText = response.text || "I'm sorry, I couldn't generate a response.";
      
      // Append grounding URLs if available
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        responseText += "\n\n**Sources:**\n";
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri && chunk.web?.title) {
            responseText += `- [${chunk.web.title}](${chunk.web.uri})\n`;
          }
        });
      }

      setMessages((prev) => [...prev, { role: "ai", text: responseText }]);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      if (error.message?.includes("Requested entity was not found")) {
        // @ts-ignore
        if (window.aistudio) await window.aistudio.openSelectKey();
      }
      setMessages((prev) => [...prev, { role: "ai", text: "I encountered an error while processing your request. Please check your API key and try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessageText = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (!line) return <br key={i} />;
      
      // Simple bold parsing for **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="mb-1.5 last:mb-0 leading-relaxed">
          {parts.map((part, j) => 
            part.startsWith('**') && part.endsWith('**') 
              ? <strong key={j} className="font-semibold text-inherit">{part.slice(2, -2)}</strong> 
              : part
          )}
        </p>
      );
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-3 shrink-0">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Multimodal Intelligence</h2>
          <p className="text-sm text-gray-500">Powered by Gemini 3.1 Pro</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
              msg.role === "user" ? "bg-white border border-gray-200" : "bg-blue-600 text-white"
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4 text-gray-600" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm shadow-sm ${
              msg.role === "user" 
                ? "bg-blue-600 text-white rounded-tr-none" 
                : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"
            }`}>
              {renderMessageText(msg.text)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex gap-1.5 items-center h-[44px]">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75" />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200 shrink-0">
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.label}
              onClick={() => handleSend(action.prompt)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-600 hover:text-blue-700 rounded-full text-xs font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          ))}
        </div>

        <div className="relative flex items-center mb-4 gap-2">
          <input
            type="file"
            accept="video/*,image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleVideoUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-3 rounded-xl transition-colors shrink-0 ${selectedVideo ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            title="Upload Video or Image for Analysis"
          >
            <Video className="w-5 h-5" />
          </button>
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={selectedVideo ? `Ask about ${selectedVideo.file.name}...` : "Ask Gemini to analyze traffic, find specific vehicles, or detect anomalies..."}
              className="w-full pl-4 pr-12 py-3.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors shadow-inner"
            />
            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && !selectedVideo) || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 max-w-lg leading-relaxed">
            This AI-powered intelligence module analyzes vehicle traffic patterns, detects anomalies, and generates comprehensive operational reports.
          </p>
        </div>
      </div>
    </div>
  );
}
