import React from 'react';

export type ChatPerfMode = 'single' | 'battle';

export interface ChatPerfSample {
    timestamp: number;
    modelId: string;
    mode: ChatPerfMode;
    inputChars: number;
    inputToRenderMs: number;
    inputToFirstTokenMs: number | null;
}

interface PendingChatPerfBenchmark {
    startedAt: number;
    baselineHistoryLength: number;
    assistantTargets: number[];
    initialContentLengthByTarget: Record<number, number>;
    modelId: string;
    mode: ChatPerfMode;
    inputChars: number;
    inputToRenderMs?: number;
    inputToFirstTokenMs?: number;
}

interface UseChatPerfBenchmarksParams {
    storageKey: string;
    history: Array<{ content?: string; isLoading?: boolean }>;
    attachmentsLength: number;
    imageAttachmentsLength: number;
    battleMode: boolean;
    secondaryModel: string;
    prefill: string | null;
    currentModel: string;
}

const parseStoredBenchmarks = (storageKey: string): ChatPerfSample[] => {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as ChatPerfSample[];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((item) =>
                item &&
                Number.isFinite(item.timestamp) &&
                typeof item.modelId === 'string' &&
                (item.mode === 'single' || item.mode === 'battle') &&
                Number.isFinite(item.inputChars) &&
                Number.isFinite(item.inputToRenderMs)
            )
            .slice(0, 5);
    } catch {
        return [];
    }
};

const computePerfStat = (values: number[], kind: 'avg' | 'p95'): number | null => {
    if (values.length === 0) return null;
    if (kind === 'avg') {
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1));
    return sorted[index];
};

export const formatPerfMs = (value?: number | null): string => {
    if (value === null) return 'n/a';
    if (value === undefined) return '...';
    return `${Math.round(value)}ms`;
};

export const useChatPerfBenchmarks = ({
    storageKey,
    history,
    attachmentsLength,
    imageAttachmentsLength,
    battleMode,
    secondaryModel,
    prefill,
    currentModel,
}: UseChatPerfBenchmarksParams) => {
    const [recentPerfBenchmarks, setRecentPerfBenchmarks] = React.useState<ChatPerfSample[]>(() => parseStoredBenchmarks(storageKey));
    const [activePerfBenchmark, setActivePerfBenchmark] = React.useState<PendingChatPerfBenchmark | null>(null);
    const pendingPerfBenchmarkRef = React.useRef<PendingChatPerfBenchmark | null>(null);

    React.useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(recentPerfBenchmarks.slice(0, 5)));
        } catch {
            // Ignore persistence failures for perf diagnostics.
        }
    }, [storageKey, recentPerfBenchmarks]);

    const finalizePerfBenchmark = React.useCallback((pending: PendingChatPerfBenchmark) => {
        if (pendingPerfBenchmarkRef.current !== pending || pending.inputToRenderMs === undefined) return;

        const sample: ChatPerfSample = {
            timestamp: Date.now(),
            modelId: pending.modelId,
            mode: pending.mode,
            inputChars: pending.inputChars,
            inputToRenderMs: pending.inputToRenderMs,
            inputToFirstTokenMs: pending.inputToFirstTokenMs ?? null,
        };

        setRecentPerfBenchmarks((prev) => [sample, ...prev].slice(0, 5));
        pendingPerfBenchmarkRef.current = null;
        setActivePerfBenchmark(null);
    }, []);

    const beginPerfBenchmark = React.useCallback((pendingInput: string) => {
        if (!pendingInput.trim() && attachmentsLength === 0 && imageAttachmentsLength === 0) {
            return;
        }

        const baselineHistoryLength = history.length;
        const isBattleRequest = battleMode && Boolean(secondaryModel);
        const assistantTargets = isBattleRequest
            ? [baselineHistoryLength + 1, baselineHistoryLength + 2]
            : [baselineHistoryLength + 1];
        const initialContentLengthByTarget: Record<number, number> = {};
        assistantTargets.forEach((targetIndex, targetOrder) => {
            initialContentLengthByTarget[targetIndex] = !isBattleRequest && targetOrder === 0 ? (prefill?.length || 0) : 0;
        });

        const pending: PendingChatPerfBenchmark = {
            startedAt: performance.now(),
            baselineHistoryLength,
            assistantTargets,
            initialContentLengthByTarget,
            modelId: currentModel || 'unknown',
            mode: isBattleRequest ? 'battle' : 'single',
            inputChars: pendingInput.trim().length,
        };

        pendingPerfBenchmarkRef.current = pending;
        setActivePerfBenchmark(pending);
    }, [attachmentsLength, imageAttachmentsLength, history.length, battleMode, secondaryModel, prefill, currentModel]);

    React.useEffect(() => {
        const pending = pendingPerfBenchmarkRef.current;
        if (!pending) return;

        const targetsInRange = pending.assistantTargets.filter((index) => index < history.length);
        if (targetsInRange.length === 0) return;

        if (pending.inputToRenderMs === undefined) {
            window.requestAnimationFrame(() => {
                const current = pendingPerfBenchmarkRef.current;
                if (!current || current !== pending || current.inputToRenderMs !== undefined) return;
                current.inputToRenderMs = performance.now() - current.startedAt;
                setActivePerfBenchmark({ ...current });
            });
        }

        if (pending.inputToFirstTokenMs === undefined) {
            for (const targetIndex of targetsInRange) {
                const targetMessage = history[targetIndex];
                if (!targetMessage) continue;
                const initialLength = pending.initialContentLengthByTarget[targetIndex] || 0;
                if ((targetMessage.content || '').length > initialLength) {
                    pending.inputToFirstTokenMs = performance.now() - pending.startedAt;
                    setActivePerfBenchmark({ ...pending });
                    break;
                }
            }
        }

        const allTargetsDone = pending.assistantTargets.every((targetIndex) => {
            const targetMessage = history[targetIndex];
            return Boolean(targetMessage) && !targetMessage.isLoading;
        });

        if (pending.inputToRenderMs !== undefined && (pending.inputToFirstTokenMs !== undefined || allTargetsDone)) {
            finalizePerfBenchmark(pending);
        }
    }, [history, finalizePerfBenchmark]);

    const latestPerfBenchmark = recentPerfBenchmarks[0] || null;
    const perfSummary = React.useMemo(() => {
        const renderValues = recentPerfBenchmarks.map((sample) => sample.inputToRenderMs);
        const firstTokenValues = recentPerfBenchmarks
            .map((sample) => sample.inputToFirstTokenMs)
            .filter((value): value is number => value !== null);
        return {
            sampleCount: recentPerfBenchmarks.length,
            firstTokenSampleCount: firstTokenValues.length,
            renderAvg: computePerfStat(renderValues, 'avg'),
            renderP95: computePerfStat(renderValues, 'p95'),
            firstTokenAvg: computePerfStat(firstTokenValues, 'avg'),
            firstTokenP95: computePerfStat(firstTokenValues, 'p95'),
        };
    }, [recentPerfBenchmarks]);

    const clearPerfHistory = React.useCallback(() => {
        pendingPerfBenchmarkRef.current = null;
        setActivePerfBenchmark(null);
        setRecentPerfBenchmarks([]);
        try {
            localStorage.removeItem(storageKey);
        } catch {
            // Ignore storage failures for perf diagnostics.
        }
    }, [storageKey]);

    return {
        recentPerfBenchmarks,
        activePerfBenchmark,
        latestPerfBenchmark,
        perfSummary,
        beginPerfBenchmark,
        clearPerfHistory,
    };
};
