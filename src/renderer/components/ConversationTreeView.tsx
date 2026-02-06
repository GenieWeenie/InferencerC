import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitBranch, Circle, ChevronDown, ChevronRight, MessageSquare, User, Bot } from 'lucide-react';
import { ConversationNode, ConversationTreeManager } from '../lib/conversationTree';

interface ConversationTreeViewProps {
    isOpen: boolean;
    onClose: () => void;
    treeManager: ConversationTreeManager;
    currentPath: string[];
    onNavigateToNode: (nodeId: string) => void;
}

const ConversationTreeView: React.FC<ConversationTreeViewProps> = ({
    isOpen,
    onClose,
    treeManager,
    currentPath,
    onNavigateToNode
}) => {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

    const toggleNode = (nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const renderNode = (node: ConversationNode, depth: number = 0): React.ReactNode => {
        if (node.id === 'root') {
            return node.children.map(child => renderNode(child, depth));
        }

        const isExpanded = expandedNodes.has(node.id);
        const isInPath = currentPath.includes(node.id);
        const isActive = currentPath[currentPath.length - 1] === node.id;
        const hasChildren = node.children.length > 0;

        const role = node.message.role;
        const RoleIcon = role === 'user' ? User : Bot;
        const content = typeof node.message.content === 'string'
            ? node.message.content
            : 'Multimodal message';
        const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;

        return (
            <div key={node.id} className="relative">
                {/* Connection Line */}
                {depth > 0 && (
                    <div
                        className="absolute left-0 top-0 bottom-0 w-px bg-slate-700"
                        style={{ left: `${depth * 20 - 10}px` }}
                    />
                )}

                {/* Node */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-start gap-2 py-2 px-3 rounded-lg mb-1 cursor-pointer transition-colors ${
                        isActive
                            ? 'bg-primary/20 border-l-2 border-primary'
                            : isInPath
                            ? 'bg-slate-800/50 border-l-2 border-blue-500/50'
                            : 'hover:bg-slate-800/30 border-l-2 border-transparent'
                    }`}
                    style={{ marginLeft: `${depth * 20}px` }}
                    onClick={() => onNavigateToNode(node.id)}
                >
                    {/* Expand/Collapse Button */}
                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleNode(node.id);
                            }}
                            className="flex-shrink-0 p-0.5 hover:bg-slate-700 rounded transition-colors"
                        >
                            {isExpanded ? (
                                <ChevronDown size={14} className="text-slate-400" />
                            ) : (
                                <ChevronRight size={14} className="text-slate-400" />
                            )}
                        </button>
                    )}

                    {/* Role Icon */}
                    <div className={`flex-shrink-0 p-1 rounded ${
                        role === 'user' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                    }`}>
                        <RoleIcon size={12} className={
                            role === 'user' ? 'text-blue-400' : 'text-purple-400'
                        } />
                    </div>

                    {/* Message Preview */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-300 capitalize">
                                {role}
                            </span>
                            {node.metadata?.branchName && (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                                    {node.metadata.branchName}
                                </span>
                            )}
                            {node.children.length > 1 && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                                    <GitBranch size={10} />
                                    {node.children.length}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {preview}
                        </p>
                    </div>

                    {/* Active Indicator */}
                    {isActive && (
                        <Circle size={8} className="flex-shrink-0 fill-primary text-primary" />
                    )}
                </motion.div>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div className="ml-2">
                        {node.children.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const stats = treeManager.getTreeStats();
    const rootNode = treeManager.getNode('root');

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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ opacity: 0, x: -300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -300 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-16 top-0 bottom-0 w-96 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 z-[91] flex flex-col"
                        style={{ left: '64px' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                    <GitBranch size={18} className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-white">Conversation Tree</h2>
                                    <p className="text-xs text-slate-400">
                                        {stats.totalNodes - 1} messages · {stats.totalBranches} branches
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tree View */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                            {rootNode && renderNode(rootNode)}
                        </div>

                        {/* Stats Footer */}
                        <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-slate-500">Current Depth:</span>
                                    <span className="ml-2 text-slate-300 font-medium">
                                        {stats.currentDepth}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Max Depth:</span>
                                    <span className="ml-2 text-slate-300 font-medium">
                                        {stats.maxDepth}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConversationTreeView;
