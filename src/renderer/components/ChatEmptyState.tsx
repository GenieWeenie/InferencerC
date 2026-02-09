import React from 'react';
import { Activity, AlertCircle, Brain, Check, Clock, Globe, Plus, Shield } from 'lucide-react';

export interface LaunchReadinessStep {
    id: string;
    title: string;
    description: string;
    complete: boolean;
}

interface ChatEmptyStateProps {
    showBottomControls: boolean;
    isReady: boolean;
    showLaunchChecklist: boolean;
    readinessCompletedCount: number;
    readinessSteps: LaunchReadinessStep[];
    onSelectPrompt: (prompt: string) => void;
}

const STARTER_SUGGESTIONS = [
    {
        icon: Plus,
        text: 'Write a React component',
        prompt: 'Write a clean, responsive React component for a Pricing Table using Tailwind CSS.',
    },
    {
        icon: Clock,
        text: 'Analyze code performance',
        prompt: 'Explain the time and space complexity of this recursive Fibonacci function and suggest an optimized iterative approach.',
    },
    {
        icon: Brain,
        text: 'Reason about logic',
        prompt: 'If all men are mortal, and Socrates is a man, walk me through the first principles of why Socrates is mortal.',
    },
    {
        icon: Globe,
        text: 'Summarize a concept',
        prompt: "Explain Quantum Entanglement like I'm five years old, using simple analogies.",
    },
];

const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
    showBottomControls,
    isReady,
    showLaunchChecklist,
    readinessCompletedCount,
    readinessSteps,
    onSelectPrompt,
}) => {
    return (
        <div className={`flex flex-col items-center justify-start h-full max-w-2xl mx-auto px-8 pt-16 text-center space-y-8 animate-in fade-in duration-700 ${showBottomControls ? 'pb-72 md:pb-80' : 'pb-48 md:pb-56'}`}>
            <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-blue-500/10 flex items-center justify-center shadow-inner">
                    <Brain size={48} className="text-primary animate-pulse" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-xl">
                    <Activity size={20} className="text-emerald-500" />
                </div>
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-heading font-bold text-white tracking-tight">How can I help you today?</h2>
                <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                    {isReady
                        ? 'InferencerC 3.1 is ready. Send your first prompt.'
                        : 'InferencerC 3.1 is focused on speed-to-success. Finish the quick launch checklist, then send.'}
                </p>
            </div>

            {showLaunchChecklist && (
                <div className="w-full max-w-xl text-left bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield size={14} className="text-cyan-400" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Launch Checklist</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                            {readinessCompletedCount}/{readinessSteps.length} ready
                        </span>
                    </div>
                    <div className="space-y-2">
                        {readinessSteps.map((step) => (
                            <div key={step.id} className={`rounded-lg border px-3 py-2 ${step.complete ? 'border-emerald-800/60 bg-emerald-900/20' : 'border-slate-800 bg-slate-950/40'}`}>
                                <div className="flex items-start gap-2">
                                    {step.complete ? (
                                        <Check size={14} className="text-emerald-400 mt-0.5" />
                                    ) : (
                                        <AlertCircle size={14} className="text-amber-400 mt-0.5" />
                                    )}
                                    <div>
                                        <p className="text-xs font-semibold text-slate-200">{step.title}</p>
                                        <p className="text-[11px] text-slate-400">{step.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                {STARTER_SUGGESTIONS.map((suggestion) => (
                    <button
                        key={suggestion.text}
                        onClick={() => onSelectPrompt(suggestion.prompt)}
                        className="flex flex-col items-start gap-2 p-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                    >
                        <div className="text-primary group-hover:scale-110 transition-transform">
                            <suggestion.icon size={14} />
                        </div>
                        <span className="text-xs font-semibold text-slate-300 group-hover:text-white">{suggestion.text}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ChatEmptyState;
