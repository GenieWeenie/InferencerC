export type MessageRenderMode = 'plain' | 'rich' | 'markdown';

const RICH_SYNTAX_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~|\$\$[\s\S]*?\$\$|\\\(|\\\[|\$[^$\n]+\$)/;
const MARKDOWN_SYNTAX_PATTERN = /(^|\n)\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>\s)|\[.+?\]\(.+?\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|(^|\n)\|.+\|/;
const SYNTAX_SENTINELS = ['`', '$', '~', '#', '*', '_', '[', '|', '>', '\n'];

export const isLikelyTruncatedContent = (content: string): boolean => (
    content.length > 0 && content.endsWith('...') && content.length <= 103
);

export const hasSyntaxSentinel = (content: string): boolean => {
    if (!content) return false;
    for (let i = 0; i < SYNTAX_SENTINELS.length; i += 1) {
        if (content.includes(SYNTAX_SENTINELS[i])) {
            return true;
        }
    }
    return false;
};

export const getMessageRenderMode = (content: string, isStreaming: boolean): MessageRenderMode => {
    if (isStreaming) {
        return 'plain';
    }

    if (!hasSyntaxSentinel(content)) {
        return 'plain';
    }

    if (RICH_SYNTAX_PATTERN.test(content)) {
        return 'rich';
    }

    if (MARKDOWN_SYNTAX_PATTERN.test(content)) {
        return 'markdown';
    }

    return 'plain';
};

export const buildLazyLoadRequestKey = (
    messageIndex: number,
    isLazyLoaded: boolean,
    isContentTruncated: boolean
): string => `${messageIndex}:${isLazyLoaded ? 'lazy' : 'normal'}:${isContentTruncated ? 'truncated' : 'full'}`;

interface LazyLoadDecisionInput {
    content: string;
    isLazyLoaded: boolean;
    messageIndex?: number;
    hasOnLoadContent: boolean;
    isLoadingContent: boolean;
    lastRequestKey: string | null;
}

interface LazyLoadDecision {
    shouldDispatch: boolean;
    nextRequestKey: string | null;
    isContentTruncated: boolean;
}

export const getLazyLoadDecision = ({
    content,
    isLazyLoaded,
    messageIndex,
    hasOnLoadContent,
    isLoadingContent,
    lastRequestKey,
}: LazyLoadDecisionInput): LazyLoadDecision => {
    const isContentTruncated = isLikelyTruncatedContent(content);
    const shouldAttemptLoad = (isLazyLoaded || isContentTruncated) && typeof messageIndex === 'number';

    if (!shouldAttemptLoad) {
        return {
            shouldDispatch: false,
            nextRequestKey: null,
            isContentTruncated,
        };
    }

    if (!hasOnLoadContent || isLoadingContent) {
        return {
            shouldDispatch: false,
            nextRequestKey: lastRequestKey,
            isContentTruncated,
        };
    }

    const requestKey = buildLazyLoadRequestKey(messageIndex, isLazyLoaded, isContentTruncated);

    if (lastRequestKey === requestKey) {
        return {
            shouldDispatch: false,
            nextRequestKey: requestKey,
            isContentTruncated,
        };
    }

    return {
        shouldDispatch: true,
        nextRequestKey: requestKey,
        isContentTruncated,
    };
};
