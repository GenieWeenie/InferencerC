import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import StreamingIndicator from './StreamingIndicator';

interface MessageContentProps {
    content: string;
    isUser: boolean;
    mcpAvailable?: boolean;
    onInsertToFile?: (code: string, language: string, filePath: string) => void;
    isStreaming?: boolean;
    isLazyLoaded?: boolean;
    onLoadContent?: () => void;
    messageIndex?: number;
}

interface BasicMarkdownProps {
    content: string;
}

const RichMessageContent = React.lazy(() => import('./MessageContentRich'));

const BasicMarkdown: React.FC<BasicMarkdownProps> = ({ content }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            code({ inline, className, children, ...props }: any) {
                const codeString = String(children).replace(/\n$/, '');
                const isBlock = !inline && codeString.includes('\n');
                return isBlock ? (
                    <pre className="my-4 rounded-lg overflow-x-auto bg-slate-950/80 border border-slate-700/60 p-4 text-[13px] leading-relaxed custom-scrollbar">
                        <code className={`font-mono text-slate-100 ${className || ''}`} {...props}>
                            {codeString}
                        </code>
                    </pre>
                ) : (
                    <code className={`${className || ''} bg-slate-800/80 px-1.5 py-0.5 rounded text-amber-200 font-mono text-[0.85em] border border-slate-700/50 box-decoration-clone break-all`} {...props}>
                        {children}
                    </code>
                );
            },
            p: ({ children }) => <p className="mb-4 last:mb-0 leading-7 text-slate-300 font-sens">{children}</p>,
            ul: ({ children }) => <ul className="list-disc ml-4 mb-4 space-y-2 text-slate-300 marker:text-primary/70">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal ml-4 mb-4 space-y-2 text-slate-300 marker:text-primary/70">{children}</ol>,
            h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4 mt-8 pb-2 border-b border-slate-800">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-bold text-white mb-3 mt-6 flex items-center gap-2"><span className="w-1 h-6 bg-primary rounded-full inline-block"></span>{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-bold text-slate-100 mb-2 mt-5">{children}</h3>,
            a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-300 hover:underline font-medium transition-colors decoration-primary/30 underline-offset-4">
                    {children}
                </a>
            ),
            table: ({ children }) => (
                <div className="overflow-x-auto my-6 border border-slate-700 rounded-lg shadow-sm bg-slate-900/30 custom-scrollbar max-w-full">
                    <table className="min-w-full divide-y divide-slate-700 text-left border-collapse">
                        {children}
                    </table>
                </div>
            ),
            thead: ({ children }) => <thead className="bg-slate-800/80 text-slate-200">{children}</thead>,
            th: ({ children }) => <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-slate-700 whitespace-nowrap">{children}</th>,
            td: ({ children }) => <td className="px-4 py-3 text-sm text-slate-300 border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition-colors">{children}</td>,
            blockquote: ({ children }) => (
                <div className="flex gap-3 my-4 pl-4 border-l-4 border-primary/40 bg-slate-800/20 py-3 pr-4 rounded-r-lg italic text-slate-400">
                    <div className="opacity-30 text-4xl leading-none font-serif">"</div>
                    <div className="flex-1">{children}</div>
                </div>
            ),
            hr: () => <hr className="my-8 border-slate-800" />,
        }}
    >
        {content}
    </ReactMarkdown>
);

const MessageContent: React.FC<MessageContentProps> = ({
    content,
    isUser,
    mcpAvailable,
    onInsertToFile,
    isStreaming,
    isLazyLoaded = false,
    onLoadContent,
    messageIndex,
}) => {
    const [displayContent, setDisplayContent] = React.useState(content);
    const [isLoadingContent, setIsLoadingContent] = React.useState(false);

    React.useEffect(() => {
        if (!isStreaming) {
            setDisplayContent(content);
            return;
        }

        let animationFrameId: number;
        const animate = () => {
            if (displayContent.length < content.length) {
                setDisplayContent((prev) => content.slice(0, prev.length + 1));
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [content, isStreaming, displayContent.length]);

    React.useEffect(() => {
        const isContentTruncated = content.length > 0 && content.endsWith('...') && content.length <= 103;
        if ((isLazyLoaded || isContentTruncated) && onLoadContent && !isLoadingContent) {
            setIsLoadingContent(true);
            onLoadContent();
        }
    }, [isLazyLoaded, messageIndex]);

    React.useEffect(() => {
        if (isLoadingContent && content.length > 103 && !content.endsWith('...')) {
            setIsLoadingContent(false);
        }
    }, [content, isLoadingContent]);

    const isContentTruncated = content.length > 0 && content.endsWith('...') && content.length <= 103;
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

    const hasCodeOrMath = /(```|~~~|\\\(|\\\[|\$\$|`[^`]+`)/.test(cleanContent);

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

            {hasCodeOrMath ? (
                <React.Suspense fallback={<BasicMarkdown content={cleanContent} />}>
                    <RichMessageContent
                        content={cleanContent}
                        isUser={isUser}
                        mcpAvailable={mcpAvailable}
                        onInsertToFile={onInsertToFile}
                    />
                </React.Suspense>
            ) : (
                <BasicMarkdown content={cleanContent} />
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
