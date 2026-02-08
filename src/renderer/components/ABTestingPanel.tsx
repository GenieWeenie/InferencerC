/**
 * A/B Testing Panel
 *
 * UI for creating and running A/B tests to compare different prompts
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Plus, Play, Trash2, Edit2, Check, AlertCircle, Loader2, Copy,
    BarChart3, TrendingUp, Clock, Zap, Award, FileText, Save, Download, Upload
} from 'lucide-react';
import {
    abTestingService,
    ABTest,
    ABTestVariant,
    ABTestVariantResult,
} from '../services/abTesting';
import { toast } from 'sonner';

interface ABTestingPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onExecutePrompt: (
        prompt: string,
        systemPrompt?: string,
        modelId?: string,
        temperature?: number,
        topP?: number,
        maxTokens?: number
    ) => Promise<{ content: string; tokensUsed?: number }>;
    currentInput?: string; // Pre-fill with current chat input
    currentContext?: any[]; // Current conversation context
}

export const ABTestingPanel: React.FC<ABTestingPanelProps> = ({
    isOpen,
    onClose,
    onExecutePrompt,
    currentInput = '',
    currentContext = [],
}) => {
    const [tests, setTests] = useState<ABTest[]>([]);
    const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
    const [testName, setTestName] = useState('');
    const [testInput, setTestInput] = useState(currentInput);
    const [variants, setVariants] = useState<ABTestVariant[]>([
        { id: '1', name: 'Variant A', prompt: '' },
        { id: '2', name: 'Variant B', prompt: '' },
    ]);
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<ABTestVariantResult[]>([]);
    const [editingVariant, setEditingVariant] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadTests();
            if (currentInput) {
                setTestInput(currentInput);
            }
        }
    }, [isOpen, currentInput]);

    const loadTests = () => {
        setTests(abTestingService.getAllTests());
    };

    const handleCreateTest = () => {
        if (!testName.trim() || !testInput.trim()) {
            toast.error('Test name and input are required');
            return;
        }

        if (variants.length < 2) {
            toast.error('At least 2 variants are required');
            return;
        }

        if (variants.some(v => !v.prompt.trim())) {
            toast.error('All variants must have prompts');
            return;
        }

        const test = abTestingService.createTest(testName, variants, testInput, currentContext);
        setTests(abTestingService.getAllTests());
        setSelectedTest(test);
        toast.success('Test created!');
    };

    const handleAddVariant = () => {
        const newId = String(variants.length + 1);
        setVariants([...variants, { id: newId, name: `Variant ${String.fromCharCode(64 + variants.length + 1)}`, prompt: '' }]);
    };

    const handleRemoveVariant = (id: string) => {
        if (variants.length <= 2) {
            toast.error('At least 2 variants are required');
            return;
        }
        setVariants(variants.filter(v => v.id !== id));
    };

    const handleUpdateVariant = (id: string, updates: Partial<ABTestVariant>) => {
        setVariants(variants.map(v => v.id === id ? { ...v, ...updates } : v));
    };

    const handleRunTest = async () => {
        if (!selectedTest) {
            toast.error('No test selected');
            return;
        }

        setIsRunning(true);
        setResults([]);

        try {
            const testResults = await abTestingService.executeTest(
                selectedTest.id,
                onExecutePrompt
            );

            setResults(testResults);
            loadTests(); // Reload to get updated test with results
            toast.success('Test completed!');
        } catch (error) {
            console.error('Test execution error:', error);
            toast.error(error instanceof Error ? error.message : 'Test execution failed');
        } finally {
            setIsRunning(false);
        }
    };

    const handleLoadTest = (test: ABTest) => {
        setSelectedTest(test);
        setTestName(test.name);
        setTestInput(test.input);
        setVariants(test.variants);
        setResults(test.results || []);
    };

    const handleDeleteTest = (id: string) => {
        if (confirm('Delete this test?')) {
            abTestingService.deleteTest(id);
            loadTests();
            if (selectedTest?.id === id) {
                setSelectedTest(null);
                setResults([]);
            }
            toast.success('Test deleted');
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
                    className="relative w-full max-w-6xl h-[90vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-6 h-6 text-blue-400" />
                            <h2 className="text-2xl font-bold text-white">A/B Testing</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Test List */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white">Saved Tests</h3>
                                    <button
                                        onClick={() => {
                                            setSelectedTest(null);
                                            setTestName('');
                                            setTestInput('');
                                            setVariants([
                                                { id: '1', name: 'Variant A', prompt: '' },
                                                { id: '2', name: 'Variant B', prompt: '' },
                                            ]);
                                            setResults([]);
                                        }}
                                        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                    >
                                        <Plus size={14} className="inline mr-1" />
                                        New
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {tests.map(test => (
                                        <div
                                            key={test.id}
                                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                                selectedTest?.id === test.id
                                                    ? 'bg-blue-600/20 border-blue-500'
                                                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                            }`}
                                            onClick={() => handleLoadTest(test)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h4 className="text-white font-medium text-sm">{test.name}</h4>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {test.variants.length} variants
                                                        {test.results && ` • ${test.results.length} results`}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteTest(test.id);
                                                    }}
                                                    className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {tests.length === 0 && (
                                        <p className="text-sm text-slate-400 text-center py-4">No saved tests</p>
                                    )}
                                </div>
                            </div>

                            {/* Right: Test Editor/Results */}
                            <div className="lg:col-span-2 space-y-6">
                                {selectedTest && selectedTest.results && selectedTest.results.length > 0 ? (
                                    <ResultsView test={selectedTest} results={selectedTest.results} />
                                ) : (
                                    <TestEditorView
                                        testName={testName}
                                        setTestName={setTestName}
                                        testInput={testInput}
                                        setTestInput={setTestInput}
                                        variants={variants}
                                        setVariants={setVariants}
                                        editingVariant={editingVariant}
                                        setEditingVariant={setEditingVariant}
                                        onAddVariant={handleAddVariant}
                                        onRemoveVariant={handleRemoveVariant}
                                        onUpdateVariant={handleUpdateVariant}
                                        onCreateTest={handleCreateTest}
                                        onRunTest={handleRunTest}
                                        isRunning={isRunning}
                                        selectedTest={selectedTest}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Test Editor View
const TestEditorView: React.FC<{
    testName: string;
    setTestName: (name: string) => void;
    testInput: string;
    setTestInput: (input: string) => void;
    variants: ABTestVariant[];
    setVariants: (variants: ABTestVariant[]) => void;
    editingVariant: string | null;
    setEditingVariant: (id: string | null) => void;
    onAddVariant: () => void;
    onRemoveVariant: (id: string) => void;
    onUpdateVariant: (id: string, updates: Partial<ABTestVariant>) => void;
    onCreateTest: () => void;
    onRunTest: () => void;
    isRunning: boolean;
    selectedTest: ABTest | null;
}> = ({
    testName,
    setTestName,
    testInput,
    setTestInput,
    variants,
    editingVariant,
    setEditingVariant,
    onAddVariant,
    onRemoveVariant,
    onUpdateVariant,
    onCreateTest,
    onRunTest,
    isRunning,
    selectedTest,
}) => {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold text-white mb-4">
                    {selectedTest ? 'Edit Test' : 'Create New Test'}
                </h3>

                {/* Test Name */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Test Name</label>
                    <input
                        type="text"
                        value={testName}
                        onChange={(e) => setTestName(e.target.value)}
                        placeholder="e.g., Prompt Comparison Test"
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                {/* Test Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Test Input</label>
                    <textarea
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        placeholder="Enter the question or prompt to test..."
                        rows={3}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                </div>

                {/* Variants */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-300">Variants</label>
                        <button
                            onClick={onAddVariant}
                            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors flex items-center gap-1"
                        >
                            <Plus size={14} />
                            Add Variant
                        </button>
                    </div>
                    <div className="space-y-3">
                        {variants.map((variant, index) => (
                            <div
                                key={variant.id}
                                className="bg-slate-800 border border-slate-700 rounded-lg p-4"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <input
                                        type="text"
                                        value={variant.name}
                                        onChange={(e) => onUpdateVariant(variant.id, { name: e.target.value })}
                                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    {variants.length > 2 && (
                                        <button
                                            onClick={() => onRemoveVariant(variant.id)}
                                            className="ml-2 p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={variant.prompt}
                                    onChange={(e) => onUpdateVariant(variant.id, { prompt: e.target.value })}
                                    placeholder={`Enter prompt for ${variant.name}...`}
                                    rows={4}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    {!selectedTest && (
                        <button
                            onClick={onCreateTest}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Save size={18} />
                            Save Test
                        </button>
                    )}
                    {selectedTest && (
                        <button
                            onClick={onRunTest}
                            disabled={isRunning}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Play size={18} />
                                    Run Test
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Results View
const ResultsView: React.FC<{ test: ABTest; results: ABTestVariantResult[] }> = ({ test, results }) => {
    const successfulResults = results.filter(r => !r.error);
    const bestResult = test.metrics?.bestVariant
        ? results.find(r => r.variantId === test.metrics!.bestVariant)
        : null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Test Results: {test.name}</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            const json = abTestingService.exportTest(test.id);
                            navigator.clipboard.writeText(json);
                            toast.success('Test exported to clipboard');
                        }}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>

            {/* Metrics Summary */}
            {test.metrics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <MetricCard
                        icon={<Clock className="w-5 h-5" />}
                        label="Avg Response Time"
                        value={`${Math.round(test.metrics.avgResponseTime)}ms`}
                        color="blue"
                    />
                    <MetricCard
                        icon={<Zap className="w-5 h-5" />}
                        label="Total Tokens"
                        value={test.metrics.totalTokens.toLocaleString()}
                        color="purple"
                    />
                    <MetricCard
                        icon={<TrendingUp className="w-5 h-5" />}
                        label="Success Rate"
                        value={`${(test.metrics.successRate * 100).toFixed(1)}%`}
                        color="green"
                    />
                    {bestResult && (
                        <MetricCard
                            icon={<Award className="w-5 h-5" />}
                            label="Best Variant"
                            value={bestResult.variantName}
                            color="yellow"
                        />
                    )}
                </div>
            )}

            {/* Results Comparison */}
            <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Variant Results</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.map((result, index) => (
                        <div
                            key={result.variantId}
                            className={`bg-slate-800 border rounded-lg p-4 ${
                                bestResult?.variantId === result.variantId
                                    ? 'border-yellow-500 bg-yellow-500/10'
                                    : result.error
                                    ? 'border-red-500 bg-red-500/10'
                                    : 'border-slate-700'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h5 className="font-semibold text-white">{result.variantName}</h5>
                                {bestResult?.variantId === result.variantId && (
                                    <Award className="w-5 h-5 text-yellow-400" />
                                )}
                            </div>
                            {result.error ? (
                                <div className="text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                    {result.error}
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2 mb-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-400">Response Time</span>
                                            <span className="text-white">{result.responseTime}ms</span>
                                        </div>
                                        {result.tokensUsed && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-400">Tokens</span>
                                                <span className="text-white">{result.tokensUsed}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-slate-900 rounded p-3 max-h-64 overflow-y-auto">
                                        <p className="text-sm text-slate-300 whitespace-pre-wrap">
                                            {result.response}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Metric Card Component
const MetricCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}> = ({ icon, label, value, color }) => {
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        green: 'bg-green-500/10 text-green-400 border-green-500/20',
        yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    };

    return (
        <div className={`bg-slate-800 rounded-lg p-4 border ${colorClasses[color as keyof typeof colorClasses]}`}>
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <p className="text-sm text-slate-400">{label}</p>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
};
