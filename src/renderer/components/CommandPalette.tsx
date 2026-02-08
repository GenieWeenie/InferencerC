import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command as CommandIcon, ArrowRight, Hash } from 'lucide-react';
import { Command, CommandCategory, commandRegistry } from '../lib/commandRegistry';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

const categoryColors: Record<CommandCategory, string> = {
    Navigation: 'text-blue-400 bg-blue-400/10',
    Actions: 'text-green-400 bg-green-400/10',
    Editing: 'text-purple-400 bg-purple-400/10',
    Settings: 'text-slate-400 bg-slate-400/10',
    Models: 'text-amber-400 bg-amber-400/10',
    Sessions: 'text-cyan-400 bg-cyan-400/10',
    Export: 'text-pink-400 bg-pink-400/10',
    View: 'text-indigo-400 bg-indigo-400/10',
    Help: 'text-emerald-400 bg-emerald-400/10',
};

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [commands, setCommands] = useState<Command[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Get filtered commands based on search query
    const filteredCommands = useMemo(() => {
        return commandRegistry.search(searchQuery);
    }, [searchQuery, commands]);

    // Subscribe to command registry changes
    useEffect(() => {
        const updateCommands = () => {
            setCommands(commandRegistry.getAll());
        };

        updateCommands();
        const unsubscribe = commandRegistry.subscribe(updateCommands);

        return unsubscribe;
    }, []);

    // Reset selection when filtered commands change
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                });
            }
        }
    }, [selectedIndex]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev =>
                        prev < filteredCommands.length - 1 ? prev + 1 : prev
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredCommands[selectedIndex]) {
                        executeCommand(filteredCommands[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filteredCommands, onClose]);

    const executeCommand = (command: Command) => {
        try {
            commandRegistry.execute(command.id);
            onClose();
        } catch (error) {
            console.error('Error executing command:', error);
        }
    };

    // Format shortcut display
    const formatShortcut = (keys?: string[]): string => {
        if (!keys || keys.length === 0) return '';
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        return keys
            .map(key => {
                if (key === 'Ctrl') return isMac ? '⌘' : 'Ctrl';
                if (key === 'Shift') return isMac ? '⇧' : 'Shift';
                if (key === 'Alt') return isMac ? '⌥' : 'Alt';
                return key;
            })
            .join('+');
    };

    // Group commands by category for display
    const groupedCommands = useMemo(() => {
        const groups: Record<string, Command[]> = {};
        filteredCommands.forEach(cmd => {
            if (!groups[cmd.category]) {
                groups[cmd.category] = [];
            }
            groups[cmd.category].push(cmd);
        });
        return groups;
    }, [filteredCommands]);

    if (!isOpen) return null;

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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Command Palette */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-700/50 z-[101] overflow-hidden"
                    >
                        {/* Search Input */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
                            <Search size={20} className="text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Type a command or search..."
                                className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
                            />
                            <div className="flex items-center gap-1">
                                <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-400">
                                    Esc
                                </kbd>
                            </div>
                        </div>

                        {/* Commands List */}
                        <div
                            ref={listRef}
                            className="max-h-[400px] overflow-y-auto custom-scrollbar"
                        >
                            {filteredCommands.length === 0 ? (
                                <div className="py-12 text-center">
                                    <CommandIcon
                                        size={48}
                                        className="mx-auto mb-3 text-slate-600"
                                    />
                                    <p className="text-slate-500 text-sm">
                                        No commands found
                                    </p>
                                    <p className="text-slate-600 text-xs mt-1">
                                        Try a different search term
                                    </p>
                                </div>
                            ) : (
                                <div className="py-2">
                                    {Object.entries(groupedCommands).map(([category, cmds]) => (
                                        <div key={category} className="mb-3 last:mb-0">
                                            {/* Category Header */}
                                            <div className="px-4 py-1.5 flex items-center gap-2">
                                                <Hash size={12} className="text-slate-600" />
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    {category}
                                                </span>
                                            </div>

                                            {/* Commands in Category */}
                                            {cmds.map((command, cmdIndex) => {
                                                const globalIndex = filteredCommands.indexOf(command);
                                                const isSelected = globalIndex === selectedIndex;
                                                const Icon = command.icon;
                                                const isEnabled = command.enabled ? command.enabled() : true;

                                                return (
                                                    <motion.button
                                                        key={command.id}
                                                        onClick={() => executeCommand(command)}
                                                        disabled={!isEnabled}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                                                            isSelected
                                                                ? 'bg-primary/20 border-l-2 border-primary'
                                                                : 'border-l-2 border-transparent hover:bg-slate-800/50'
                                                        } ${!isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                    >
                                                        {/* Icon */}
                                                        {Icon && (
                                                            <div
                                                                className={`flex-shrink-0 ${
                                                                    isSelected ? 'text-primary' : 'text-slate-400'
                                                                }`}
                                                            >
                                                                <Icon size={18} />
                                                            </div>
                                                        )}

                                                        {/* Label & Description */}
                                                        <div className="flex-1 text-left min-w-0">
                                                            <div className="text-sm font-medium text-white truncate">
                                                                {command.label}
                                                            </div>
                                                            {command.description && (
                                                                <div className="text-xs text-slate-400 truncate mt-0.5">
                                                                    {command.description}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Shortcut */}
                                                        {command.shortcut && (
                                                            <div className="flex-shrink-0 text-xs text-slate-500 font-mono">
                                                                {formatShortcut(command.shortcut)}
                                                            </div>
                                                        )}

                                                        {/* Arrow indicator for selected */}
                                                        {isSelected && (
                                                            <ArrowRight
                                                                size={16}
                                                                className="flex-shrink-0 text-primary"
                                                            />
                                                        )}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono">
                                        ↑↓
                                    </kbd>
                                    Navigate
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono">
                                        ↵
                                    </kbd>
                                    Select
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono">
                                        Esc
                                    </kbd>
                                    Close
                                </span>
                            </div>
                            <div className="text-xs text-slate-600">
                                {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CommandPalette;
