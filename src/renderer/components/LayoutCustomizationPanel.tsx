/**
 * Layout Customization Panel
 *
 * Drag-and-drop layout customization UI
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GripVertical, Eye, EyeOff, Save, RotateCcw, Layout } from 'lucide-react';
import {
    layoutCustomizationService,
    LayoutPreset,
    PanelConfig,
} from '../services/layoutCustomization';
import { toast } from 'sonner';

interface LayoutCustomizationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onLayoutChange?: (panels: PanelConfig[]) => void;
}

export const LayoutCustomizationPanel: React.FC<LayoutCustomizationPanelProps> = ({
    isOpen,
    onClose,
    onLayoutChange,
}) => {
    const [panels, setPanels] = useState<PanelConfig[]>([]);
    const [presets, setPresets] = useState<LayoutPreset[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadLayout();
        }
    }, [isOpen]);

    const loadLayout = () => {
        const layout = layoutCustomizationService.getLayout();
        setPanels([...layout.panels]);
        setPresets([...layoutCustomizationService.getBuiltInPresets(), ...layout.customPresets]);
    };

    const handleToggleVisibility = (panelId: string) => {
        const panel = panels.find(p => p.id === panelId);
        if (!panel) return;
        const newVisible = !panel.visible;
        layoutCustomizationService.updatePanel(panelId, { visible: newVisible });
        const updated = panels.map(p => p.id === panelId ? { ...p, visible: newVisible } : p);
        setPanels(updated);
        onLayoutChange?.(updated);
        // Force a storage event to notify other components
        window.dispatchEvent(new Event('storage'));
    };

    const handleResize = (panelId: string, newSize: number) => {
        layoutCustomizationService.updatePanel(panelId, { size: newSize });
        const updated = panels.map(p => p.id === panelId ? { ...p, size: newSize } : p);
        setPanels(updated);
        onLayoutChange?.(updated);
        // Force a storage event to notify other components
        window.dispatchEvent(new Event('storage'));
    };

    const handleSavePreset = () => {
        const name = prompt('Preset name:');
        if (name) {
            const preset = layoutCustomizationService.createPreset(name, 'Custom layout preset');
            setPresets([...presets, preset]);
            toast.success('Preset saved!');
        }
    };

    const handleApplyPreset = (presetId: string) => {
        layoutCustomizationService.applyPreset(presetId);
        // Force reload from storage
        const updatedLayout = layoutCustomizationService.getLayout();
        const updatedPanels = [...updatedLayout.panels];
        setPanels(updatedPanels);
        toast.success('Preset applied!');
        // Trigger layout change callback
        onLayoutChange?.(updatedPanels);
        // Force a storage event to notify other components
        window.dispatchEvent(new Event('storage'));
    };

    const handleReset = () => {
        if (confirm('Reset to default layout?')) {
            layoutCustomizationService.resetToDefault();
            loadLayout();
            toast.success('Layout reset!');
            onLayoutChange?.(panels);
        }
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
                            <Layout className="w-6 h-6 text-blue-400" />
                            <h2 className="text-2xl font-bold text-white">Layout Customization</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
                            aria-label="Close layout customization"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Presets */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Layout Presets</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {presets.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => handleApplyPreset(preset.id)}
                                        className="p-3 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-left transition-colors"
                                    >
                                        <div className="font-semibold text-white text-sm">{preset.name}</div>
                                        <div className="text-xs text-slate-400 mt-1">{preset.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Panels */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-slate-300">Panels</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSavePreset}
                                        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
                                    >
                                        <Save size={12} />
                                        Save Preset
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center gap-2"
                                    >
                                        <RotateCcw size={12} />
                                        Reset
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {panels.map((panel, index) => (
                                    <div
                                        key={panel.id}
                                        className="flex items-center gap-3 p-3 bg-slate-800 rounded border border-slate-700"
                                    >
                                        <GripVertical className="w-4 h-4 text-slate-500" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-white capitalize">
                                                    {panel.type}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {panel.position} • {panel.size}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min="10"
                                                max="50"
                                                value={panel.size}
                                                onChange={(e) => handleResize(panel.id, parseInt(e.target.value))}
                                                className="w-20"
                                            />
                                            <button
                                                onClick={() => handleToggleVisibility(panel.id)}
                                                className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                                                aria-label={panel.visible ? 'Hide panel' : 'Show panel'}
                                            >
                                                {panel.visible ? (
                                                    <Eye className="w-4 h-4 text-green-400" />
                                                ) : (
                                                    <EyeOff className="w-4 h-4 text-slate-500" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
