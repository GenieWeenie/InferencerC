import React, { useState, useRef, useEffect } from 'react';
import { Play, X, Maximize2, Minimize2, RefreshCw, ExternalLink, Copy, Check, Code2 } from 'lucide-react';

interface ArtifactPreviewProps {
    code: string;
    language: string;
    onClose?: () => void;
}

/**
 * ArtifactPreview renders HTML/CSS/JS code in a sandboxed iframe.
 * Supports full-screen mode, refresh, and opening in a new tab.
 */
const ArtifactPreview: React.FC<ArtifactPreviewProps> = ({ code, language, onClose }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Build the HTML document to render
    const buildHtmlDocument = (): string => {
        // If language is already HTML, use as-is or wrap minimally
        if (language === 'html' || language === 'htm') {
            // Check if it's a complete HTML document
            if (code.toLowerCase().includes('<!doctype') || code.toLowerCase().includes('<html')) {
                return code;
            }
            // Wrap partial HTML in a basic document
            return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 16px;
            background: #ffffff; color: #1a1a1a;
        }
    </style>
</head>
<body>
${code}
</body>
</html>`;
        }

        // If it's CSS, render in a styled demo page
        if (language === 'css') {
            return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>${code}</style>
</head>
<body>
    <div class="demo-container">
        <h1>CSS Preview</h1>
        <p>This is a demo paragraph to showcase your CSS styles.</p>
        <button>Sample Button</button>
        <div class="box">Sample Box</div>
    </div>
</body>
</html>`;
        }

        // If it's JavaScript, wrap in a basic HTML document
        if (language === 'javascript' || language === 'js') {
            return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 16px;
            background: #ffffff; color: #1a1a1a;
        }
        #output { 
            background: #f5f5f5; padding: 12px; border-radius: 8px;
            font-family: monospace; white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div id="output"></div>
    <script>
        // Redirect console.log to the output div
        const outputEl = document.getElementById('output');
        const originalLog = console.log;
        console.log = (...args) => {
            outputEl.textContent += args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : a).join(' ') + '\\n';
            originalLog(...args);
        };
        console.error = console.log;
        console.warn = console.log;
        
        try {
            ${code}
        } catch (e) {
            console.log('Error: ' + e.message);
        }
    </script>
</body>
</html>`;
        }

        // Default: treat as HTML
        return code;
    };

    const refreshPreview = () => {
        setIsLoading(true);
        if (iframeRef.current) {
            const doc = buildHtmlDocument();
            iframeRef.current.srcdoc = doc;
        }
    };

    const openInNewTab = () => {
        const doc = buildHtmlDocument();
        const blob = new Blob([doc], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        if (iframeRef.current) {
            refreshPreview();
        }
    }, [code, language]);
    
    // Ensure iframe loads content on mount
    useEffect(() => {
        if (iframeRef.current && !iframeRef.current.srcdoc) {
            refreshPreview();
        }
    }, []);

    const containerClass = isFullscreen
        ? 'fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-xl flex flex-col'
        : 'relative w-full h-[400px] flex flex-col rounded-lg overflow-hidden border border-slate-700 bg-slate-900';

    return (
        <div className={containerClass}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 select-none">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Code2 size={16} className="text-primary" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            Live Preview
                        </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">
                        {language.toUpperCase()}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={refreshPreview}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={copyCode}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        title="Copy Code"
                    >
                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    <button
                        onClick={openInNewTab}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        title="Open in New Tab"
                    >
                        <ExternalLink size={14} />
                    </button>
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors ml-1"
                            title="Close Preview"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Iframe Container */}
            <div className="flex-1 relative bg-white">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10">
                        <div className="flex items-center gap-2 text-slate-300">
                            <RefreshCw size={16} className="animate-spin" />
                            <span className="text-sm">Loading preview...</span>
                        </div>
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-modals allow-same-origin"
                    title="Artifact Preview"
                    onLoad={() => {
                        setIsLoading(false);
                        // Ensure content is loaded
                        if (iframeRef.current && !iframeRef.current.srcdoc) {
                            refreshPreview();
                        }
                    }}
                />
            </div>
        </div>
    );
};

/**
 * Floating button to trigger the preview
 */
export const ArtifactPreviewButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors py-1 px-2 rounded hover:bg-slate-700 border border-emerald-500/30 hover:border-emerald-500/50"
    >
        <Play size={12} fill="currentColor" />
        RUN PREVIEW
    </button>
);

export default ArtifactPreview;
