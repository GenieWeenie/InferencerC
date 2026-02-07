import React, { useState, useEffect } from 'react';
import { X, Command, Keyboard, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    KeyboardShortcut,
    keyboardShortcutsManager,
} from '../lib/keyboardShortcuts';

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
    const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);

    // Load shortcuts
    useEffect(() => {
        const loadShortcuts = () => {
            setShortcuts(keyboardShortcutsManager.getAllShortcuts());
        };

        loadShortcuts();

        const unsubscribe = keyboardShortcutsManager.subscribe(loadShortcuts);
        return unsubscribe;
    }, []);

    // Group shortcuts by category
    const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

    // Detect OS for key display
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? '⌘' : 'Ctrl';

    const formatKey = (key: string) => {
        if (key === 'Ctrl') return modifierKey;
        if (key === 'Shift') return isMac ? '⇧' : 'Shift';
        if (key === 'Alt') return isMac ? '⌥' : 'Alt';
        if (key === 'Enter') return isMac ? '↵' : 'Enter';
        if (key === 'Escape') return 'Esc';
        return key;
    };

    const renderKeys = (keys: string[]) => {
        return (
            <div className="flex items-center gap-1">
                {keys.map((key, index) => (
                    <React.Fragment key={index}>
                        <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-300 shadow-sm min-w-[2rem] text-center">
                            {formatKey(key)}
                        </kbd>
                        {index < keys.length - 1 && (
                            <span className="text-slate-600 text-xs mx-0.5">+</span>
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    const renderChord = (chord: string[][]) => {
        return (
            <div className="flex items-center gap-2">
                {chord.map((keys, index) => (
                    <React.Fragment key={index}>
                        {renderKeys(keys)}
                        {index < chord.length - 1 && (
                            <ArrowRight size={14} className="text-slate-500" />
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    };

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

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-slate-900 rounded-xl shadow-2xl border border-slate-700/50 z-50 max-h-[85vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                    <Keyboard size={20} className="text-primary" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar max-h-[calc(85vh-80px)]">
                            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                                <div key={category} className="mb-6 last:mb-0">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <span className="w-8 h-[1px] bg-slate-700"></span>
                                        {category}
                                    </h3>
                                    <div className="space-y-2">
                                        {categoryShortcuts.map((shortcut, index) => {
                                            const keys = shortcut.customKeys || shortcut.defaultKeys;
                                            const chord = shortcut.customChord || shortcut.defaultChord;

                                            return (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-800/50 transition-colors"
                                                >
                                                    <span className="text-slate-200 text-sm">{shortcut.description}</span>
                                                    <div className="flex items-center gap-1">
                                                        {shortcut.isChord && chord ? renderChord(chord) : renderKeys(keys)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-slate-700/50 bg-slate-800/30">
                            <p className="text-xs text-slate-500 text-center">
                                Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono">?</kbd> anytime to view this help
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default KeyboardShortcutsModal;
