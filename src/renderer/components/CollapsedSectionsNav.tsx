/**
 * Collapsed Sections Navigation Panel
 *
 * Displays a quick navigation panel showing all collapsed code blocks and message sections.
 * Features:
 * - Collapsible panel design
 * - Lists all collapsed items with previews
 * - Click to jump to and expand sections
 * - Location indicators
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    ChevronUp,
    Code2,
    FileText,
    MapPin,
    Eye,
    Layers,
} from 'lucide-react';
import { ChatMessage } from '../../shared/types';
import { useCollapseState } from '../hooks/useCollapseState';

interface CollapsedItem {
    id: string;
    type: 'code-block' | 'message-section';
    preview: string;
    language?: string;
    messageIndex: number;
    messageRole: 'user' | 'assistant' | 'system';
}

interface CollapsedSectionsNavProps {
    sessionId: string;
    messages: ChatMessage[];
    onJumpToSection: (messageIndex: number, itemId: string) => void;
    className?: string;
}

const CollapsedSectionsNav: React.FC<CollapsedSectionsNavProps> = ({
    sessionId,
    messages,
    onJumpToSection,
    className = '',
}) => {
    const [expanded, setExpanded] = React.useState(false);
    const { getCollapsedItems, isCollapsed } = useCollapseState(sessionId);

    // Extract collapsed items from messages
    const collapsedItems = useMemo((): CollapsedItem[] => {
        const items: CollapsedItem[] = [];
        const collapsedIds = getCollapsedItems();

        if (collapsedIds.length === 0) return items;

        messages.forEach((message, index) => {
            // Check for collapsed message section
            if (collapsedIds.includes('message') && isCollapsed('message')) {
                // Count words to determine if this message is collapsible
                const wordCount = countWords(message.content);
                if (wordCount > 500) {
                    items.push({
                        id: 'message',
                        type: 'message-section',
                        preview: getPreview(message.content, 50),
                        messageIndex: index,
                        messageRole: message.role,
                    });
                }
            }

            // Extract code blocks from message content
            const codeBlockMatches = extractCodeBlocks(message.content);
            codeBlockMatches.forEach(({ code, language }) => {
                const codeHash = code.substring(0, 50);
                if (collapsedIds.includes(codeHash)) {
                    items.push({
                        id: codeHash,
                        type: 'code-block',
                        preview: getPreview(code, 80),
                        language: language || 'text',
                        messageIndex: index,
                        messageRole: message.role,
                    });
                }
            });
        });

        return items;
    }, [messages, getCollapsedItems, isCollapsed]);

    // Helper function to extract code blocks from markdown
    function extractCodeBlocks(content: string): Array<{ code: string; language?: string }> {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const blocks: Array<{ code: string; language?: string }> = [];
        let match;

        while ((match = codeBlockRegex.exec(content)) !== null) {
            blocks.push({
                code: match[2].trim(),
                language: match[1],
            });
        }

        return blocks;
    }

    // Helper function to count words
    function countWords(text: string): number {
        let cleanText = text.replace(/```[\s\S]*?```/g, '');
        cleanText = cleanText.replace(/`[^`]+`/g, '');
        cleanText = cleanText.replace(/[#*_~`\[\]()]/g, '');
        const words = cleanText.trim().split(/\s+/).filter(word => word.length > 0);
        return words.length;
    }

    // Helper function to get preview text
    function getPreview(text: string, maxChars: number): string {
        const trimmed = text.trim().replace(/\n/g, ' ').substring(0, maxChars);
        return trimmed.length < text.length ? trimmed + '...' : trimmed;
    }

    const handleToggle = () => {
        setExpanded(!expanded);
    };

    const handleItemClick = (item: CollapsedItem) => {
        onJumpToSection(item.messageIndex, item.id);
    };

    // Don't show if no collapsed items
    if (collapsedItems.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-xl overflow-hidden ${className}`}
        >
            {/* Header */}
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                        <Layers size={16} className="text-indigo-400" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium text-white">Collapsed Sections</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                            <MapPin size={10} />
                            {collapsedItems.length} {collapsedItems.length === 1 ? 'item' : 'items'} hidden
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
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
                        <div className="px-4 pb-4 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                            {collapsedItems.map((item, index) => (
                                <motion.button
                                    key={`${item.id}-${item.messageIndex}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => handleItemClick(item)}
                                    className="w-full flex items-start gap-3 p-3 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/30 hover:border-indigo-500/30 rounded-lg transition-all group"
                                >
                                    {/* Icon */}
                                    <div className={`p-1.5 rounded ${item.type === 'code-block'
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'bg-purple-500/20 text-purple-400'
                                        }`}>
                                        {item.type === 'code-block' ? (
                                            <Code2 size={14} />
                                        ) : (
                                            <FileText size={14} />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 text-left">
                                        {/* Type and Location */}
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-slate-400">
                                                {item.type === 'code-block' ? (
                                                    <>
                                                        Code Block
                                                        {item.language && (
                                                            <span className="ml-1 text-blue-400">
                                                                ({item.language})
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    'Long Message'
                                                )}
                                            </span>
                                            <span className="text-xs text-slate-600">•</span>
                                            <span className="text-xs text-slate-500">
                                                Message #{item.messageIndex + 1}
                                            </span>
                                            <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${item.messageRole === 'user'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : item.messageRole === 'assistant'
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : 'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                {item.messageRole}
                                            </span>
                                        </div>

                                        {/* Preview */}
                                        <p className="text-sm text-slate-300 font-mono leading-relaxed line-clamp-2">
                                            {item.preview}
                                        </p>
                                    </div>

                                    {/* Expand Icon */}
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Eye size={16} className="text-indigo-400" />
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        {/* Footer Hint */}
                        <div className="px-4 pb-3 pt-2 border-t border-slate-700/30">
                            <p className="text-xs text-slate-500 text-center">
                                Click any item to jump to and expand it
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default CollapsedSectionsNav;
