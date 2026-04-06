import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Play, AlertTriangle } from 'lucide-react';

export type MediaSource = {
  type: 'url' | 'file' | 'rtsp' | 'transcoding' | 'idle';
  url?: string;
  file?: File;
  status: 'idle' | 'loading' | 'ready' | 'error';
  message?: string;
};

interface OmniMediaIngestProps {
  onMediaReady: (url: string, type: 'video/mp4' | 'application/x-mpegURL') => void;
}

export function OmniMediaIngest({ onMediaReady }: OmniMediaIngestProps) {
  const [source, setSource] = useState<MediaSource>({ type: 'idle', status: 'idle' });
  const [inputValue, setInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) return;

    if (inputValue.startsWith('rtsp://')) {
      setSource({
        type: 'rtsp',
        status: 'error',
        message: 'RTSP streams are not currently supported in this environment.'
      });
    } else if (inputValue.endsWith('.m3u8')) {
      setSource({ type: 'url', url: inputValue, status: 'ready' });
      onMediaReady(inputValue, 'application/x-mpegURL');
    } else {
      setSource({ type: 'url', url: inputValue, status: 'ready' });
      onMediaReady(inputValue, 'video/mp4');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isH265 = file.name.endsWith('.hevc') || file.name.endsWith('.265');
    
    if (isH265) {
      setSource({
        type: 'transcoding',
        status: 'error',
        message: 'H.265/HEVC files are not currently supported.'
      });
    } else {
      const objectUrl = URL.createObjectURL(file);
      setSource({ type: 'file', file, url: objectUrl, status: 'ready' });
      onMediaReady(objectUrl, 'video/mp4');
    }
  };

  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Play className="w-4 h-4 text-emerald-400" />
        Media Ingestion Engine
      </h3>

      <div className="space-y-3">
        {/* URL Input */}
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter stream URL (MP4, M3U8, RTSP)"
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Connect Stream
          </button>
        </form>

        {/* File Upload */}
        <div className="relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".mp4,.m3u8,.264,.265,.hevc"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors bg-slate-900/20 hover:bg-slate-900/40"
          >
            <Upload className="w-5 h-5" />
            <span className="text-sm font-medium">Upload Video File (.mp4, .m3u8, .265)</span>
          </button>
        </div>
      </div>

      {/* Status Feedback */}
      {source.status === 'error' && (
        <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="text-sm text-red-300">{source.message}</div>
        </div>
      )}
    </div>
  );
}
