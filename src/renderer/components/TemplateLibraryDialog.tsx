/**
 * Template Library Dialog
 * 
 * A modal for browsing, creating, and managing conversation templates.
 * Features:
 * - Browse templates by category
 * - Search templates
 * - Preview template content
 * - Use template to start new conversation
 * - Create new templates from current conversation
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    Plus,
    Trash2,
    Play,
    Code2,
    FileText,
    BarChart3,
    Lightbulb,
    Brain,
    MessageSquare,
    Star,
    Clock,
    Tag,
    Download,
    Upload,
    Copy,
    Check,
    ChevronRight,
} from 'lucide-react';
import { TemplateService, ConversationTemplate, TemplateCategory } from '../services/templates';
import { ChatMessage } from '../../shared/types';
import { toast } from 'sonner';

interface TemplateLibraryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onUseTemplate: (template: ConversationTemplate) => void;
    currentMessages?: ChatMessage[];
    currentSystemPrompt?: string;
    currentSettings?: {
        temperature?: number;
        topP?: number;
        maxTokens?: number;
        expertMode?: string | null;
        thinkingEnabled?: boolean;
    };
}

const iconMap: Record<string, React.ElementType> = {
    Code2,
    FileText,
    BarChart3,
    Lightbulb,
    Brain,
    MessageSquare,
};

const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    green: 'text-green-400 bg-green-400/10 border-green-400/20',
    yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    pink: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
    slate: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

const TemplateLibraryDialog: React.FC<TemplateLibraryDialogProps> = ({
    isOpen,
    onClose,
    onUseTemplate,
    currentMessages = [],
    currentSystemPrompt,
    currentSettings,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<ConversationTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateDescription, setNewTemplateDescription] = useState('');
    const [newTemplateCategory, setNewTemplateCategory] = useState('general');
    const [newTemplateTags, setNewTemplateTags] = useState('');

    const categories = useMemo(() => TemplateService.getCategories(), []);
    const allTemplates = useMemo(() => TemplateService.getAllTemplates(), [isOpen]);

    const filteredTemplates = useMemo(() => {
        let templates = allTemplates;

        if (selectedCategory) {
            templates = templates.filter(t => t.category === selectedCategory);
        }

        if (searchQuery.trim()) {
            templates = TemplateService.searchTemplates(searchQuery);
            if (selectedCategory) {
                templates = templates.filter(t => t.category === selectedCategory);
            }
        }

        return templates;
    }, [allTemplates, selectedCategory, searchQuery]);

    const mostUsedTemplates = useMemo(() => TemplateService.getMostUsedTemplates(3), [isOpen]);

    const handleUseTemplate = (template: ConversationTemplate) => {
        TemplateService.recordUsage(template.id);
        onUseTemplate(template);
        onClose();
        toast.success(`Started new conversation from "${template.name}"`);
    };

    const handleCreateTemplate = () => {
        if (!newTemplateName.trim()) {
            toast.error('Please enter a template name');
            return;
        }

        if (currentMessages.length === 0) {
            toast.error('No messages to save as template');
            return;
        }

        const tags = newTemplateTags.split(',').map(t => t.trim()).filter(Boolean);

        TemplateService.createTemplate(
            newTemplateName,
            newTemplateDescription,
            newTemplateCategory,
            currentMessages,
            currentSystemPrompt,
            currentSettings,
            tags
        );

        toast.success('Template created successfully!');
        setIsCreating(false);
        setNewTemplateName('');
        setNewTemplateDescription('');
        setNewTemplateCategory('general');
        setNewTemplateTags('');
    };

    const handleDeleteTemplate = (templateId: string) => {
        const deleted = TemplateService.deleteTemplate(templateId);
        if (deleted) {
            toast.success('Template deleted');
            setSelectedTemplate(null);
        } else {
            toast.error('Cannot delete built-in templates');
        }
    };

    const handleExportTemplates = () => {
        const json = TemplateService.exportTemplates();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-templates-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Templates exported');
    };

    const handleImportTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const { imported, errors } = TemplateService.importTemplates(content);

            if (imported > 0) {
                toast.success(`Imported ${imported} templates`);
            }
            if (errors.length > 0) {
                errors.forEach(err => toast.error(err));
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const getCategoryIcon = (iconName: string): React.ElementType => {
        return iconMap[iconName] || MessageSquare;
    };



    // ...

    if (!isOpen) return null;

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
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
                        animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                        exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 w-[90vw] max-w-4xl h-[85vh] bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl z-[101] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl">
                                    <FileText className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Template Library</h2>
                                    <p className="text-sm text-slate-400">{allTemplates.length} templates available</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {currentMessages.length > 0 && (
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm"
                                    >
                                        <Plus size={16} />
                                        Save as Template
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Sidebar - Categories */}
                            <div className="w-48 flex-shrink-0 border-r border-slate-700/50 p-4 space-y-4">
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                        Categories
                                    </h3>
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => setSelectedCategory(null)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${!selectedCategory
                                                ? 'bg-blue-600/20 text-blue-400'
                                                : 'text-slate-400 hover:bg-slate-800'
                                                }`}
                                        >
                                            <Star size={14} />
                                            All Templates
                                        </button>
                                        {categories.map((cat) => {
                                            const Icon = getCategoryIcon(cat.icon);
                                            const count = allTemplates.filter(t => t.category === cat.id).length;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setSelectedCategory(cat.id)}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat.id
                                                        ? `${colorMap[cat.color]} border`
                                                        : 'text-slate-400 hover:bg-slate-800'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Icon size={14} />
                                                        {cat.name}
                                                    </div>
                                                    <span className="text-xs text-slate-500">{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="pt-4 border-t border-slate-700/50">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                        Actions
                                    </h3>
                                    <div className="space-y-1">
                                        <button
                                            onClick={handleExportTemplates}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:bg-slate-800 rounded-lg text-sm transition-colors"
                                        >
                                            <Download size={14} />
                                            Export
                                        </button>
                                        <label className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:bg-slate-800 rounded-lg text-sm transition-colors cursor-pointer">
                                            <Upload size={14} />
                                            Import
                                            <input
                                                type="file"
                                                accept=".json"
                                                onChange={handleImportTemplates}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 overflow-y-auto">
                                {/* Search */}
                                <div className="sticky top-0 p-4 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search templates..."
                                            className="w-full bg-slate-800 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Most Used (only on All Templates view) */}
                                {!selectedCategory && !searchQuery && mostUsedTemplates.length > 0 && (
                                    <div className="p-4 border-b border-slate-700/50">
                                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                            <Clock size={12} />
                                            Recently Used
                                        </h3>
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {mostUsedTemplates.map((template) => (
                                                <button
                                                    key={template.id}
                                                    onClick={() => handleUseTemplate(template)}
                                                    className="flex-shrink-0 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg text-sm text-white transition-colors"
                                                >
                                                    {template.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Templates Grid */}
                                <div className="p-4 grid grid-cols-2 gap-3">
                                    {filteredTemplates.map((template) => {
                                        const category = categories.find(c => c.id === template.category);
                                        const Icon = category ? getCategoryIcon(category.icon) : MessageSquare;
                                        const color = category ? colorMap[category.color] : colorMap.slate;

                                        return (
                                            <motion.div
                                                key={template.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`group relative p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl cursor-pointer transition-all ${selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                                                    }`}
                                                onClick={() => setSelectedTemplate(template)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg ${color}`}>
                                                        <Icon size={16} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-white truncate">
                                                            {template.name}
                                                        </h4>
                                                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                                            {template.description}
                                                        </p>
                                                        {template.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {template.tags.slice(0, 3).map((tag) => (
                                                                    <span
                                                                        key={tag}
                                                                        className="px-1.5 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded"
                                                                    >
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Quick Use Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUseTemplate(template);
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Use template"
                                                >
                                                    <Play size={12} />
                                                </button>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {filteredTemplates.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                                            <FileText size={32} className="text-slate-500" />
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-300 mb-2">
                                            No templates found
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            {searchQuery ? 'Try a different search term' : 'Create your first template!'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Template Preview Sidebar */}
                            <AnimatePresence>
                                {selectedTemplate && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 320, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="flex-shrink-0 border-l border-slate-700/50 overflow-hidden"
                                    >
                                        <div className="w-80 h-full flex flex-col">
                                            <div className="p-4 border-b border-slate-700/50">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="font-semibold text-white">{selectedTemplate.name}</h3>
                                                    <button
                                                        onClick={() => setSelectedTemplate(null)}
                                                        className="p-1 hover:bg-slate-700 rounded"
                                                    >
                                                        <X size={14} className="text-slate-400" />
                                                    </button>
                                                </div>
                                                <p className="text-sm text-slate-400">{selectedTemplate.description}</p>
                                            </div>

                                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                                {/* System Prompt */}
                                                {selectedTemplate.systemPrompt && (
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                            System Prompt
                                                        </h4>
                                                        <p className="text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg">
                                                            {selectedTemplate.systemPrompt}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Initial Messages Preview */}
                                                <div>
                                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                        Initial Messages ({selectedTemplate.initialMessages.length})
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {selectedTemplate.initialMessages.slice(0, 2).map((msg, i) => (
                                                            <div
                                                                key={i}
                                                                className="p-3 bg-slate-800/50 rounded-lg"
                                                            >
                                                                <div className="text-xs text-slate-500 mb-1 capitalize">
                                                                    {msg.role}
                                                                </div>
                                                                <p className="text-sm text-slate-300 line-clamp-3">
                                                                    {msg.content}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Usage Stats */}
                                                <div className="text-xs text-slate-500">
                                                    Used {selectedTemplate.usageCount} times
                                                </div>
                                            </div>

                                            <div className="flex-shrink-0 p-4 border-t border-slate-700/50 space-y-2">
                                                <button
                                                    onClick={() => handleUseTemplate(selectedTemplate)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                                                >
                                                    <Play size={16} />
                                                    Use Template
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* Create Template Modal */}
                    <AnimatePresence>
                        {isCreating && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsCreating(false)}
                                    className="fixed inset-0 bg-black/50 z-[102]"
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl z-[103] p-6"
                                >
                                    <h3 className="text-lg font-semibold text-white mb-4">
                                        Save as Template
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={newTemplateName}
                                                onChange={(e) => setNewTemplateName(e.target.value)}
                                                placeholder="My Template"
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Description</label>
                                            <textarea
                                                value={newTemplateDescription}
                                                onChange={(e) => setNewTemplateDescription(e.target.value)}
                                                placeholder="What is this template for?"
                                                rows={2}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Category</label>
                                            <select
                                                value={newTemplateCategory}
                                                onChange={(e) => setNewTemplateCategory(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            >
                                                {categories.map((cat) => (
                                                    <option key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm text-slate-400 mb-1">Tags (comma-separated)</label>
                                            <input
                                                type="text"
                                                value={newTemplateTags}
                                                onChange={(e) => setNewTemplateTags(e.target.value)}
                                                placeholder="tag1, tag2, tag3"
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            />
                                        </div>

                                        <div className="text-sm text-slate-500">
                                            This will save {currentMessages.length} messages as the template's starting point.
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => setIsCreating(false)}
                                            className="flex-1 px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCreateTemplate}
                                            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                                        >
                                            Create Template
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default TemplateLibraryDialog;
