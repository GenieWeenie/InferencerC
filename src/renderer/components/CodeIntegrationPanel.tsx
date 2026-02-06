/**
 * Code Integration Panel
 *
 * UI for Git integration, code review, refactoring, and documentation
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, GitBranch, Eye, RefreshCw, FileText, TestTube, CheckCircle, AlertCircle,
    Download, Copy, ChevronDown, ChevronRight, Code
} from 'lucide-react';
import { gitIntegrationService, GitCommit } from '../services/gitIntegration';
import { codeReviewService, CodeReviewResult } from '../services/codeReview';
import { refactoringAssistantService, RefactoringSuggestion } from '../services/refactoringAssistant';
import { documentationGeneratorService, DocumentationResult } from '../services/documentationGenerator';
import { toast } from 'sonner';
import { ChatMessage } from '../../shared/types';

interface CodeIntegrationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    code?: string;
    language?: string;
    conversationHistory?: ChatMessage[];
    onExecutePrompt: (prompt: string, systemPrompt?: string) => Promise<{ content: string }>;
}

export const CodeIntegrationPanel: React.FC<CodeIntegrationPanelProps> = ({
    isOpen,
    onClose,
    code = '',
    language = 'javascript',
    conversationHistory = [],
    onExecutePrompt,
}) => {
    const [activeTab, setActiveTab] = useState<'git' | 'review' | 'refactor' | 'docs' | 'tests'>('review');
    const [reviewResult, setReviewResult] = useState<CodeReviewResult | null>(null);
    const [refactoringSuggestions, setRefactoringSuggestions] = useState<RefactoringSuggestion[]>([]);
    const [documentationResult, setDocumentationResult] = useState<DocumentationResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [gitConfig, setGitConfig] = useState(gitIntegrationService.getConfig());
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    const toggleSection = (section: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    const handleReview = async () => {
        if (!code.trim()) {
            toast.error('No code to review');
            return;
        }

        setIsProcessing(true);
        try {
            const result = await codeReviewService.reviewCode(code, language, onExecutePrompt);
            setReviewResult(result);
            toast.success(`Review complete: ${result.issues.length} issues found`);
        } catch (error) {
            toast.error('Failed to review code');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRefactor = async () => {
        if (!code.trim()) {
            toast.error('No code to refactor');
            return;
        }

        setIsProcessing(true);
        try {
            const suggestions = await refactoringAssistantService.suggestRefactorings(code, language, onExecutePrompt);
            setRefactoringSuggestions(suggestions);
            toast.success(`Found ${suggestions.length} refactoring suggestions`);
        } catch (error) {
            toast.error('Failed to analyze code');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGenerateDocs = async () => {
        if (!code.trim()) {
            toast.error('No code to document');
            return;
        }

        setIsProcessing(true);
        try {
            const result = await documentationGeneratorService.generateDocumentation(
                code,
                language,
                { format: 'jsdoc', includeExamples: true, style: 'detailed' },
                onExecutePrompt
            );
            setDocumentationResult(result);
            toast.success('Documentation generated!');
        } catch (error) {
            toast.error('Failed to generate documentation');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCommit = async () => {
        if (!code.trim()) {
            toast.error('No code to commit');
            return;
        }

        const commitMessage = gitIntegrationService.generateCommitMessage(conversationHistory);
        try {
            const commit = await gitIntegrationService.commitCode(
                `file.${language}`,
                code,
                commitMessage
            );

            if (commit.success) {
                toast.success('Code committed to Git!');
            } else {
                toast.error(commit.error || 'Failed to commit');
            }
        } catch (error) {
            toast.error('Git commit failed');
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
                            <Code className="w-6 h-6 text-blue-400" />
                            <h2 className="text-2xl font-bold text-white">Code Integration</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-700">
                        {[
                            { id: 'review', label: 'Code Review', icon: Eye },
                            { id: 'refactor', label: 'Refactor', icon: RefreshCw },
                            { id: 'docs', label: 'Documentation', icon: FileText },
                            { id: 'tests', label: 'Tests', icon: TestTube },
                            { id: 'git', label: 'Git', icon: GitBranch },
                        ].map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id as any)}
                                className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${
                                    activeTab === id
                                        ? 'text-primary border-primary bg-slate-900/50'
                                        : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Icon size={14} />
                                    {label}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'review' && (
                            <CodeReviewView
                                code={code}
                                language={language}
                                result={reviewResult}
                                isProcessing={isProcessing}
                                onReview={handleReview}
                            />
                        )}

                        {activeTab === 'refactor' && (
                            <RefactoringView
                                code={code}
                                language={language}
                                suggestions={refactoringSuggestions}
                                isProcessing={isProcessing}
                                onRefactor={handleRefactor}
                            />
                        )}

                        {activeTab === 'docs' && (
                            <DocumentationView
                                code={code}
                                language={language}
                                result={documentationResult}
                                isProcessing={isProcessing}
                                onGenerate={handleGenerateDocs}
                            />
                        )}

                        {activeTab === 'tests' && (
                            <TestGenerationView
                                code={code}
                                language={language}
                                onExecutePrompt={onExecutePrompt}
                            />
                        )}

                        {activeTab === 'git' && (
                            <GitIntegrationView
                                code={code}
                                language={language}
                                config={gitConfig}
                                onConfigChange={setGitConfig}
                                onCommit={handleCommit}
                            />
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Sub-components
const CodeReviewView: React.FC<{
    code: string;
    language: string;
    result: CodeReviewResult | null;
    isProcessing: boolean;
    onReview: () => void;
}> = ({ code, result, isProcessing, onReview }) => {
    if (!code.trim()) {
        return (
            <div className="text-center py-12 text-slate-400">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No code to review</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <button
                onClick={onReview}
                disabled={isProcessing}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Reviewing...
                    </>
                ) : (
                    <>
                        <Eye size={16} />
                        Review Code
                    </>
                )}
            </button>

            {result && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                        <div>
                            <div className="text-sm text-slate-400">Code Quality Score</div>
                            <div className="text-3xl font-bold text-white">{result.score}/100</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-400">Issues Found</div>
                            <div className="text-2xl font-bold text-white">{result.issues.length}</div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Summary</h4>
                        <p className="text-sm text-slate-300">{result.summary}</p>
                    </div>

                    {result.issues.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-2">Issues</h4>
                            <div className="space-y-2">
                                {result.issues.map((issue, i) => (
                                    <div
                                        key={i}
                                        className={`p-3 rounded-lg border ${
                                            issue.severity === 'critical'
                                                ? 'bg-red-500/10 border-red-500/30'
                                                : issue.severity === 'high'
                                                ? 'bg-orange-500/10 border-orange-500/30'
                                                : 'bg-yellow-500/10 border-yellow-500/30'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {issue.severity === 'critical' ? (
                                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-semibold text-white uppercase">
                                                        {issue.severity}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{issue.category}</span>
                                                    {issue.line && (
                                                        <span className="text-xs text-slate-500">
                                                            Line {issue.line}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-300">{issue.message}</p>
                                                {issue.suggestion && (
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        💡 {issue.suggestion}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const RefactoringView: React.FC<{
    code: string;
    language: string;
    suggestions: RefactoringSuggestion[];
    isProcessing: boolean;
    onRefactor: () => void;
}> = ({ code, suggestions, isProcessing, onRefactor }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSuggestion = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleApply = () => {
        const result = refactoringAssistantService.applyRefactorings(
            code,
            suggestions,
            Array.from(selectedIds)
        );
        toast.success(`Applied ${result.appliedSuggestions.length} refactorings`);
    };

    if (!code.trim()) {
        return (
            <div className="text-center py-12 text-slate-400">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No code to refactor</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <button
                onClick={onRefactor}
                disabled={isProcessing}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Analyzing...
                    </>
                ) : (
                    <>
                        <RefreshCw size={16} />
                        Analyze Refactorings
                    </>
                )}
            </button>

            {suggestions.length > 0 && (
                <>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">
                            {selectedIds.size} of {suggestions.length} selected
                        </span>
                        <button
                            onClick={handleApply}
                            disabled={selectedIds.size === 0}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
                        >
                            Apply Selected
                        </button>
                    </div>

                    <div className="space-y-3">
                        {suggestions.map((suggestion) => (
                            <div
                                key={suggestion.id}
                                className="p-4 bg-slate-800 rounded-lg border border-slate-700"
                            >
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(suggestion.id)}
                                        onChange={() => toggleSuggestion(suggestion.id)}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-semibold text-purple-400 uppercase">
                                                {suggestion.type}
                                            </span>
                                            <span className="text-xs text-slate-400">{suggestion.impact} impact</span>
                                            <span className="text-xs text-slate-500">
                                                {Math.round(suggestion.confidence * 100)}% confidence
                                            </span>
                                        </div>
                                        <p className="text-sm text-white mb-2">{suggestion.description}</p>
                                        <p className="text-xs text-slate-400 mb-3">{suggestion.explanation}</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                            <div>
                                                <div className="text-slate-500 mb-1">Original:</div>
                                                <div className="bg-slate-900 p-2 rounded text-slate-300">
                                                    {suggestion.code.substring(0, 100)}...
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-slate-500 mb-1">Refactored:</div>
                                                <div className="bg-green-500/10 p-2 rounded text-green-300">
                                                    {suggestion.refactoredCode.substring(0, 100)}...
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const DocumentationView: React.FC<{
    code: string;
    language: string;
    result: DocumentationResult | null;
    isProcessing: boolean;
    onGenerate: () => void;
}> = ({ code, result, isProcessing, onGenerate }) => {
    if (!code.trim()) {
        return (
            <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No code to document</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <button
                onClick={onGenerate}
                disabled={isProcessing}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                    </>
                ) : (
                    <>
                        <FileText size={16} />
                        Generate Documentation
                    </>
                )}
            </button>

            {result && (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(result.documentedCode);
                                toast.success('Copied documented code');
                            }}
                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm flex items-center gap-2"
                        >
                            <Copy size={14} />
                            Copy Code
                        </button>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(result.documentation);
                                toast.success('Copied documentation');
                            }}
                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm flex items-center gap-2"
                        >
                            <Copy size={14} />
                            Copy Docs
                        </button>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Documented Code</h4>
                        <pre className="bg-slate-950 p-4 rounded text-sm font-mono text-slate-300 overflow-x-auto">
                            {result.documentedCode}
                        </pre>
                    </div>

                    {result.documentation && (
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-2">Standalone Documentation</h4>
                            <div className="bg-slate-950 p-4 rounded text-sm text-slate-300 whitespace-pre-wrap">
                                {result.documentation}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const TestGenerationView: React.FC<{
    code: string;
    language: string;
    onExecutePrompt: (prompt: string, systemPrompt?: string) => Promise<{ content: string }>;
}> = ({ code, language, onExecutePrompt }) => {
    const [framework, setFramework] = useState<'jest' | 'mocha' | 'pytest' | 'junit' | 'vitest'>('jest');
    const [testResult, setTestResult] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!code.trim()) {
            toast.error('No code to generate tests for');
            return;
        }

        setIsGenerating(true);
        try {
            const { testCaseGenerationService } = await import('../services/testCaseGeneration');
            const result = await testCaseGenerationService.generateTestCases(
                {
                    codeDescription: code,
                    language,
                    framework,
                    testType: 'unit',
                    coverage: 'comprehensive',
                },
                onExecutePrompt
            );
            setTestResult(result.testCode);
            toast.success('Tests generated!');
        } catch (error) {
            toast.error('Failed to generate tests');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Test Framework</label>
                <select
                    value={framework}
                    onChange={(e) => setFramework(e.target.value as any)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                >
                    <option value="jest">Jest</option>
                    <option value="mocha">Mocha</option>
                    <option value="pytest">Pytest</option>
                    <option value="junit">JUnit</option>
                    <option value="vitest">Vitest</option>
                </select>
            </div>

            <button
                onClick={handleGenerate}
                disabled={isGenerating || !code.trim()}
                className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isGenerating ? (
                    <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                    </>
                ) : (
                    <>
                        <TestTube size={16} />
                        Generate Tests
                    </>
                )}
            </button>

            {testResult && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-white">Generated Test Code</h4>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(testResult);
                                toast.success('Copied test code');
                            }}
                            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
                        >
                            <Copy size={12} />
                        </button>
                    </div>
                    <pre className="bg-slate-950 p-4 rounded text-sm font-mono text-slate-300 overflow-x-auto">
                        {testResult}
                    </pre>
                </div>
            )}
        </div>
    );
};

const GitIntegrationView: React.FC<{
    code: string;
    language: string;
    config: ReturnType<typeof gitIntegrationService.getConfig>;
    onConfigChange: (config: ReturnType<typeof gitIntegrationService.getConfig>) => void;
    onCommit: () => void;
}> = ({ code, language, config, onConfigChange, onCommit }) => {
    const [commitMessage, setCommitMessage] = useState('');
    const [filePath, setFilePath] = useState(`file.${language}`);

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Git Configuration</label>
                <div className="space-y-3 bg-slate-800 p-4 rounded">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Enable Git Integration</span>
                        <button
                            onClick={() => {
                                const newConfig = { ...config, enabled: !config.enabled };
                                onConfigChange(newConfig);
                                gitIntegrationService.updateConfig(newConfig);
                            }}
                            className={`relative w-10 h-5 rounded-full transition-colors ${config.enabled ? 'bg-green-500' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${config.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    {config.enabled && (
                        <>
                            <input
                                type="text"
                                value={config.authorName || ''}
                                onChange={(e) => {
                                    const newConfig = { ...config, authorName: e.target.value };
                                    onConfigChange(newConfig);
                                    gitIntegrationService.updateConfig(newConfig);
                                }}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                                placeholder="Author Name"
                            />
                            <input
                                type="email"
                                value={config.authorEmail || ''}
                                onChange={(e) => {
                                    const newConfig = { ...config, authorEmail: e.target.value };
                                    onConfigChange(newConfig);
                                    gitIntegrationService.updateConfig(newConfig);
                                }}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                                placeholder="Author Email"
                            />
                        </>
                    )}
                </div>
            </div>

            {config.enabled && code.trim() && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">File Path</label>
                        <input
                            type="text"
                            value={filePath}
                            onChange={(e) => setFilePath(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm font-mono"
                            placeholder="path/to/file.js"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Commit Message</label>
                        <textarea
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                            placeholder="Commit message..."
                            rows={3}
                        />
                    </div>
                    <button
                        onClick={async () => {
                            const message = commitMessage || gitIntegrationService.generateCommitMessage([]);
                            await gitIntegrationService.commitCode(filePath, code, message);
                            onCommit();
                        }}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <GitBranch size={16} />
                        Commit to Git
                    </button>
                </>
            )}
        </div>
    );
};
