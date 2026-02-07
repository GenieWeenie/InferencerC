import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Play, X, FileText, Save, PlayCircle, Github, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import 'katex/dist/katex.min.css';
import ArtifactPreview from './ArtifactPreview';
import { toast } from 'sonner';
import { githubService } from '../services/github';
import { useCollapseState } from '../hooks/useCollapseState';

interface MessageContentProps {
    content: string;
    isUser: boolean;
    mcpAvailable?: boolean;
    onInsertToFile?: (code: string, language: string) => void;
    isStreaming?: boolean;
    sessionId?: string;
}

// Languages that support live preview
const PREVIEWABLE_LANGUAGES = ['html', 'htm', 'css', 'javascript', 'js'];

// Common languages for syntax highlighting
const COMMON_LANGUAGES = [
    'text', 'javascript', 'typescript', 'jsx', 'tsx', 'python', 'java', 'c', 'cpp', 'csharp',
    'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'dart', 'scala', 'r', 'sql',
    'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'toml', 'ini',
    'markdown', 'bash', 'shell', 'powershell', 'dockerfile', 'makefile', 'cmake',
    'diff', 'git', 'nginx', 'apache', 'graphql', 'vue', 'svelte', 'angular'
];

// Utility function to count words in text, stripping markdown
const countWords = (text: string): number => {
    // Remove code blocks first (both inline and block)
    let cleanText = text.replace(/```[\s\S]*?```/g, '');
    cleanText = cleanText.replace(/`[^`]+`/g, '');

    // Remove markdown formatting
    cleanText = cleanText.replace(/[#*_~`\[\]()]/g, '');

    // Remove extra whitespace and split by whitespace
    const words = cleanText.trim().split(/\s+/).filter(word => word.length > 0);

    return words.length;
};

const MessageContent: React.FC<MessageContentProps> = ({ content, isUser, mcpAvailable, onInsertToFile, isStreaming, sessionId = 'default' }) => {
    const [displayContent, setDisplayContent] = React.useState(content);

    // Typewriter effect for streaming
    React.useEffect(() => {
        if (!isStreaming) {
            setDisplayContent(content);
            return;
        }

        let animationFrameId: number;

        const animate = () => {
            if (displayContent.length < content.length) {
                // Fixed 1 char per frame for consistent typewriter feel
                // At 60fps, this is 60 chars/sec - a slower reading speed
                const chunkSize = 1;

                setDisplayContent(prev => content.slice(0, prev.length + chunkSize));
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [content, isStreaming, displayContent.length]); // depend on length to allow re-trigger, but be careful of loops.
    // Actually, simple timeout based approach might be more stable in React than rAF due to render cycles.

    const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
    const [previewCode, setPreviewCode] = React.useState<{ code: string; language: string } | null>(null);
    const [showFilePathInput, setShowFilePathInput] = React.useState<string | null>(null);
    const [filePath, setFilePath] = React.useState('');
    // Track custom language selection per code block (keyed by code content hash)
    const [codeBlockLanguages, setCodeBlockLanguages] = React.useState<Record<string, string>>({});
    const [executingCode, setExecutingCode] = React.useState<string | null>(null);
    const [executionResults, setExecutionResults] = React.useState<Record<string, { output: string; success: boolean }>>({});

    // Use collapse state hook for persistent code block collapse state
    const { isCollapsed, toggleCollapse } = useCollapseState(sessionId);

    // Calculate word count and determine if message should be collapsible
    const wordCount = React.useMemo(() => countWords(displayContent), [displayContent]);
    const isLongMessage = wordCount > 500;

    // State for message collapse (using 'message' as the key)
    const messageCollapseKey = 'message';
    const isMessageCollapsed = isCollapsed(messageCollapseKey);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const handleSaveFile = (code: string, language: string) => {
        // Get file extension from language
        const extensionMap: Record<string, string> = {
            'javascript': 'js',
            'typescript': 'ts',
            'jsx': 'jsx',
            'tsx': 'tsx',
            'python': 'py',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'csharp': 'cs',
            'php': 'php',
            'ruby': 'rb',
            'go': 'go',
            'rust': 'rs',
            'swift': 'swift',
            'kotlin': 'kt',
            'dart': 'dart',
            'scala': 'scala',
            'r': 'r',
            'sql': 'sql',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'toml': 'toml',
            'ini': 'ini',
            'markdown': 'md',
            'md': 'md',
            'bash': 'sh',
            'shell': 'sh',
            'powershell': 'ps1',
            'dockerfile': 'Dockerfile',
            'makefile': 'Makefile',
            'cmake': 'cmake',
            'graphql': 'graphql',
            'vue': 'vue',
            'svelte': 'svelte',
            'angular': 'ts'
        };

        const extension = extensionMap[language.toLowerCase()] || 'txt';
        const filename = `artifact-${Date.now()}.${extension}`;

        // Create blob and download
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`Saved as ${filename}`);
    };

    const handleExecuteCode = async (code: string, language: string, codeHash: string) => {
        if (!window.electronAPI?.executeCode) {
            toast.error('Code execution not available');
            return;
        }

        setExecutingCode(codeHash);
        try {
            const result = await window.electronAPI.executeCode(code, language);
            setExecutionResults(prev => ({
                ...prev,
                [codeHash]: {
                    output: result.output || 'No output',
                    success: result.success || false
                }
            }));
            if (result.success) {
                toast.success('Code executed successfully');
            } else {
                toast.error('Code execution failed');
            }
        } catch (error: any) {
            setExecutionResults(prev => ({
                ...prev,
                [codeHash]: {
                    output: `Error: ${error.message}`,
                    success: false
                }
            }));
            toast.error('Execution error');
        } finally {
            setExecutingCode(null);
        }
    };

    const handleInsertToFile = (codeString: string, language: string) => {
        if (!filePath.trim()) {
            toast.error('Please enter a file path');
            return;
        }

        if (onInsertToFile) {
            onInsertToFile(codeString, language);
            toast.success(`Inserting code to ${filePath}...`);
            setShowFilePathInput(null);
            setFilePath('');
        }
    };

    // Parse <thinking> blocks more robustly
    let thoughtProcess = null;
    let cleanContent = displayContent;

    // Check if content starts with <thinking>
    if (displayContent.trim().startsWith('<thinking>')) {
        const parts = displayContent.split('</thinking>');
        if (parts.length > 1) {
            // Found closing tag
            thoughtProcess = parts[0].replace('<thinking>', '').trim();
            cleanContent = parts.slice(1).join('</thinking>').trim();
        } else {
            // Still streaming thinking block? Or malformed?
            // If we are deep in thinking but haven't closed, show all as thought
            thoughtProcess = content.replace('<thinking>', '').trim();
            cleanContent = ""; // No main content yet
        }
    }

    // Create preview content for collapsed long messages
    const getPreviewContent = (text: string): string => {
        const words = text.split(/\s+/);
        if (words.length <= 100) return text;
        return words.slice(0, 100).join(' ') + '...';
    };

    const contentToRender = isLongMessage && isMessageCollapsed
        ? getPreviewContent(cleanContent)
        : cleanContent;

    return (
        <div className={`prose ${isUser ? 'prose-invert' : 'prose-invert'} max-w-none text-sm break-words overflow-wrap-anywhere word-break-break-word`}>
            {/* Long message collapse toggle */}
            {isLongMessage && (
                <div className="flex items-center justify-end mb-2 -mt-2">
                    <button
                        onClick={() => toggleCollapse(messageCollapseKey)}
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors py-1 px-2 rounded hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600"
                        title={isMessageCollapsed ? "Expand message" : "Collapse message"}
                    >
                        <span className="font-mono">{wordCount} words</span>
                        {isMessageCollapsed ? (
                            <ChevronDown size={14} />
                        ) : (
                            <ChevronUp size={14} />
                        )}
                    </button>
                </div>
            )}

            {thoughtProcess && (
                <details className="mb-4 group bg-slate-900/50 border border-slate-700/50 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300" open={cleanContent === ""}>
                    <summary className="px-4 py-2 cursor-pointer bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                        <span className="opacity-70 group-open:rotate-90 transition-transform">▶</span>
                        Thought Process
                    </summary>
                    <div className="p-4 bg-slate-950/30 text-slate-400 font-mono text-xs whitespace-pre-wrap leading-relaxed border-t border-slate-800/50 border-dashed max-h-[400px] overflow-y-auto custom-scrollbar">
                        {thoughtProcess}
                    </div>
                </details>
            )}
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        const isBlock = !inline && (match || codeString.includes('\n'));
                        const codeHash = codeString.substring(0, 50); // Use first 50 chars as hash
                        const detectedLanguage = match ? match[1] : 'text';
                        // Use custom language if set, otherwise use detected
                        const language = codeBlockLanguages[codeHash] || detectedLanguage;
                        const isPreviewable = PREVIEWABLE_LANGUAGES.includes(language.toLowerCase());

                        const handleLanguageChange = (newLang: string) => {
                            setCodeBlockLanguages(prev => ({ ...prev, [codeHash]: newLang }));
                        };

                        return isBlock ? (
                            <div className="rounded-lg overflow-hidden my-4 border border-slate-700 bg-[#1e1e1e] shadow-lg group/code">
                                <div className="flex justify-between items-center px-4 py-2 bg-[#2d2d2d] border-b border-slate-700 select-none">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                                        </div>
                                        <select
                                            value={language}
                                            onChange={(e) => handleLanguageChange(e.target.value)}
                                            className="text-xs font-mono text-slate-300 font-bold ml-2 uppercase tracking-wider bg-slate-800/50 border border-slate-600/50 rounded px-2 py-0.5 hover:bg-slate-700/50 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer appearance-none"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {COMMON_LANGUAGES.map(lang => (
                                                <option key={lang} value={lang} className="bg-slate-800">
                                                    {lang.toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => toggleCollapse(codeHash)}
                                            className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                                            title={isCollapsed(codeHash) ? "Expand code block" : "Collapse code block"}
                                        >
                                            {isCollapsed(codeHash) ? (
                                                <ChevronDown size={16} className="text-slate-400" />
                                            ) : (
                                                <ChevronUp size={16} className="text-slate-400" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {isPreviewable && (
                                            <button
                                                onClick={() => setPreviewCode({ code: codeString, language })}
                                                className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors py-1 px-2 rounded hover:bg-slate-700 border border-emerald-500/30 hover:border-emerald-500/50"
                                            >
                                                <Play size={12} fill="currentColor" />
                                                PREVIEW
                                            </button>
                                        )}
                                        {mcpAvailable && !isUser && (
                                            <button
                                                onClick={() => setShowFilePathInput(codeString)}
                                                className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors py-1 px-2 rounded hover:bg-slate-700 border border-blue-500/30 hover:border-blue-500/50"
                                                title="Insert to file (requires MCP)"
                                            >
                                                <FileText size={12} />
                                                INSERT
                                            </button>
                                        )}
                                        {(language === 'python' || language === 'javascript' || language === 'js') && !isUser && (
                                            <button
                                                onClick={() => handleExecuteCode(codeString, language, codeHash)}
                                                disabled={executingCode === codeHash}
                                                className="flex items-center gap-1.5 text-[10px] font-bold text-orange-400 hover:text-orange-300 transition-colors py-1 px-2 rounded hover:bg-slate-700 border border-orange-500/30 hover:border-orange-500/50 disabled:opacity-50"
                                                title="Execute code (sandboxed)"
                                            >
                                                {executingCode === codeHash ? (
                                                    <span className="animate-spin">⏳</span>
                                                ) : (
                                                    <PlayCircle size={12} />
                                                )}
                                                RUN
                                            </button>
                                        )}
                                        {githubService.isConfigured() && !isUser && (
                                            <button
                                                onClick={async () => {
                                                    const filename = `code.${language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'python' ? 'py' : 'txt'}`;
                                                    const description = `Code snippet from InferencerC`;

                                                    const result = await githubService.createGist(
                                                        description,
                                                        filename,
                                                        codeString,
                                                        false // Private by default
                                                    );

                                                    if (result.success && result.gist) {
                                                        toast.success('Gist created!', {
                                                            action: {
                                                                label: 'Open',
                                                                onClick: () => window.open(result.gist!.html_url, '_blank')
                                                            }
                                                        });
                                                    } else {
                                                        toast.error(result.error || 'Failed to create gist');
                                                    }
                                                }}
                                                className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors py-1 px-2 rounded hover:bg-slate-700 border border-emerald-500/30 hover:border-emerald-500/50"
                                                title="Create GitHub Gist"
                                            >
                                                <Github size={12} />
                                                GIST
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleSaveFile(codeString, language)}
                                            className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors py-1 px-2 rounded hover:bg-slate-700 border border-purple-500/30 hover:border-purple-500/50"
                                            title="Save as file"
                                        >
                                            <Save size={12} />
                                            SAVE
                                        </button>
                                        <button
                                            onClick={() => handleCopy(codeString)}
                                            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-white transition-colors py-1 px-2 rounded hover:bg-slate-700 border border-transparent hover:border-slate-600"
                                        >
                                            {copiedCode === codeString ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                            {copiedCode === codeString ? 'COPIED' : 'COPY'}
                                        </button>
                                    </div>
                                </div>
                                <AnimatePresence initial={false}>
                                    {!isCollapsed(codeHash) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            style={{ overflow: "hidden" }}
                                        >
                                            <div className="relative">
                                                <SyntaxHighlighter
                                                    {...props}
                                                    style={vscDarkPlus}
                                                    language={language}
                                                    PreTag="div"
                                                    customStyle={{ margin: 0, borderRadius: 0, padding: '1.25rem', overflowX: 'auto', background: 'transparent', fontSize: '13px', lineHeight: '1.5' }}
                                                    wrapLines={true}
                                                    wrapLongLines={true}
                                                    showLineNumbers={true}
                                                    lineNumberStyle={{ minWidth: '2em', paddingRight: '1em', color: '#525252', textAlign: 'right' }}
                                                >
                                                    {codeString}
                                                </SyntaxHighlighter>
                                            </div>
                                            {/* Execution Results */}
                                            {executionResults[codeHash] && (
                                                <div className={`px-4 py-3 border-t ${executionResults[codeHash].success ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-xs font-bold ${executionResults[codeHash].success ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {executionResults[codeHash].success ? '✓ Execution Successful' : '✗ Execution Failed'}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                const newResults = { ...executionResults };
                                                                delete newResults[codeHash];
                                                                setExecutionResults(newResults);
                                                            }}
                                                            className="ml-auto p-1 hover:bg-slate-700 rounded transition-colors"
                                                        >
                                                            <X size={12} className="text-slate-500" />
                                                        </button>
                                                    </div>
                                                    <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap bg-slate-900/50 p-2 rounded border border-slate-700/50 max-h-48 overflow-y-auto custom-scrollbar">
                                                        {executionResults[codeHash].output}
                                                    </pre>
                                                </div>
                                            )}
                                            {showFilePathInput === codeString && (
                                                <div className="px-4 py-3 bg-[#2d2d2d] border-t border-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={filePath}
                                                            onChange={(e) => setFilePath(e.target.value)}
                                                            placeholder="Enter file path (e.g., ./src/utils/helper.js)"
                                                            className="flex-1 bg-slate-800 border border-slate-600 text-white text-sm rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleInsertToFile(codeString, language);
                                                                } else if (e.key === 'Escape') {
                                                                    setShowFilePathInput(null);
                                                                    setFilePath('');
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => handleInsertToFile(codeString, language)}
                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded font-medium transition-colors"
                                                        >
                                                            Insert
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setShowFilePathInput(null);
                                                                setFilePath('');
                                                            }}
                                                            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                                                        >
                                                            <X size={16} className="text-slate-400" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <code className={`${className} bg-slate-800/80 px-1.5 py-0.5 rounded text-amber-200 font-mono text-[0.85em] border border-slate-700/50 box-decoration-clone break-all`} {...props}>
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
                {contentToRender}
            </ReactMarkdown>

            {/* Artifact Preview Modal */}
            {previewCode && (
                <div className="mt-4 animate-in slide-in-from-bottom-4 duration-300">
                    <ArtifactPreview
                        code={previewCode.code}
                        language={previewCode.language}
                        onClose={() => setPreviewCode(null)}
                    />
                </div>
            )}
        </div>
    );
};

export default React.memo(MessageContent);
