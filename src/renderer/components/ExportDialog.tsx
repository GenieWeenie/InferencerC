/**
 * Export Dialog Component
 * 
 * A modal dialog for exporting conversations to various formats:
 * - PDF: Professional document export with formatting
 * - DOCX: Microsoft Word format for editing
 * - HTML: Standalone HTML file with styling
 * - Markdown: Plain markdown format
 * - JSON: Raw data export
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Download,
    FileText,
    FileCode,
    FileJson,
    File,
    CheckCircle2,
    Loader2,
    Settings2,
    Clock,
    Tag,
    Image
} from 'lucide-react';
import { ExportService, ExportFormat, ExportOptions, ExportResult } from '../lib/exportService';
import { ChatMessage } from '../../shared/types';
import {
    pluginSystemService,
    RegisteredPluginExportFormat,
} from '../services/pluginSystem';

interface ExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    sessionTitle?: string;
}

interface FormatOption {
    id: ExportFormat;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
}

const coreFormatOptions: FormatOption[] = [
    {
        id: 'pdf',
        label: 'PDF',
        description: 'Professional document format',
        icon: FileText,
        color: 'text-red-400 bg-red-400/10 border-red-400/20'
    },
    {
        id: 'docx',
        label: 'Word (DOCX)',
        description: 'Editable Microsoft Word document',
        icon: File,
        color: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    },
    {
        id: 'html',
        label: 'HTML',
        description: 'Standalone HTML file with styling',
        icon: FileCode,
        color: 'text-orange-400 bg-orange-400/10 border-orange-400/20'
    },
    {
        id: 'markdown',
        label: 'Markdown',
        description: 'Plain text with formatting',
        icon: FileText,
        color: 'text-purple-400 bg-purple-400/10 border-purple-400/20'
    },
    {
        id: 'json',
        label: 'JSON',
        description: 'Raw data export',
        icon: FileJson,
        color: 'text-green-400 bg-green-400/10 border-green-400/20'
    }
];

const ExportDialog: React.FC<ExportDialogProps> = ({
    isOpen,
    onClose,
    messages,
    sessionTitle = 'Conversation'
}) => {
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
    const [pluginFormats, setPluginFormats] = useState<RegisteredPluginExportFormat[]>([]);
    const [title, setTitle] = useState(sessionTitle);
    const [includeMetadata, setIncludeMetadata] = useState(true);
    const [includeTimestamps, setIncludeTimestamps] = useState(true);
    const [includeImages, setIncludeImages] = useState(true);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [isExporting, setIsExporting] = useState(false);
    const [exportResult, setExportResult] = useState<ExportResult | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const syncPluginFormats = () => {
            setPluginFormats(pluginSystemService.getRegisteredExportFormats());
        };

        syncPluginFormats();
        const unsubscribe = pluginSystemService.subscribe(() => syncPluginFormats());
        return unsubscribe;
    }, [isOpen]);

    const formatOptions = useMemo<FormatOption[]>(() => {
        const pluginOptions: FormatOption[] = pluginFormats.map(pluginFormat => ({
            id: pluginFormat.runtimeId as ExportFormat,
            label: `${pluginFormat.format.label} (Plugin)`,
            description: `${pluginFormat.format.description} • ${pluginFormat.pluginName}`,
            icon: FileCode,
            color: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/20',
        }));

        return [...coreFormatOptions, ...pluginOptions];
    }, [pluginFormats]);

    useEffect(() => {
        if (!formatOptions.some(format => format.id === selectedFormat)) {
            setSelectedFormat(formatOptions[0]?.id || 'pdf');
        }
    }, [formatOptions, selectedFormat]);

    const handleExport = async () => {
        setIsExporting(true);
        setExportResult(null);

        try {
            const options: ExportOptions = {
                format: selectedFormat,
                title,
                includeMetadata,
                includeTimestamps,
                includeImages,
                theme
            };

            const result = await ExportService.exportConversation(messages, options);
            setExportResult(result);

            if (result.success) {
                // Auto-close after successful export
                setTimeout(() => {
                    onClose();
                    setExportResult(null);
                }, 2000);
            }
        } catch (error) {
            setExportResult({
                success: false,
                fileName: '',
                error: error instanceof Error ? error.message : 'Export failed'
            });
        } finally {
            setIsExporting(false);
        }
    };

    const estimatedSize = ExportService.estimateFileSize(messages, selectedFormat);

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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
                        animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                        exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 w-full max-w-lg max-h-[85vh] bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl z-[101] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Download className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Export Conversation</h2>
                                    <p className="text-sm text-slate-400">{messages.length} messages</p>
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
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Title Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Export Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter a title for your export"
                                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                />
                            </div>

                            {/* Format Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-3">
                                    Export Format
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {formatOptions.map((format) => {
                                        const Icon = format.icon;
                                        const isSelected = selectedFormat === format.id;
                                        return (
                                            <button
                                                key={format.id}
                                                onClick={() => setSelectedFormat(format.id)}
                                                className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${isSelected
                                                    ? `${format.color} border-current`
                                                    : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg ${isSelected ? format.color : 'bg-slate-700/50'}`}>
                                                        <Icon className={`w-4 h-4 ${isSelected ? '' : 'text-slate-400'}`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                                            {format.label}
                                                        </div>
                                                        <div className="text-xs text-slate-500 truncate">
                                                            {format.description}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <motion.div
                                                        layoutId="format-check"
                                                        className="absolute top-2 right-2"
                                                    >
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </motion.div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Advanced Options Toggle */}
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
                            >
                                <Settings2 className="w-4 h-4" />
                                <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Options</span>
                            </button>

                            {/* Advanced Options */}
                            <AnimatePresence>
                                {showAdvanced && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="space-y-4 overflow-hidden"
                                    >
                                        {/* Option Toggles */}
                                        <div className="space-y-3">
                                            <ToggleOption
                                                icon={Tag}
                                                label="Include Metadata"
                                                description="Add export date and message count"
                                                checked={includeMetadata}
                                                onChange={setIncludeMetadata}
                                            />
                                            <ToggleOption
                                                icon={Clock}
                                                label="Include Timestamps"
                                                description="Show generation time for each message"
                                                checked={includeTimestamps}
                                                onChange={setIncludeTimestamps}
                                            />
                                            <ToggleOption
                                                icon={Image}
                                                label="Include Images"
                                                description="Export attached images (JSON only)"
                                                checked={includeImages}
                                                onChange={setIncludeImages}
                                                disabled={selectedFormat !== 'json'}
                                            />
                                        </div>

                                        {/* Theme Selection (for HTML) */}
                                        {selectedFormat === 'html' && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                                    HTML Theme
                                                </label>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => setTheme('dark')}
                                                        className={`flex-1 px-4 py-2 rounded-lg border transition-all ${theme === 'dark'
                                                            ? 'bg-slate-800 border-blue-500 text-white'
                                                            : 'bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-600'
                                                            }`}
                                                    >
                                                        Dark
                                                    </button>
                                                    <button
                                                        onClick={() => setTheme('light')}
                                                        className={`flex-1 px-4 py-2 rounded-lg border transition-all ${theme === 'light'
                                                            ? 'bg-white border-blue-500 text-slate-900'
                                                            : 'bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-600'
                                                            }`}
                                                    >
                                                        Light
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Export Result */}
                            <AnimatePresence>
                                {exportResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className={`p-4 rounded-xl ${exportResult.success
                                            ? 'bg-green-500/10 border border-green-500/30'
                                            : 'bg-red-500/10 border border-red-500/30'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2
                                                className={`w-5 h-5 ${exportResult.success ? 'text-green-400' : 'text-red-400'
                                                    }`}
                                            />
                                            <div>
                                                <div className={exportResult.success ? 'text-green-300' : 'text-red-300'}>
                                                    {exportResult.success
                                                        ? 'Export successful!'
                                                        : 'Export failed'}
                                                </div>
                                                <div className="text-sm text-slate-400">
                                                    {exportResult.success
                                                        ? exportResult.fileName
                                                        : exportResult.error}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-700/50 bg-slate-800/30">
                            <div className="text-sm text-slate-500">
                                Estimated size: ~{estimatedSize} KB
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting || messages.length === 0}
                                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-all shadow-lg shadow-blue-900/30 disabled:shadow-none"
                                >
                                    {isExporting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Exporting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            <span>Export</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

// Toggle Option Component
interface ToggleOptionProps {
    icon: React.ElementType;
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

const ToggleOption: React.FC<ToggleOptionProps> = ({
    icon: Icon,
    label,
    description,
    checked,
    onChange,
    disabled = false
}) => (
    <div
        className={`flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/50 ${disabled ? 'opacity-50' : ''
            }`}
    >
        <div className="flex items-center gap-3">
            <Icon className="w-4 h-4 text-slate-400" />
            <div>
                <div className="text-sm text-slate-300">{label}</div>
                <div className="text-xs text-slate-500">{description}</div>
            </div>
        </div>
        <button
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`w-10 h-6 rounded-full transition-all ${checked
                ? 'bg-blue-600'
                : 'bg-slate-700'
                }`}
        >
            <motion.div
                animate={{ x: checked ? 16 : 2 }}
                className="w-5 h-5 bg-white rounded-full shadow-md"
            />
        </button>
    </div>
);

export default ExportDialog;
