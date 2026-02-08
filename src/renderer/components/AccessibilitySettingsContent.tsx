/**
 * Accessibility Settings Content
 *
 * Inline accessibility settings for Settings page
 */

import React, { useState, useEffect } from 'react';
import { Eye, Keyboard, Hand, Volume2 } from 'lucide-react';
import {
    accessibilityService,
    AccessibilityConfig,
    KeyboardShortcut,
} from '../services/accessibility';
import { useGestureConfig } from '../hooks/useGestures';
import { toast } from 'sonner';

export const AccessibilitySettingsContent: React.FC = () => {
    const [config, setConfig] = useState<AccessibilityConfig>(accessibilityService.getConfig());
    const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
    const { config: gestureConfig, updateConfig: updateGestureConfig, resetConfig: resetGestureConfig } = useGestureConfig();

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

    const handleGestureConfigChange = (updates: Partial<typeof gestureConfig>, showToast = true) => {
        updateGestureConfig(updates);
        if (showToast) {
            toast.success('Gesture settings updated');
        }
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
                            onChange={(e) => handleConfigChange({ colorBlindMode: e.target.value as AccessibilityConfig['colorBlindMode'] })}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                        >
                            <option value="none">None</option>
                            <option value="protanopia">Protanopia</option>
                            <option value="deuteranopia">Deuteranopia</option>
                            <option value="tritanopia">Tritanopia</option>
                        </select>
                    </div>

                    <div className="p-4 bg-slate-800 rounded border border-slate-700">
                        <div className="font-medium text-white mb-2">Touch Target Size</div>
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                { value: 'standard', label: '44px' },
                                { value: 'large', label: '48px' },
                                { value: 'xlarge', label: '56px' },
                            ] as const).map((size) => (
                                <button
                                    key={size.value}
                                    onClick={() => handleConfigChange({ touchTargetSize: size.value })}
                                    className={`px-3 py-2 rounded transition-colors text-sm ${
                                        config.touchTargetSize === size.value
                                            ? 'bg-green-600 text-white'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                                >
                                    {size.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            Sets the minimum touch target size for controls.
                        </p>
                    </div>
                </div>
            </section>

            {/* Gesture Settings */}
            <section>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Hand size={18} />
                    Gesture Controls
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-800 rounded border border-slate-700">
                        <div>
                            <div className="font-medium text-white">Pinch to Zoom</div>
                            <div className="text-sm text-slate-400">Adjust conversation text size with pinch gestures</div>
                        </div>
                        <button
                            onClick={() => handleGestureConfigChange({ enablePinchZoom: !gestureConfig.enablePinchZoom })}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                gestureConfig.enablePinchZoom ? 'bg-green-500' : 'bg-slate-700'
                            }`}
                            aria-label={gestureConfig.enablePinchZoom ? 'Disable pinch to zoom' : 'Enable pinch to zoom'}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                gestureConfig.enablePinchZoom ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-800 rounded border border-slate-700">
                        <div>
                            <div className="font-medium text-white">Two-Finger Swipe Navigation</div>
                            <div className="text-sm text-slate-400">Swipe left/right in chat or up/down in history to switch conversations</div>
                        </div>
                        <button
                            onClick={() => handleGestureConfigChange({ enableSwipeNavigation: !gestureConfig.enableSwipeNavigation })}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                gestureConfig.enableSwipeNavigation ? 'bg-green-500' : 'bg-slate-700'
                            }`}
                            aria-label={gestureConfig.enableSwipeNavigation ? 'Disable swipe navigation' : 'Enable swipe navigation'}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                gestureConfig.enableSwipeNavigation ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-800 rounded border border-slate-700">
                        <div>
                            <div className="font-medium text-white">Long Press Context Menu</div>
                            <div className="text-sm text-slate-400">Show message actions by pressing and holding on touch</div>
                        </div>
                        <button
                            onClick={() => handleGestureConfigChange({ enableLongPress: !gestureConfig.enableLongPress })}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                gestureConfig.enableLongPress ? 'bg-green-500' : 'bg-slate-700'
                            }`}
                            aria-label={gestureConfig.enableLongPress ? 'Disable long press' : 'Enable long press'}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                gestureConfig.enableLongPress ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>

                    <div className="p-4 bg-slate-800 rounded border border-slate-700 space-y-3">
                        <div className="text-sm font-medium text-white">Pinch Sensitivity: {gestureConfig.pinchSensitivity.toFixed(1)}x</div>
                        <input
                            type="range"
                            min={0.5}
                            max={2}
                            step={0.1}
                            value={gestureConfig.pinchSensitivity}
                            onChange={(e) => handleGestureConfigChange({ pinchSensitivity: Number(e.target.value) }, false)}
                            className="w-full"
                        />

                        <div className="text-sm font-medium text-white">Swipe Sensitivity: {gestureConfig.swipeSensitivity.toFixed(1)}x</div>
                        <input
                            type="range"
                            min={0.5}
                            max={2}
                            step={0.1}
                            value={gestureConfig.swipeSensitivity}
                            onChange={(e) => handleGestureConfigChange({ swipeSensitivity: Number(e.target.value) }, false)}
                            className="w-full"
                        />

                        <div className="text-sm font-medium text-white">Long Press Delay: {gestureConfig.longPressDuration}ms</div>
                        <input
                            type="range"
                            min={300}
                            max={1200}
                            step={50}
                            value={gestureConfig.longPressDuration}
                            onChange={(e) => handleGestureConfigChange({ longPressDuration: Number(e.target.value) }, false)}
                            className="w-full"
                        />

                        <button
                            onClick={() => {
                                resetGestureConfig();
                                toast.success('Gesture settings reset');
                            }}
                            className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors"
                        >
                            Reset Gesture Defaults
                        </button>
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
