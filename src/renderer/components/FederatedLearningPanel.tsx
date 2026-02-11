/**
 * Federated Learning Panel
 *
 * Privacy-preserving model training
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, TrendingUp, Users, Shield, Activity } from 'lucide-react';
import {
    federatedLearningService,
    TrainingRound,
} from '../services/federatedLearning';
import { toast } from 'sonner';

interface FederatedLearningPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const FederatedLearningPanel: React.FC<FederatedLearningPanelProps> = ({
    isOpen,
    onClose,
}) => {
    const isParticipationMode = (
        value: string
    ): value is 'active' | 'passive' | 'disabled' => {
        return value === 'active' || value === 'passive' || value === 'disabled';
    };

    const [config, setConfig] = useState(federatedLearningService.getConfig());
    const [rounds, setRounds] = useState<TrainingRound[]>([]);
    const [stats, setStats] = useState(federatedLearningService.getParticipationStats());
    const [isTraining, setIsTraining] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setRounds(federatedLearningService.getTrainingRounds());
            setStats(federatedLearningService.getParticipationStats());
        }
    }, [isOpen]);

    const handleConfigChange = (updates: Partial<typeof config>) => {
        const updated = { ...config, ...updates };
        setConfig(updated);
        federatedLearningService.saveConfig(updates);
    };

    const handleStartTraining = async () => {
        if (!config.enabled) {
            toast.error('Federated learning is not enabled');
            return;
        }

        setIsTraining(true);
        try {
            const round = await federatedLearningService.startTrainingRound(rounds.length + 1);
            setRounds([...rounds, round]);
            setStats(federatedLearningService.getParticipationStats());
            toast.success('Training round started!');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to start training');
        } finally {
            setIsTraining(false);
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
                            <Shield className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-2xl font-bold text-white">Federated Learning</h2>
                            <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded">
                                Privacy-Preserving
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
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
                                        <div className="font-medium text-white">Enable Federated Learning</div>
                                        <div className="text-sm text-slate-400">Participate in privacy-preserving model training</div>
                                    </div>
                                    <button
                                        onClick={() => handleConfigChange({ enabled: !config.enabled })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            config.enabled ? 'bg-indigo-500' : 'bg-slate-700'
                                        }`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                            config.enabled ? 'translate-x-6' : 'translate-x-0'
                                        }`} />
                                    </button>
                                </div>

                                {config.enabled && (
                                    <>
                                        <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Participation Mode</label>
                                            <select
                                                value={config.participationMode}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (isParticipationMode(value)) {
                                                        handleConfigChange({ participationMode: value });
                                                    }
                                                }}
                                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                                            >
                                                <option value="disabled">Disabled</option>
                                                <option value="passive">Passive (Receive updates only)</option>
                                                <option value="active">Active (Train and contribute)</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                                <label className="block text-sm font-medium text-slate-300 mb-2">Local Epochs</label>
                                                <input
                                                    type="number"
                                                    value={config.localEpochs}
                                                    onChange={(e) => handleConfigChange({ localEpochs: parseInt(e.target.value) })}
                                                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                                                    min="1"
                                                    max="10"
                                                />
                                            </div>
                                            <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                                <label className="block text-sm font-medium text-slate-300 mb-2">Batch Size</label>
                                                <input
                                                    type="number"
                                                    value={config.batchSize}
                                                    onChange={(e) => handleConfigChange({ batchSize: parseInt(e.target.value) })}
                                                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                                                    min="1"
                                                    max="128"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>

                        {/* Statistics */}
                        <section>
                            <h3 className="text-lg font-semibold text-white mb-4">Participation Statistics</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                    <div className="text-sm text-slate-400 mb-1">Total Rounds</div>
                                    <div className="text-2xl font-bold text-white">{stats.totalRounds}</div>
                                </div>
                                <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                    <div className="text-sm text-slate-400 mb-1">Completed</div>
                                    <div className="text-2xl font-bold text-green-400">{stats.completedRounds}</div>
                                </div>
                                <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                    <div className="text-sm text-slate-400 mb-1">Total Samples</div>
                                    <div className="text-2xl font-bold text-white">{stats.totalSamples}</div>
                                </div>
                                <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                    <div className="text-sm text-slate-400 mb-1">Avg Accuracy</div>
                                    <div className="text-2xl font-bold text-indigo-400">
                                        {(stats.averageAccuracy * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Training Rounds */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">Training Rounds</h3>
                                <button
                                    onClick={handleStartTraining}
                                    disabled={!config.enabled || isTraining}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isTraining ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Training...
                                        </>
                                    ) : (
                                        <>
                                            <Activity size={16} />
                                            Start Round
                                        </>
                                    )}
                                </button>
                            </div>
                            {rounds.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No training rounds yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {rounds.map((round) => (
                                        <div
                                            key={round.round}
                                            className="p-4 bg-slate-800 rounded border border-slate-700"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                                                    <span className="font-semibold text-white">Round {round.round}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                                        round.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                        round.status === 'training' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-slate-500/20 text-slate-400'
                                                    }`}>
                                                        {round.status}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-400">
                                                    {round.participants} participant(s)
                                                </span>
                                            </div>
                                            {round.metrics && (
                                                <div className="text-xs text-slate-400 space-y-1 mt-2">
                                                    <div>Loss: {round.metrics.loss.toFixed(4)}</div>
                                                    <div>Accuracy: {(round.metrics.accuracy * 100).toFixed(2)}%</div>
                                                    <div>Samples: {round.metrics.samples}</div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
