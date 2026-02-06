/**
 * Conversation Recommendations Panel
 *
 * Shows relevant past conversations based on current context
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, TrendingUp, Clock, MessageSquare } from 'lucide-react';
import {
    conversationRecommendationsService,
    Recommendation,
} from '../services/conversationRecommendations';
import { HistoryService } from '../services/history';
import { ChatMessage } from '../../shared/types';

interface ConversationRecommendationsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentSessionId: string;
    currentMessage?: string;
    conversationHistory: ChatMessage[];
    onSelectConversation: (sessionId: string) => void;
}

export const ConversationRecommendationsPanel: React.FC<ConversationRecommendationsPanelProps> = ({
    isOpen,
    onClose,
    currentSessionId,
    currentMessage,
    conversationHistory,
    onSelectConversation,
}) => {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadRecommendations();
        }
    }, [isOpen, currentSessionId, currentMessage]);

    const loadRecommendations = async () => {
        setIsLoading(true);
        try {
            const result = await conversationRecommendationsService.getRecommendations(
                currentSessionId,
                currentMessage,
                5
            );
            setRecommendations(result);
        } catch (error) {
            console.error('Failed to load recommendations:', error);
        } finally {
            setIsLoading(false);
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
                    className="relative w-full max-w-2xl bg-slate-900 rounded-lg shadow-2xl border border-slate-700 p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-yellow-400" />
                            <h3 className="text-xl font-bold text-white">Recommended Conversations</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-8 text-slate-400">
                            Finding relevant conversations...
                        </div>
                    ) : recommendations.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            No relevant conversations found
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recommendations.map((rec) => {
                                const session = HistoryService.getSession(rec.sessionId);
                                return (
                                    <button
                                        key={rec.sessionId}
                                        onClick={() => {
                                            onSelectConversation(rec.sessionId);
                                            onClose();
                                        }}
                                        className="w-full text-left p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-blue-500 transition-all hover:bg-slate-750"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-semibold text-white">{rec.title}</h4>
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-green-400" />
                                                <span className="text-xs text-green-400 font-medium">
                                                    {Math.round(rec.relevanceScore * 100)}% match
                                                </span>
                                            </div>
                                        </div>
                                        {rec.reasons.length > 0 && (
                                            <div className="space-y-1 mb-2">
                                                {rec.reasons.slice(0, 2).map((reason, i) => (
                                                    <p key={i} className="text-xs text-slate-400">
                                                        • {reason}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                        {session && (
                                            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                                                <div className="flex items-center gap-1">
                                                    <MessageSquare className="w-3 h-3" />
                                                    {session.messages?.length || 0} messages
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(session.lastModified).toLocaleDateString()}
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
