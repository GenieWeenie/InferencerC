import React from 'react';
import { ChatDiagnosticsPopover } from '../components/chat/chatLazyPanels';

interface BenchmarkSample {
    inputToRenderMs: number;
    inputToFirstTokenMs: number | null;
    mode: 'single' | 'battle';
    inputChars: number;
}

interface PerfSummary {
    sampleCount: number;
    firstTokenSampleCount: number;
    renderAvg: number | null;
    renderP95: number | null;
    firstTokenAvg: number | null;
    firstTokenP95: number | null;
}

interface DiagnosticsStatus {
    label: string;
    detail: string;
    className: string;
}

export interface UseChatDiagnosticsPopoverParams {
    showDiagnosticsPanel: boolean;
    diagnosticsPopoverRef: React.RefObject<HTMLDivElement | null>;
    diagnosticsPanelPosition: { left: number; top: number };
    diagnosticsStatus: DiagnosticsStatus;
    activePerfBenchmark: unknown | null;
    recentPerfBenchmarksCount: number;
    latestPerfBenchmark: BenchmarkSample | null;
    perfSummary: PerfSummary;
    formatPerfMs: (value?: number | null) => string;
    devMonitorsEnabled: boolean;
    providerReady: boolean;
    modelReady: boolean;
    historyLength: number;
    promptReady: boolean;
    onClose: () => void;
    onClearPerfHistory: () => void;
    onToggleDevMonitors: () => void;
    onRequestConnectionRefresh: () => void;
    onAutoSelectFirstModel: () => void;
    onOpenSettings: () => void;
    onOpenModels: () => void;
    onInsertStarterPrompt: () => void;
}

export const buildChatDiagnosticsPopover = ({
    showDiagnosticsPanel,
    diagnosticsPopoverRef,
    diagnosticsPanelPosition,
    diagnosticsStatus,
    activePerfBenchmark,
    recentPerfBenchmarksCount,
    latestPerfBenchmark,
    perfSummary,
    formatPerfMs,
    devMonitorsEnabled,
    providerReady,
    modelReady,
    historyLength,
    promptReady,
    onClose,
    onClearPerfHistory,
    onToggleDevMonitors,
    onRequestConnectionRefresh,
    onAutoSelectFirstModel,
    onOpenSettings,
    onOpenModels,
    onInsertStarterPrompt,
}: UseChatDiagnosticsPopoverParams): React.ReactNode => {
    if (!showDiagnosticsPanel) {
        return null;
    }

    return (
        <React.Suspense fallback={null}>
            <ChatDiagnosticsPopover
                ref={diagnosticsPopoverRef}
                position={diagnosticsPanelPosition}
                status={diagnosticsStatus}
                activePerfBenchmark={activePerfBenchmark}
                recentPerfBenchmarksCount={recentPerfBenchmarksCount}
                latestPerfBenchmark={latestPerfBenchmark}
                perfSummary={perfSummary}
                formatPerfMs={formatPerfMs}
                devMonitorsEnabled={devMonitorsEnabled}
                providerReady={providerReady}
                modelReady={modelReady}
                historyLength={historyLength}
                promptReady={promptReady}
                onClose={onClose}
                onClearPerfHistory={onClearPerfHistory}
                onToggleDevMonitors={onToggleDevMonitors}
                onRequestConnectionRefresh={onRequestConnectionRefresh}
                onAutoSelectFirstModel={onAutoSelectFirstModel}
                onOpenSettings={onOpenSettings}
                onOpenModels={onOpenModels}
                onInsertStarterPrompt={onInsertStarterPrompt}
            />
        </React.Suspense>
    );
};

export const useChatDiagnosticsPopover = (
    params: UseChatDiagnosticsPopoverParams
): React.ReactNode => {
    return React.useMemo(() => buildChatDiagnosticsPopover(params), [
        params.showDiagnosticsPanel,
        params.diagnosticsPopoverRef,
        params.diagnosticsPanelPosition,
        params.diagnosticsStatus,
        params.activePerfBenchmark,
        params.recentPerfBenchmarksCount,
        params.latestPerfBenchmark,
        params.perfSummary,
        params.formatPerfMs,
        params.devMonitorsEnabled,
        params.providerReady,
        params.modelReady,
        params.historyLength,
        params.promptReady,
        params.onClose,
        params.onClearPerfHistory,
        params.onToggleDevMonitors,
        params.onRequestConnectionRefresh,
        params.onAutoSelectFirstModel,
        params.onOpenSettings,
        params.onOpenModels,
        params.onInsertStarterPrompt,
    ]);
};
