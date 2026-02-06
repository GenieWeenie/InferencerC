import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, ChevronLeft, ChevronRight, Plus, Trash2, GitMerge, Circle } from 'lucide-react';
import { ConversationNode } from '../lib/conversationTree';

interface BranchNavigatorProps {
    currentNode: ConversationNode | undefined;
    siblings: ConversationNode[];
    currentSiblingIndex: number;
    onSwitchBranch: (index: number) => void;
    onCreateBranch: () => void;
    onDeleteBranch: (nodeId: string) => void;
    onMergeBranch?: (nodeId: string) => void;
    isInCurrentPath: boolean;
}

const BranchNavigator: React.FC<BranchNavigatorProps> = ({
    currentNode,
    siblings,
    currentSiblingIndex,
    onSwitchBranch,
    onCreateBranch,
    onDeleteBranch,
    onMergeBranch,
    isInCurrentPath
}) => {
    if (!currentNode || (siblings.length === 0 && !isInCurrentPath)) {
        return null;
    }

    const totalBranches = siblings.length + 1; // Including current
    const hasPrevious = currentSiblingIndex > 0;
    const hasNext = currentSiblingIndex < siblings.length - 1;

    const getBranchColor = (index: number): string => {
        const colors = [
            'bg-blue-500',
            'bg-green-500',
            'bg-purple-500',
            'bg-amber-500',
            'bg-pink-500',
            'bg-cyan-500',
            'bg-rose-500',
        ];
        return colors[index % colors.length];
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg backdrop-blur-sm"
        >
            {/* Branch Icon */}
            <GitBranch size={16} className="text-slate-400" />

            {/* Branch Name/Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-300">
                        {currentNode.metadata?.branchName || `Branch ${currentSiblingIndex + 1}`}
                    </span>
                    {totalBranches > 1 && (
                        <span className="text-xs text-slate-500">
                            ({currentSiblingIndex + 1}/{totalBranches})
                        </span>
                    )}
                </div>
            </div>

            {/* Branch Indicators */}
            {totalBranches > 1 && (
                <div className="flex items-center gap-1">
                    {Array.from({ length: totalBranches }).map((_, index) => {
                        const isActive = index === currentSiblingIndex;
                        return (
                            <button
                                key={index}
                                onClick={() => onSwitchBranch(index)}
                                className={`w-2 h-2 rounded-full transition-all ${isActive
                                        ? `${getBranchColor(index)} ring-2 ring-white/50`
                                        : 'bg-slate-600 hover:bg-slate-500'
                                    }`}
                                title={`Switch to branch ${index + 1}`}
                            />
                        );
                    })}
                </div>
            )}

            {/* Navigation Controls */}
            {totalBranches > 1 && (
                <>
                    <div className="w-px h-4 bg-slate-700" />
                    <button
                        onClick={() => onSwitchBranch(currentSiblingIndex - 1)}
                        disabled={!hasPrevious}
                        className={`p-1 rounded transition-colors ${hasPrevious
                                ? 'text-slate-300 hover:bg-slate-700'
                                : 'text-slate-600 cursor-not-allowed'
                            }`}
                        title="Previous branch"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => onSwitchBranch(currentSiblingIndex + 1)}
                        disabled={!hasNext}
                        className={`p-1 rounded transition-colors ${hasNext
                                ? 'text-slate-300 hover:bg-slate-700'
                                : 'text-slate-600 cursor-not-allowed'
                            }`}
                        title="Next branch"
                    >
                        <ChevronRight size={16} />
                    </button>
                </>
            )}

            {/* Action Buttons */}
            <div className="w-px h-4 bg-slate-700" />

            <button
                onClick={onCreateBranch}
                className="p-1 text-green-400 hover:bg-slate-700 rounded transition-colors"
                title="Create new branch from here"
            >
                <Plus size={16} />
            </button>

            {totalBranches > 1 && (
                <button
                    onClick={() => onDeleteBranch(currentNode.id)}
                    className="p-1 text-red-400 hover:bg-slate-700 rounded transition-colors"
                    title="Delete this branch"
                >
                    <Trash2 size={16} />
                </button>
            )}

            {onMergeBranch && siblings.length > 0 && (
                <button
                    onClick={() => onMergeBranch(currentNode.id)}
                    className="p-1 text-purple-400 hover:bg-slate-700 rounded transition-colors"
                    title="Merge with another branch"
                >
                    <GitMerge size={16} />
                </button>
            )}
        </motion.div>
    );
};

export default BranchNavigator;
