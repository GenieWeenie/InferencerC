import React, { useMemo } from 'react';
import { ChatMessage } from '../../shared/types';
import MessageContent from './MessageContent';
import { Copy, Download, Maximize2, Minimize2, X, GitCompare } from 'lucide-react';
import { toast } from 'sonner';

interface ComparisonGridProps {
    messageA: ChatMessage;
    messageB: ChatMessage;
    modelAName: string;
    modelBName: string;
    onClose?: () => void;
    mcpAvailable?: boolean;
    onInsertToFile?: (code: string, language: string) => void;
    sessionId?: string;
}

/**
 * ComparisonGrid displays two Battle Mode responses side-by-side with diff highlighting
 */
const ComparisonGrid: React.FC<ComparisonGridProps> = ({
    messageA,
    messageB,
    modelAName,
    modelBName,
    onClose,
    mcpAvailable,
    onInsertToFile,
    sessionId
}) => {
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [showDiff, setShowDiff] = React.useState(false);

    // Extract clean content (remove "Model A:" prefix if present)
    const contentA = useMemo(() => {
        let content = messageA.content || '';
        // Remove "Model A: {name}" prefix if present
        if (content.startsWith('**Model A:')) {
            const lines = content.split('\n');
            if (lines[0].includes('Model A:')) {
                content = lines.slice(1).join('\n').trim();
            }
        }
        return content;
    }, [messageA.content]);

    const contentB = useMemo(() => {
        let content = messageB.content || '';
        // Remove "Model B: {name}" prefix if present
        if (content.startsWith('**Model B:')) {
            const lines = content.split('\n');
            if (lines[0].includes('Model B:')) {
                content = lines.slice(1).join('\n').trim();
            }
        }
        return content;
    }, [messageB.content]);

    // Simple word-level diff (for highlighting differences)
    const diffLines = useMemo(() => {
        if (!showDiff) return null;

        const linesA = contentA.split('\n');
        const linesB = contentB.split('\n');
        const maxLines = Math.max(linesA.length, linesB.length);
        const diff: Array<{ lineA: string; lineB: string; type: 'same' | 'diff' | 'onlyA' | 'onlyB' }> = [];

        for (let i = 0; i < maxLines; i++) {
            const lineA = linesA[i] || '';
            const lineB = linesB[i] || '';

            if (lineA === lineB) {
                diff.push({ lineA, lineB, type: 'same' });
            } else if (lineA && lineB) {
                diff.push({ lineA, lineB, type: 'diff' });
            } else if (lineA) {
                diff.push({ lineA, lineB: '', type: 'onlyA' });
            } else {
                diff.push({ lineA: '', lineB, type: 'onlyB' });
            }
        }

        return diff;
    }, [contentA, contentB, showDiff]);

    const handleExportComparison = () => {
        const comparison = `# Model Comparison

## ${modelAName}
${contentA}

---

## ${modelBName}
${contentB}

---

## Generation Times
- ${modelAName}: ${messageA.generationTime ? (messageA.generationTime / 1000).toFixed(2) + 's' : 'N/A'}
- ${modelBName}: ${messageB.generationTime ? (messageB.generationTime / 1000).toFixed(2) + 's' : 'N/A'}
`;

        const blob = new Blob([comparison], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `comparison-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Comparison exported');
    };

    const containerClass = isFullscreen
        ? 'fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-xl flex flex-col'
        : 'relative w-full flex flex-col rounded-lg overflow-hidden border border-slate-700 bg-slate-900';

    return (
        <div className={containerClass}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 select-none">
                <div className="flex items-center gap-3">
                    <GitCompare size={16} className="text-primary" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Comparison View
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                            {modelAName}
                        </span>
                        <span className="text-slate-500">VS</span>
                        <span className="text-[10px] font-mono text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded">
                            {modelBName}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowDiff(!showDiff)}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                            showDiff
                                ? 'bg-primary text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Toggle diff view"
                    >
                        Diff
                    </button>
                    <button
                        onClick={handleExportComparison}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        title="Export Comparison"
                    >
                        <Download size={14} />
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
                            title="Close Comparison"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Comparison Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Model A Column */}
                <div className="flex-1 flex flex-col border-r border-slate-700 overflow-hidden">
                    <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-sm font-bold text-blue-400">{modelAName}</span>
                            </div>
                            {messageA.generationTime && (
                                <span className="text-xs text-slate-400 font-mono">
                                    {(messageA.generationTime / 1000).toFixed(2)}s
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {showDiff && diffLines ? (
                            <div className="space-y-1 font-mono text-xs">
                                {diffLines.map((diff, i) => (
                                    <div key={i} className={`p-2 rounded ${
                                        diff.type === 'same' ? 'bg-slate-800/30' :
                                        diff.type === 'diff' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                                        'bg-blue-500/10 border border-blue-500/30'
                                    }`}>
                                        <div className="text-slate-300 whitespace-pre-wrap">{diff.lineA || '\u00A0'}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <MessageContent
                                content={contentA}
                                isUser={false}
                                mcpAvailable={mcpAvailable}
                                onInsertToFile={onInsertToFile}
                                sessionId={sessionId}
                            />
                        )}
                    </div>
                </div>

                {/* Model B Column */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 py-2 bg-orange-500/10 border-b border-orange-500/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                <span className="text-sm font-bold text-orange-400">{modelBName}</span>
                            </div>
                            {messageB.generationTime && (
                                <span className="text-xs text-slate-400 font-mono">
                                    {(messageB.generationTime / 1000).toFixed(2)}s
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {showDiff && diffLines ? (
                            <div className="space-y-1 font-mono text-xs">
                                {diffLines.map((diff, i) => (
                                    <div key={i} className={`p-2 rounded ${
                                        diff.type === 'same' ? 'bg-slate-800/30' :
                                        diff.type === 'diff' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                                        'bg-orange-500/10 border border-orange-500/30'
                                    }`}>
                                        <div className="text-slate-300 whitespace-pre-wrap">{diff.lineB || '\u00A0'}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <MessageContent
                                content={contentB}
                                isUser={false}
                                mcpAvailable={mcpAvailable}
                                onInsertToFile={onInsertToFile}
                                sessionId={sessionId}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComparisonGrid;
