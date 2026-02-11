/**
 * Accessibility Settings Panel
 *
 * WCAG 2.1 AA compliance settings
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Keyboard, Type, Palette, Volume2 } from 'lucide-react';
import {
    accessibilityService,
    AccessibilityConfig,
    KeyboardShortcut,
} from '../services/accessibility';
import { toast } from 'sonner';

interface AccessibilitySettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({
    isOpen,
    onClose,
}) => {
    const isColorBlindMode = (
        value: string
    ): value is AccessibilityConfig['colorBlindMode'] => {
        return value === 'none' || value === 'protanopia' || value === 'deuteranopia' || value === 'tritanopia';
    };

    const [config, setConfig] = useState<AccessibilityConfig>(accessibilityService.getConfig());
    const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);

    useEffect(() => {
        if (isOpen) {
            setConfig(accessibilityService.getConfig());
            setShortcuts(accessibilityService.getKeyboardShortcuts());
        }
    }, [isOpen]);

    const handleConfigChange = (updates: Partial<AccessibilityConfig>) => {
        const updated = { ...config, ...updates };
        setConfig(updated);
        accessibilityService.updateConfig(updates);
        toast.success('Accessibility settings updated');
    };

    const handleShortcutChange = (index: number, updates: Partial<KeyboardShortcut>) => {
        const updated = [...shortcuts];
        updated[index] = { ...updated[index], ...updates };
        setShortcuts(updated);
        accessibilityService.updateKeyboardShortcuts(updated);
        toast.success('Keyboard shortcut updated');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-4xl h-[90vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <Eye className="w-6 h-6 text-green-400" />
                            <h2 className="text-2xl font-bold text-white">Accessibility Settings</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
                            aria-label="Close accessibility settings"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Visual Settings */}
                        <section>
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Eye size={18} />
                                Visual Settings
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-800 rounded border border-slate-700">
                                    <div>
                                        <div className="font-medium text-white">High Contrast</div>
                                        <div className="text-sm text-slate-400">Increase contrast for better visibility</div>
                                    </div>
                                    <button
                                        onClick={() => handleConfigChange({ highContrast: !config.highContrast })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            config.highContrast ? 'bg-green-500' : 'bg-slate-700'
                                        }`}
                                        aria-label={config.highContrast ? 'Disable high contrast' : 'Enable high contrast'}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                            config.highContrast ? 'translate-x-6' : 'translate-x-0'
                                        }`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-800 rounded border border-slate-700">
                                    <div>
                                        <div className="font-medium text-white">Reduced Motion</div>
                                        <div className="text-sm text-slate-400">Reduce animations and transitions</div>
                                    </div>
                                    <button
                                        onClick={() => handleConfigChange({ reducedMotion: !config.reducedMotion })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            config.reducedMotion ? 'bg-green-500' : 'bg-slate-700'
                                        }`}
                                        aria-label={config.reducedMotion ? 'Disable reduced motion' : 'Enable reduced motion'}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                            config.reducedMotion ? 'translate-x-6' : 'translate-x-0'
                                        }`} />
                                    </button>
                                </div>

                                <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                    <div className="font-medium text-white mb-2">Font Size</div>
                                    <div className="flex gap-2">
                                        {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => handleConfigChange({ fontSize: size })}
                                                className={`px-4 py-2 rounded transition-colors ${
                                                    config.fontSize === size
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                }`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                    <div className="font-medium text-white mb-2">Color Blind Mode</div>
                                    <select
                                        value={config.colorBlindMode}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (isColorBlindMode(value)) {
                                                handleConfigChange({ colorBlindMode: value });
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                                    >
                                        <option value="none">None</option>
                                        <option value="protanopia">Protanopia</option>
                                        <option value="deuteranopia">Deuteranopia</option>
                                        <option value="tritanopia">Tritanopia</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Keyboard Navigation */}
                        <section>
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Keyboard size={18} />
                                Keyboard Navigation
                            </h3>
                            <div className="space-y-2">
                                {shortcuts.map((shortcut, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-white">{shortcut.description}</div>
                                            <div className="text-sm text-slate-400 mt-1">
                                                {[
                                                    shortcut.ctrl && 'Ctrl',
                                                    shortcut.shift && 'Shift',
                                                    shortcut.alt && 'Alt',
                                                    shortcut.key,
                                                ].filter(Boolean).join(' + ')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Screen Reader */}
                        <section>
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Volume2 size={18} />
                                Screen Reader
                            </h3>
                            <div className="flex items-center justify-between p-4 bg-slate-800 rounded border border-slate-700">
                                <div>
                                    <div className="font-medium text-white">Screen Reader Support</div>
                                    <div className="text-sm text-slate-400">Enable ARIA labels and announcements</div>
                                </div>
                                <button
                                    onClick={() => handleConfigChange({ screenReader: !config.screenReader })}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${
                                        config.screenReader ? 'bg-green-500' : 'bg-slate-700'
                                    }`}
                                    aria-label={config.screenReader ? 'Disable screen reader' : 'Enable screen reader'}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                        config.screenReader ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                                </button>
                            </div>
                        </section>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
