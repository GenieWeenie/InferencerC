/**
 * Accessibility Settings Content
 *
 * Inline accessibility settings for Settings page
 */

import React, { useState, useEffect } from 'react';
import { Eye, Keyboard, Type, Palette, Volume2 } from 'lucide-react';
import {
    accessibilityService,
    AccessibilityConfig,
    KeyboardShortcut,
} from '../services/accessibility';
import { toast } from 'sonner';

export const AccessibilitySettingsContent: React.FC = () => {
    const [config, setConfig] = useState<AccessibilityConfig>(accessibilityService.getConfig());
    const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);

    useEffect(() => {
        setConfig(accessibilityService.getConfig());
        setShortcuts(accessibilityService.getKeyboardShortcuts());
    }, []);

    const handleConfigChange = (updates: Partial<AccessibilityConfig>) => {
        const updated = { ...config, ...updates };
        setConfig(updated);
        accessibilityService.updateConfig(updates);
        toast.success('Accessibility settings updated');
    };

    return (
        <div className="space-y-6">
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
                            onChange={(e) => handleConfigChange({ colorBlindMode: e.target.value as any })}
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
    );
};
