/**
 * Smart Suggestions Panel
 *
 * Displays AI-powered follow-up question suggestions
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Sparkles, X, ChevronRight } from 'lucide-react';
import {
    smartSuggestionsService,
    Suggestion,
} from '../services/smartSuggestions';
import { ChatMessage } from '../../shared/types';

interface SmartSuggestionsPanelProps {
    conversationHistory: ChatMessage[];
    lastMessage?: string;
    onSelectSuggestion: (suggestion: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export const SmartSuggestionsPanel: React.FC<SmartSuggestionsPanelProps> = ({
    conversationHistory,
    lastMessage,
    onSelectSuggestion,
    isOpen,
    onClose,
}) => {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && conversationHistory.length > 0) {
            loadSuggestions();
        }
    }, [isOpen, conversationHistory, lastMessage]);

    const loadSuggestions = async () => {
        setIsLoading(true);
        try {
            const result = await smartSuggestionsService.generateSuggestions(
                conversationHistory,
                lastMessage
            );
            setSuggestions(result);
        } catch (error) {
            console.error('Failed to load suggestions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'follow-up': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
            case 'clarification': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
            case 'example': return 'bg-green-500/10 text-green-400 border-green-500/30';
            case 'deep-dive': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
            case 'alternative': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
            case 'related': return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        <h4 className="text-sm font-semibold text-white">Suggested Questions</h4>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                    >
                        <X className="w-3 h-3 text-slate-400" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="text-sm text-slate-400 text-center py-4">
                        Generating suggestions...
                    </div>
                ) : suggestions.length === 0 ? (
                    <div className="text-sm text-slate-400 text-center py-4">
                        No suggestions available
                    </div>
                ) : (
                    <div className="space-y-2">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion.id}
                                onClick={() => {
                                    onSelectSuggestion(suggestion.text);
                                    onClose();
                                }}
                                className={`w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.02] ${getTypeColor(suggestion.type)}`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{suggestion.text}</p>
                                        {suggestion.context && (
                                            <p className="text-xs text-slate-500 mt-1">{suggestion.context}</p>
                                        )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs px-2 py-0.5 bg-slate-900/50 rounded">
                                        {suggestion.type}
                                    </span>
                                    <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-current opacity-50"
                                            style={{ width: `${suggestion.confidence * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};
