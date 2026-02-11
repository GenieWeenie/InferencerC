import React from 'react';
import type { ChatMessage } from '../../../shared/types';
import type { ContextUsage } from '../../services/contextManagement';
import { ConversationSummaryPanel } from './chatLazyPanels';

interface ChatSummaryPanelProps {
    history: ChatMessage[];
    sessionId: string;
    modelId: string;
}

export const ChatSummaryPanel: React.FC<ChatSummaryPanelProps> = React.memo(({
    history,
    sessionId,
    modelId,
}) => {
    if (history.length < 5) {
        return null;
    }

    return (
        <div className="px-6 py-2">
            <React.Suspense fallback={<div className="text-xs text-slate-500">Loading summary...</div>}>
                <ConversationSummaryPanel
                    sessionId={sessionId}
                    messages={history}
                    modelId={modelId}
                />
            </React.Suspense>
        </div>
    );
}, (prev, next) => (
    prev.history === next.history &&
    prev.sessionId === next.sessionId &&
    prev.modelId === next.modelId
));

interface ChatContextWindowPanelProps {
    hasHistory: boolean;
    contextUsage: ContextUsage;
}

export const ChatContextWindowPanel: React.FC<ChatContextWindowPanelProps> = React.memo(({
    hasHistory,
    contextUsage,
}) => {
    if (!hasHistory) {
        return null;
    }

    const usagePercent = Math.min(100, Math.round(contextUsage.fillRatio * 100));
    const usageFillWidth = Math.min(100, contextUsage.fillRatio * 100);

    return (
        <div className="px-6 pb-2">
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="text-slate-400 uppercase tracking-wider font-semibold">Context Window</span>
                    <span className={`${contextUsage.warning ? 'text-amber-300' : 'text-slate-500'}`}>
                        {usagePercent}% • {contextUsage.totalTokens.toLocaleString()} / {contextUsage.maxContextTokens.toLocaleString()} tokens
                    </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${contextUsage.fillRatio >= 0.9 ? 'bg-red-500' : contextUsage.fillRatio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${usageFillWidth}%` }}
                    />
                </div>
                {contextUsage.warning && (
                    <div className="mt-2 text-[11px] text-amber-300">
                        Context is above 80%. Open Controls and use Context Optimizer to trim or auto-summarize.
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => (
    prev.hasHistory === next.hasHistory &&
    prev.contextUsage === next.contextUsage
));
