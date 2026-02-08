import React, { useMemo } from 'react';
import { X, TrendingUp, MessageSquare, Zap, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface UsageStats {
    date: string;
    tokenCount: number;
    messageCount: number;
    modelId: string;
    sessionId: string;
}

interface AnalyticsDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    usageHistory: UsageStats[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ isOpen, onClose, usageHistory }) => {
    // Calculate total stats
    const totalStats = useMemo(() => {
        const total = usageHistory.reduce(
            (acc, stat) => ({
                tokens: acc.tokens + stat.tokenCount,
                messages: acc.messages + stat.messageCount,
            }),
            { tokens: 0, messages: 0 }
        );

        return {
            totalTokens: total.tokens,
            totalMessages: total.messages,
            totalSessions: new Set(usageHistory.map(s => s.sessionId)).size,
            avgTokensPerMessage: total.messages > 0 ? Math.round(total.tokens / total.messages) : 0,
        };
    }, [usageHistory]);

    // Model usage breakdown
    const modelBreakdown = useMemo(() => {
        const breakdown: Record<string, { tokens: number; messages: number; percentage: number }> = {};

        usageHistory.forEach(stat => {
            if (!breakdown[stat.modelId]) {
                breakdown[stat.modelId] = { tokens: 0, messages: 0, percentage: 0 };
            }
            breakdown[stat.modelId].tokens += stat.tokenCount;
            breakdown[stat.modelId].messages += stat.messageCount;
        });

        // Calculate percentages
        Object.keys(breakdown).forEach(model => {
            breakdown[model].percentage = (breakdown[model].tokens / totalStats.totalTokens) * 100;
        });

        return Object.entries(breakdown)
            .sort((a, b) => b[1].tokens - a[1].tokens)
            .slice(0, 5); // Top 5 models
    }, [usageHistory, totalStats.totalTokens]);

    // Usage over time (last 7 days)
    const usageOverTime = useMemo(() => {
        const last7Days: Record<string, { tokens: number; messages: number }> = {};
        const today = new Date();

        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last7Days[dateStr] = { tokens: 0, messages: 0 };
        }

        // Aggregate usage
        usageHistory.forEach(stat => {
            if (last7Days[stat.date]) {
                last7Days[stat.date].tokens += stat.tokenCount;
                last7Days[stat.date].messages += stat.messageCount;
            }
        });

        return Object.entries(last7Days).map(([date, data]) => ({
            date,
            ...data,
        }));
    }, [usageHistory]);

    // Estimated cost (rough estimate: $0.002 per 1K tokens for GPT-3.5 class models)
    const estimatedCost = useMemo(() => {
        const costPer1KTokens = 0.002;
        return ((totalStats.totalTokens / 1000) * costPer1KTokens).toFixed(2);
    }, [totalStats.totalTokens]);

    const maxTokensInWeek = Math.max(...usageOverTime.map(d => d.tokens), 1);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                    />

                    {/* Dashboard Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 m-auto w-full max-w-5xl h-fit max-h-[90vh] bg-slate-900 shadow-2xl border border-slate-700 z-50 flex flex-col rounded-xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <TrendingUp size={24} className="text-primary" />
                                <h2 className="text-xl font-bold text-white">Analytics Dashboard</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            {usageHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
                                    <TrendingUp size={64} className="mb-4 opacity-20" />
                                    <p className="text-lg font-medium">No usage data yet</p>
                                    <p className="text-sm mt-1">Start chatting to see your analytics</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-blue-400 mb-2">
                                                <Zap size={16} />
                                                <span className="text-xs font-bold uppercase">Total Tokens</span>
                                            </div>
                                            <div className="text-2xl font-bold text-white">{totalStats.totalTokens.toLocaleString()}</div>
                                        </div>

                                        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-green-400 mb-2">
                                                <MessageSquare size={16} />
                                                <span className="text-xs font-bold uppercase">Messages</span>
                                            </div>
                                            <div className="text-2xl font-bold text-white">{totalStats.totalMessages.toLocaleString()}</div>
                                        </div>

                                        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-purple-400 mb-2">
                                                <MessageSquare size={16} />
                                                <span className="text-xs font-bold uppercase">Avg Tokens/Msg</span>
                                            </div>
                                            <div className="text-2xl font-bold text-white">{totalStats.avgTokensPerMessage.toLocaleString()}</div>
                                        </div>

                                        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-orange-400 mb-2">
                                                <DollarSign size={16} />
                                                <span className="text-xs font-bold uppercase">Est. Cost</span>
                                            </div>
                                            <div className="text-2xl font-bold text-white">${estimatedCost}</div>
                                            <div className="text-xs text-slate-500 mt-1">Based on GPT-3.5 pricing</div>
                                        </div>
                                    </div>

                                    {/* Usage Over Time Chart */}
                                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
                                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                            <TrendingUp size={20} className="text-primary" />
                                            Token Usage (Last 7 Days)
                                        </h3>
                                        <div className="space-y-3">
                                            {usageOverTime.map((day) => {
                                                const barWidth = (day.tokens / maxTokensInWeek) * 100;
                                                const dateObj = new Date(day.date);
                                                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                                                return (
                                                    <div key={day.date} className="flex items-center gap-3">
                                                        <div className="w-20 text-xs text-slate-400 text-right font-mono">
                                                            <div className="font-bold text-slate-300">{dayName}</div>
                                                            <div>{dateStr}</div>
                                                        </div>
                                                        <div className="flex-1 h-10 bg-slate-900/50 rounded-lg overflow-hidden relative">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${barWidth}%` }}
                                                                transition={{ duration: 0.5, delay: 0.1 }}
                                                                className="h-full bg-gradient-to-r from-primary to-blue-500 relative"
                                                            >
                                                                {day.tokens > 0 && (
                                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white">
                                                                        {day.tokens.toLocaleString()}
                                                                    </span>
                                                                )}
                                                            </motion.div>
                                                            {day.tokens === 0 && (
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                                                                    No activity
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="w-16 text-xs text-slate-500 font-mono">
                                                            {day.messages} msgs
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Model Breakdown */}
                                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
                                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                            <Zap size={20} className="text-primary" />
                                            Top Models by Usage
                                        </h3>
                                        <div className="space-y-3">
                                            {modelBreakdown.map(([model, data], index) => (
                                                <div key={model} className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary">
                                                        #{index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-sm font-medium text-white truncate">{model}</span>
                                                            <span className="text-xs text-slate-400 ml-2">{data.percentage.toFixed(1)}%</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${data.percentage}%` }}
                                                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                                                className="h-full bg-gradient-to-r from-primary to-blue-500"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                                            <span>{data.tokens.toLocaleString()} tokens</span>
                                                            <span>{data.messages} messages</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AnalyticsDashboard;
