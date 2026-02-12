import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { PluggableList } from 'unified';
import { Copy, Check, Play, X, FileText, Save, PlayCircle, Github, Minimize2, Maximize2 } from 'lucide-react';
import ArtifactPreview from './ArtifactPreview';
import { toast } from 'sonner';
import { githubService } from '../services/github';

interface MessageContentRichProps {
    content: string;
    isUser: boolean;
    mcpAvailable?: boolean;
    onInsertToFile?: (code: string, language: string, filePath: string) => void;
}

const PREVIEWABLE_LANGUAGES = ['html', 'htm', 'css', 'javascript', 'js'];
const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
};

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

interface PrismLanguageModule {
    default: unknown;
}

const PRISM_LANGUAGE_LOADERS: Record<string, () => Promise<PrismLanguageModule>> = {
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
    remarkMath: PluggableList[number];
    rehypeKatex: PluggableList[number];
}

interface SyntaxHighlighterBundle {
    component: unknown;
    style: Record<string, React.CSSProperties>;
}

type CodeExecutionResult = {
    output: string;
    success: boolean;
};

interface MarkdownCodeComponentProps extends React.HTMLAttributes<HTMLElement> {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
    node?: unknown;
}

interface MarkdownCodeRendererProps {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
    codeProps: Omit<MarkdownCodeComponentProps, 'inline' | 'className' | 'children'>;
    syntaxHighlighterBundle: SyntaxHighlighterBundle | null;
    loadedSyntaxLanguages: Set<string>;
    codeBlockLanguages: Record<string, string>;
    onLanguageChange: (codeHash: string, language: string) => void;
    onPreviewCode: (code: string, language: string) => void;
    mcpAvailable?: boolean;
    isUser: boolean;
    onShowFilePathInput: (code: string) => void;
    executingCode: string | null;
    onExecuteCode: (code: string, language: string, codeHash: string) => void;
    executionResult?: CodeExecutionResult;
    onDismissExecutionResult: (codeHash: string) => void;
    githubConfigured: boolean;
    onCreateGist: (code: string, language: string) => void;
    onSaveFile: (code: string, language: string) => void;
    copiedCode: string | null;
    onCopyCode: (code: string) => void;
    showFilePathInput: string | null;
    filePath: string;
    onFilePathChange: (value: string) => void;
    onInsertToFile: (code: string, language: string) => void;
    onCancelInsertToFile: () => void;
    collapsedCodeBlocks: Record<string, boolean>;
    onToggleCodeCollapse: (codeHash: string) => void;
}

const MarkdownCodeRenderer: React.FC<MarkdownCodeRendererProps> = React.memo(({
    inline,
    className,
    children,
    codeProps,
    syntaxHighlighterBundle,
    loadedSyntaxLanguages,
    codeBlockLanguages,
    onLanguageChange,
    onPreviewCode,
    mcpAvailable,
    isUser,
    onShowFilePathInput,
    executingCode,
    onExecuteCode,
    executionResult,
    onDismissExecutionResult,
    githubConfigured,
    onCreateGist,
    onSaveFile,
    copiedCode,
    onCopyCode,
    showFilePathInput,
    filePath,
    onFilePathChange,
    onInsertToFile,
    onCancelInsertToFile,
    collapsedCodeBlocks,
    onToggleCodeCollapse,
}) => {
    const { node: _node, ...safeCodeProps } = codeProps;

    const match = /language-([\w-]+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');
    const isBlock = !inline && (Boolean(match) || codeString.includes('\n'));
    if (!isBlock) {
        return (
            <code className={`${className} bg-slate-800/80 px-1.5 py-0.5 rounded text-amber-200 font-mono text-[0.85em] border border-slate-700/50 box-decoration-clone break-all`} {...safeCodeProps}>
                {children}
            </code>
        );
    }

    const codeHash = codeString.substring(0, 50);
    const detectedLanguage = match ? match[1] : 'text';
    const selectedLanguage = codeBlockLanguages[codeHash] || detectedLanguage;
    const codeLineCount = codeString.split('\n').length;
    const isLongCodeBlock = codeLineCount > 20 || codeString.length > 1200;
    const isCollapsed = isLongCodeBlock && collapsedCodeBlocks[codeHash] === true;
    const normalizedSyntaxLanguage = normalizeSyntaxLanguage(selectedLanguage);
    const SyntaxHighlighterComponent = syntaxHighlighterBundle?.component as React.ComponentType<Record<string, unknown>> | undefined;
    const canSyntaxHighlight = Boolean(
        SyntaxHighlighterComponent &&
        normalizedSyntaxLanguage &&
        loadedSyntaxLanguages.has(normalizedSyntaxLanguage)
    );
    const isPreviewable = PREVIEWABLE_LANGUAGES.includes(selectedLanguage.toLowerCase());

    return (
        <div className="rounded-lg overflow-hidden my-4 border border-slate-700 bg-[#1e1e1e] shadow-lg group/code">
            <div className="flex justify-between items-center px-4 py-2 bg-[#2d2d2d] border-b border-slate-700 select-none">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                    </div>
                    <select
                        value={selectedLanguage}
                        onChange={(event) => onLanguageChange(codeHash, event.target.value)}
                        className="text-xs font-mono text-slate-300 font-bold ml-2 uppercase tracking-wider bg-slate-800/50 border border-slate-600/50 rounded px-2 py-0.5 hover:bg-slate-700/50 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer appearance-none"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {COMMON_LANGUAGES.map((languageOption) => (
                            <option key={languageOption} value={languageOption} className="bg-slate-800">
                                {languageOption.toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-1">
                    {isLongCodeBlock && (
                        <button
                            onClick={() => onToggleCodeCollapse(codeHash)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-300 hover:text-cyan-200 transition-colors py-1 px-2 rounded hover:bg-slate-700 border border-cyan-500/30 hover:border-cyan-500/50"
                            title={isCollapsed ? 'Expand code block' : 'Minimize code block'}
                        >
                            {isCollapsed ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                            {isCollapsed ? 'EXPAND' : 'MINIMIZE'}
                        </button>
                    )}
                    {isPreviewable && (
                        <button
                            onClick={() => onPreviewCode(codeString, selectedLanguage)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors py-1 px-2 rounded hover:bg-slate-700 border border-emerald-500/30 hover:border-emerald-500/50"
                        >
                            <Play size={12} fill="currentColor" />
                            PREVIEW
                        </button>
                    )}
                    {mcpAvailable && !isUser && (
                        <button
                            onClick={() => onShowFilePathInput(codeString)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors py-1 px-2 rounded hover:bg-slate-700 border border-blue-500/30 hover:border-blue-500/50"
                            title="Insert to file (requires MCP)"
                        >
                            <FileText size={12} />
                            INSERT
                        </button>
                    )}
                    {(selectedLanguage === 'python' || selectedLanguage === 'javascript' || selectedLanguage === 'js') && !isUser && (
                        <button
                            onClick={() => onExecuteCode(codeString, selectedLanguage, codeHash)}
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
                    {githubConfigured && !isUser && (
                        <button
                            onClick={() => onCreateGist(codeString, selectedLanguage)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors py-1 px-2 rounded hover:bg-slate-700 border border-emerald-500/30 hover:border-emerald-500/50"
                            title="Create GitHub Gist"
                        >
                            <Github size={12} />
                            GIST
                        </button>
                    )}
                    <button
                        onClick={() => onSaveFile(codeString, selectedLanguage)}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors py-1 px-2 rounded hover:bg-slate-700 border border-purple-500/30 hover:border-purple-500/50"
                        title="Save as file"
                    >
                        <Save size={12} />
                        SAVE
                    </button>
                    <button
                        onClick={() => onCopyCode(codeString)}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-white transition-colors py-1 px-2 rounded hover:bg-slate-700 border border-transparent hover:border-slate-600"
                    >
                        {copiedCode === codeString ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        {copiedCode === codeString ? 'COPIED' : 'COPY'}
                    </button>
                </div>
            </div>
            <div className={`relative ${isCollapsed ? 'max-h-72 overflow-hidden' : ''}`}>
                {canSyntaxHighlight && SyntaxHighlighterComponent ? (
                    <SyntaxHighlighterComponent
                        {...safeCodeProps}
                        style={syntaxHighlighterBundle!.style}
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
                {isCollapsed && (
                    <>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/90 to-transparent" />
                        <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-semibold text-cyan-200/90 bg-slate-900/70 border border-cyan-500/30 rounded px-2 py-0.5">
                            Minimized {codeLineCount} lines
                        </div>
                    </>
                )}
            </div>
            {executionResult && (
                <div className={`px-4 py-3 border-t ${executionResult.success ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold ${executionResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                            {executionResult.success ? '✓ Execution Successful' : '✗ Execution Failed'}
                        </span>
                        <button
                            onClick={() => onDismissExecutionResult(codeHash)}
                            className="ml-auto p-1 hover:bg-slate-700 rounded transition-colors"
                        >
                            <X size={12} className="text-slate-500" />
                        </button>
                    </div>
                    <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap bg-slate-900/50 p-2 rounded border border-slate-700/50 max-h-48 overflow-y-auto custom-scrollbar">
                        {executionResult.output}
                    </pre>
                </div>
            )}
            {showFilePathInput === codeString && (
                <div className="px-4 py-3 bg-[#2d2d2d] border-t border-slate-700">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={filePath}
                            onChange={(event) => onFilePathChange(event.target.value)}
                            placeholder="Enter file path (e.g., ./src/utils/helper.js)"
                            className="flex-1 bg-slate-800 border border-slate-600 text-white text-sm rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                            autoFocus
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    onInsertToFile(codeString, selectedLanguage);
                                } else if (event.key === 'Escape') {
                                    onCancelInsertToFile();
                                }
                            }}
                        />
                        <button
                            onClick={() => onInsertToFile(codeString, selectedLanguage)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded font-medium transition-colors"
                        >
                            Insert
                        </button>
                        <button
                            onClick={onCancelInsertToFile}
                            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                        >
                            <X size={16} className="text-slate-400" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

const MessageContentRich: React.FC<MessageContentRichProps> = ({ content, isUser, mcpAvailable, onInsertToFile }) => {
    const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
    const [previewCode, setPreviewCode] = React.useState<{ code: string; language: string } | null>(null);
    const [showFilePathInput, setShowFilePathInput] = React.useState<string | null>(null);
    const [filePath, setFilePath] = React.useState('');
    const [codeBlockLanguages, setCodeBlockLanguages] = React.useState<Record<string, string>>({});
    const [executingCode, setExecutingCode] = React.useState<string | null>(null);
    const [executionResults, setExecutionResults] = React.useState<Record<string, CodeExecutionResult>>({});
    const [collapsedCodeBlocks, setCollapsedCodeBlocks] = React.useState<Record<string, boolean>>({});
    const [mathPlugins, setMathPlugins] = React.useState<MathPluginBundle | null>(null);
    const [syntaxHighlighterBundle, setSyntaxHighlighterBundle] = React.useState<SyntaxHighlighterBundle | null>(null);
    const [loadedSyntaxLanguages, setLoadedSyntaxLanguages] = React.useState<Set<string>>(new Set());
    const loadedSyntaxLanguagesRef = React.useRef<Set<string>>(new Set());
    const syntaxLanguageLoadInFlightRef = React.useRef<Set<string>>(new Set());

    const hasMathSyntax = React.useMemo(
        () => /(\$\$[\s\S]*?\$\$|\\\(|\\\[|\$[^$\n]+\$)/.test(content),
        [content]
    );
    const hasCodeBlocks = React.useMemo(
        () => /```[\s\S]*?```/.test(content),
        [content]
    );

    const detectedCodeLanguages = React.useMemo(() => {
        const languageSet = new Set<string>();
        const fencePattern = /```([\w-]+)/g;
        for (const match of content.matchAll(fencePattern)) {
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
    }, [content, codeBlockLanguages]);

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
            const syntaxComponent = syntaxHighlighterBundle.component as {
                registerLanguage?: (name: string, language: unknown) => void;
            };
            if (typeof syntaxComponent.registerLanguage !== 'function') {
                return;
            }
            syntaxComponent.registerLanguage(normalized, module.default);
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

    const remarkPlugins = React.useMemo<PluggableList>(() => {
        const plugins: PluggableList = [remarkGfm];
        if (mathPlugins) plugins.push(mathPlugins.remarkMath);
        return plugins;
    }, [mathPlugins]);

    const rehypePlugins = React.useMemo<PluggableList>(() => {
        return mathPlugins ? [mathPlugins.rehypeKatex] : [];
    }, [mathPlugins]);

    const handleCopy = React.useCallback((code: string) => {
        void navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    }, []);

    const handleSaveFile = React.useCallback((code: string, language: string) => {
        const extensionMap: Record<string, string> = {
            javascript: 'js',
            typescript: 'ts',
            jsx: 'jsx',
            tsx: 'tsx',
            python: 'py',
            java: 'java',
            c: 'c',
            cpp: 'cpp',
            csharp: 'cs',
            php: 'php',
            ruby: 'rb',
            go: 'go',
            rust: 'rs',
            swift: 'swift',
            kotlin: 'kt',
            dart: 'dart',
            scala: 'scala',
            r: 'r',
            sql: 'sql',
            html: 'html',
            css: 'css',
            scss: 'scss',
            sass: 'sass',
            less: 'less',
            json: 'json',
            xml: 'xml',
            yaml: 'yaml',
            yml: 'yaml',
            toml: 'toml',
            ini: 'ini',
            markdown: 'md',
            md: 'md',
            bash: 'sh',
            shell: 'sh',
            powershell: 'ps1',
            dockerfile: 'Dockerfile',
            makefile: 'Makefile',
            cmake: 'cmake',
            graphql: 'graphql',
            vue: 'vue',
            svelte: 'svelte',
            angular: 'ts',
        };

        const extension = extensionMap[language.toLowerCase()] || 'txt';
        const filename = `artifact-${Date.now()}.${extension}`;
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        toast.success(`Saved as ${filename}`);
    }, []);

    const handleExecuteCode = React.useCallback(async (code: string, language: string, codeHash: string) => {
        if (!window.electronAPI?.executeCode) {
            toast.error('Code execution not available');
            return;
        }

        setExecutingCode(codeHash);
        try {
            const result = await window.electronAPI.executeCode(code, language);
            setExecutionResults((prev) => ({
                ...prev,
                [codeHash]: {
                    output: result.output || 'No output',
                    success: result.success || false,
                },
            }));
            if (result.success) {
                toast.success('Code executed successfully');
            } else {
                toast.error('Code execution failed');
            }
        } catch (error: unknown) {
            setExecutionResults((prev) => ({
                ...prev,
                [codeHash]: {
                    output: `Error: ${getErrorMessage(error, 'Unknown error')}`,
                    success: false,
                },
            }));
            toast.error('Execution error');
        } finally {
            setExecutingCode(null);
        }
    }, []);

    const handleDismissExecutionResult = React.useCallback((codeHash: string) => {
        setExecutionResults((prev) => {
            if (!prev[codeHash]) return prev;
            const next = { ...prev };
            delete next[codeHash];
            return next;
        });
    }, []);

    const handleCreateGist = React.useCallback(async (codeString: string, language: string) => {
        const filename = `code.${language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'python' ? 'py' : 'txt'}`;
        const description = 'Code snippet from InferencerC';

        const result = await githubService.createGist(
            description,
            filename,
            codeString,
            false
        );

        if (result.success && result.gist) {
            toast.success('Gist created!', {
                action: {
                    label: 'Open',
                    onClick: () => window.open(result.gist!.html_url, '_blank'),
                },
            });
        } else {
            toast.error(result.error || 'Failed to create gist');
        }
    }, []);

    const handleInsertToFile = React.useCallback((codeString: string, language: string) => {
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
    }, [filePath, onInsertToFile]);

    const handleLanguageChange = React.useCallback((codeHash: string, newLanguage: string) => {
        setCodeBlockLanguages((prev) => {
            if (prev[codeHash] === newLanguage) {
                return prev;
            }
            return { ...prev, [codeHash]: newLanguage };
        });
        void ensureSyntaxLanguageLoaded(newLanguage);
    }, [ensureSyntaxLanguageLoaded]);

    const handleToggleCodeCollapse = React.useCallback((codeHash: string) => {
        setCollapsedCodeBlocks((prev) => ({
            ...prev,
            [codeHash]: !prev[codeHash],
        }));
    }, []);

    const markdownStaticComponents = React.useMemo(() => ({
        p: ({ children }: { children?: React.ReactNode }) => <p className="mb-4 last:mb-0 leading-7 text-slate-300 font-sens">{children}</p>,
        ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc ml-4 mb-4 space-y-2 text-slate-300 marker:text-primary/70">{children}</ul>,
        ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal ml-4 mb-4 space-y-2 text-slate-300 marker:text-primary/70">{children}</ol>,
        h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-2xl font-bold text-white mb-4 mt-8 pb-2 border-b border-slate-800">{children}</h1>,
        h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-xl font-bold text-white mb-3 mt-6 flex items-center gap-2"><span className="w-1 h-6 bg-primary rounded-full inline-block"></span>{children}</h2>,
        h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-lg font-bold text-slate-100 mb-2 mt-5">{children}</h3>,
        a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-300 hover:underline font-medium transition-colors decoration-primary/30 underline-offset-4">
                {children}
            </a>
        ),
        table: ({ children }: { children?: React.ReactNode }) => (
            <div className="overflow-x-auto my-6 border border-slate-700 rounded-lg shadow-sm bg-slate-900/30 custom-scrollbar max-w-full">
                <table className="min-w-full divide-y divide-slate-700 text-left border-collapse">
                    {children}
                </table>
            </div>
        ),
        thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-slate-800/80 text-slate-200">{children}</thead>,
        th: ({ children }: { children?: React.ReactNode }) => <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider border-b border-slate-700 whitespace-nowrap">{children}</th>,
        td: ({ children }: { children?: React.ReactNode }) => <td className="px-4 py-3 text-sm text-slate-300 border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition-colors">{children}</td>,
        blockquote: ({ children }: { children?: React.ReactNode }) => (
            <div className="flex gap-3 my-4 pl-4 border-l-4 border-primary/40 bg-slate-800/20 py-3 pr-4 rounded-r-lg italic text-slate-400">
                <div className="opacity-30 text-4xl leading-none font-serif">"</div>
                <div className="flex-1">{children}</div>
            </div>
        ),
        hr: () => <hr className="my-8 border-slate-800" />,
    }), []);

    const renderMarkdownCode = React.useCallback(({ inline, className, children, ...codeProps }: MarkdownCodeComponentProps) => (
        <MarkdownCodeRenderer
            inline={inline}
            className={className}
            children={children}
            codeProps={codeProps}
            syntaxHighlighterBundle={syntaxHighlighterBundle}
            loadedSyntaxLanguages={loadedSyntaxLanguages}
            codeBlockLanguages={codeBlockLanguages}
            onLanguageChange={handleLanguageChange}
            onPreviewCode={(code, language) => setPreviewCode({ code, language })}
            mcpAvailable={mcpAvailable}
            isUser={isUser}
            onShowFilePathInput={setShowFilePathInput}
            executingCode={executingCode}
            onExecuteCode={handleExecuteCode}
            executionResult={executionResults[String(children).replace(/\n$/, '').substring(0, 50)]}
            onDismissExecutionResult={handleDismissExecutionResult}
            githubConfigured={githubService.isConfigured()}
            onCreateGist={(code, language) => {
                void handleCreateGist(code, language);
            }}
            onSaveFile={handleSaveFile}
            copiedCode={copiedCode}
            onCopyCode={handleCopy}
            showFilePathInput={showFilePathInput}
            filePath={filePath}
            onFilePathChange={setFilePath}
            onInsertToFile={handleInsertToFile}
            onCancelInsertToFile={() => {
                setShowFilePathInput(null);
                setFilePath('');
            }}
            collapsedCodeBlocks={collapsedCodeBlocks}
            onToggleCodeCollapse={handleToggleCodeCollapse}
        />
    ), [
        collapsedCodeBlocks,
        codeBlockLanguages,
        copiedCode,
        executingCode,
        executionResults,
        filePath,
        handleCopy,
        handleCreateGist,
        handleDismissExecutionResult,
        handleExecuteCode,
        handleInsertToFile,
        handleLanguageChange,
        handleToggleCodeCollapse,
        handleSaveFile,
        isUser,
        loadedSyntaxLanguages,
        mcpAvailable,
        showFilePathInput,
        syntaxHighlighterBundle,
    ]);

    const markdownComponents = React.useMemo(() => ({
        ...markdownStaticComponents,
        code: renderMarkdownCode,
    }), [markdownStaticComponents, renderMarkdownCode]);

    return (
        <>
            <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={markdownComponents}
            >
                {content}
            </ReactMarkdown>

            {previewCode && (
                <div className="mt-4 animate-in slide-in-from-bottom-4 duration-300">
                    <ArtifactPreview
                        code={previewCode.code}
                        language={previewCode.language}
                        onClose={() => setPreviewCode(null)}
                    />
                </div>
            )}
        </>
    );
};

export default MessageContentRich;
