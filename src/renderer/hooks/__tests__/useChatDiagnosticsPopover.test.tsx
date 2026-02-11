import React from 'react';
import {
    buildChatDiagnosticsPopover,
    type UseChatDiagnosticsPopoverParams,
} from '../useChatDiagnosticsPopover';

const baseParams: UseChatDiagnosticsPopoverParams = {
    showDiagnosticsPanel: true,
    diagnosticsPopoverRef: { current: null },
    diagnosticsPanelPosition: { left: 12, top: 24 },
    diagnosticsStatus: {
        label: 'Healthy',
        detail: 'All systems go.',
        className: 'text-emerald-300',
    },
    activePerfBenchmark: null,
    recentPerfBenchmarksCount: 0,
    latestPerfBenchmark: null,
    perfSummary: {
        sampleCount: 0,
        firstTokenSampleCount: 0,
        renderAvg: null,
        renderP95: null,
        firstTokenAvg: null,
        firstTokenP95: null,
    },
    formatPerfMs: jest.fn((value?: number | null) => (value == null ? '—' : `${value} ms`)),
    devMonitorsEnabled: false,
    providerReady: true,
    modelReady: true,
    historyLength: 0,
    promptReady: false,
    onClose: jest.fn(),
    onClearPerfHistory: jest.fn(),
    onToggleDevMonitors: jest.fn(),
    onRequestConnectionRefresh: jest.fn(),
    onAutoSelectFirstModel: jest.fn(),
    onOpenSettings: jest.fn(),
    onOpenModels: jest.fn(),
    onInsertStarterPrompt: jest.fn(),
};

describe('buildChatDiagnosticsPopover', () => {
    it('returns null when diagnostics popover is hidden', () => {
        const result = buildChatDiagnosticsPopover({
            ...baseParams,
            showDiagnosticsPanel: false,
        });

        expect(result).toBeNull();
    });

    it('returns a suspense-wrapped diagnostics popover when visible', () => {
        const result = buildChatDiagnosticsPopover(baseParams);

        expect(React.isValidElement(result)).toBe(true);
        expect((result as React.ReactElement).type).toBe(React.Suspense);
    });
});

