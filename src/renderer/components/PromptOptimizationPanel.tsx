/**
 * Prompt Optimization Panel
 *
 * UI for analyzing and optimizing prompts with AI-powered suggestions
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sparkles, TrendingUp, AlertCircle, CheckCircle, Lightbulb, Zap,
    Target, BarChart3, ArrowRight, Copy, RefreshCw, Download
} from 'lucide-react';
import {
    promptOptimizationService,
    PromptAnalysis,
    OptimizationResult,
    OptimizationSuggestion,
} from '../services/promptOptimization';
import { toast } from 'sonner';

interface PromptOptimizationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    initialPrompt?: string;
    initialSystemPrompt?: string;
    onApplyOptimized?: (prompt: string, systemPrompt?: string) => void;
}

export const PromptOptimizationPanel: React.FC<PromptOptimizationPanelProps> = ({
    isOpen,
    onClose,
    initialPrompt = '',
    initialSystemPrompt = '',
    onApplyOptimized,
}) => {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
    const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
    const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [activeTab, setActiveTab] = useState<'analyze' | 'optimize' | 'compare'>('analyze');

    const handleAnalyze = () => {
        if (!prompt.trim()) {
            toast.error('Please enter a prompt to analyze');
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = promptOptimizationService.analyzePrompt(prompt, systemPrompt || undefined);
            setAnalysis(result);
            setActiveTab('analyze');
            toast.success('Analysis complete!');
        } catch (error) {
            console.error('Analysis error:', error);
            toast.error('Failed to analyze prompt');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleOptimize = () => {
        if (!prompt.trim()) {
            toast.error('Please enter a prompt to optimize');
            return;
        }

        setIsOptimizing(true);
        try {
            const result = promptOptimizationService.optimizePrompt(prompt, systemPrompt || undefined);
            setOptimizationResult(result);
            setActiveTab('optimize');
            toast.success('Optimization complete!');
        } catch (error) {
            console.error('Optimization error:', error);
            toast.error('Failed to optimize prompt');
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleApplyOptimized = () => {
        if (optimizationResult && onApplyOptimized) {
            onApplyOptimized(
                optimizationResult.optimized.prompt,
                optimizationResult.optimized.systemPrompt
            );
            toast.success('Optimized prompt applied!');
            onClose();
        }
    };

    const handleCopyOptimized = () => {
        if (optimizationResult) {
            const text = optimizationResult.optimized.systemPrompt
                ? `${optimizationResult.optimized.systemPrompt}\n\n${optimizationResult.optimized.prompt}`
                : optimizationResult.optimized.prompt;
            navigator.clipboard.writeText(text);
            toast.success('Optimized prompt copied to clipboard!');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-5xl h-[90vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-yellow-400" />
                            <h2 className="text-2xl font-bold text-white">Prompt Optimization</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 p-4 border-b border-slate-700 bg-slate-800/50">
                        {(['analyze', 'optimize', 'compare'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                                    activeTab === tab
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left: Input */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        System Prompt (Optional)
                                    </label>
                                    <textarea
                                        value={systemPrompt}
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                        placeholder="Enter system prompt..."
                                        rows={3}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Prompt
                                    </label>
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Enter your prompt to analyze or optimize..."
                                        rows={8}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing || !prompt.trim()}
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <BarChart3 className="w-4 h-4" />
                                                Analyze
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleOptimize}
                                        disabled={isOptimizing || !prompt.trim()}
                                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isOptimizing ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Optimizing...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-4 h-4" />
                                                Optimize
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Right: Results */}
                            <div className="space-y-6">
                                {activeTab === 'analyze' && analysis && (
                                    <AnalysisView analysis={analysis} />
                                )}
                                {activeTab === 'optimize' && optimizationResult && (
                                    <OptimizeView
                                        result={optimizationResult}
                                        onApply={handleApplyOptimized}
                                        onCopy={handleCopyOptimized}
                                    />
                                )}
                                {activeTab === 'compare' && optimizationResult && (
                                    <CompareView result={optimizationResult} />
                                )}
                                {!analysis && !optimizationResult && (
                                    <div className="text-center py-12 text-slate-400">
                                        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>Enter a prompt and click Analyze or Optimize to get started</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Analysis View
const AnalysisView: React.FC<{ analysis: PromptAnalysis }> = ({ analysis }) => {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Analysis Results</h3>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-slate-400">Overall Score</span>
                        <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all"
                                    style={{ width: `${analysis.score}%` }}
                                />
                            </div>
                            <span className="text-xl font-bold text-white">{analysis.score}/100</span>
                        </div>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">
                        Category: <span className="text-white font-medium">{analysis.category}</span>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div>
                <h4 className="text-sm font-semibold text-white mb-3">Quality Metrics</h4>
                <div className="space-y-2">
                    {Object.entries(analysis.metrics).map(([key, value]) => (
                        <MetricBar
                            key={key}
                            label={key.charAt(0).toUpperCase() + key.slice(1)}
                            value={value}
                        />
                    ))}
                </div>
            </div>

            {/* Strengths */}
            {analysis.strengths.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Strengths
                    </h4>
                    <div className="space-y-2">
                        {analysis.strengths.map((strength, i) => (
                            <div
                                key={i}
                                className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-300"
                            >
                                {strength}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Weaknesses */}
            {analysis.weaknesses.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        Weaknesses
                    </h4>
                    <div className="space-y-2">
                        {analysis.weaknesses.map((weakness, i) => (
                            <div
                                key={i}
                                className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300"
                            >
                                {weakness}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-400" />
                        Suggestions ({analysis.suggestions.length})
                    </h4>
                    <div className="space-y-3">
                        {analysis.suggestions.map((suggestion, i) => (
                            <SuggestionCard key={i} suggestion={suggestion} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Optimize View
const OptimizeView: React.FC<{
    result: OptimizationResult;
    onApply: () => void;
    onCopy: () => void;
}> = ({ result, onApply, onCopy }) => {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Optimized Prompt</h3>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-400">Score Improvement</span>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">{result.original.score}</span>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                            <span className="text-green-400 font-bold">{result.optimized.score}</span>
                            <span className="text-green-400 text-sm">
                                (+{result.optimized.score - result.original.score})
                            </span>
                        </div>
                    </div>
                    <div className="bg-slate-900 rounded p-3 mb-3">
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">
                            {result.optimized.prompt}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onCopy}
                            className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            <Copy className="w-4 h-4" />
                            Copy
                        </button>
                        <button
                            onClick={onApply}
                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Apply
                        </button>
                    </div>
                </div>
            </div>

            {/* Improvements */}
            {result.improvements.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-white mb-3">Improvements</h4>
                    <div className="space-y-2">
                        {result.improvements.map((improvement, i) => (
                            <div
                                key={i}
                                className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-300"
                            >
                                <CheckCircle className="w-4 h-4 inline mr-2" />
                                {improvement}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Compare View
const CompareView: React.FC<{ result: OptimizationResult }> = ({ result }) => {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Before vs After</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                        <h4 className="text-sm font-semibold text-slate-400 mb-2">Original</h4>
                        <div className="text-xs text-slate-500 mb-2">Score: {result.original.score}/100</div>
                        <div className="bg-slate-900 rounded p-3 text-sm text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                            {result.original.prompt}
                        </div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-4 border border-green-500/50">
                        <h4 className="text-sm font-semibold text-green-400 mb-2">Optimized</h4>
                        <div className="text-xs text-green-500 mb-2">Score: {result.optimized.score}/100</div>
                        <div className="bg-slate-900 rounded p-3 text-sm text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                            {result.optimized.prompt}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Comparison */}
            <div>
                <h4 className="text-sm font-semibold text-white mb-3">Metrics Comparison</h4>
                <div className="space-y-3">
                    {Object.keys(result.original.metrics).map((key) => {
                        const originalValue = result.original.metrics[key as keyof typeof result.original.metrics];
                        const optimizedValue = result.optimized.metrics[key as keyof typeof result.optimized.metrics];
                        const diff = optimizedValue - originalValue;
                        return (
                            <div key={key} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-300 capitalize">{key}</span>
                                    <span className={`text-sm font-bold ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                        {diff > 0 ? '+' : ''}{diff}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-slate-500"
                                            style={{ width: `${originalValue}%` }}
                                        />
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-400" />
                                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${diff > 0 ? 'bg-green-500' : diff < 0 ? 'bg-red-500' : 'bg-slate-500'}`}
                                            style={{ width: `${optimizedValue}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// Metric Bar Component
const MetricBar: React.FC<{ label: string; value: number }> = ({ label, value }) => {
    const color = value >= 70 ? 'green' : value >= 50 ? 'yellow' : 'red';
    const colorClasses = {
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        red: 'bg-red-500',
    };

    return (
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-300">{label}</span>
                <span className="text-sm font-bold text-white">{value}/100</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorClasses[color]} transition-all`}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
};

// Suggestion Card Component
const SuggestionCard: React.FC<{ suggestion: OptimizationSuggestion }> = ({ suggestion }) => {
    const priorityColors = {
        high: 'border-red-500/50 bg-red-500/10',
        medium: 'border-yellow-500/50 bg-yellow-500/10',
        low: 'border-blue-500/50 bg-blue-500/10',
    };

    return (
        <div className={`rounded-lg p-3 border ${priorityColors[suggestion.priority]}`}>
            <div className="flex items-start justify-between mb-2">
                <h5 className="text-sm font-semibold text-white">{suggestion.title}</h5>
                <span className={`text-xs px-2 py-0.5 rounded ${
                    suggestion.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                    suggestion.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-blue-500/20 text-blue-300'
                }`}>
                    {suggestion.priority}
                </span>
            </div>
            <p className="text-xs text-slate-400 mb-2">{suggestion.description}</p>
            {suggestion.currentText && (
                <div className="mb-2">
                    <span className="text-xs text-slate-500">Current: </span>
                    <code className="text-xs text-red-300 bg-slate-900 px-1 rounded">{suggestion.currentText}</code>
                </div>
            )}
            {suggestion.suggestedText && (
                <div className="mb-2">
                    <span className="text-xs text-slate-500">Suggested: </span>
                    <code className="text-xs text-green-300 bg-slate-900 px-1 rounded">{suggestion.suggestedText}</code>
                </div>
            )}
            <p className="text-xs text-slate-500 italic">{suggestion.impact}</p>
        </div>
    );
};
