/**
 * Conversation Summary Panel
 * 
 * Displays AI-generated summaries, key points, and topics for conversations.
 * Features:
 * - Collapsible panel design
 * - Auto-refresh when conversation grows
 * - Manual regeneration option
 * - Loading states and error handling
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Loader2,
    Tag,
    Lightbulb,
    X,
    AlertCircle,
    MessageSquare,
    Clock,
} from 'lucide-react';
import { SummarizationService, ConversationSummary } from '../services/summarization';
import { ChatMessage } from '../../shared/types';

interface ConversationSummaryPanelProps {
    sessionId: string;
    messages: ChatMessage[];
    modelId: string;
    isExpanded?: boolean;
    onToggle?: () => void;
    className?: string;
}

const ConversationSummaryPanel: React.FC<ConversationSummaryPanelProps> = ({
    sessionId,
    messages,
    modelId,
    isExpanded = false,
    onToggle,
    className = '',
}) => {
    const [summary, setSummary] = useState<ConversationSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(isExpanded);

    // Load cached summary on mount
    useEffect(() => {
        const cached = SummarizationService.getCachedSummary(sessionId);
        if (cached) {
            setSummary(cached);
        }
    }, [sessionId]);

    // Auto-generate summary when needed
    useEffect(() => {
        if (SummarizationService.needsUpdate(sessionId, messages.length) && !isLoading) {
            // Only auto-generate if we have enough messages and not currently loading
            if (messages.length >= 10 && modelId) {
                generateSummary();
            }
        }
    }, [messages.length, sessionId, modelId]);

    const generateSummary = useCallback(async () => {
        if (isLoading || !modelId || messages.length < 3) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await SummarizationService.generateSummary(
                sessionId,
                messages,
                modelId,
                {
                    maxLength: 100,
                    includeKeyPoints: true,
                    includeTopics: true,
                    style: 'detailed'
                }
            );

            if (result) {
                setSummary(result);
            } else {
                setError('Unable to generate summary');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate summary');
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, messages, modelId, isLoading]);

    const handleToggle = () => {
        setExpanded(!expanded);
        onToggle?.();
    };

    const formatTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    // Don't show for very short conversations
    if (messages.length < 5) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-xl overflow-hidden ${className}`}
        >
            {/* Header */}
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-purple-500/20 rounded-lg">
                        <Sparkles size={16} className="text-purple-400" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium text-white">AI Summary</div>
                        {summary && (
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                <Clock size={10} />
                                {formatTimeAgo(summary.generatedAt)}
                                <span>•</span>
                                <MessageSquare size={10} />
                                {summary.messageCount} messages
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isLoading && <Loader2 size={16} className="text-purple-400 animate-spin" />}
                    {expanded ? (
                        <ChevronUp size={18} className="text-slate-400" />
                    ) : (
                        <ChevronDown size={18} className="text-slate-400" />
                    )}
                </div>
            </button>

            {/* Content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-4">
                            {/* Summary */}
                            {summary?.summary && (
                                <div>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        {summary.summary}
                                    </p>
                                </div>
                            )}

                            {/* Key Points */}
                            {summary?.keyPoints && summary.keyPoints.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Lightbulb size={14} className="text-yellow-400" />
                                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                                            Key Points
                                        </span>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {summary.keyPoints.map((point, index) => (
                                            <li
                                                key={index}
                                                className="text-sm text-slate-400 flex items-start gap-2"
                                            >
                                                <span className="text-purple-400 mt-1">•</span>
                                                <span>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Topics */}
                            {summary?.topics && summary.topics.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Tag size={14} className="text-blue-400" />
                                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                                            Topics
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {summary.topics.map((topic, index) => (
                                            <span
                                                key={index}
                                                className="px-2.5 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30"
                                            >
                                                {topic}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Error State */}
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <AlertCircle size={16} className="text-red-400" />
                                    <span className="text-sm text-red-300">{error}</span>
                                </div>
                            )}

                            {/* No Summary Yet */}
                            {!summary && !isLoading && !error && (
                                <div className="text-center py-4">
                                    <p className="text-sm text-slate-500 mb-3">
                                        Generate an AI-powered summary of this conversation
                                    </p>
                                    <button
                                        onClick={generateSummary}
                                        disabled={isLoading || messages.length < 3}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white rounded-lg transition-colors text-sm"
                                    >
                                        <Sparkles size={14} />
                                        Generate Summary
                                    </button>
                                </div>
                            )}

                            {/* Actions */}
                            {summary && (
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/50">
                                    <button
                                        onClick={generateSummary}
                                        disabled={isLoading}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                    >
                                        <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                                        Regenerate
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ConversationSummaryPanel;
