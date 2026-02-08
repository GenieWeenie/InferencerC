import React from 'react';
import { Minus, Square, X } from 'lucide-react';

// Note: Window.electronAPI is declared in services/mcp.ts

const TitleBar: React.FC = () => {
    // Only render if running in Electron (check for API)
    if (!window.electronAPI) return null;

    return (
        <div className="h-[30px] bg-slate-950 flex justify-between items-center select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
            {/* Draggable Area Title */}
            <div className="flex-1 px-4 text-xs font-bold text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary/50"></span>
                WinInferencer
            </div>

            {/* Window Controls (No Drag) */}
            <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <button
                    onClick={() => window.electronAPI?.minimize()}
                    className="h-full px-3 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={() => window.electronAPI?.maximize()}
                    className="h-full px-3 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                >
                    <Square size={12} />
                </button>
                <button
                    onClick={() => window.electronAPI?.close()}
                    className="h-full px-3 hover:bg-red-600 text-slate-400 hover:text-white transition-colors flex items-center justify-center group"
                >
                    <X size={14} className="group-hover:text-white" />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
