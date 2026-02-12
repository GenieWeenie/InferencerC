import React from 'react';
import StreamingIndicator from './StreamingIndicator';
import {
    getLazyLoadDecision,
    getMessageRenderMode,
    isLikelyTruncatedContent,
} from '../lib/messageContentSyntax';

interface MessageContentProps {
    content: string;
    isUser: boolean;
    mcpAvailable?: boolean;
    onInsertToFile?: (code: string, language: string, filePath: string) => void;
    isStreaming?: boolean;
    isLazyLoaded?: boolean;
    onLoadContent?: (messageIndex: number) => void;
    messageIndex?: number;
    collapseLongCodeBlocksSignal?: number;
    expandLongCodeBlocksSignal?: number;
}

interface PlainTextContentProps {
    content: string;
}

const RichMessageContent = React.lazy(() => import('./MessageContentRich'));
const MarkdownMessageContent = React.lazy(() => import('./MessageContentMarkdown'));

const PlainTextContent: React.FC<PlainTextContentProps> = ({ content }) => {
    const paragraphs = content
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

    if (paragraphs.length === 0) {
        return null;
    }

    return (
        <div>
            {paragraphs.map((paragraph, paragraphIndex) => (
                (() => {
                    const lines = paragraph.split('\n');
                    return (
                        <p key={`${paragraphIndex}-${paragraph.slice(0, 20)}`} className="mb-4 last:mb-0 leading-7 text-slate-300 whitespace-pre-wrap">
                            {lines.map((line, lineIndex) => (
                                <React.Fragment key={`${paragraphIndex}-${lineIndex}`}>
                                    {line}
                                    {lineIndex < lines.length - 1 ? <br /> : null}
                                </React.Fragment>
                            ))}
                        </p>
                    );
                })()
            ))}
        </div>
    );
};

const MessageContent: React.FC<MessageContentProps> = ({
    content,
    isUser,
    mcpAvailable,
    onInsertToFile,
    isStreaming,
    isLazyLoaded = false,
    onLoadContent,
    messageIndex,
    collapseLongCodeBlocksSignal,
    expandLongCodeBlocksSignal,
}) => {
    const [displayContent, setDisplayContent] = React.useState(content);
    const [isLoadingContent, setIsLoadingContent] = React.useState(false);
    const lastLoadRequestKeyRef = React.useRef<string | null>(null);
    const displayContentRef = React.useRef(content);
    const displayLengthRef = React.useRef(content.length);
    const streamTargetRef = React.useRef(content);
    const animationFrameRef = React.useRef<number | null>(null);

    const cancelStreamingAnimation = React.useCallback(() => {
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, []);

    React.useEffect(() => {
        displayContentRef.current = displayContent;
        displayLengthRef.current = displayContent.length;
    }, [displayContent]);

    React.useEffect(() => {
        streamTargetRef.current = content;

        if (!isStreaming) {
            cancelStreamingAnimation();
            displayContentRef.current = content;
            displayLengthRef.current = content.length;
            setDisplayContent(content);
            return;
        }

        if (!content.startsWith(displayContentRef.current)) {
            displayContentRef.current = '';
            displayLengthRef.current = 0;
            setDisplayContent('');
        }

        if (animationFrameRef.current !== null) {
            return;
        }

        let animationFrameId: number;
        const animate = () => {
            const target = streamTargetRef.current;
            if (displayLengthRef.current < target.length) {
                const nextLength = Math.min(displayLengthRef.current + 1, target.length);
                displayLengthRef.current = nextLength;
                setDisplayContent(target.slice(0, nextLength));
                animationFrameId = requestAnimationFrame(animate);
                animationFrameRef.current = animationFrameId;
                return;
            }

            animationFrameRef.current = null;
        };

        animationFrameId = requestAnimationFrame(animate);
        animationFrameRef.current = animationFrameId;
    }, [content, isStreaming, cancelStreamingAnimation]);

    React.useEffect(() => {
        return () => {
            cancelStreamingAnimation();
        };
    }, [cancelStreamingAnimation]);

    React.useEffect(() => {
        const decision = getLazyLoadDecision({
            content,
            isLazyLoaded,
            messageIndex,
            hasOnLoadContent: Boolean(onLoadContent),
            isLoadingContent,
            lastRequestKey: lastLoadRequestKeyRef.current,
        });
        lastLoadRequestKeyRef.current = decision.nextRequestKey;
        if (!decision.shouldDispatch || !onLoadContent || typeof messageIndex !== 'number') {
            return;
        }
        setIsLoadingContent(true);
        onLoadContent(messageIndex);
    }, [content, isLazyLoaded, onLoadContent, messageIndex, isLoadingContent]);

    React.useEffect(() => {
        if (isLoadingContent && content.length > 103 && !content.endsWith('...')) {
            setIsLoadingContent(false);
        }
    }, [content, isLoadingContent]);

    const isContentTruncated = isLikelyTruncatedContent(content);
    const shouldShowSkeleton = (isLazyLoaded || isContentTruncated) && isLoadingContent;

    if (shouldShowSkeleton) {
        return (
            <div className="prose prose-invert max-w-none text-sm">
                <div className="flex items-center gap-3 p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg animate-pulse">
                    <div className="flex-shrink-0">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-700/50 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        );
    }

    let thoughtProcess: string | null = null;
    let cleanContent = displayContent;

    if (displayContent.trim().startsWith('<thinking>')) {
        const parts = displayContent.split('</thinking>');
        if (parts.length > 1) {
            thoughtProcess = parts[0].replace('<thinking>', '').trim();
            cleanContent = parts.slice(1).join('</thinking>').trim();
        } else {
            thoughtProcess = content.replace('<thinking>', '').trim();
            cleanContent = '';
        }
    }

    const renderMode = getMessageRenderMode(cleanContent, Boolean(isStreaming));

    return (
        <div className={`prose ${isUser ? 'prose-invert' : 'prose-invert'} max-w-none text-sm break-words overflow-wrap-anywhere word-break-break-word`}>
            {thoughtProcess && (
                <details className="mb-4 group bg-slate-900/50 border border-slate-700/50 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300" open={cleanContent === ''}>
                    <summary className="px-4 py-2 cursor-pointer bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                        <span className="opacity-70 group-open:rotate-90 transition-transform">▶</span>
                        Thought Process
                    </summary>
                    <div className="p-4 bg-slate-950/30 text-slate-400 font-mono text-xs whitespace-pre-wrap leading-relaxed border-t border-slate-800/50 border-dashed max-h-[400px] overflow-y-auto custom-scrollbar">
                        {thoughtProcess}
                    </div>
                </details>
            )}

            {renderMode === 'rich' ? (
                <React.Suspense fallback={<PlainTextContent content={cleanContent} />}>
                    <RichMessageContent
                        content={cleanContent}
                        isUser={isUser}
                        mcpAvailable={mcpAvailable}
                        onInsertToFile={onInsertToFile}
                        collapseLongCodeBlocksSignal={collapseLongCodeBlocksSignal}
                        expandLongCodeBlocksSignal={expandLongCodeBlocksSignal}
                    />
                </React.Suspense>
            ) : renderMode === 'markdown' ? (
                <React.Suspense fallback={<PlainTextContent content={cleanContent} />}>
                    <MarkdownMessageContent content={cleanContent} />
                </React.Suspense>
            ) : (
                <PlainTextContent content={cleanContent} />
            )}

            {isStreaming && !isUser && (
                <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <StreamingIndicator />
                </div>
            )}
        </div>
    );
};

export default React.memo(MessageContent);
