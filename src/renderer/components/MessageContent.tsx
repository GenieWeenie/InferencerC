import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Play, X, FileText, Save, PlayCircle, Github } from 'lucide-react';
import ArtifactPreview from './ArtifactPreview';
import StreamingIndicator from './StreamingIndicator';
import { toast } from 'sonner';
import { githubService } from '../services/github';

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

const SYNTAX_LANGUAGE_ALIASES: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    shell: 'bash',
    sh: 'bash',
    zsh: 'bash',
    ps1: 'powershell',
    yml: 'yaml',
    md: 'markdown',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    kt: 'kotlin',
    cs: 'csharp',
    htm: 'markup',
    html: 'markup',
    xml: 'markup',
    svg: 'markup',
    dockerfile: 'docker',
    angular: 'typescript',
    apache: 'apacheconf',
    json5: 'json',
};

const PRISM_LANGUAGE_LOADERS: Record<string, () => Promise<{ default: any }>> = {
    javascript: () => import('react-syntax-highlighter/dist/esm/languages/prism/javascript'),
    typescript: () => import('react-syntax-highlighter/dist/esm/languages/prism/typescript'),
    jsx: () => import('react-syntax-highlighter/dist/esm/languages/prism/jsx'),
    tsx: () => import('react-syntax-highlighter/dist/esm/languages/prism/tsx'),
    python: () => import('react-syntax-highlighter/dist/esm/languages/prism/python'),
    java: () => import('react-syntax-highlighter/dist/esm/languages/prism/java'),
    c: () => import('react-syntax-highlighter/dist/esm/languages/prism/c'),
    cpp: () => import('react-syntax-highlighter/dist/esm/languages/prism/cpp'),
    csharp: () => import('react-syntax-highlighter/dist/esm/languages/prism/csharp'),
    php: () => import('react-syntax-highlighter/dist/esm/languages/prism/php'),
    ruby: () => import('react-syntax-highlighter/dist/esm/languages/prism/ruby'),
    go: () => import('react-syntax-highlighter/dist/esm/languages/prism/go'),
    rust: () => import('react-syntax-highlighter/dist/esm/languages/prism/rust'),
    swift: () => import('react-syntax-highlighter/dist/esm/languages/prism/swift'),
    kotlin: () => import('react-syntax-highlighter/dist/esm/languages/prism/kotlin'),
    dart: () => import('react-syntax-highlighter/dist/esm/languages/prism/dart'),
    scala: () => import('react-syntax-highlighter/dist/esm/languages/prism/scala'),
    r: () => import('react-syntax-highlighter/dist/esm/languages/prism/r'),
    sql: () => import('react-syntax-highlighter/dist/esm/languages/prism/sql'),
    markup: () => import('react-syntax-highlighter/dist/esm/languages/prism/markup'),
    css: () => import('react-syntax-highlighter/dist/esm/languages/prism/css'),
    scss: () => import('react-syntax-highlighter/dist/esm/languages/prism/scss'),
    sass: () => import('react-syntax-highlighter/dist/esm/languages/prism/sass'),
    less: () => import('react-syntax-highlighter/dist/esm/languages/prism/less'),
    json: () => import('react-syntax-highlighter/dist/esm/languages/prism/json'),
    yaml: () => import('react-syntax-highlighter/dist/esm/languages/prism/yaml'),
    toml: () => import('react-syntax-highlighter/dist/esm/languages/prism/toml'),
    ini: () => import('react-syntax-highlighter/dist/esm/languages/prism/ini'),
    markdown: () => import('react-syntax-highlighter/dist/esm/languages/prism/markdown'),
    bash: () => import('react-syntax-highlighter/dist/esm/languages/prism/bash'),
    powershell: () => import('react-syntax-highlighter/dist/esm/languages/prism/powershell'),
    docker: () => import('react-syntax-highlighter/dist/esm/languages/prism/docker'),
    makefile: () => import('react-syntax-highlighter/dist/esm/languages/prism/makefile'),
    cmake: () => import('react-syntax-highlighter/dist/esm/languages/prism/cmake'),
    diff: () => import('react-syntax-highlighter/dist/esm/languages/prism/diff'),
    git: () => import('react-syntax-highlighter/dist/esm/languages/prism/git'),
    nginx: () => import('react-syntax-highlighter/dist/esm/languages/prism/nginx'),
    apacheconf: () => import('react-syntax-highlighter/dist/esm/languages/prism/apacheconf'),
    graphql: () => import('react-syntax-highlighter/dist/esm/languages/prism/graphql'),
};

const normalizeSyntaxLanguage = (language: string): string | null => {
    const normalized = language.toLowerCase().trim();
    if (!normalized || normalized === 'text' || normalized === 'plaintext' || normalized === 'txt') {
        return null;
    }
    return SYNTAX_LANGUAGE_ALIASES[normalized] || normalized;
};

interface MathPluginBundle {
    remarkMath: any;
    rehypeKatex: any;
}

interface SyntaxHighlighterBundle {
    component: React.ComponentType<any> & {
        registerLanguage: (name: string, language: any) => void;
    };
    style: any;
}

const MessageContent: React.FC<MessageContentProps> = ({ content, isUser, mcpAvailable, onInsertToFile, isStreaming, isLazyLoaded = false, onLoadContent, messageIndex }) => {
    const [displayContent, setDisplayContent] = React.useState(content);
    const [isLoadingContent, setIsLoadingContent] = React.useState(false);

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

    // Lazy loading effect: Trigger content load on mount if needed
    React.useEffect(() => {
        // Detect if content is lazy-loaded (truncated to 100 chars + "...")
        const isContentTruncated = content.length > 0 && content.endsWith('...') && content.length <= 103;

        if (isLazyLoaded || isContentTruncated) {
            if (onLoadContent && !isLoadingContent) {
                setIsLoadingContent(true);
                onLoadContent();
                // The parent will re-render with full content, which will update the content prop
            }
        }
    }, [isLazyLoaded, messageIndex]); // Only run when lazy-loaded state or message index changes

    // Update loading state when content changes (full content loaded)
    React.useEffect(() => {
        if (isLoadingContent && content.length > 103 && !content.endsWith('...')) {
            setIsLoadingContent(false);
        }
    }, [content, isLoadingContent]);

    const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
    const [previewCode, setPreviewCode] = React.useState<{ code: string; language: string } | null>(null);
    const [showFilePathInput, setShowFilePathInput] = React.useState<string | null>(null);
    const [filePath, setFilePath] = React.useState('');
    // Track custom language selection per code block (keyed by code content hash)
    const [codeBlockLanguages, setCodeBlockLanguages] = React.useState<Record<string, string>>({});
    const [executingCode, setExecutingCode] = React.useState<string | null>(null);
    const [executionResults, setExecutionResults] = React.useState<Record<string, { output: string; success: boolean }>>({});
    const [mathPlugins, setMathPlugins] = React.useState<MathPluginBundle | null>(null);
    const [syntaxHighlighterBundle, setSyntaxHighlighterBundle] = React.useState<SyntaxHighlighterBundle | null>(null);
    const [loadedSyntaxLanguages, setLoadedSyntaxLanguages] = React.useState<Set<string>>(new Set());
    const loadedSyntaxLanguagesRef = React.useRef<Set<string>>(new Set());
    const syntaxLanguageLoadInFlightRef = React.useRef<Set<string>>(new Set());

    const contentWithoutThinking = React.useMemo(() => {
        if (!displayContent.trim().startsWith('<thinking>')) return displayContent;
        const parts = displayContent.split('</thinking>');
        return parts.length > 1 ? parts.slice(1).join('</thinking>').trim() : '';
    }, [displayContent]);
    const hasMathSyntax = React.useMemo(
        () => /(\$\$[\s\S]*?\$\$|\\\(|\\\[|\$[^$\n]+\$)/.test(contentWithoutThinking),
        [contentWithoutThinking]
    );
    const hasCodeBlocks = React.useMemo(
        () => /```[\s\S]*?```/.test(contentWithoutThinking),
        [contentWithoutThinking]
    );
    const detectedCodeLanguages = React.useMemo(() => {
        const languageSet = new Set<string>();
        const fencePattern = /```([\w-]+)/g;
        for (const match of contentWithoutThinking.matchAll(fencePattern)) {
            const normalized = normalizeSyntaxLanguage(match[1] || '');
            if (normalized) {
                languageSet.add(normalized);
            }
        }
        Object.values(codeBlockLanguages).forEach((selectedLanguage) => {
            const normalized = normalizeSyntaxLanguage(selectedLanguage);
            if (normalized) {
                languageSet.add(normalized);
            }
        });
        return Array.from(languageSet);
    }, [contentWithoutThinking, codeBlockLanguages]);

    React.useEffect(() => {
        if (!hasMathSyntax || mathPlugins) return;
        let cancelled = false;

        (async () => {
            const [remarkMathModule, rehypeKatexModule] = await Promise.all([
                import('remark-math'),
                import('rehype-katex'),
                import('katex/dist/katex.min.css'),
            ]);

            if (!cancelled) {
                setMathPlugins({
                    remarkMath: remarkMathModule.default,
                    rehypeKatex: rehypeKatexModule.default,
                });
            }
        })().catch((error) => {
            console.error('Failed to load math rendering modules:', error);
        });

        return () => {
            cancelled = true;
        };
    }, [hasMathSyntax, mathPlugins]);

    React.useEffect(() => {
        if (!hasCodeBlocks || syntaxHighlighterBundle) return;
        let cancelled = false;

        (async () => {
            const [syntaxHighlighterModule, syntaxThemeModule] = await Promise.all([
                import('react-syntax-highlighter/dist/esm/prism-light'),
                import('react-syntax-highlighter/dist/esm/styles/prism'),
            ]);

            if (!cancelled) {
                setSyntaxHighlighterBundle({
                    component: syntaxHighlighterModule.default,
                    style: syntaxThemeModule.vscDarkPlus,
                });
            }
        })().catch((error) => {
            console.error('Failed to load syntax highlighting modules:', error);
        });

        return () => {
            cancelled = true;
        };
    }, [hasCodeBlocks, syntaxHighlighterBundle]);

    const ensureSyntaxLanguageLoaded = React.useCallback(async (requestedLanguage: string) => {
        if (!syntaxHighlighterBundle) return;
        const normalized = normalizeSyntaxLanguage(requestedLanguage);
        if (!normalized) return;

        if (loadedSyntaxLanguagesRef.current.has(normalized) || syntaxLanguageLoadInFlightRef.current.has(normalized)) {
            return;
        }

        const loader = PRISM_LANGUAGE_LOADERS[normalized];
        if (!loader) {
            return;
        }

        syntaxLanguageLoadInFlightRef.current.add(normalized);
        try {
            const module = await loader();
            syntaxHighlighterBundle.component.registerLanguage(normalized, module.default);
            setLoadedSyntaxLanguages((prev) => {
                if (prev.has(normalized)) return prev;
                const next = new Set(prev);
                next.add(normalized);
                loadedSyntaxLanguagesRef.current = next;
                return next;
            });
        } catch (error) {
            console.error(`Failed to load Prism language "${normalized}":`, error);
        } finally {
            syntaxLanguageLoadInFlightRef.current.delete(normalized);
        }
    }, [syntaxHighlighterBundle]);

    React.useEffect(() => {
        if (!hasCodeBlocks || !syntaxHighlighterBundle) return;
        detectedCodeLanguages.forEach((language) => {
            void ensureSyntaxLanguageLoaded(language);
        });
    }, [hasCodeBlocks, syntaxHighlighterBundle, detectedCodeLanguages, ensureSyntaxLanguageLoaded]);

    const remarkPlugins = React.useMemo(() => {
        const plugins: any[] = [remarkGfm];
        if (mathPlugins) plugins.push(mathPlugins.remarkMath);
        return plugins;
    }, [mathPlugins]);
    const rehypePlugins = React.useMemo(() => {
        return mathPlugins ? [mathPlugins.rehypeKatex] : [];
    }, [mathPlugins]);

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
            onInsertToFile(codeString, language, filePath.trim());
            toast.success(`Inserting code to ${filePath}...`);
            setShowFilePathInput(null);
            setFilePath('');
        }
    };

    // Show skeleton/spinner while lazy-loading content
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

    return (
        <div className={`prose ${isUser ? 'prose-invert' : 'prose-invert'} max-w-none text-sm break-words overflow-wrap-anywhere word-break-break-word`}>
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
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={{
                    code({ node, inline, className, children, ...props }: any) {
                        const match = /language-([\w-]+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        const isBlock = !inline && (match || codeString.includes('\n'));
                        const codeHash = codeString.substring(0, 50); // Use first 50 chars as hash
                        const detectedLanguage = match ? match[1] : 'text';
                        const SyntaxHighlighterComponent = syntaxHighlighterBundle?.component;
                        // Use custom language if set, otherwise use detected
                        const language = codeBlockLanguages[codeHash] || detectedLanguage;
                        const normalizedSyntaxLanguage = normalizeSyntaxLanguage(language);
                        const canSyntaxHighlight = Boolean(
                            SyntaxHighlighterComponent &&
                            normalizedSyntaxLanguage &&
                            loadedSyntaxLanguages.has(normalizedSyntaxLanguage)
                        );
                        const isPreviewable = PREVIEWABLE_LANGUAGES.includes(language.toLowerCase());

                        const handleLanguageChange = (newLang: string) => {
                            setCodeBlockLanguages(prev => ({ ...prev, [codeHash]: newLang }));
                            void ensureSyntaxLanguageLoaded(newLang);
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
                                <div className="relative">
                                    {canSyntaxHighlight ? (
                                        <SyntaxHighlighterComponent
                                            {...props}
                                            style={syntaxHighlighterBundle.style}
                                            language={normalizedSyntaxLanguage || undefined}
                                            PreTag="div"
                                            customStyle={{ margin: 0, borderRadius: 0, padding: '1.25rem', overflowX: 'auto', background: 'transparent', fontSize: '13px', lineHeight: '1.5' }}
                                            wrapLines={true}
                                            wrapLongLines={true}
                                            showLineNumbers={true}
                                            lineNumberStyle={{ minWidth: '2em', paddingRight: '1em', color: '#525252', textAlign: 'right' }}
                                        >
                                            {codeString}
                                        </SyntaxHighlighterComponent>
                                    ) : (
                                        <pre className="m-0 p-5 overflow-x-auto bg-transparent text-slate-100 text-[13px] leading-relaxed whitespace-pre-wrap break-words custom-scrollbar">
                                            <code className="font-mono">{codeString}</code>
                                        </pre>
                                    )}
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
                {cleanContent}
            </ReactMarkdown>

            {/* Streaming Indicator */}
            {isStreaming && !isUser && (
                <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <StreamingIndicator />
                </div>
            )}

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
