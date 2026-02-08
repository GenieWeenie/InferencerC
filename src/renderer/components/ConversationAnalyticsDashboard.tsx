/**
 * Conversation Analytics Dashboard
 *
 * Comprehensive analytics dashboard showing:
 * - Overview metrics
 * - Model performance comparison
 * - Pattern analysis
 * - Trends over time
 * - Individual conversation insights
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, BarChart3, TrendingUp, Clock, MessageSquare, Zap, Target, Activity,
    Calendar, Users, Award, ArrowUp, ArrowDown, Minus, Filter, Download
} from 'lucide-react';
import {
    conversationAnalyticsService,
    ConversationMetrics,
    ModelPerformance,
    PatternAnalysis,
    TrendData,
} from '../services/conversationAnalytics';
import { HistoryService } from '../services/history';

interface ConversationAnalyticsDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

type ViewMode = 'overview' | 'models' | 'patterns' | 'trends' | 'conversations';

export const ConversationAnalyticsDashboard: React.FC<ConversationAnalyticsDashboardProps> = ({
    isOpen,
    onClose,
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('overview');
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<ConversationMetrics[]>([]);
    const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
    const [patternAnalysis, setPatternAnalysis] = useState<PatternAnalysis | null>(null);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    const [daysFilter, setDaysFilter] = useState<number>(30);

    useEffect(() => {
        if (isOpen) {
            loadAnalytics();
        }
    }, [isOpen, daysFilter]);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const [allMetrics, modelPerf, patterns, trendData] = await Promise.all([
                conversationAnalyticsService.analyzeAllConversations(),
                conversationAnalyticsService.getModelPerformance(),
                conversationAnalyticsService.getPatternAnalysis(),
                conversationAnalyticsService.getTrends(daysFilter),
            ]);

            setMetrics(allMetrics);
            setModelPerformance(modelPerf);
            setPatternAnalysis(patterns);
            setTrends(trendData);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate overview stats
    const overviewStats = useMemo(() => {
        if (metrics.length === 0) {
            return {
                totalConversations: 0,
                totalMessages: 0,
                totalTokens: 0,
                avgEngagement: 0,
                avgResponseTime: 0,
                topModel: '',
            };
        }

        const totalMessages = metrics.reduce((sum, m) => sum + m.messageCount, 0);
        const totalTokens = metrics.reduce((sum, m) => sum + m.totalTokens, 0);
        const avgEngagement = metrics.reduce((sum, m) => sum + m.effectiveness.engagementScore, 0) / metrics.length;
        const avgResponseTime = metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length;

        // Find top model
        const modelCounts: Record<string, number> = {};
        metrics.forEach(m => {
            modelCounts[m.modelId] = (modelCounts[m.modelId] || 0) + 1;
        });
        const topModel = Object.entries(modelCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

        return {
            totalConversations: metrics.length,
            totalMessages,
            totalTokens,
            avgEngagement: Math.round(avgEngagement * 100) / 100,
            avgResponseTime: Math.round(avgResponseTime),
            topModel,
        };
    }, [metrics]);

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
                    className="relative w-full max-w-6xl h-[90vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-6 h-6 text-blue-400" />
                            <h2 className="text-2xl font-bold text-white">Conversation Analytics</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={daysFilter}
                                onChange={(e) => setDaysFilter(Number(e.target.value))}
                                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white"
                            >
                                <option value={7}>Last 7 days</option>
                                <option value={30}>Last 30 days</option>
                                <option value={90}>Last 90 days</option>
                                <option value={365}>Last year</option>
                            </select>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-800 rounded transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-1 p-4 border-b border-slate-700 bg-slate-800/50">
                        {(['overview', 'models', 'patterns', 'trends', 'conversations'] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                                    viewMode === mode
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <Activity className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
                                    <p className="text-slate-400">Loading analytics...</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {viewMode === 'overview' && <OverviewView stats={overviewStats} />}
                                {viewMode === 'models' && <ModelsView performance={modelPerformance} />}
                                {viewMode === 'patterns' && <PatternsView patterns={patternAnalysis} />}
                                {viewMode === 'trends' && <TrendsView trends={trends} />}
                                {viewMode === 'conversations' && (
                                    <ConversationsView
                                        metrics={metrics}
                                        selected={selectedConversation}
                                        onSelect={setSelectedConversation}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Overview View
const OverviewView: React.FC<{ stats: any }> = ({ stats }) => {
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    icon={<MessageSquare className="w-5 h-5" />}
                    label="Total Conversations"
                    value={stats.totalConversations.toLocaleString()}
                    color="blue"
                />
                <StatCard
                    icon={<Activity className="w-5 h-5" />}
                    label="Total Messages"
                    value={stats.totalMessages.toLocaleString()}
                    color="green"
                />
                <StatCard
                    icon={<Zap className="w-5 h-5" />}
                    label="Total Tokens"
                    value={stats.totalTokens.toLocaleString()}
                    color="purple"
                />
                <StatCard
                    icon={<Target className="w-5 h-5" />}
                    label="Avg Engagement"
                    value={`${(stats.avgEngagement * 100).toFixed(1)}%`}
                    color="orange"
                />
                <StatCard
                    icon={<Clock className="w-5 h-5" />}
                    label="Avg Response Time"
                    value={`${stats.avgResponseTime}ms`}
                    color="red"
                />
                <StatCard
                    icon={<Award className="w-5 h-5" />}
                    label="Top Model"
                    value={stats.topModel || 'N/A'}
                    color="yellow"
                />
            </div>
        </div>
    );
};

// Models View
const ModelsView: React.FC<{ performance: ModelPerformance[] }> = ({ performance }) => {
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Model Performance</h3>
            <div className="space-y-4">
                {performance.map((model) => (
                    <div
                        key={model.modelId}
                        className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-white">{model.modelId}</h4>
                            <span className="text-sm text-slate-400">
                                {model.totalConversations} conversations
                            </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-slate-400">Avg Response Time</p>
                                <p className="text-white font-medium">{Math.round(model.avgResponseTime)}ms</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Avg Tokens/Message</p>
                                <p className="text-white font-medium">{Math.round(model.avgTokensPerMessage)}</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Engagement Score</p>
                                <p className="text-white font-medium">
                                    {(model.avgEngagementScore * 100).toFixed(1)}%
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400">Completion Rate</p>
                                <p className="text-white font-medium">
                                    {(model.avgCompletionRate * 100).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Patterns View
const PatternsView: React.FC<{ patterns: PatternAnalysis | null }> = ({ patterns }) => {
    if (!patterns) return null;

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Usage Patterns</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="font-semibold text-white mb-3">Peak Hours</h4>
                    <div className="space-y-2">
                        {patterns.peakHours.map((hour) => (
                            <div key={hour} className="flex items-center justify-between">
                                <span className="text-slate-400">{hour}:00</span>
                                <div className="flex-1 mx-4 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500"
                                        style={{ width: '60%' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="font-semibold text-white mb-3">Peak Days</h4>
                    <div className="space-y-2">
                        {patterns.peakDays.map((day) => (
                            <div key={day} className="text-slate-300">{day}</div>
                        ))}
                    </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="font-semibold text-white mb-3">Common Topics</h4>
                    <div className="space-y-2">
                        {patterns.commonTopics.slice(0, 5).map((topic) => (
                            <div key={topic.topic} className="flex items-center justify-between">
                                <span className="text-slate-300">{topic.topic}</span>
                                <span className="text-slate-400 text-sm">{topic.frequency}x</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="font-semibold text-white mb-3">Conversation Lengths</h4>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-300">Short (&lt; 10)</span>
                            <span className="text-slate-400">{patterns.conversationLengths.short}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-300">Medium (10-50)</span>
                            <span className="text-slate-400">{patterns.conversationLengths.medium}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-300">Long (&gt; 50)</span>
                            <span className="text-slate-400">{patterns.conversationLengths.long}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Trends View
const TrendsView: React.FC<{ trends: TrendData[] }> = ({ trends }) => {
    const maxConversations = Math.max(...trends.map(t => t.conversations), 1);
    const maxMessages = Math.max(...trends.map(t => t.messages), 1);

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Trends Over Time</h3>
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="space-y-4">
                    {trends.slice(-14).map((trend) => (
                        <div key={trend.date} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-300">{trend.date}</span>
                                <span className="text-slate-400">{trend.conversations} conv, {trend.messages} msgs</span>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500"
                                        style={{ width: `${(trend.conversations / maxConversations) * 100}%` }}
                                    />
                                </div>
                                <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500"
                                        style={{ width: `${(trend.messages / maxMessages) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Conversations View
const ConversationsView: React.FC<{
    metrics: ConversationMetrics[];
    selected: string | null;
    onSelect: (id: string | null) => void;
}> = ({ metrics, selected, onSelect }) => {
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Conversations</h3>
            <div className="space-y-2">
                {metrics.map((metric) => (
                    <div
                        key={metric.sessionId}
                        onClick={() => onSelect(selected === metric.sessionId ? null : metric.sessionId)}
                        className={`bg-slate-800 rounded-lg p-4 border cursor-pointer transition-colors ${
                            selected === metric.sessionId ? 'border-blue-500' : 'border-slate-700 hover:border-slate-600'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-white">{metric.title}</h4>
                            <span className="text-sm text-slate-400">{metric.modelId}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-slate-400">Messages</p>
                                <p className="text-white">{metric.messageCount}</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Engagement</p>
                                <p className="text-white">{(metric.effectiveness.engagementScore * 100).toFixed(1)}%</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Response Time</p>
                                <p className="text-white">{Math.round(metric.avgResponseTime)}ms</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Topics</p>
                                <p className="text-white">{metric.topics.length}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}> = ({ icon, label, value, color }) => {
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        green: 'bg-green-500/10 text-green-400 border-green-500/20',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        red: 'bg-red-500/10 text-red-400 border-red-500/20',
        yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    };

    return (
        <div className={`bg-slate-800 rounded-lg p-4 border ${colorClasses[color as keyof typeof colorClasses]}`}>
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <p className="text-sm text-slate-400">{label}</p>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
};
