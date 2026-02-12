import React from 'react';
import { Activity, AlertCircle, ChevronRight, Eye, EyeOff, FolderOpen, Github, Globe, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ChatMessage } from '../../../shared/types';
import type { ProjectContext } from '../../services/projectContext';
import type { PromptSnippet } from '../../hooks/usePrompts';
import { calculateEntropy } from '../../lib/chatDisplayUtils';
import { buildInspectorAlternativeRows } from '../../lib/chatUiModels';
import type { SelectedTokenContext } from '../../lib/chatSelectionTypes';

const SmartSuggestionsPanel = React.lazy(() =>
    import('../SmartSuggestionsPanel').then((mod) => ({ default: mod.SmartSuggestionsPanel }))
);

interface InspectorTokenSummaryCardProps {
    selectedToken: SelectedTokenContext;
    entropyValue: number;
    onUpdateToken: (value: string) => void;
}

const InspectorTokenSummaryCard: React.FC<InspectorTokenSummaryCardProps> = React.memo(({
    selectedToken,
    entropyValue,
    onUpdateToken,
}) => {
    const [tokenInputValue, setTokenInputValue] = React.useState(selectedToken.logprob.token);

    React.useEffect(() => {
        setTokenInputValue(selectedToken.logprob.token);
    }, [selectedToken]);

    const submitTokenUpdate = React.useCallback(() => {
        onUpdateToken(tokenInputValue);
    }, [onUpdateToken, tokenInputValue]);

    return (
        <div className="animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white text-slate-900 rounded-xl p-6 text-center shadow-lg mb-6 border-4 border-slate-800 relative">
                <div className="text-3xl font-heading font-bold mb-1">"{selectedToken.logprob.token}"</div>
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Selected Token</div>

                <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 bg-slate-100 border border-slate-300 rounded px-2 py-1 text-sm font-mono"
                            value={tokenInputValue}
                            onChange={(event) => setTokenInputValue(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    submitTokenUpdate();
                                }
                            }}
                        />
                        <button
                            onClick={submitTokenUpdate}
                            className="text-xs bg-slate-900 text-white px-2 py-1 rounded hover:bg-slate-700"
                        >
                            Update
                        </button>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Press Enter to apply changes</div>
                </div>
            </div>

            <div className="space-y-4 mb-6">
                <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-400 text-sm">Logprob</span>
                        <span className="font-mono text-emerald-400">{selectedToken.logprob.logprob?.toFixed(4) ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-400 text-sm">Probability</span>
                        <span className="font-mono text-emerald-400">{(Math.exp(selectedToken.logprob.logprob || 0) * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Entropy</span>
                        <span className="font-mono text-amber-400">{entropyValue.toFixed(3)}</span>
                    </div>
                </div>
            </div>
            <details className="mb-6 group">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors list-none flex items-center gap-1">
                    <ChevronRight size={12} className="group-open:rotate-90 transition-transform" /> Debug Data
                </summary>
                <pre className="mt-2 text-[10px] bg-slate-950 p-2 rounded text-slate-400 overflow-x-auto border border-slate-800 font-mono">
                    {JSON.stringify(selectedToken.logprob, null, 2)}
                </pre>
            </details>
        </div>
    );
}, (prev, next) => (
    prev.selectedToken === next.selectedToken &&
    prev.entropyValue === next.entropyValue &&
    prev.onUpdateToken === next.onUpdateToken
));

interface InspectorAlternativeListProps {
    rows: Array<{
        key: string;
        token: string;
        probabilityPercent: number;
        widthPercent: number;
    }>;
}

const InspectorAlternativeList: React.FC<InspectorAlternativeListProps> = React.memo(({
    rows,
}) => {
    if (rows.length === 0) {
        return (
            <div className="p-4 bg-amber-900/20 border border-amber-900/50 rounded-lg text-amber-200 text-sm flex items-start gap-3">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                    <p className="font-bold">No alternatives found.</p>
                    <p className="opacity-80 text-xs mt-1">If you just updated the server, please restart the application.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
            {rows.map((row) => (
                <div key={row.key} className="p-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors group">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="font-mono font-bold text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded text-xs">"{row.token}"</span>
                        <span className="text-xs text-slate-400 group-hover:text-white font-mono">{row.probabilityPercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500" style={{ width: `${row.widthPercent}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}, (prev, next) => prev.rows === next.rows);

export interface ChatInspectorTabPanelProps {
    selectedToken: SelectedTokenContext | null;
    onUpdateToken: (messageIndex: number, tokenIndex: number, value: string) => void;
}

export const ChatInspectorTabPanel: React.FC<ChatInspectorTabPanelProps> = React.memo(({
    selectedToken,
    onUpdateToken,
}) => {
    const alternativeRows = React.useMemo(
        () => buildInspectorAlternativeRows(selectedToken?.logprob?.top_logprobs),
        [selectedToken?.logprob?.top_logprobs]
    );
    const entropyValue = React.useMemo(
        () => calculateEntropy(selectedToken?.logprob?.top_logprobs),
        [selectedToken?.logprob?.top_logprobs]
    );
    const handleUpdateToken = React.useCallback((value: string) => {
        if (!selectedToken) {
            return;
        }
        onUpdateToken(selectedToken.messageIndex, selectedToken.tokenIndex, value);
        toast.success('Token updated');
    }, [onUpdateToken, selectedToken]);

    return (
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar pr-4">
            {selectedToken ? (
                <>
                    <InspectorTokenSummaryCard
                        selectedToken={selectedToken}
                        entropyValue={entropyValue}
                        onUpdateToken={handleUpdateToken}
                    />
                    <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                        <Activity size={14} className="text-primary" /> Top Alternatives
                    </h4>
                    <InspectorAlternativeList rows={alternativeRows} />
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center space-y-4 p-8">
                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-2 animate-pulse">
                        <Activity size={32} className="text-slate-700" />
                    </div>
                    <p className="font-medium">Inspect Token Details</p>
                    <p className="text-sm opacity-70">Select any token in the chat message to view its probabilities and entropy.</p>
                    <div className="text-xs bg-slate-900/50 p-3 rounded border border-slate-800">
                        <span className="text-amber-500">Note:</span> If tokens are not clickable, logprobs might be disabled on the server.
                    </div>
                </div>
            )}
        </div>
    );
}, (prev, next) => (
    prev.selectedToken === next.selectedToken &&
    prev.onUpdateToken === next.onUpdateToken
));

export interface ComposerAttachmentsPanelProps {
    attachments: Array<{ id: string; name: string; content: string }>;
    imageAttachments: Array<{ id: string; name: string; thumbnailUrl: string }>;
    onRemoveImageAttachment: (id: string) => void;
    onRemoveAttachment: (id: string) => void;
}

export const ComposerAttachmentsPanel: React.FC<ComposerAttachmentsPanelProps> = React.memo(({
    attachments,
    imageAttachments,
    onRemoveImageAttachment,
    onRemoveAttachment,
}) => {
    if (attachments.length === 0 && imageAttachments.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2 px-4 pt-4 pb-1 animate-in slide-in-from-bottom-2 duration-200">
            {imageAttachments.map((img) => (
                <div key={img.id} className="relative group">
                    <img
                        src={img.thumbnailUrl}
                        alt={img.name}
                        className="w-16 h-16 object-cover rounded-lg border border-slate-700/50 group-hover:border-primary/50 transition-colors"
                    />
                    <button
                        onClick={() => onRemoveImageAttachment(img.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                        <X size={10} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm rounded-b-lg px-1 py-0.5">
                        <span className="text-[8px] text-white truncate block">{img.name.slice(0, 10)}</span>
                    </div>
                </div>
            ))}
            {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/50 rounded-lg pl-3 pr-2 py-1.5 text-xs text-slate-200 group hover:border-slate-600 transition-colors">
                    <div className="flex flex-col">
                        <span className="font-bold truncate max-w-[150px]">{attachment.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{(attachment.content.length / 1024).toFixed(1)} KB</span>
                    </div>
                    <button
                        onClick={() => onRemoveAttachment(attachment.id)}
                        className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-red-400 transition-colors"
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
}, (prev, next) => (
    prev.attachments === next.attachments &&
    prev.imageAttachments === next.imageAttachments &&
    prev.onRemoveImageAttachment === next.onRemoveImageAttachment &&
    prev.onRemoveAttachment === next.onRemoveAttachment
));

export interface ComposerAuxPanelsProps {
    showSuggestions: boolean;
    history: ChatMessage[];
    onSelectSuggestion: (suggestion: string) => void;
    onCloseSuggestions: () => void;
    prefill: string | null;
    onPrefillChange: (value: string) => void;
    showUrlInput: boolean;
    urlInput: string;
    onUrlInputChange: (value: string) => void;
    onUrlInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onExecuteWebFetch: () => void;
    isFetchingWeb: boolean;
    showGithubInput: boolean;
    githubUrl: string;
    onGithubUrlChange: (value: string) => void;
    onGithubInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onExecuteGithubFetch: () => void;
    isFetchingGithub: boolean;
    githubConfigured: boolean;
    projectContext: ProjectContext | null;
    includeContextInMessages: boolean;
    onToggleIncludeContextInMessages: () => void;
    onClearProjectContext: () => void;
    onStartWatchingProjectContext: () => void;
    slashMatch: { query: string; index: number } | null;
    filteredPrompts: PromptSnippet[];
    activePromptIndex: number;
    onInsertPrompt: (prompt: PromptSnippet) => void;
}

export const ComposerAuxPanels: React.FC<ComposerAuxPanelsProps> = React.memo(({
    showSuggestions,
    history,
    onSelectSuggestion,
    onCloseSuggestions,
    prefill,
    onPrefillChange,
    showUrlInput,
    urlInput,
    onUrlInputChange,
    onUrlInputKeyDown,
    onExecuteWebFetch,
    isFetchingWeb,
    showGithubInput,
    githubUrl,
    onGithubUrlChange,
    onGithubInputKeyDown,
    onExecuteGithubFetch,
    isFetchingGithub,
    githubConfigured,
    projectContext,
    includeContextInMessages,
    onToggleIncludeContextInMessages,
    onClearProjectContext,
    onStartWatchingProjectContext,
    slashMatch,
    filteredPrompts,
    activePromptIndex,
    onInsertPrompt,
}) => (
    <>
        {showSuggestions && history.length > 0 && (
            <div className="px-4">
                <React.Suspense fallback={<div className="text-xs text-slate-500 px-2 py-1">Loading suggestions...</div>}>
                    <SmartSuggestionsPanel
                        conversationHistory={history}
                        lastMessage={history[history.length - 1]?.content}
                        onSelectSuggestion={onSelectSuggestion}
                        isOpen={showSuggestions}
                        onClose={onCloseSuggestions}
                    />
                </React.Suspense>
            </div>
        )}

        {prefill !== null && (
            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                <div className="relative">
                    <div className="absolute left-3 top-3 text-primary">
                        <ChevronRight size={16} strokeWidth={3} />
                    </div>
                    <input
                        type="text"
                        value={prefill}
                        onChange={(event) => onPrefillChange(event.target.value)}
                        className="w-full bg-slate-950 border-2 border-primary/30 rounded-lg pl-9 pr-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors shadow-inner"
                        placeholder="Type the response here... (Steer the model)"
                    />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 ml-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                    This seeds the model's response, forcing it to continue from your text.
                </p>
            </div>
        )}

        {showUrlInput && (
            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                <div className="relative flex gap-2 items-center">
                    <div className="absolute left-3 top-3 text-primary">
                        <Globe size={16} strokeWidth={3} />
                    </div>
                    <input
                        type="text"
                        value={urlInput}
                        onChange={(event) => onUrlInputChange(event.target.value)}
                        onKeyDown={onUrlInputKeyDown}
                        className="flex-1 bg-slate-950 border-2 border-primary/30 rounded-lg pl-9 pr-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors shadow-inner"
                        placeholder="Enter URL to fetch context from..."
                    />
                    <button
                        onClick={onExecuteWebFetch}
                        disabled={isFetchingWeb || !urlInput}
                        className="px-4 py-3 bg-primary hover:bg-primary-600 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isFetchingWeb ? <span className="animate-spin inline-block mr-1">⌛</span> : 'Fetch'}
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 ml-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    Fetches the text content of the URL and adds it to the chat context.
                </p>
            </div>
        )}

        {showGithubInput && (
            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                <div className="relative flex gap-2 items-center">
                    <div className="absolute left-3 top-3 text-primary">
                        <Github size={16} strokeWidth={3} />
                    </div>
                    <input
                        type="text"
                        value={githubUrl}
                        onChange={(event) => onGithubUrlChange(event.target.value)}
                        onKeyDown={onGithubInputKeyDown}
                        className="flex-1 bg-slate-950 border-2 border-primary/30 rounded-lg pl-9 pr-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors shadow-inner"
                        placeholder="owner/repo/path or full GitHub URL..."
                    />
                    <button
                        onClick={onExecuteGithubFetch}
                        disabled={isFetchingGithub || !githubUrl || !githubConfigured}
                        className="px-4 py-3 bg-primary hover:bg-primary-600 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isFetchingGithub ? <span className="animate-spin inline-block mr-1">⌛</span> : 'Fetch'}
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 ml-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                    {githubConfigured
                        ? 'Fetches file contents from GitHub repositories. Format: owner/repo/path/to/file'
                        : 'Configure GitHub API key in Settings → API Keys to use this feature.'}
                </p>
            </div>
        )}

        {projectContext && (
            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-slate-950 border-2 border-blue-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <FolderOpen size={16} className="text-blue-400" />
                            <span className="text-xs font-bold text-blue-400">Project Context</span>
                            {projectContext.isWatching && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Watching</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={onToggleIncludeContextInMessages}
                                className="p-1 hover:bg-slate-800 rounded transition-colors"
                                title={includeContextInMessages ? 'Context is included' : 'Context is excluded'}
                            >
                                {includeContextInMessages ? <Eye size={14} className="text-blue-400" /> : <EyeOff size={14} className="text-slate-500" />}
                            </button>
                            <button
                                onClick={onClearProjectContext}
                                className="p-1 hover:bg-slate-800 rounded transition-colors"
                                title="Clear context"
                            >
                                <X size={14} className="text-slate-500 hover:text-red-400" />
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono truncate mb-2" title={projectContext.folderPath}>
                        {projectContext.folderPath}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                            {projectContext.files.length} file{projectContext.files.length !== 1 ? 's' : ''} loaded
                        </span>
                        {!projectContext.isWatching && (
                            <button
                                onClick={onStartWatchingProjectContext}
                                className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                            >
                                Start watching
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {slashMatch && (
            <div className="absolute bottom-full left-4 mb-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                <div className="p-2 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center">
                    <span>Prompt Library</span>
                    <span className="bg-slate-800 px-1 rounded text-slate-400">/</span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                    {filteredPrompts.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 italic text-center">No matching prompts</div>
                    ) : (
                        filteredPrompts.map((prompt, index) => (
                            <button
                                key={prompt.id}
                                onClick={() => onInsertPrompt(prompt)}
                                className={`w-full text-left px-3 py-2 text-xs border-b border-slate-800/50 last:border-0 transition-colors flex flex-col gap-0.5 ${index === activePromptIndex ? 'bg-primary/20 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <span className="font-bold flex items-center gap-2">/{prompt.alias} <span className="font-normal opacity-50 text-[10px] ml-auto">↵</span></span>
                                <span className="opacity-70 truncate w-full block">{prompt.title}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        )}
    </>
), (prev, next) => (
    prev.showSuggestions === next.showSuggestions &&
    prev.history === next.history &&
    prev.onSelectSuggestion === next.onSelectSuggestion &&
    prev.onCloseSuggestions === next.onCloseSuggestions &&
    prev.prefill === next.prefill &&
    prev.onPrefillChange === next.onPrefillChange &&
    prev.showUrlInput === next.showUrlInput &&
    prev.urlInput === next.urlInput &&
    prev.onUrlInputChange === next.onUrlInputChange &&
    prev.onUrlInputKeyDown === next.onUrlInputKeyDown &&
    prev.onExecuteWebFetch === next.onExecuteWebFetch &&
    prev.isFetchingWeb === next.isFetchingWeb &&
    prev.showGithubInput === next.showGithubInput &&
    prev.githubUrl === next.githubUrl &&
    prev.onGithubUrlChange === next.onGithubUrlChange &&
    prev.onGithubInputKeyDown === next.onGithubInputKeyDown &&
    prev.onExecuteGithubFetch === next.onExecuteGithubFetch &&
    prev.isFetchingGithub === next.isFetchingGithub &&
    prev.githubConfigured === next.githubConfigured &&
    prev.projectContext === next.projectContext &&
    prev.includeContextInMessages === next.includeContextInMessages &&
    prev.onToggleIncludeContextInMessages === next.onToggleIncludeContextInMessages &&
    prev.onClearProjectContext === next.onClearProjectContext &&
    prev.onStartWatchingProjectContext === next.onStartWatchingProjectContext &&
    prev.slashMatch === next.slashMatch &&
    prev.filteredPrompts === next.filteredPrompts &&
    prev.activePromptIndex === next.activePromptIndex &&
    prev.onInsertPrompt === next.onInsertPrompt
));
