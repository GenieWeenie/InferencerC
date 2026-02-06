import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Keyboard,
    RotateCcw,
    Download,
    Upload,
    AlertTriangle,
    Search,
    Check,
} from 'lucide-react';
import {
    KeyboardShortcut,
    ShortcutCategory,
    ShortcutConflict,
    keyboardShortcutsManager,
} from '../lib/keyboardShortcuts';

interface ShortcutEditorProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShortcutEditor: React.FC<ShortcutEditorProps> = ({ isOpen, onClose }) => {
    const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
    const [conflicts, setConflicts] = useState<ShortcutConflict[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | 'All'>('All');
    const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
    const [recordingKeys, setRecordingKeys] = useState<string[]>([]);
    const [isChordMode, setIsChordMode] = useState(false);
    const [chordSequence, setChordSequence] = useState<string[][]>([]);

    // Load shortcuts
    useEffect(() => {
        const loadShortcuts = () => {
            setShortcuts(keyboardShortcutsManager.getAllShortcuts());
            setConflicts(keyboardShortcutsManager.findConflicts());
        };

        loadShortcuts();

        const unsubscribe = keyboardShortcutsManager.subscribe(loadShortcuts);
        return unsubscribe;
    }, []);

    // Record keyboard shortcut
    useEffect(() => {
        if (editingShortcut === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();

            if (e.key === 'Escape') {
                setEditingShortcut(null);
                setRecordingKeys([]);
                setIsChordMode(false);
                setChordSequence([]);
                return;
            }

            const keys: string[] = [];
            if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
            if (e.shiftKey) keys.push('Shift');
            if (e.altKey) keys.push('Alt');

            const key = e.key;
            if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
                keys.push(key);
            }

            setRecordingKeys(keys);
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (recordingKeys.length > 0) {
                if (isChordMode) {
                    // Add to chord sequence
                    const newSequence = [...chordSequence, recordingKeys];
                    setChordSequence(newSequence);
                    setRecordingKeys([]);
                } else {
                    // Single key binding
                    keyboardShortcutsManager.updateShortcut(editingShortcut, recordingKeys);
                    setEditingShortcut(null);
                    setRecordingKeys([]);
                    setIsChordMode(false);
                    setChordSequence([]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [editingShortcut, recordingKeys, isChordMode, chordSequence]);

    // Filter shortcuts
    const filteredShortcuts = shortcuts.filter(shortcut => {
        const matchesSearch =
            shortcut.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shortcut.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
            selectedCategory === 'All' || shortcut.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Group by category
    const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {} as Record<ShortcutCategory, KeyboardShortcut[]>);

    const categories: (ShortcutCategory | 'All')[] = [
        'All',
        'Navigation',
        'Chat',
        'Editing',
        'View',
        'Tools',
        'System',
    ];

    const handleReset = (id: string) => {
        keyboardShortcutsManager.resetShortcut(id);
    };

    const handleResetAll = () => {
        if (confirm('Reset all shortcuts to default? This cannot be undone.')) {
            keyboardShortcutsManager.resetAllShortcuts();
        }
    };

    const handleExport = () => {
        const json = keyboardShortcutsManager.exportShortcuts();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'keyboard-shortcuts.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = event.target?.result as string;
                    keyboardShortcutsManager.importShortcuts(json);
                    alert('Shortcuts imported successfully!');
                } catch (error) {
                    alert('Failed to import shortcuts. Invalid file format.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleToggleChordMode = () => {
        setIsChordMode(!isChordMode);
        setChordSequence([]);
        setRecordingKeys([]);
    };

    const handleSaveChord = () => {
        if (editingShortcut && chordSequence.length > 0) {
            keyboardShortcutsManager.updateChordShortcut(editingShortcut, chordSequence);
            setEditingShortcut(null);
            setRecordingKeys([]);
            setIsChordMode(false);
            setChordSequence([]);
        }
    };

    const handleCancelEdit = () => {
        setEditingShortcut(null);
        setRecordingKeys([]);
        setIsChordMode(false);
        setChordSequence([]);
    };

    const renderKeys = (keys: string[]) => {
        return (
            <div className="flex items-center gap-1">
                {keys.map((key, index) => (
                    <React.Fragment key={index}>
                        <kbd className="px-2 py-1 text-xs font-semibold bg-slate-700 rounded border border-slate-600">
                            {key}
                        </kbd>
                        {index < keys.length - 1 && (
                            <span className="text-slate-500 text-xs">+</span>
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
                            <span className="text-slate-500 text-xs font-medium">then</span>
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={onClose}
                    >
                        <div
                            className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/20 rounded-lg">
                                        <Keyboard size={20} className="text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">
                                            Keyboard Shortcuts
                                        </h2>
                                        <p className="text-sm text-slate-400">
                                            Customize your keyboard shortcuts
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            {/* Toolbar */}
                            <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-4">
                                {/* Search */}
                                <div className="flex-1 relative">
                                    <Search
                                        size={18}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search shortcuts..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-primary"
                                    />
                                </div>

                                {/* Category Filter */}
                                <select
                                    value={selectedCategory}
                                    onChange={(e) =>
                                        setSelectedCategory(e.target.value as ShortcutCategory | 'All')
                                    }
                                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>

                                {/* Actions */}
                                <button
                                    onClick={handleResetAll}
                                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-white flex items-center gap-2 transition-colors"
                                    title="Reset all shortcuts to default"
                                >
                                    <RotateCcw size={16} />
                                    Reset All
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                                    title="Export shortcuts"
                                >
                                    <Download size={16} className="text-white" />
                                </button>
                                <button
                                    onClick={handleImport}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                                    title="Import shortcuts"
                                >
                                    <Upload size={16} className="text-white" />
                                </button>
                            </div>

                            {/* Conflicts Warning */}
                            {conflicts.length > 0 && (
                                <div className="mx-6 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
                                    <AlertTriangle size={20} className="text-yellow-500 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-yellow-500">
                                            {conflicts.length} Shortcut Conflict{conflicts.length > 1 ? 's' : ''}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Some shortcuts have the same key combination. Please resolve these
                                            conflicts.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-6 py-4">
                                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                                    <div key={category} className="mb-6">
                                        <h3 className="text-sm font-semibold text-slate-400 mb-3">
                                            {category}
                                        </h3>
                                        <div className="space-y-2">
                                            {categoryShortcuts.map((shortcut) => {
                                                const keys = shortcut.customKeys || shortcut.defaultKeys;
                                                const chord = shortcut.customChord || shortcut.defaultChord;
                                                const isCustom = !!(shortcut.customKeys || shortcut.customChord);
                                                const isEditing = editingShortcut === shortcut.id;
                                                const hasConflict = conflicts.some(
                                                    (c) =>
                                                        c.shortcut1.id === shortcut.id ||
                                                        c.shortcut2.id === shortcut.id
                                                );

                                                return (
                                                    <div
                                                        key={shortcut.id}
                                                        className={`p-3 bg-slate-800 rounded-lg border ${
                                                            hasConflict
                                                                ? 'border-yellow-500/50'
                                                                : 'border-slate-700'
                                                        } hover:border-slate-600 transition-colors`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-medium text-white">
                                                                        {shortcut.label}
                                                                    </p>
                                                                    {isCustom && (
                                                                        <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded">
                                                                            Custom
                                                                        </span>
                                                                    )}
                                                                    {shortcut.isChord && (
                                                                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                                                                            Chord
                                                                        </span>
                                                                    )}
                                                                    {hasConflict && (
                                                                        <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-500 rounded">
                                                                            Conflict
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-400 mt-1">
                                                                    {shortcut.description}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                {isEditing ? (
                                                                    <div className="flex items-center gap-2">
                                                                        {isChordMode ? (
                                                                            <>
                                                                                <div className="px-3 py-2 bg-purple-500/20 border border-purple-400 rounded-lg">
                                                                                    <div className="flex flex-col gap-2">
                                                                                        <p className="text-xs text-purple-400 font-medium">
                                                                                            Chord Mode - Step {chordSequence.length + 1}
                                                                                        </p>
                                                                                        {chordSequence.length > 0 && (
                                                                                            <div className="text-xs text-white">
                                                                                                {renderChord(chordSequence)}
                                                                                            </div>
                                                                                        )}
                                                                                        {recordingKeys.length > 0 && (
                                                                                            <div className="text-xs text-white flex items-center gap-1">
                                                                                                <span className="text-purple-400">Current:</span>
                                                                                                {renderKeys(recordingKeys)}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                {chordSequence.length > 0 && (
                                                                                    <button
                                                                                        onClick={handleSaveChord}
                                                                                        className="p-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500 rounded transition-colors"
                                                                                        title="Save chord"
                                                                                    >
                                                                                        <Check size={16} className="text-green-500" />
                                                                                    </button>
                                                                                )}
                                                                                <button
                                                                                    onClick={handleCancelEdit}
                                                                                    className="p-2 hover:bg-slate-700 rounded transition-colors"
                                                                                    title="Cancel"
                                                                                >
                                                                                    <X size={16} className="text-slate-400" />
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <div className="px-3 py-2 bg-primary/20 border border-primary rounded-lg">
                                                                                    <p className="text-xs text-primary font-medium">
                                                                                        {recordingKeys.length > 0
                                                                                            ? renderKeys(recordingKeys)
                                                                                            : 'Press keys...'}
                                                                                    </p>
                                                                                </div>
                                                                                <button
                                                                                    onClick={handleToggleChordMode}
                                                                                    className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400 rounded-lg text-xs text-purple-400 font-medium transition-colors"
                                                                                    title="Enter chord mode"
                                                                                >
                                                                                    Chord
                                                                                </button>
                                                                                <button
                                                                                    onClick={handleCancelEdit}
                                                                                    className="p-2 hover:bg-slate-700 rounded transition-colors"
                                                                                    title="Cancel"
                                                                                >
                                                                                    <X size={16} className="text-slate-400" />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setEditingShortcut(shortcut.id)}
                                                                        className="hover:bg-slate-700 rounded px-3 py-2 transition-colors"
                                                                    >
                                                                        {shortcut.isChord && chord ? renderChord(chord) : renderKeys(keys)}
                                                                    </button>
                                                                )}
                                                                {isCustom && !isEditing && (
                                                                    <button
                                                                        onClick={() => handleReset(shortcut.id)}
                                                                        className="p-2 hover:bg-slate-700 rounded transition-colors"
                                                                        title="Reset to default"
                                                                    >
                                                                        <RotateCcw size={16} className="text-slate-400" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {filteredShortcuts.length === 0 && (
                                    <div className="text-center py-12">
                                        <p className="text-slate-400">No shortcuts found</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
                                <p className="text-xs text-slate-400">
                                    Click on a shortcut to customize it. Use "Chord" button for multi-step sequences. Press Escape to cancel.
                                </p>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white text-sm font-medium transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ShortcutEditor;
