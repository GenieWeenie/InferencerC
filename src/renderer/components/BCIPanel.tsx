/**
 * Brain-Computer Interface Panel
 *
 * Experimental BCI integration UI
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Activity, Zap, TrendingUp } from 'lucide-react';
import {
    bciService,
    BCISignal,
    ThoughtPattern,
} from '../services/brainComputerInterface';
import { toast } from 'sonner';

interface BCIPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BCIPanel: React.FC<BCIPanelProps> = ({
    isOpen,
    onClose,
}) => {
    const [config, setConfig] = useState(bciService.getConfig());
    const [isRecording, setIsRecording] = useState(false);
    const [recentSignals, setRecentSignals] = useState<BCISignal[]>([]);
    const [detectedThoughts, setDetectedThoughts] = useState<ThoughtPattern[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        const signalUnsubscribe = bciService.subscribeToSignals((signal) => {
            setRecentSignals(prev => [...prev.slice(-49), signal]);
        });

        const thoughtUnsubscribe = bciService.subscribeToThoughts((thought) => {
            setDetectedThoughts(prev => [...prev.slice(-9), thought]);
            toast.info(`Thought detected: ${thought.meaning}`);
        });

        return () => {
            signalUnsubscribe();
            thoughtUnsubscribe();
        };
    }, [isOpen]);

    const handleToggleRecording = () => {
        if (isRecording) {
            bciService.stopRecording();
            setIsRecording(false);
        } else {
            bciService.startRecording();
            setIsRecording(true);
        }
    };

    const handleConfigChange = (updates: Partial<typeof config>) => {
        const updated = { ...config, ...updates };
        setConfig(updated);
        bciService.saveConfig(updates);
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
                            <Brain className="w-6 h-6 text-purple-400" />
                            <h2 className="text-2xl font-bold text-white">Brain-Computer Interface</h2>
                            <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                                Experimental
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
                            aria-label="Close BCI panel"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Configuration */}
                        <section>
                            <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-800 rounded border border-slate-700">
                                    <div>
                                        <div className="font-medium text-white">Enable BCI</div>
                                        <div className="text-sm text-slate-400">Connect to brain-computer interface device</div>
                                    </div>
                                    <button
                                        onClick={() => handleConfigChange({ enabled: !config.enabled })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            config.enabled ? 'bg-purple-500' : 'bg-slate-700'
                                        }`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                            config.enabled ? 'translate-x-6' : 'translate-x-0'
                                        }`} />
                                    </button>
                                </div>

                                <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Device Type</label>
                                    <select
                                        value={config.deviceType}
                                        onChange={(e) => handleConfigChange({ deviceType: e.target.value as any })}
                                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                                    >
                                        <option value="simulated">Simulated (Testing)</option>
                                        <option value="emotiv">Emotiv</option>
                                        <option value="neurosky">NeuroSky</option>
                                        <option value="openbci">OpenBCI</option>
                                    </select>
                                </div>

                                <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Sensitivity: {config.sensitivity}
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={config.sensitivity}
                                        onChange={(e) => handleConfigChange({ sensitivity: parseFloat(e.target.value) })}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Recording Controls */}
                        <section>
                            <h3 className="text-lg font-semibold text-white mb-4">Recording</h3>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleToggleRecording}
                                    className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                                        isRecording
                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                                    }`}
                                >
                                    <Activity className={isRecording ? 'animate-pulse' : ''} size={18} />
                                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                                </button>
                                {isRecording && (
                                    <div className="flex items-center gap-2 text-purple-400">
                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                                        <span className="text-sm">Recording brain signals...</span>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Signal Visualization */}
                        {isRecording && (
                            <section>
                                <h3 className="text-lg font-semibold text-white mb-4">Live Signals</h3>
                                <div className="bg-slate-800 rounded border border-slate-700 p-4 h-48 overflow-y-auto">
                                    <div className="space-y-2">
                                        {recentSignals.slice(-10).map((signal, i) => (
                                            <div key={i} className="flex items-center gap-3 text-xs">
                                                <div className="w-2 h-2 bg-purple-400 rounded-full" />
                                                <span className="text-slate-400">
                                                    {new Date(signal.timestamp).toLocaleTimeString()}
                                                </span>
                                                <span className="text-slate-300">
                                                    Confidence: {(signal.confidence * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Detected Thoughts */}
                        {detectedThoughts.length > 0 && (
                            <section>
                                <h3 className="text-lg font-semibold text-white mb-4">Detected Thoughts</h3>
                                <div className="space-y-2">
                                    {detectedThoughts.map((thought) => (
                                        <div
                                            key={thought.id}
                                            className="p-4 bg-slate-800 rounded border border-purple-500/30"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold text-white">{thought.meaning}</span>
                                                <span className="text-xs text-purple-400">
                                                    {(thought.confidence * 100).toFixed(1)}% confidence
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                Pattern: {thought.pattern}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
