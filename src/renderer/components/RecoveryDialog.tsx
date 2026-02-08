/**
 * Recovery Dialog Component
 *
 * A modal dialog that appears after app crashes or unexpected closures
 * to restore the previous session state. Offers users the option to:
 * - Restore the previous session with conversation history and draft
 * - Dismiss and start fresh
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    RotateCcw,
    Clock,
    MessageSquare,
    AlertCircle,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { RecoveryState } from '../../shared/types';

interface RecoveryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onRestore: () => void;
    onDismiss: () => void;
    recoveryState: RecoveryState | null;
}

const RecoveryDialog: React.FC<RecoveryDialogProps> = ({
    isOpen,
    onClose,
    onRestore,
    onDismiss,
    recoveryState
}) => {
    const formatTimestamp = (timestamp: number): string => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffMins < 1) return 'Just now';
        if (diffMins === 1) return '1 minute ago';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours === 1) return '1 hour ago';
        if (diffHours < 24) return `${diffHours} hours ago`;

        return date.toLocaleString();
    };

    const handleRestore = () => {
        onRestore();
        onClose();
    };

    const handleDismiss = () => {
        onDismiss();
        onClose();
    };

    if (!isOpen || !recoveryState) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
                        animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                        exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl z-[101] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <RotateCcw className="w-5 h-5 text-orange-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Session Recovery</h2>
                                    <p className="text-sm text-slate-400">Restore your previous session</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-6 space-y-6">
                            {/* Alert Message */}
                            <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-orange-300 mb-1">
                                        Unexpected Closure Detected
                                    </h3>
                                    <p className="text-sm text-slate-300">
                                        It looks like the app closed unexpectedly. Would you like to restore your previous session?
                                    </p>
                                </div>
                            </div>

                            {/* Recovery Details */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-slate-300">Recovery Details</h3>

                                <div className="space-y-2">
                                    {/* Timestamp */}
                                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
                                        <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-400">Last Activity</p>
                                            <p className="text-sm text-white">{formatTimestamp(recoveryState.timestamp)}</p>
                                        </div>
                                    </div>

                                    {/* Session ID */}
                                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
                                        <MessageSquare className="w-4 h-4 text-green-400 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-400">Session ID</p>
                                            <p className="text-sm text-white font-mono truncate">{recoveryState.sessionId.slice(0, 16)}...</p>
                                        </div>
                                    </div>

                                    {/* Draft Message */}
                                    {recoveryState.draftMessage && (
                                        <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
                                            <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-slate-400 mb-1">Unsent Draft</p>
                                                <p className="text-sm text-white line-clamp-3 break-words">
                                                    {recoveryState.draftMessage}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Pending Response */}
                                    {recoveryState.pendingResponse && (
                                        <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-sm text-yellow-300">
                                                    A response was in progress when the app closed
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info Message */}
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <p className="text-xs text-blue-300">
                                    <strong>Note:</strong> Restoring will load your conversation history, settings, and any unsent messages.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/50 bg-slate-800/30">
                            <button
                                onClick={handleDismiss}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
                            >
                                <XCircle className="w-4 h-4" />
                                Start Fresh
                            </button>
                            <button
                                onClick={handleRestore}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Restore Session
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default RecoveryDialog;
