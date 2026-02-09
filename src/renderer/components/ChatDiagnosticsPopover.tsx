import React from 'react';
import { X } from 'lucide-react';

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
    detail: string;
}

interface ChatDiagnosticsPopoverProps {
    position: { left: number; top: number };
    status: DiagnosticsStatus;
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

const ChatDiagnosticsPopover = React.forwardRef<HTMLDivElement, ChatDiagnosticsPopoverProps>(
    (
        {
            position,
            status,
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
        },
        ref
    ) => (
        <div
            ref={ref}
            className="fixed w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-40"
            style={{ left: position.left, top: position.top }}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold text-slate-200">Startup Diagnostics</p>
                    <p className="text-[11px] text-slate-400 mt-1">{status.detail}</p>
                </div>
                <button
                    onClick={onClose}
                    className="text-slate-500 hover:text-slate-200 transition-colors"
                    aria-label="Close diagnostics panel"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/50 px-2.5 py-2">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Dev Perf (Last Send)</p>
                    <div className="flex items-center gap-2">
                        {activePerfBenchmark && (
                            <span className="text-[10px] text-cyan-300 animate-pulse">Measuring...</span>
                        )}
                        {recentPerfBenchmarksCount > 0 && (
                            <button
                                onClick={onClearPerfHistory}
                                className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
                {latestPerfBenchmark ? (
                    <div className="mt-1.5 space-y-1">
                        <p className="text-[11px] text-slate-300">
                            Input → Render: <span className="font-semibold text-cyan-300">{formatPerfMs(latestPerfBenchmark.inputToRenderMs)}</span>
                        </p>
                        <p className="text-[11px] text-slate-300">
                            Input → First Token: <span className="font-semibold text-emerald-300">{formatPerfMs(latestPerfBenchmark.inputToFirstTokenMs)}</span>
                        </p>
                        <p className="text-[10px] text-slate-500">
                            {latestPerfBenchmark.mode === 'battle' ? 'Battle mode' : 'Single mode'} • {latestPerfBenchmark.inputChars} chars
                        </p>
                        <div className="mt-2 rounded border border-slate-800/80 bg-slate-900/60 px-2 py-1.5">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500">
                                Last {perfSummary.sampleCount} Sends
                            </p>
                            <p className="mt-1 text-[11px] text-slate-300">
                                Render Avg / P95: <span className="font-semibold text-cyan-300">{formatPerfMs(perfSummary.renderAvg)}</span> / <span className="font-semibold text-cyan-300">{formatPerfMs(perfSummary.renderP95)}</span>
                            </p>
                            <p className="text-[11px] text-slate-300">
                                First Token Avg / P95: <span className="font-semibold text-emerald-300">{formatPerfMs(perfSummary.firstTokenAvg)}</span> / <span className="font-semibold text-emerald-300">{formatPerfMs(perfSummary.firstTokenP95)}</span>
                            </p>
                            {perfSummary.firstTokenSampleCount !== perfSummary.sampleCount && (
                                <p className="text-[10px] text-slate-500">
                                    First-token stats based on {perfSummary.firstTokenSampleCount} completed samples.
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="mt-1.5 text-[11px] text-slate-500">Send one prompt to record benchmark metrics.</p>
                )}
            </div>

            <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/50 px-2.5 py-2">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Dev Monitors</p>
                        <p className="text-[10px] text-slate-500 mt-1">Console FPS and memory polling for deep diagnostics.</p>
                    </div>
                    <button
                        onClick={onToggleDevMonitors}
                        className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-colors ${
                            devMonitorsEnabled
                                ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700/70'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                    >
                        {devMonitorsEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                </div>
            </div>

            <div className="mt-3 space-y-2">
                {!providerReady && (
                    <>
                        <button
                            onClick={onRequestConnectionRefresh}
                            className="w-full px-2.5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs text-left"
                        >
                            Retry Connection Check
                        </button>
                        <button
                            onClick={onOpenSettings}
                            className="w-full px-2.5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs text-left"
                        >
                            Open Settings (API Keys)
                        </button>
                        <button
                            onClick={onOpenModels}
                            className="w-full px-2.5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs text-left"
                        >
                            Open Models Tab
                        </button>
                    </>
                )}

                {providerReady && !modelReady && (
                    <>
                        <button
                            onClick={onAutoSelectFirstModel}
                            className="w-full px-2.5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs text-left"
                        >
                            Auto-Select First Available Model
                        </button>
                        <button
                            onClick={onOpenModels}
                            className="w-full px-2.5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs text-left"
                        >
                            Open Models Tab
                        </button>
                    </>
                )}

                {providerReady && modelReady && historyLength === 0 && !promptReady && (
                    <button
                        onClick={onInsertStarterPrompt}
                        className="w-full px-2.5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs text-left"
                    >
                        Insert Starter Prompt
                    </button>
                )}

                {providerReady && modelReady && (historyLength > 0 || promptReady) && (
                    <div className="px-2 py-2 rounded-md bg-emerald-900/20 border border-emerald-800/50 text-[11px] text-emerald-300">
                        No startup blockers detected.
                    </div>
                )}
            </div>
        </div>
    )
);

ChatDiagnosticsPopover.displayName = 'ChatDiagnosticsPopover';

export default ChatDiagnosticsPopover;
