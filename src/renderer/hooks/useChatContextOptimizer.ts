import React from 'react';
import { toast } from 'sonner';
import {
    buildContextTrimSuggestionRows,
    buildRecentContextMessageRows,
    type ContextTrimSuggestionRow,
    type RecentContextMessageRow,
} from '../lib/chatUiModels';
import type { ChatMessage } from '../../shared/types';
import type { ContextUsage, ContextTrimSuggestion } from '../services/contextManagement';

interface ContextManagementServiceLike {
    estimateTokens: (text: string) => number;
    estimateUsage: (params: {
        messages: ChatMessage[];
        excludedIndices: Set<number>;
        systemPrompt?: string;
        currentInput?: string;
        reservedOutputTokens: number;
        maxContextTokens: number;
    }) => ContextUsage;
    suggestMessagesToTrim: (params: {
        messages: ChatMessage[];
        excludedIndices: Set<number>;
        targetFillRatio: number;
        usage: ContextUsage;
    }) => ContextTrimSuggestion[];
    buildAutoSummaryPlan: (params: {
        messages: ChatMessage[];
        excludedIndices: Set<number>;
        keepRecentCount?: number;
    }) => { indicesToExclude: number[]; summary: string } | null;
}

interface UseChatContextOptimizerParams {
    sessionId: string;
    history: ChatMessage[];
    systemPrompt: string;
    input: string;
    maxTokens: number;
    maxContextTokens: number;
    contextManagementService: ContextManagementServiceLike | null;
}

const estimateTokensFallback = (text: string): number => {
    const normalized = text.trim();
    if (!normalized) return 0;
    return Math.max(1, Math.ceil(normalized.length / 4));
};

const estimateUsageFallback = ({
    history,
    excludedIndices,
    systemPrompt,
    currentInput,
    maxTokens,
    maxContextTokens,
}: {
    history: ChatMessage[];
    excludedIndices: Set<number>;
    systemPrompt: string;
    currentInput: string;
    maxTokens: number;
    maxContextTokens: number;
}): ContextUsage => {
    let inputTokens = estimateTokensFallback(systemPrompt || '') + estimateTokensFallback(currentInput || '');
    history.forEach((message, index) => {
        if (excludedIndices.has(index)) return;
        inputTokens += estimateTokensFallback(message.content || '') + 4;
    });

    const totalTokens = inputTokens + Math.max(0, maxTokens);
    const fillRatio = maxContextTokens > 0 ? totalTokens / maxContextTokens : 1;

    return {
        inputTokens,
        reservedOutputTokens: maxTokens,
        totalTokens,
        maxContextTokens,
        fillRatio,
        warning: fillRatio >= 0.8,
    };
};

export const useChatContextOptimizer = ({
    sessionId,
    history,
    systemPrompt,
    input,
    maxTokens,
    maxContextTokens,
    contextManagementService,
}: UseChatContextOptimizerParams) => {
    const [excludedContextIndices, setExcludedContextIndices] = React.useState<Set<number>>(new Set());
    const [autoSummarizeContext, setAutoSummarizeContext] = React.useState(true);
    const contextWarningTriggered = React.useRef(false);

    const excludedContextKey = React.useMemo(
        () => Array.from(excludedContextIndices).sort((a, b) => a - b).join(','),
        [excludedContextIndices]
    );

    React.useEffect(() => {
        if (!sessionId) {
            setExcludedContextIndices(new Set());
            return;
        }

        try {
            const raw = localStorage.getItem(`context-exclusions-${sessionId}`);
            if (!raw) {
                setExcludedContextIndices(new Set());
                return;
            }
            const parsed = JSON.parse(raw) as number[];
            setExcludedContextIndices(new Set(parsed.filter((n) => Number.isInteger(n) && n >= 0)));
        } catch {
            setExcludedContextIndices(new Set());
        }
    }, [sessionId]);

    React.useEffect(() => {
        if (!sessionId) return;
        const safe = Array.from(excludedContextIndices).filter((index) => index < history.length);
        localStorage.setItem(`context-exclusions-${sessionId}`, JSON.stringify(safe));
    }, [sessionId, excludedContextIndices, history.length]);

    React.useEffect(() => {
        setExcludedContextIndices((prev) => {
            const next = new Set(Array.from(prev).filter((index) => index < history.length));
            return next.size === prev.size ? prev : next;
        });
    }, [history.length]);

    const estimateTokens = React.useCallback((text: string) => {
        if (contextManagementService) {
            return contextManagementService.estimateTokens(text);
        }
        return estimateTokensFallback(text);
    }, [contextManagementService]);

    const contextUsage = React.useMemo<ContextUsage>(() => {
        if (contextManagementService) {
            return contextManagementService.estimateUsage({
                messages: history,
                excludedIndices: excludedContextIndices,
                systemPrompt,
                currentInput: input,
                reservedOutputTokens: maxTokens,
                maxContextTokens,
            });
        }

        return estimateUsageFallback({
            history,
            excludedIndices: excludedContextIndices,
            systemPrompt,
            currentInput: input,
            maxTokens,
            maxContextTokens,
        });
    }, [
        contextManagementService,
        history,
        excludedContextIndices,
        systemPrompt,
        input,
        maxTokens,
        maxContextTokens,
        excludedContextKey,
    ]);

    const trimSuggestions = React.useMemo<ContextTrimSuggestion[]>(() => {
        if (!contextManagementService) return [];
        return contextManagementService.suggestMessagesToTrim({
            messages: history,
            excludedIndices: excludedContextIndices,
            targetFillRatio: 0.75,
            usage: contextUsage,
        });
    }, [history, excludedContextIndices, contextUsage, excludedContextKey, contextManagementService]);

    const trimSuggestionRows = React.useMemo<ContextTrimSuggestionRow[]>(
        () => buildContextTrimSuggestionRows(trimSuggestions, 3),
        [trimSuggestions]
    );

    const recentContextRows = React.useMemo<RecentContextMessageRow[]>(
        () => buildRecentContextMessageRows(history, excludedContextIndices, estimateTokens, 20),
        [history, excludedContextIndices, excludedContextKey, estimateTokens]
    );

    React.useEffect(() => {
        if (contextUsage.fillRatio >= 0.8 && !contextWarningTriggered.current) {
            toast.warning(`Context window is ${(contextUsage.fillRatio * 100).toFixed(0)}% full. Consider trimming older messages.`);
            contextWarningTriggered.current = true;
        } else if (contextUsage.fillRatio < 0.75) {
            contextWarningTriggered.current = false;
        }
    }, [contextUsage.fillRatio]);

    const toggleMessageContextInclusion = React.useCallback((messageIndex: number) => {
        setExcludedContextIndices((prev) => {
            const next = new Set(prev);
            if (next.has(messageIndex)) {
                next.delete(messageIndex);
            } else {
                next.add(messageIndex);
            }
            return next;
        });
    }, []);

    const applyTrimSuggestions = React.useCallback((count: number = 3) => {
        if (trimSuggestions.length === 0) return;
        setExcludedContextIndices((prev) => {
            const next = new Set(prev);
            trimSuggestions.slice(0, count).forEach((suggestion) => next.add(suggestion.messageIndex));
            return next;
        });
    }, [trimSuggestions]);

    const includeAllContext = React.useCallback(() => {
        setExcludedContextIndices(new Set());
    }, []);

    const excludeTrimSuggestion = React.useCallback((messageIndex: number) => {
        setExcludedContextIndices((prev) => {
            const next = new Set(prev);
            next.add(messageIndex);
            return next;
        });
    }, []);

    const buildContextSendOptions = React.useCallback((pendingInput: string) => {
        const effectiveExcluded = new Set(excludedContextIndices);
        let contextSummary: string | undefined;

        const usageAtSend: ContextUsage = contextManagementService
            ? contextManagementService.estimateUsage({
                messages: history,
                excludedIndices: effectiveExcluded,
                systemPrompt,
                currentInput: pendingInput,
                reservedOutputTokens: maxTokens,
                maxContextTokens,
            })
            : estimateUsageFallback({
                history,
                excludedIndices: effectiveExcluded,
                systemPrompt,
                currentInput: pendingInput,
                maxTokens,
                maxContextTokens,
            });

        if (autoSummarizeContext && usageAtSend.fillRatio >= 0.8) {
            const plan = contextManagementService?.buildAutoSummaryPlan({
                messages: history,
                excludedIndices: effectiveExcluded,
                keepRecentCount: 8,
            });

            if (plan && plan.indicesToExclude.length > 0) {
                plan.indicesToExclude.forEach((index) => effectiveExcluded.add(index));
                contextSummary = plan.summary;
                setExcludedContextIndices(new Set(effectiveExcluded));
                toast.info(`Auto-summarized ${plan.indicesToExclude.length} older messages to fit context limits.`);
            }
        }

        return {
            excludedMessageIndices: Array.from(effectiveExcluded),
            contextSummary,
        };
    }, [
        excludedContextIndices,
        contextManagementService,
        history,
        systemPrompt,
        maxTokens,
        maxContextTokens,
        autoSummarizeContext,
    ]);

    return {
        autoSummarizeContext,
        setAutoSummarizeContext,
        excludedContextIndices,
        contextUsage,
        trimSuggestionRows,
        recentContextRows,
        toggleMessageContextInclusion,
        applyTrimSuggestions,
        includeAllContext,
        excludeTrimSuggestion,
        buildContextSendOptions,
    };
};
