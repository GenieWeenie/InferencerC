/**
 * Variable Insert Menu
 * 
 * A dropdown menu for inserting prompt variables into text inputs.
 * Features:
 * - Category-based organization
 * - Search/filter variables
 * - Preview values before inserting
 * - Custom variable management
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    Calendar,
    User,
    Settings,
    Shuffle,
    Plus,
    Trash2,
    Copy,
    Check,
    ChevronDown,
    Code2,
    HelpCircle,
} from 'lucide-react';
import { PromptVariableService, PromptVariable, VariableContext } from '../services/promptVariables';
import { toast } from 'sonner';

interface VariableInsertMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (variable: string) => void;
    context?: VariableContext;
    position?: { top: number; left: number };
}

const categoryIcons: Record<string, React.ElementType> = {
    datetime: Calendar,
    user: User,
    system: Settings,
    random: Shuffle,
    custom: Code2,
};

const categoryColors: Record<string, string> = {
    datetime: 'text-blue-400 bg-blue-400/10',
    user: 'text-purple-400 bg-purple-400/10',
    system: 'text-green-400 bg-green-400/10',
    random: 'text-orange-400 bg-orange-400/10',
    custom: 'text-pink-400 bg-pink-400/10',
};

const VariableInsertMenu: React.FC<VariableInsertMenuProps> = ({
    isOpen,
    onClose,
    onInsert,
    context = {},
    position,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [hoveredVariable, setHoveredVariable] = useState<PromptVariable | null>(null);
    const [previewValue, setPreviewValue] = useState<string>('');
    const [copiedVar, setCopiedVar] = useState<string | null>(null);
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [newVarName, setNewVarName] = useState('');
    const [newVarValue, setNewVarValue] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const allVariables = useMemo(() => PromptVariableService.getAllVariables(), [isOpen, showCustomForm]);

    const filteredVariables = useMemo(() => {
        let vars = allVariables;

        if (selectedCategory) {
            vars = vars.filter(v => v.category === selectedCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            vars = vars.filter(v =>
                v.name.toLowerCase().includes(query) ||
                v.description.toLowerCase().includes(query)
            );
        }

        return vars;
    }, [allVariables, selectedCategory, searchQuery]);

    const categories = useMemo(() => {
        const counts = new Map<string, number>();
        allVariables.forEach(v => {
            counts.set(v.category, (counts.get(v.category) || 0) + 1);
        });
        return Array.from(counts.entries()).map(([id, count]) => ({ id, count }));
    }, [allVariables]);

    // Focus search input when opened
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Load preview value on hover
    useEffect(() => {
        if (hoveredVariable) {
            PromptVariableService.getVariableValue(hoveredVariable.name, context)
                .then(setPreviewValue)
                .catch(() => setPreviewValue('Error'));
        } else {
            setPreviewValue('');
        }
    }, [hoveredVariable, context]);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose]);

    const handleInsert = (variable: PromptVariable) => {
        onInsert(`{{${variable.name}}}`);
        onClose();
    };

    const handleCopyVariable = (variable: PromptVariable) => {
        navigator.clipboard.writeText(`{{${variable.name}}}`);
        setCopiedVar(variable.name);
        setTimeout(() => setCopiedVar(null), 2000);
        toast.success(`Copied {{${variable.name}}} to clipboard`);
    };

    const handleCreateCustomVariable = () => {
        if (!newVarName.trim()) {
            toast.error('Variable name is required');
            return;
        }

        // Validate name (alphanumeric and underscores only)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newVarName)) {
            toast.error('Variable name must start with a letter or underscore and contain only letters, numbers, and underscores');
            return;
        }

        PromptVariableService.setCustomVariable(newVarName, newVarValue);
        toast.success(`Created variable {{${newVarName}}}`);
        setNewVarName('');
        setNewVarValue('');
        setShowCustomForm(false);
    };

    const handleDeleteCustomVariable = (name: string) => {
        PromptVariableService.deleteCustomVariable(name);
        toast.success(`Deleted variable {{${name}}}`);
    };

    if (!isOpen) return null;

    const menuStyle: React.CSSProperties = position ? {
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 200,
    } : {};

    return (
        <AnimatePresence>
            <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={menuStyle}
                className={`${position ? '' : 'absolute bottom-full left-0 mb-2'} w-80 bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden`}
            >
                {/* Header */}
                <div className="p-3 border-b border-slate-700/50 bg-slate-800/50">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-white flex items-center gap-2">
                            <Code2 size={14} className="text-blue-400" />
                            Insert Variable
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-slate-700 rounded transition-colors"
                        >
                            <X size={14} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search variables..."
                            className="w-full bg-slate-800 border border-slate-700/50 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="px-3 py-2 border-b border-slate-700/50 flex gap-1 flex-wrap">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${!selectedCategory
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:bg-slate-800'
                            }`}
                    >
                        All
                    </button>
                    {categories.map(({ id, count }) => {
                        const Icon = categoryIcons[id] || Code2;
                        return (
                            <button
                                key={id}
                                onClick={() => setSelectedCategory(selectedCategory === id ? null : id)}
                                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${selectedCategory === id
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:bg-slate-800'
                                    }`}
                            >
                                <Icon size={12} />
                                {id.charAt(0).toUpperCase() + id.slice(1)}
                                <span className="text-slate-500">({count})</span>
                            </button>
                        );
                    })}
                </div>

                {/* Variables List */}
                <div className="max-h-64 overflow-y-auto">
                    {filteredVariables.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">
                            No variables found
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredVariables.map((variable) => {
                                const Icon = categoryIcons[variable.category] || Code2;
                                const isCustom = variable.category === 'custom';

                                return (
                                    <div
                                        key={variable.name}
                                        className="group flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors"
                                        onMouseEnter={() => setHoveredVariable(variable)}
                                        onMouseLeave={() => setHoveredVariable(null)}
                                        onClick={() => handleInsert(variable)}
                                    >
                                        <div className={`p-1.5 rounded-md ${categoryColors[variable.category]}`}>
                                            <Icon size={12} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <code className="text-xs text-blue-300 font-mono">
                                                    {`{{${variable.name}}}`}
                                                </code>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate">
                                                {variable.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCopyVariable(variable);
                                                }}
                                                className="p-1 hover:bg-slate-700 rounded transition-colors"
                                                title="Copy"
                                            >
                                                {copiedVar === variable.name ? (
                                                    <Check size={12} className="text-green-400" />
                                                ) : (
                                                    <Copy size={12} className="text-slate-400" />
                                                )}
                                            </button>
                                            {isCustom && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteCustomVariable(variable.name);
                                                    }}
                                                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={12} className="text-red-400" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Preview */}
                <AnimatePresence>
                    {hoveredVariable && previewValue && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-700/50 overflow-hidden"
                        >
                            <div className="p-3 bg-slate-800/30">
                                <div className="text-xs text-slate-500 mb-1">Preview:</div>
                                <div className="text-sm text-white font-mono bg-slate-800 px-2 py-1 rounded">
                                    {previewValue}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Add Custom Variable */}
                <div className="border-t border-slate-700/50 p-3">
                    {showCustomForm ? (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={newVarName}
                                onChange={(e) => setNewVarName(e.target.value)}
                                placeholder="Variable name (e.g., my_var)"
                                className="w-full bg-slate-800 border border-slate-700/50 rounded px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            />
                            <input
                                type="text"
                                value={newVarValue}
                                onChange={(e) => setNewVarValue(e.target.value)}
                                placeholder="Value"
                                className="w-full bg-slate-800 border border-slate-700/50 rounded px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowCustomForm(false)}
                                    className="flex-1 px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateCustomVariable}
                                    className="flex-1 px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowCustomForm(true)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 border border-dashed border-slate-700 rounded-lg transition-colors"
                        >
                            <Plus size={12} />
                            Add Custom Variable
                        </button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default VariableInsertMenu;
