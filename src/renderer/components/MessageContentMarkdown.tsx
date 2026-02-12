import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageContentMarkdownProps {
    content: string;
}

type MarkdownCodeComponentProps = {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

const MessageContentMarkdown: React.FC<MessageContentMarkdownProps> = ({ content }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            code({ inline, className, children, ...props }: MarkdownCodeComponentProps) {
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

export default React.memo(MessageContentMarkdown);
