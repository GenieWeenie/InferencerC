import React from 'react';
import type { ChatOverlaySlots } from './ChatOverlays';
import type { ChatOverlaySlotsProps } from './chatOverlayTypes';
import {
    AnalyticsDashboard,
    ConversationTreeView,
    ExportDialog,
    GlobalSearchDialog,
    KeyboardShortcutsModal,
    PerformanceMonitorOverlay,
    RecoveryDialog,
    RequestResponseLog,
    TemplateLibraryDialog,
} from './chatLazyPanels';

interface BuildChatCoreOverlaySlotsParams extends Pick<
    ChatOverlaySlotsProps,
    | 'showShortcutsModal'
    | 'setShowShortcutsModal'
    | 'showRequestLog'
    | 'setShowRequestLog'
    | 'apiLogs'
    | 'clearApiLogs'
    | 'showAnalytics'
    | 'setShowAnalytics'
    | 'usageStats'
    | 'branchingEnabled'
    | 'showTreeView'
    | 'setShowTreeView'
    | 'treeManager'
    | 'currentPath'
    | 'showExportDialog'
    | 'setShowExportDialog'
    | 'history'
    | 'sessionId'
    | 'showGlobalSearch'
    | 'setShowGlobalSearch'
    | 'onJumpToSearchMessage'
    | 'showTemplateLibrary'
    | 'setShowTemplateLibrary'
    | 'createNewSession'
    | 'setSystemPrompt'
    | 'setTemperature'
    | 'setTopP'
    | 'setMaxTokens'
    | 'setExpertMode'
    | 'setThinkingEnabled'
    | 'replaceHistory'
    | 'systemPrompt'
    | 'temperature'
    | 'topP'
    | 'maxTokens'
    | 'expertMode'
    | 'thinkingEnabled'
    | 'devMonitorsEnabled'
    | 'showRecoveryDialog'
    | 'setShowRecoveryDialog'
    | 'handleRestoreSession'
    | 'handleDismissRecovery'
    | 'recoveryState'
> {
    currentSessionTitle: string;
}

export const buildChatCoreOverlaySlots = ({
    showShortcutsModal,
    setShowShortcutsModal,
    showRequestLog,
    setShowRequestLog,
    apiLogs,
    clearApiLogs,
    showAnalytics,
    setShowAnalytics,
    usageStats,
    branchingEnabled,
    showTreeView,
    setShowTreeView,
    treeManager,
    currentPath,
    showExportDialog,
    setShowExportDialog,
    history,
    sessionId,
    showGlobalSearch,
    setShowGlobalSearch,
    onJumpToSearchMessage,
    showTemplateLibrary,
    setShowTemplateLibrary,
    createNewSession,
    setSystemPrompt,
    setTemperature,
    setTopP,
    setMaxTokens,
    setExpertMode,
    setThinkingEnabled,
    replaceHistory,
    systemPrompt,
    temperature,
    topP,
    maxTokens,
    expertMode,
    thinkingEnabled,
    devMonitorsEnabled,
    showRecoveryDialog,
    setShowRecoveryDialog,
    handleRestoreSession,
    handleDismissRecovery,
    recoveryState,
    currentSessionTitle,
}: BuildChatCoreOverlaySlotsParams): Pick<
    ChatOverlaySlots,
    | 'keyboardShortcutsModal'
    | 'requestResponseLog'
    | 'analyticsDashboard'
    | 'conversationTreeView'
    | 'exportDialog'
    | 'globalSearchDialog'
    | 'templateLibraryDialog'
    | 'performanceMonitor'
    | 'recoveryDialog'
> => ({
    keyboardShortcutsModal: showShortcutsModal ? (
        <React.Suspense fallback={null}>
            <KeyboardShortcutsModal
                isOpen={showShortcutsModal}
                onClose={() => setShowShortcutsModal(false)}
            />
        </React.Suspense>
    ) : null,
    requestResponseLog: showRequestLog ? (
        <React.Suspense fallback={null}>
            <RequestResponseLog
                isOpen={showRequestLog}
                onClose={() => setShowRequestLog(false)}
                logs={apiLogs}
                onClear={clearApiLogs}
            />
        </React.Suspense>
    ) : null,
    analyticsDashboard: showAnalytics ? (
        <React.Suspense fallback={null}>
            <AnalyticsDashboard
                isOpen={showAnalytics}
                onClose={() => setShowAnalytics(false)}
                usageHistory={usageStats}
            />
        </React.Suspense>
    ) : null,
    conversationTreeView: branchingEnabled && showTreeView && treeManager ? (
        <React.Suspense fallback={null}>
            <ConversationTreeView
                isOpen={showTreeView}
                onClose={() => setShowTreeView(false)}
                treeManager={treeManager}
                currentPath={currentPath}
                onNavigateToNode={() => {
                    setShowTreeView(false);
                }}
            />
        </React.Suspense>
    ) : null,
    exportDialog: showExportDialog ? (
        <React.Suspense fallback={null}>
            <ExportDialog
                isOpen={showExportDialog}
                onClose={() => setShowExportDialog(false)}
                messages={history}
                sessionTitle={currentSessionTitle}
            />
        </React.Suspense>
    ) : null,
    globalSearchDialog: showGlobalSearch ? (
        <React.Suspense fallback={null}>
            <GlobalSearchDialog
                isOpen={showGlobalSearch}
                onClose={() => setShowGlobalSearch(false)}
                currentSessionId={sessionId}
                currentSessionTitle={currentSessionTitle}
                onNavigateToMessage={onJumpToSearchMessage}
            />
        </React.Suspense>
    ) : null,
    templateLibraryDialog: showTemplateLibrary ? (
        <React.Suspense fallback={null}>
            <TemplateLibraryDialog
                isOpen={showTemplateLibrary}
                onClose={() => setShowTemplateLibrary(false)}
                onUseTemplate={(template) => {
                    createNewSession();

                    if (template.systemPrompt) {
                        setSystemPrompt(template.systemPrompt);
                    }
                    if (template.settings) {
                        if (template.settings.temperature !== undefined) setTemperature(template.settings.temperature);
                        if (template.settings.topP !== undefined) setTopP(template.settings.topP);
                        if (template.settings.maxTokens !== undefined) setMaxTokens(template.settings.maxTokens);
                        if (template.settings.expertMode !== undefined) setExpertMode(template.settings.expertMode);
                        if (template.settings.thinkingEnabled !== undefined) setThinkingEnabled(template.settings.thinkingEnabled);
                    }

                    if (template.initialMessages.length > 0) {
                        replaceHistory(template.initialMessages.map((message) => ({
                            ...message,
                            isLoading: false,
                        })));
                    }
                }}
                currentMessages={history}
                currentSystemPrompt={systemPrompt}
                currentSettings={{
                    temperature,
                    topP,
                    maxTokens,
                    expertMode,
                    thinkingEnabled,
                }}
            />
        </React.Suspense>
    ) : null,
    performanceMonitor: devMonitorsEnabled ? (
        <React.Suspense fallback={null}>
            <PerformanceMonitorOverlay messageCount={history.length} />
        </React.Suspense>
    ) : null,
    recoveryDialog: showRecoveryDialog ? (
        <React.Suspense fallback={null}>
            <RecoveryDialog
                isOpen={showRecoveryDialog}
                onClose={() => setShowRecoveryDialog(false)}
                onRestore={handleRestoreSession}
                onDismiss={handleDismissRecovery}
                recoveryState={recoveryState}
            />
        </React.Suspense>
    ) : null,
});
