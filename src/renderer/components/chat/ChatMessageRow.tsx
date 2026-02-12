import React from 'react';
import { Brain, Clock, Code2, Star, ThumbsDown, ThumbsUp, Wrench, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import SkeletonLoader from '../SkeletonLoader';
import { calculateEntropy } from '../../lib/chatDisplayUtils';
import { getMessageActionCapabilities } from '../../lib/chatMessageActions';
import type {
    ChatMessage,
    ImageAttachment,
    TokenLogprob,
    ToolCall,
} from '../../../shared/types';
import type { SelectedTokenContext } from '../../lib/chatSelectionTypes';

const MessageContent = React.lazy(() => import('../MessageContent'));
const MessageActionsMenu = React.lazy(() => import('../MessageActionsMenu'));
const QuickReplyTemplates = React.lazy(() => import('../QuickReplyTemplates'));
const ComparisonGrid = React.lazy(() => import('../ComparisonGrid'));

const MessageSkeleton: React.FC<{ isUser?: boolean }> = ({ isUser = false }) => {
    return (
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} py-3`}>
            <div className={`p-4 rounded-2xl max-w-[85%] ${isUser ? 'bg-primary/20 rounded-tr-sm' : 'bg-slate-800/80 rounded-tl-sm'}`}>
                <div className="space-y-2">
                    <SkeletonLoader variant="text" width="w-64" />
                    <SkeletonLoader variant="text" width="w-48" />
                    <SkeletonLoader variant="text" width="w-56" />
                </div>
            </div>
        </div>
    );
};

const EMPTY_TOOL_CALLS: ToolCall[] = [];

interface ToolCallsListProps {
    toolCalls: ToolCall[];
    animated?: boolean;
}

const ToolCallsList: React.FC<ToolCallsListProps> = React.memo(({
    toolCalls,
    animated = false,
}) => (
    <div className={`mb-2 space-y-2 ${animated ? 'animate-in slide-in-from-top-1 fade-in duration-300' : ''}`}>
        {toolCalls.map((tc, idx) => (
            <div key={tc.id || idx} className="p-2 bg-slate-900/80 border border-slate-700/50 rounded-lg text-xs font-mono shadow-sm">
                <div className="flex items-center gap-2 mb-1 text-primary">
                    <Wrench size={12} />
                    <span className="font-bold">{tc.function.name}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
                    {tc.function.arguments}
                </div>
            </div>
        ))}
    </div>
), (prev, next) => prev.toolCalls === next.toolCalls && prev.animated === next.animated);

interface MessageHoverActionsProps {
    isBookmarked: boolean;
    messageContent: string;
    messageIndex: number;
    messageRole: ChatMessage['role'];
    isLoading: boolean;
    onToggleBookmark: () => void;
    onCopy: () => void;
    onDelete: () => void;
    onEdit?: () => void;
    onRegenerate?: () => void;
    onBranch: () => void;
}

const MessageHoverActions: React.FC<MessageHoverActionsProps> = React.memo(({
    isBookmarked,
    messageContent,
    messageIndex,
    messageRole,
    isLoading,
    onToggleBookmark,
    onCopy,
    onDelete,
    onEdit,
    onRegenerate,
    onBranch,
}) => (
    <div className="absolute top-2 right-2 flex flex-col items-center gap-1.5 rounded-xl border border-slate-700/70 bg-slate-900/85 px-1 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity z-20 backdrop-blur-sm">
        <button
            onClick={onToggleBookmark}
            className={`h-8 w-8 rounded-lg text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors ${isBookmarked
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-slate-700/90 hover:bg-slate-600'
                }`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark message'}
        >
            <Star size={12} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>
        <React.Suspense fallback={null}>
            <MessageActionsMenu
                messageContent={messageContent}
                messageIndex={messageIndex}
                messageRole={messageRole}
                onCopy={onCopy}
                onDelete={onDelete}
                onEdit={onEdit}
                onRegenerate={onRegenerate}
                onBranch={onBranch}
            />
        </React.Suspense>
    </div>
), (prev, next) => (
    prev.isBookmarked === next.isBookmarked &&
    prev.messageContent === next.messageContent &&
    prev.messageIndex === next.messageIndex &&
    prev.messageRole === next.messageRole &&
    prev.isLoading === next.isLoading &&
    prev.onToggleBookmark === next.onToggleBookmark &&
    prev.onCopy === next.onCopy &&
    prev.onDelete === next.onDelete &&
    prev.onEdit === next.onEdit &&
    prev.onRegenerate === next.onRegenerate &&
    prev.onBranch === next.onBranch
));

export const resolveBattleModelName = (
    content: string | undefined,
    pattern: RegExp,
    fallbackModelId: string,
    modelNameById: Map<string, string>,
    fallbackLabel: string
): string => {
    const match = content?.match(pattern);
    if (match?.[1]) {
        return match[1];
    }
    return modelNameById.get(fallbackModelId) || fallbackLabel;
};

interface LogprobTokenListProps {
    currentLogprobs: TokenLogprob[];
    messageIndex: number;
    selectedTokenForMessage: SelectedTokenContext | null;
    setSelectedToken: React.Dispatch<React.SetStateAction<SelectedTokenContext | null>>;
    setActiveTab: (value: 'inspector' | 'controls' | 'prompts' | 'documents') => void;
}

const LogprobTokenList: React.FC<LogprobTokenListProps> = React.memo(({
    currentLogprobs,
    messageIndex,
    selectedTokenForMessage,
    setSelectedToken,
    setActiveTab,
}) => (
    <div className="leading-relaxed font-mono text-[15px] animate-in fade-in duration-300">
        {currentLogprobs.map((lp, i: number) => {
            if (!lp || typeof lp !== 'object') return null;
            const entropy = calculateEntropy(lp.top_logprobs);
            const isSelected = selectedTokenForMessage?.logprob === lp;
            const redIntensity = Math.min(255, entropy * 100);
            const bgAlpha = entropy > 0.5 ? 0.3 : 0.05;

            const style = {
                backgroundColor: isSelected ? 'rgba(251, 191, 36, 0.9)' : `rgba(${redIntensity}, 50, 50, ${bgAlpha})`,
                color: isSelected ? '#000' : 'inherit',
                borderBottom: entropy > 1.0 ? '1px dotted #ef4444' : 'none',
            };

            return (
                <span
                    key={i}
                    onClick={() => {
                        setSelectedToken({ logprob: lp, messageIndex, tokenIndex: i });
                        setActiveTab('inspector');
                    }}
                    title={`Token: "${lp.token}"\nLogprob: ${lp.logprob}`}
                    className={`cursor-pointer rounded-[2px] px-[1px] transition-colors ${isSelected ? 'font-bold ring-2 ring-yellow-400 z-10 relative' : 'hover:bg-slate-700'}`}
                    style={style}
                >
                    {lp.token}
                </span>
            );
        })}
    </div>
), (prev, next) => {
    return (
        prev.currentLogprobs === next.currentLogprobs &&
        prev.messageIndex === next.messageIndex &&
        prev.selectedTokenForMessage === next.selectedTokenForMessage
    );
});

export interface ChatMessageRowProps {
    index: number;
    msg: ChatMessage;
    isLoadingMessages: boolean;
    isSearchResult: boolean;
    isCurrentSearchResult: boolean;
    isLastMessage: boolean;
    previousMessage: ChatMessage | null;
    nextMessage: ChatMessage | null;
    isShowingComparison: boolean;
    isComparisonPartnerHidden: boolean;
    isBookmarked: boolean;
    deleteMessage: (index: number) => void;
    handleEditMessage: (index: number) => void;
    handleRegenerateResponse: (index: number) => void;
    handleBranchConversation: (index: number) => void;
    mcpAvailable: boolean;
    handleInsertToFile: (code: string, language: string, filePath: string) => void;
    selectedTokenForMessage: SelectedTokenContext | null;
    setSelectedToken: React.Dispatch<React.SetStateAction<SelectedTokenContext | null>>;
    setActiveTab: (value: 'inspector' | 'controls' | 'prompts' | 'documents') => void;
    setComparisonIndex: React.Dispatch<React.SetStateAction<number | null>>;
    modelNameById: Map<string, string>;
    currentModel: string;
    secondaryModel: string;
    handleRateMessage: (index: number, rating: 'up' | 'down') => void;
    messageRating?: 'up' | 'down';
    showInspector: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    isEditingRow: boolean;
    editingContentForRow: string;
    onEditingContentChange: (value: string) => void;
    handleCancelEdit: () => void;
    handleSaveEdit: (index: number) => void;
    selectChoice: (messageIndex: number, choiceIndex: number) => void;
    toggleBookmark: (index: number) => void;
    conversationFontSize: number;
    isCompactViewport: boolean;
    isLazyLoaded: boolean;
    loadMessageAtIndex: (messageIndex: number) => void;
}

export const ChatMessageRow: React.FC<ChatMessageRowProps> = React.memo(({
    index,
    msg,
    isLoadingMessages,
    isSearchResult,
    isCurrentSearchResult,
    isLastMessage,
    previousMessage,
    nextMessage,
    isShowingComparison,
    isComparisonPartnerHidden,
    isBookmarked,
    deleteMessage,
    handleEditMessage,
    handleRegenerateResponse,
    handleBranchConversation,
    mcpAvailable,
    handleInsertToFile,
    selectedTokenForMessage,
    setSelectedToken,
    setActiveTab,
    setComparisonIndex,
    modelNameById,
    currentModel,
    secondaryModel,
    handleRateMessage,
    messageRating,
    showInspector,
    textareaRef,
    setInput,
    isEditingRow,
    editingContentForRow,
    onEditingContentChange,
    handleCancelEdit,
    handleSaveEdit,
    selectChoice,
    toggleBookmark,
    conversationFontSize,
    isCompactViewport,
    isLazyLoaded,
    loadMessageAtIndex,
}) => {
    const activeChoice = msg.choices?.[msg.selectedChoiceIndex || 0];
    const currentLogprobs: TokenLogprob[] = activeChoice?.logprobs?.content || [];
    const hasLogprobs = Array.isArray(currentLogprobs) && currentLogprobs.length > 0;
    const showMissingLogprobsWarning = msg.role === 'assistant' && !hasLogprobs && isLastMessage;

    const isBattleModePair = msg.role === 'assistant' &&
        Boolean(nextMessage) &&
        nextMessage?.role === 'assistant' &&
        msg.content?.includes('Model A:') &&
        nextMessage?.content?.includes('Model B:');

    const isSecondInBattlePair = msg.role === 'assistant' &&
        Boolean(previousMessage) &&
        previousMessage?.role === 'assistant' &&
        previousMessage?.content?.includes('Model A:') &&
        msg.content?.includes('Model B:') &&
        isComparisonPartnerHidden;

    const toolCalls = Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0
        ? msg.tool_calls as ToolCall[]
        : EMPTY_TOOL_CALLS;
    const hasToolCalls = toolCalls.length > 0;
    const messageActionCapabilities = React.useMemo(
        () => getMessageActionCapabilities(msg),
        [msg.role, msg.isLoading]
    );

    const comparisonDetails = React.useMemo(() => {
        if (!nextMessage) {
            return null;
        }

        return {
            messageB: nextMessage,
            modelAName: resolveBattleModelName(
                msg.content,
                /\*\*Model A:\s*(.+?)\*\*/,
                currentModel,
                modelNameById,
                'Model A'
            ),
            modelBName: resolveBattleModelName(
                nextMessage.content,
                /\*\*Model B:\s*(.+?)\*\*/,
                secondaryModel,
                modelNameById,
                'Model B'
            ),
        };
    }, [nextMessage, msg.content, currentModel, secondaryModel, modelNameById]);

    const handleToggleBookmark = React.useCallback(() => {
        toggleBookmark(index);
    }, [toggleBookmark, index]);

    const handleCopyMessage = React.useCallback(() => {
        navigator.clipboard.writeText(msg.content || '');
        toast.success('Copied to clipboard');
    }, [msg.content]);

    const handleDeleteMessage = React.useCallback(() => {
        deleteMessage(index);
    }, [deleteMessage, index]);

    const handleEditMessageAction = React.useCallback(() => {
        handleEditMessage(index);
    }, [handleEditMessage, index]);

    const handleRegenerateMessageAction = React.useCallback(() => {
        handleRegenerateResponse(index);
    }, [handleRegenerateResponse, index]);

    const handleBranchConversationAction = React.useCallback(() => {
        handleBranchConversation(index);
    }, [handleBranchConversation, index]);

    const handleRateUp = React.useCallback(() => {
        handleRateMessage(index, 'up');
    }, [handleRateMessage, index]);

    const handleRateDown = React.useCallback(() => {
        handleRateMessage(index, 'down');
    }, [handleRateMessage, index]);

    const handleEditContentChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onEditingContentChange(e.target.value);
    }, [onEditingContentChange]);

    if (isLoadingMessages) {
        return <MessageSkeleton isUser={index % 2 === 0} />;
    }

    if (isSecondInBattlePair) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group py-3 min-w-0 w-full`}
        >
            <div className={`relative p-4 pr-24 rounded-2xl max-w-[85%] min-w-0 shadow-md transition-all break-words overflow-visible ${isCurrentSearchResult
                ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-background'
                : isSearchResult
                    ? 'ring-1 ring-yellow-500/50'
                    : ''
                } ${msg.role === 'user' ? 'bg-primary/20 text-white rounded-tr-sm border border-primary/20' : 'bg-slate-800/80 text-slate-200 rounded-tl-sm border border-slate-700/50 backdrop-blur-sm'}`}
            data-message-bubble-index={index}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', fontSize: `${conversationFontSize}px`, maxWidth: isCompactViewport ? '95%' : '85%' }}>
                <MessageHoverActions
                    isBookmarked={isBookmarked}
                    messageContent={msg.content || ''}
                    messageIndex={index}
                    messageRole={msg.role}
                    isLoading={Boolean(msg.isLoading)}
                    onToggleBookmark={handleToggleBookmark}
                    onCopy={handleCopyMessage}
                    onDelete={handleDeleteMessage}
                    onEdit={messageActionCapabilities.canEdit ? handleEditMessageAction : undefined}
                    onRegenerate={messageActionCapabilities.canRegenerate ? handleRegenerateMessageAction : undefined}
                    onBranch={handleBranchConversationAction}
                />
                {msg.role === 'assistant' ? (
                    <div>
                        {msg.isLoading ? (
                            <div className="flex flex-col gap-2">
                                {hasToolCalls && (
                                    <ToolCallsList toolCalls={toolCalls} animated={true} />
                                )}
                                {msg.content && (
                                    <React.Suspense fallback={<div className="text-xs text-slate-500">Rendering response...</div>}>
                                        <MessageContent
                                            content={msg.content}
                                            isUser={false}
                                            mcpAvailable={mcpAvailable}
                                            onInsertToFile={handleInsertToFile}
                                            isStreaming={true}
                                            isLazyLoaded={isLazyLoaded}
                                            onLoadContent={loadMessageAtIndex}
                                            messageIndex={index}
                                        />
                                    </React.Suspense>
                                )}
                                <div className="flex items-center gap-2 text-slate-400 italic text-sm animate-pulse">
                                    <Brain size={16} className="text-primary" /> Thinking...
                                </div>
                            </div>
                        ) : (
                            <>
                                {(!showInspector || !hasLogprobs) && (
                                    <>
                                        {hasToolCalls && (
                                            <ToolCallsList toolCalls={toolCalls} />
                                        )}
                                        <React.Suspense fallback={<div className="text-xs text-slate-500">Rendering response...</div>}>
                                            <MessageContent
                                                content={msg.content || ''}
                                                isUser={false}
                                                mcpAvailable={mcpAvailable}
                                                onInsertToFile={handleInsertToFile}
                                                isLazyLoaded={isLazyLoaded}
                                                onLoadContent={loadMessageAtIndex}
                                                messageIndex={index}
                                            />
                                        </React.Suspense>
                                    </>
                                )}

                                {showInspector && hasLogprobs && (
                                    <LogprobTokenList
                                        currentLogprobs={currentLogprobs}
                                        messageIndex={index}
                                        selectedTokenForMessage={selectedTokenForMessage}
                                        setSelectedToken={setSelectedToken}
                                        setActiveTab={setActiveTab}
                                    />
                                )}
                            </>
                        )}
                        {isBattleModePair && !msg.isLoading && !nextMessage?.isLoading && (
                            <div className="mt-2 mb-2">
                                <button
                                    onClick={() => setComparisonIndex(isShowingComparison ? null : index)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-primary/50 text-slate-300 hover:text-primary"
                                >
                                    <Code2 size={14} />
                                    {isShowingComparison ? 'Hide Comparison' : 'Show Comparison Grid'}
                                </button>
                            </div>
                        )}

                        {isShowingComparison && isBattleModePair && !msg.isLoading && !nextMessage?.isLoading && (
                            <div className="mt-4 mb-4">
                                {comparisonDetails && (
                                    <React.Suspense fallback={<div className="text-xs text-slate-500">Loading comparison...</div>}>
                                        <ComparisonGrid
                                            messageA={msg}
                                            messageB={comparisonDetails.messageB}
                                            modelAName={comparisonDetails.modelAName}
                                            modelBName={comparisonDetails.modelBName}
                                            onClose={() => setComparisonIndex(null)}
                                            mcpAvailable={mcpAvailable}
                                            onInsertToFile={handleInsertToFile}
                                        />
                                    </React.Suspense>
                                )}
                            </div>
                        )}

                        <div className="mt-2 flex items-center justify-between gap-2">
                            {!msg.isLoading && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleRateUp}
                                        className={`p-1 rounded transition-colors ${messageRating === 'up'
                                            ? 'text-green-500 bg-green-500/20'
                                            : 'text-slate-500 hover:text-green-400 hover:bg-slate-800'
                                            }`}
                                        title="Good response"
                                    >
                                        <ThumbsUp size={12} fill={messageRating === 'up' ? 'currentColor' : 'none'} />
                                    </button>
                                    <button
                                        onClick={handleRateDown}
                                        className={`p-1 rounded transition-colors ${messageRating === 'down'
                                            ? 'text-red-500 bg-red-500/20'
                                            : 'text-slate-500 hover:text-red-400 hover:bg-slate-800'
                                            }`}
                                        title="Poor response"
                                    >
                                        <ThumbsDown size={12} fill={messageRating === 'down' ? 'currentColor' : 'none'} />
                                    </button>
                                </div>
                            )}
                            {msg.generationTime && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                    <Clock size={10} />
                                    {(msg.generationTime / 1000).toFixed(2)}s
                                </div>
                            )}
                        </div>
                        {!msg.isLoading && isLastMessage && msg.content && (
                            <React.Suspense fallback={null}>
                                <QuickReplyTemplates
                                    lastAssistantMessage={msg.content}
                                    onSelectTemplate={(template: string) => {
                                        setInput(template);
                                        if (textareaRef.current) {
                                            textareaRef.current.focus();
                                        }
                                    }}
                                />
                            </React.Suspense>
                        )}
                    </div>
                ) : (
                    <>
                        {isEditingRow ? (
                            <div className="flex flex-col gap-2">
                                <textarea
                                    value={editingContentForRow}
                                    onChange={handleEditContentChange}
                                    className="w-full min-h-[100px] p-2 bg-slate-900/50 border border-primary/30 rounded-lg text-white resize-y focus:outline-none focus:border-primary/60"
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleSaveEdit(index)}
                                        className="px-3 py-1 text-sm bg-primary hover:bg-primary/80 rounded-lg transition-colors"
                                    >
                                        Save & Resend
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <React.Suspense fallback={<div className="text-xs text-slate-500">Rendering message...</div>}>
                                    <MessageContent
                                        content={msg.content}
                                        isUser={true}
                                        mcpAvailable={mcpAvailable}
                                        onInsertToFile={handleInsertToFile}
                                        isLazyLoaded={isLazyLoaded}
                                        onLoadContent={loadMessageAtIndex}
                                        messageIndex={index}
                                    />
                                </React.Suspense>
                                {msg.images && msg.images.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {msg.images.map((img: ImageAttachment, imgIdx: number) => (
                                            <a
                                                key={imgIdx}
                                                href={img.thumbnailUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block"
                                            >
                                                <img
                                                    src={img.thumbnailUrl}
                                                    alt={img.name}
                                                    className="max-w-[200px] max-h-[150px] object-cover rounded-lg border border-slate-600 hover:border-primary/50 transition-colors cursor-pointer"
                                                />
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
            {showMissingLogprobsWarning && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-2 p-3 bg-amber-900/20 text-amber-200 rounded-lg text-sm border border-amber-900/50 flex flex-col gap-2 max-w-[85%]"
                >
                    <div className="flex items-center gap-2 font-bold"><AlertTriangle size={14} /> Token Data Missing</div>
                    <p className="opacity-80">The LM Studio server refused to send token data. (Note: Remote models like OpenRouter may not support logprobs yet)</p>
                </motion.div>
            )}
            {msg.role === 'assistant' && msg.choices && Array.isArray(msg.choices) && msg.choices.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto max-w-full pb-1">
                    {msg.choices.map((_, cIdx: number) => (
                        <button key={cIdx} onClick={() => selectChoice(index, cIdx)} className={`px-2 py-1 text-xs border rounded-md transition-colors whitespace-nowrap ${(msg.selectedChoiceIndex || 0) === cIdx ? 'bg-slate-700 text-white border-slate-600' : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300'}`}>Option {cIdx + 1}</button>
                    ))}
                </div>
            )}
        </motion.div>
    );
}, (prev, next) => {
    return (
        prev.index === next.index &&
        prev.msg === next.msg &&
        prev.isLoadingMessages === next.isLoadingMessages &&
        prev.isSearchResult === next.isSearchResult &&
        prev.isCurrentSearchResult === next.isCurrentSearchResult &&
        prev.isLastMessage === next.isLastMessage &&
        prev.previousMessage === next.previousMessage &&
        prev.nextMessage === next.nextMessage &&
        prev.isShowingComparison === next.isShowingComparison &&
        prev.isComparisonPartnerHidden === next.isComparisonPartnerHidden &&
        prev.isBookmarked === next.isBookmarked &&
        prev.selectedTokenForMessage === next.selectedTokenForMessage &&
        prev.messageRating === next.messageRating &&
        prev.showInspector === next.showInspector &&
        prev.isEditingRow === next.isEditingRow &&
        prev.editingContentForRow === next.editingContentForRow &&
        prev.conversationFontSize === next.conversationFontSize &&
        prev.isCompactViewport === next.isCompactViewport &&
        prev.isLazyLoaded === next.isLazyLoaded &&
        prev.modelNameById === next.modelNameById &&
        prev.currentModel === next.currentModel &&
        prev.secondaryModel === next.secondaryModel
    );
});
