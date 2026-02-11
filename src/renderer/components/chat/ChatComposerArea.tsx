import React from 'react';
import type { ChatMessage } from '../../../shared/types';
import type {
    ComposerControlPillActionConfig,
    ComposerVariableContext,
} from './ChatInlinePanels';
import { ChatComposerShell } from './ChatComposerShell';
import {
    ComposerActionButtons,
    ComposerControlPills,
} from './ChatInlinePanels';
import {
    ComposerAttachmentsPanel,
    ComposerAuxPanels,
} from './ChatInspectorComposerPanels';
import type { ProjectContext } from '../../services/projectContext';
import type { PromptSnippet } from '../../hooks/usePrompts';

interface ChatComposerAreaProps {
    composerContainerRef: React.RefObject<HTMLDivElement | null>;
    isCompactViewport: boolean;
    isDragging: boolean;
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    attachments: Array<{ name: string; content: string }>;
    imageAttachments: Array<{ name: string; mimeType: string; base64: string; thumbnailUrl: string }>;
    onRemoveAttachment: (index: number) => void;
    onRemoveImageAttachment: (index: number) => void;
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
    onExecuteWebFetch: () => void | Promise<void>;
    isFetchingWeb: boolean;
    showGithubInput: boolean;
    githubUrl: string;
    onGithubUrlChange: (value: string) => void;
    onGithubInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onExecuteGithubFetch: () => void | Promise<void>;
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
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    input: string;
    onInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onInputPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
    onInputKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    showBottomControls: boolean;
    onToggleBottomControls: () => void;
    onToggleSuggestions: () => void;
    onSendComposerMessage: () => void;
    composerControlPillActions: ComposerControlPillActionConfig[];
    mcpAvailable: boolean;
    mcpConnectedCount: number;
    mcpToolCount: number;
    showExpertMenu: boolean;
    onSelectExpert: (expert: string) => void;
    showVariableMenu: boolean;
    onCloseVariableMenu: () => void;
    onInsertVariable: (variable: string) => void;
    composerVariableContext: ComposerVariableContext;
}

export const ChatComposerArea: React.FC<ChatComposerAreaProps> = React.memo(({
    composerContainerRef,
    isCompactViewport,
    isDragging,
    onDragOver,
    onDragLeave,
    onDrop,
    attachments,
    imageAttachments,
    onRemoveAttachment,
    onRemoveImageAttachment,
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
    textareaRef,
    input,
    onInputChange,
    onInputPaste,
    onInputKeyDown,
    showBottomControls,
    onToggleBottomControls,
    onToggleSuggestions,
    onSendComposerMessage,
    composerControlPillActions,
    mcpAvailable,
    mcpConnectedCount,
    mcpToolCount,
    showExpertMenu,
    onSelectExpert,
    showVariableMenu,
    onCloseVariableMenu,
    onInsertVariable,
    composerVariableContext,
}) => (
    <ChatComposerShell
        composerContainerRef={composerContainerRef}
        isCompactViewport={isCompactViewport}
        isDragging={isDragging}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        attachmentsPanel={(
            <ComposerAttachmentsPanel
                attachments={attachments}
                imageAttachments={imageAttachments}
                onRemoveAttachment={onRemoveAttachment}
                onRemoveImageAttachment={onRemoveImageAttachment}
            />
        )}
        auxPanels={(
            <ComposerAuxPanels
                showSuggestions={showSuggestions}
                history={history}
                onSelectSuggestion={onSelectSuggestion}
                onCloseSuggestions={onCloseSuggestions}
                prefill={prefill}
                onPrefillChange={onPrefillChange}
                showUrlInput={showUrlInput}
                urlInput={urlInput}
                onUrlInputChange={onUrlInputChange}
                onUrlInputKeyDown={onUrlInputKeyDown}
                onExecuteWebFetch={onExecuteWebFetch}
                isFetchingWeb={isFetchingWeb}
                showGithubInput={showGithubInput}
                githubUrl={githubUrl}
                onGithubUrlChange={onGithubUrlChange}
                onGithubInputKeyDown={onGithubInputKeyDown}
                onExecuteGithubFetch={onExecuteGithubFetch}
                isFetchingGithub={isFetchingGithub}
                githubConfigured={githubConfigured}
                projectContext={projectContext}
                includeContextInMessages={includeContextInMessages}
                onToggleIncludeContextInMessages={onToggleIncludeContextInMessages}
                onClearProjectContext={onClearProjectContext}
                onStartWatchingProjectContext={onStartWatchingProjectContext}
                slashMatch={slashMatch}
                filteredPrompts={filteredPrompts}
                activePromptIndex={activePromptIndex}
                onInsertPrompt={onInsertPrompt}
            />
        )}
        textareaRef={textareaRef}
        input={input}
        slashMatchActive={Boolean(slashMatch)}
        onInputChange={onInputChange}
        onInputPaste={onInputPaste}
        onInputKeyDown={onInputKeyDown}
        showBottomControls={showBottomControls}
        actionButtons={(
            <ComposerActionButtons
                showBottomControls={showBottomControls}
                showSuggestions={showSuggestions}
                canToggleSuggestions={history.length > 0}
                canSend={Boolean(input.trim())}
                onToggleBottomControls={onToggleBottomControls}
                onToggleSuggestions={onToggleSuggestions}
                onSend={onSendComposerMessage}
            />
        )}
        bottomControls={(
            <ComposerControlPills
                actions={composerControlPillActions}
                mcpAvailable={mcpAvailable}
                mcpConnectedCount={mcpConnectedCount}
                mcpToolCount={mcpToolCount}
                showExpertMenu={showExpertMenu}
                onSelectExpert={onSelectExpert}
                showVariableMenu={showVariableMenu}
                onCloseVariableMenu={onCloseVariableMenu}
                onInsertVariable={onInsertVariable}
                variableContext={composerVariableContext}
            />
        )}
    />
), (prev, next) => (
    prev.composerContainerRef === next.composerContainerRef &&
    prev.isCompactViewport === next.isCompactViewport &&
    prev.isDragging === next.isDragging &&
    prev.onDragOver === next.onDragOver &&
    prev.onDragLeave === next.onDragLeave &&
    prev.onDrop === next.onDrop &&
    prev.attachments === next.attachments &&
    prev.imageAttachments === next.imageAttachments &&
    prev.onRemoveAttachment === next.onRemoveAttachment &&
    prev.onRemoveImageAttachment === next.onRemoveImageAttachment &&
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
    prev.onInsertPrompt === next.onInsertPrompt &&
    prev.textareaRef === next.textareaRef &&
    prev.input === next.input &&
    prev.onInputChange === next.onInputChange &&
    prev.onInputPaste === next.onInputPaste &&
    prev.onInputKeyDown === next.onInputKeyDown &&
    prev.showBottomControls === next.showBottomControls &&
    prev.onToggleBottomControls === next.onToggleBottomControls &&
    prev.onToggleSuggestions === next.onToggleSuggestions &&
    prev.onSendComposerMessage === next.onSendComposerMessage &&
    prev.composerControlPillActions === next.composerControlPillActions &&
    prev.mcpAvailable === next.mcpAvailable &&
    prev.mcpConnectedCount === next.mcpConnectedCount &&
    prev.mcpToolCount === next.mcpToolCount &&
    prev.showExpertMenu === next.showExpertMenu &&
    prev.onSelectExpert === next.onSelectExpert &&
    prev.showVariableMenu === next.showVariableMenu &&
    prev.onCloseVariableMenu === next.onCloseVariableMenu &&
    prev.onInsertVariable === next.onInsertVariable &&
    prev.composerVariableContext === next.composerVariableContext
));
