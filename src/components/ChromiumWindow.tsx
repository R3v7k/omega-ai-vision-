import React, { useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Info, Maximize2, Minimize2, X } from 'lucide-react';

interface ChromiumWindowProps {
  title: string;
  children: React.ReactNode;
  infoContent: React.ReactNode;
}

export function ChromiumWindow({ title, children, infoContent }: ChromiumWindowProps) {
  const [isFloating, setIsFloating] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const dragControls = useDragControls();

  const windowContent = (
    <>
      {/* Title Bar - Glassmorphic */}
      <div 
        className="flex items-center justify-between px-4 py-2.5 bg-slate-800/50 backdrop-blur-md border-b border-white/5 cursor-move select-none"
        onPointerDown={(e) => {
          if (isFloating && !isMaximized) {
            dragControls.start(e);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-300 font-mono tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded-md transition-colors ${showInfo ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
            title="Analytics Info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          
          {isFloating && (
            <button 
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title={isMaximized ? "Restore Window" : "Maximize Window"}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          <button 
            onClick={() => {
              setIsFloating(!isFloating);
              if (isMaximized) setIsMaximized(false);
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title={isFloating ? "Dock Window" : "Float Window"}
          >
            {isFloating ? <X className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative flex-1 overflow-hidden bg-slate-900/50 flex flex-col">
        {children}

        {/* Info Overlay */}
        <AnimatePresence>
          {showInfo && (
            <motion.div 
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              className="absolute inset-0 z-50 p-6 bg-slate-900/80 text-white overflow-y-auto border-t border-white/5"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-emerald-400">
                  <Info className="w-5 h-5" />
                  Vision AI Analytics
                </h3>
                <button onClick={() => setShowInfo(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm text-slate-200 space-y-4 leading-relaxed font-sans">
                {infoContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  if (isFloating) {
    return (
      <>
        {/* Placeholder in grid when floating */}
        <div className="w-full aspect-video bg-slate-800/30 rounded-2xl border border-dashed border-slate-700/50 flex flex-col items-center justify-center text-slate-500">
          <Maximize2 className="w-6 h-6 mb-2 opacity-50" />
          <span className="font-mono text-xs tracking-widest uppercase">Window Undocked</span>
        </div>

        {/* Floating Window with Liquid Edges */}
        <motion.div
          drag={!isMaximized}
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            ...(isMaximized ? {
              width: '100vw',
              height: '100vh',
              top: 0,
              left: 0,
              x: 0,
              y: 0,
              borderRadius: 0
            } : {
              y: 0,
              borderRadius: '16px'
            })
          }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className={`fixed z-[100] flex flex-col shadow-2xl border border-white/10 overflow-hidden backdrop-blur-xl bg-slate-800/80 ${isMaximized ? '' : 'rounded-2xl'}`}
          style={!isMaximized ? { 
            width: '600px',
            top: '100px',
            left: '25vw',
            resize: 'both',
            minWidth: '320px',
            minHeight: '240px',
          } : {}}
        >
          {windowContent}
        </motion.div>
      </>
    );
  }

  return (
    <div className="flex flex-col w-full rounded-2xl border border-white/10 shadow-lg bg-slate-800/80 backdrop-blur-sm overflow-hidden transition-all duration-300">
      {windowContent}
    </div>
  );
}
