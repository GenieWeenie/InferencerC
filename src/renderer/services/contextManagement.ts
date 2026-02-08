import { ChatMessage } from '../../shared/types';

export interface ContextUsage {
    inputTokens: number;
    reservedOutputTokens: number;
    totalTokens: number;
    maxContextTokens: number;
    fillRatio: number;
    warning: boolean;
}

export interface ContextTrimSuggestion {
    messageIndex: number;
    estimatedTokenSavings: number;
    reason: string;
    preview: string;
    role: ChatMessage['role'];
}

export interface AutoSummaryPlan {
    indicesToExclude: number[];
    summary: string;
}

export class ContextManagementService {
    static estimateTokens(text: string): number {
        const normalized = text.trim();
        if (!normalized) return 0;
        return Math.max(1, Math.ceil(normalized.length / 4));
    }

    static estimateUsage(params: {
        messages: ChatMessage[];
        excludedIndices: Set<number>;
        systemPrompt?: string;
        currentInput?: string;
        reservedOutputTokens: number;
        maxContextTokens: number;
    }): ContextUsage {
        const {
            messages,
            excludedIndices,
            systemPrompt,
            currentInput,
            reservedOutputTokens,
            maxContextTokens,
        } = params;

        let inputTokens = 0;
        inputTokens += this.estimateTokens(systemPrompt || '');
        inputTokens += this.estimateTokens(currentInput || '');

        messages.forEach((message, index) => {
            if (excludedIndices.has(index)) return;
            inputTokens += this.estimateTokens(message.content || '');
            // Light framing/token-overhead per message.
            inputTokens += 4;
        });

        const totalTokens = inputTokens + Math.max(0, reservedOutputTokens);
        const fillRatio = maxContextTokens > 0 ? totalTokens / maxContextTokens : 1;

        return {
            inputTokens,
            reservedOutputTokens,
            totalTokens,
            maxContextTokens,
            fillRatio,
            warning: fillRatio >= 0.8,
        };
    }

    static suggestMessagesToTrim(params: {
        messages: ChatMessage[];
        excludedIndices: Set<number>;
        targetFillRatio: number;
        usage: ContextUsage;
    }): ContextTrimSuggestion[] {
        const { messages, excludedIndices, targetFillRatio, usage } = params;
        const targetTokens = Math.floor(usage.maxContextTokens * targetFillRatio);
        const needToSave = Math.max(0, usage.totalTokens - targetTokens);
        if (needToSave <= 0) return [];

        const candidates: ContextTrimSuggestion[] = [];
        const keepRecentCount = 8;
        const oldestAllowedIndex = Math.max(0, messages.length - keepRecentCount);

        messages.forEach((message, index) => {
            if (excludedIndices.has(index)) return;
            if (index >= oldestAllowedIndex) return;
            if (!message.content?.trim()) return;

            const estimate = this.estimateTokens(message.content);
            if (estimate < 25) return;

            candidates.push({
                messageIndex: index,
                estimatedTokenSavings: estimate,
                reason: estimate > 180 ? 'Large message' : 'Older context',
                preview: this.preview(message.content),
                role: message.role,
            });
        });

        return candidates
            .sort((a, b) => b.estimatedTokenSavings - a.estimatedTokenSavings)
            .slice(0, 6);
    }

    static buildAutoSummaryPlan(params: {
        messages: ChatMessage[];
        excludedIndices: Set<number>;
        keepRecentCount?: number;
    }): AutoSummaryPlan | null {
        const { messages, excludedIndices, keepRecentCount = 8 } = params;

        const includedIndices: number[] = [];
        messages.forEach((message, index) => {
            if (excludedIndices.has(index)) return;
            if (!message.content?.trim()) return;
            includedIndices.push(index);
        });

        if (includedIndices.length <= keepRecentCount + 2) {
            return null;
        }

        const cut = Math.max(0, includedIndices.length - keepRecentCount);
        const indicesToExclude = includedIndices.slice(0, cut);
        const summarySource = indicesToExclude
            .map(index => {
                const msg = messages[index];
                return `${msg.role.toUpperCase()}: ${this.preview(msg.content, 120)}`;
            })
            .join('\n');

        if (!summarySource.trim()) {
            return null;
        }

        const summary = `Summarized prior context (${indicesToExclude.length} messages):\n${summarySource}`;
        return {
            indicesToExclude,
            summary: summary.slice(0, 2200),
        };
    }

    private static preview(content: string, maxLen: number = 100): string {
        const normalized = content.replace(/\s+/g, ' ').trim();
        if (normalized.length <= maxLen) return normalized;
        return `${normalized.slice(0, maxLen - 3)}...`;
    }
}
