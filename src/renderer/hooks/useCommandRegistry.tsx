import { useEffect } from 'react';
import {
    MessageSquare,
    Plus,
    Trash2,
    Settings,
    LayoutGrid,
    FolderOpen,
    Download,
    Search,
    Sun,
    Moon,
    Zap,
    Copy,
    RefreshCw,
    Code2,
    FileText,
    File,
    FileCode,
    FileJson,
    Users,
    Globe,
    Github,
    Brain,
    Keyboard,
    BarChart3,
    Eye,
    EyeOff,
    Activity,
    Wrench,
    Plug,
    ChevronLeft,
    ChevronRight,
    Star,
    Archive,
    BookOpen,
    Terminal,
    GitBranch,
    GitMerge,
    Network,
    Sparkles
} from 'lucide-react';
import { commandRegistry, Command } from '../lib/commandRegistry';

interface UseCommandRegistryProps {
    // Navigation
    setActiveTab?: (tab: 'chat' | 'models' | 'settings') => void;
    togglePerformanceMonitor?: () => void;

    // Chat actions
    createNewSession?: () => void;
    clearChat?: () => void;
    stopGeneration?: () => void;

    // UI toggles
    toggleHistory?: () => void;
    toggleSidebar?: () => void;
    toggleInspector?: () => void;
    toggleAnalytics?: () => void;
    toggleRequestLog?: () => void;
    toggleShortcuts?: () => void;

    // Theme
    currentTheme?: string;
    setTheme?: (theme: string) => void;
    availableThemes?: string[];

    // Export
    exportChat?: () => void;
    openExportDialog?: () => void;
    exportToPDF?: () => void;
    exportToDOCX?: () => void;
    exportToHTML?: () => void;
    exportToMarkdown?: () => void;
    exportToJSON?: () => void;

    // Search
    openGlobalSearch?: () => void;

    // Summarization
    generateSummary?: () => void;

    // Templates
    openTemplateLibrary?: () => void;

    // Battle mode
    toggleBattleMode?: () => void;
    battleMode?: boolean;

    // Expert modes
    setExpertMode?: (mode: string | null) => void;

    // Project context
    selectProjectFolder?: () => void;

    // Other features
    toggleThinkingMode?: () => void;
    thinkingEnabled?: boolean;
    toggleStreamingMode?: () => void;
    streamingEnabled?: boolean;

    // Conversation branching
    toggleTreeView?: () => void;
    createBranchFromCurrent?: () => void;
    switchToPreviousBranch?: () => void;
    switchToNextBranch?: () => void;

    // Prompt chaining
    openPromptChainBuilder?: () => void;
}

export const useCommandRegistry = (props: UseCommandRegistryProps) => {
    useEffect(() => {
        const commands: Command[] = [];

        // === NAVIGATION COMMANDS ===
        if (props.setActiveTab) {
            commands.push(
                {
                    id: 'nav.chat',
                    label: 'Go to Chat',
                    description: 'Switch to the chat interface',
                    category: 'Navigation',
                    icon: MessageSquare,
                    keywords: ['chat', 'conversation', 'talk'],
                    action: () => props.setActiveTab?.('chat')
                },
                {
                    id: 'nav.models',
                    label: 'Go to Models',
                    description: 'Browse and download AI models',
                    category: 'Navigation',
                    icon: LayoutGrid,
                    keywords: ['models', 'browse', 'download'],
                    action: () => props.setActiveTab?.('models')
                },
                {
                    id: 'nav.settings',
                    label: 'Go to Settings',
                    description: 'Configure application settings',
                    category: 'Navigation',
                    icon: Settings,
                    keywords: ['settings', 'preferences', 'config'],
                    shortcut: ['Ctrl', ','],
                    action: () => props.setActiveTab?.('settings')
                }
            );
        }

        // === CHAT ACTIONS ===
        if (props.createNewSession) {
            commands.push({
                id: 'chat.new',
                label: 'New Chat',
                description: 'Start a new conversation',
                category: 'Actions',
                icon: Plus,
                keywords: ['new', 'create', 'start', 'fresh'],
                shortcut: ['Ctrl', 'N'],
                action: () => props.createNewSession?.()
            });
        }

        if (props.clearChat) {
            commands.push({
                id: 'chat.clear',
                label: 'Clear Chat',
                description: 'Clear current conversation',
                category: 'Editing',
                icon: Trash2,
                keywords: ['clear', 'delete', 'remove', 'clean'],
                shortcut: ['Ctrl', 'L'],
                action: () => {
                    if (confirm('Are you sure you want to clear this chat?')) {
                        props.clearChat?.();
                    }
                }
            });
        }

        if (props.stopGeneration) {
            commands.push({
                id: 'chat.stop',
                label: 'Stop Generation',
                description: 'Stop the current AI response',
                category: 'Actions',
                icon: Zap,
                keywords: ['stop', 'cancel', 'abort', 'halt'],
                shortcut: ['Escape'],
                action: () => props.stopGeneration?.()
            });
        }

        // === VIEW TOGGLES ===
        if (props.toggleHistory) {
            commands.push({
                id: 'view.history',
                label: 'Toggle History Sidebar',
                description: 'Show or hide conversation history',
                category: 'View',
                icon: Archive,
                keywords: ['history', 'sidebar', 'sessions'],
                shortcut: ['Ctrl', '/'],
                action: () => props.toggleHistory?.()
            });
        }

        if (props.toggleSidebar) {
            commands.push({
                id: 'view.sidebar',
                label: 'Toggle Sidebar',
                description: 'Show or hide the sidebar',
                category: 'View',
                icon: ChevronLeft,
                keywords: ['sidebar', 'panel'],
                shortcut: ['Ctrl', '.'],
                action: () => props.toggleSidebar?.()
            });
        }

        if (props.toggleInspector) {
            commands.push({
                id: 'view.inspector',
                label: 'Toggle Inspector',
                description: 'Show or hide the inspector panel',
                category: 'View',
                icon: Eye,
                keywords: ['inspector', 'debug', 'details'],
                action: () => props.toggleInspector?.()
            });
        }

        if (props.toggleAnalytics) {
            commands.push({
                id: 'view.analytics',
                label: 'Toggle Analytics',
                description: 'Show or hide usage analytics',
                category: 'View',
                icon: BarChart3,
                keywords: ['analytics', 'stats', 'usage'],
                action: () => props.toggleAnalytics?.()
            });
        }

        if (props.toggleRequestLog) {
            commands.push({
                id: 'view.requestlog',
                label: 'Toggle Request Log',
                description: 'Show or hide API request/response log',
                category: 'View',
                icon: Activity,
                keywords: ['log', 'requests', 'api', 'debug'],
                action: () => props.toggleRequestLog?.()
            });
        }

        // === EXPORT ===
        if (props.exportChat) {
            commands.push({
                id: 'export.chat',
                label: 'Export Chat',
                description: 'Export current conversation',
                category: 'Export',
                icon: Download,
                keywords: ['export', 'download', 'save'],
                shortcut: ['Ctrl', 'S'],
                action: () => props.exportChat?.()
            });
        }

        if (props.openExportDialog) {
            commands.push({
                id: 'export.dialog',
                label: 'Export Conversation...',
                description: 'Open export dialog with format options',
                category: 'Export',
                icon: Download,
                keywords: ['export', 'save', 'pdf', 'docx', 'html', 'markdown', 'json'],
                shortcut: ['Ctrl', 'Shift', 'E'],
                action: () => props.openExportDialog?.()
            });
        }

        if (props.exportToPDF) {
            commands.push({
                id: 'export.pdf',
                label: 'Export as PDF',
                description: 'Export conversation as PDF document',
                category: 'Export',
                icon: FileText,
                keywords: ['export', 'pdf', 'document', 'print'],
                action: () => props.exportToPDF?.()
            });
        }

        if (props.exportToDOCX) {
            commands.push({
                id: 'export.docx',
                label: 'Export as Word (DOCX)',
                description: 'Export as Microsoft Word document',
                category: 'Export',
                icon: File,
                keywords: ['export', 'docx', 'word', 'microsoft'],
                action: () => props.exportToDOCX?.()
            });
        }

        if (props.exportToHTML) {
            commands.push({
                id: 'export.html',
                label: 'Export as HTML',
                description: 'Export as standalone HTML file',
                category: 'Export',
                icon: FileCode,
                keywords: ['export', 'html', 'web', 'webpage'],
                action: () => props.exportToHTML?.()
            });
        }

        if (props.exportToMarkdown) {
            commands.push({
                id: 'export.markdown',
                label: 'Export as Markdown',
                description: 'Export as Markdown file',
                category: 'Export',
                icon: FileText,
                keywords: ['export', 'markdown', 'md', 'text'],
                action: () => props.exportToMarkdown?.()
            });
        }

        if (props.exportToJSON) {
            commands.push({
                id: 'export.json',
                label: 'Export as JSON',
                description: 'Export raw data as JSON',
                category: 'Export',
                icon: FileJson,
                keywords: ['export', 'json', 'data', 'raw'],
                action: () => props.exportToJSON?.()
            });
        }

        // === SEARCH ===
        if (props.openGlobalSearch) {
            commands.push({
                id: 'search.global',
                label: 'Search All Conversations',
                description: 'Smart search across all your chats',
                category: 'Navigation',
                icon: Search,
                keywords: ['search', 'find', 'global', 'semantic', 'smart'],
                shortcut: ['Ctrl', 'Shift', 'F'],
                action: () => props.openGlobalSearch?.()
            });
        }

        // === DEV TOOLS ===
        if (props.togglePerformanceMonitor) {
            commands.push({
                id: 'dev.performance',
                label: 'Toggle Performance Monitor',
                description: 'Show FPS and memory usage',
                category: 'Actions',
                icon: Activity,
                keywords: ['performance', 'fps', 'memory', 'monitor', 'debug'],
                action: () => props.togglePerformanceMonitor?.()
            });
        }

        // === SUMMARIZATION ===
        if (props.generateSummary) {
            commands.push({
                id: 'ai.summarize',
                label: 'Generate AI Summary',
                description: 'Create an AI-powered summary of this conversation',
                category: 'Actions',
                icon: Sparkles,
                keywords: ['summary', 'summarize', 'ai', 'key points', 'overview'],
                action: () => props.generateSummary?.()
            });
        }

        // === TEMPLATES ===
        if (props.openTemplateLibrary) {
            commands.push({
                id: 'templates.library',
                label: 'Open Template Library',
                description: 'Browse and use conversation templates',
                category: 'Navigation',
                icon: FileText,
                keywords: ['templates', 'library', 'starters', 'presets'],
                action: () => props.openTemplateLibrary?.()
            });
        }

        // === BATTLE MODE ===
        if (props.toggleBattleMode) {
            commands.push({
                id: 'chat.battlemode',
                label: props.battleMode ? 'Disable Battle Mode' : 'Enable Battle Mode',
                description: 'Compare two models side-by-side',
                category: 'Actions',
                icon: Users,
                keywords: ['battle', 'compare', 'models', 'side-by-side'],
                action: () => props.toggleBattleMode?.()
            });
        }

        // === EXPERT MODES ===
        if (props.setExpertMode) {
            commands.push(
                {
                    id: 'expert.coding',
                    label: 'Coding Expert Mode',
                    description: 'Optimize for code generation',
                    category: 'Actions',
                    icon: Code2,
                    keywords: ['coding', 'code', 'programming', 'developer'],
                    action: () => props.setExpertMode?.('coding')
                },
                {
                    id: 'expert.creative',
                    label: 'Creative Expert Mode',
                    description: 'Optimize for creative writing',
                    category: 'Actions',
                    icon: FileText,
                    keywords: ['creative', 'writing', 'story'],
                    action: () => props.setExpertMode?.('creative')
                },
                {
                    id: 'expert.math',
                    label: 'Math Expert Mode',
                    description: 'Optimize for mathematical reasoning',
                    category: 'Actions',
                    icon: Brain,
                    keywords: ['math', 'mathematics', 'logic'],
                    action: () => props.setExpertMode?.('math')
                },
                {
                    id: 'expert.reasoning',
                    label: 'Reasoning Expert Mode',
                    description: 'Optimize for deep reasoning',
                    category: 'Actions',
                    icon: Brain,
                    keywords: ['reasoning', 'logic', 'analysis'],
                    action: () => props.setExpertMode?.('reasoning')
                },
                {
                    id: 'expert.reset',
                    label: 'Reset Expert Mode',
                    description: 'Return to default settings',
                    category: 'Actions',
                    icon: RefreshCw,
                    keywords: ['reset', 'default', 'normal'],
                    action: () => props.setExpertMode?.(null)
                }
            );
        }

        // === PROJECT CONTEXT ===
        if (props.selectProjectFolder) {
            commands.push({
                id: 'project.select',
                label: 'Select Project Folder',
                description: 'Add project context to conversations',
                category: 'Actions',
                icon: FolderOpen,
                keywords: ['project', 'folder', 'context', 'files'],
                action: () => props.selectProjectFolder?.()
            });
        }

        // === THINKING MODE ===
        if (props.toggleThinkingMode) {
            commands.push({
                id: 'chat.thinking',
                label: props.thinkingEnabled ? 'Disable Thinking Mode' : 'Enable Thinking Mode',
                description: 'Show AI reasoning process',
                category: 'Actions',
                icon: Brain,
                keywords: ['thinking', 'reasoning', 'process', 'cot'],
                action: () => props.toggleThinkingMode?.()
            });
        }

        // === STREAMING MODE ===
        if (props.toggleStreamingMode) {
            commands.push({
                id: 'chat.streaming',
                label: props.streamingEnabled ? 'Disable Streaming' : 'Enable Streaming',
                description: 'Toggle real-time response streaming',
                category: 'Actions',
                icon: Activity,
                keywords: ['streaming', 'realtime', 'live'],
                action: () => props.toggleStreamingMode?.()
            });
        }

        // === THEME COMMANDS ===
        if (props.setTheme && props.availableThemes) {
            props.availableThemes.forEach(theme => {
                const themeName = theme.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');

                commands.push({
                    id: `theme.${theme}`,
                    label: `Switch to ${themeName}`,
                    description: `Change theme to ${themeName}`,
                    category: 'Settings',
                    icon: theme.includes('light') ? Sun : Moon,
                    keywords: ['theme', 'color', 'appearance', theme],
                    action: () => props.setTheme?.(theme)
                });
            });
        }

        // === CONVERSATION BRANCHING ===
        if (props.toggleTreeView) {
            commands.push({
                id: 'branch.toggleTree',
                label: 'Toggle Conversation Tree',
                description: 'View conversation structure as a tree',
                category: 'View',
                icon: Network,
                keywords: ['tree', 'branch', 'structure', 'visualize'],
                shortcut: ['Ctrl', 'T'],
                action: () => props.toggleTreeView?.()
            });
        }

        if (props.createBranchFromCurrent) {
            commands.push({
                id: 'branch.create',
                label: 'Create Branch',
                description: 'Create a new branch from current message',
                category: 'Actions',
                icon: GitBranch,
                keywords: ['branch', 'fork', 'split', 'alternate'],
                shortcut: ['Ctrl', 'B'],
                action: () => props.createBranchFromCurrent?.()
            });
        }

        if (props.switchToPreviousBranch) {
            commands.push({
                id: 'branch.previous',
                label: 'Previous Branch',
                description: 'Switch to previous branch',
                category: 'Navigation',
                icon: ChevronLeft,
                keywords: ['branch', 'previous', 'back'],
                shortcut: ['Alt', 'Left'],
                action: () => props.switchToPreviousBranch?.()
            });
        }

        if (props.switchToNextBranch) {
            commands.push({
                id: 'branch.next',
                label: 'Next Branch',
                description: 'Switch to next branch',
                category: 'Navigation',
                icon: ChevronRight,
                keywords: ['branch', 'next', 'forward'],
                shortcut: ['Alt', 'Right'],
                action: () => props.switchToNextBranch?.()
            });
        }

        // === PROMPT CHAINING ===
        if (props.openPromptChainBuilder) {
            commands.push({
                id: 'ai.promptChain',
                label: 'Open Prompt Chain Builder',
                description: 'Chain multiple prompts together',
                category: 'Actions',
                icon: GitMerge,
                keywords: ['chain', 'prompt', 'workflow', 'pipeline', 'multi', 'sequence'],
                shortcut: ['Ctrl', 'Shift', 'C'],
                action: () => props.openPromptChainBuilder?.()
            });
        }

        // === HELP ===
        if (props.toggleShortcuts) {
            commands.push({
                id: 'help.shortcuts',
                label: 'Keyboard Shortcuts',
                description: 'View all keyboard shortcuts',
                category: 'Help',
                icon: Keyboard,
                keywords: ['help', 'shortcuts', 'keys', 'hotkeys'],
                shortcut: ['Ctrl', '?'],
                action: () => props.toggleShortcuts?.()
            });
        }

        // Register all commands
        commandRegistry.registerMany(commands);

        // Cleanup on unmount
        return () => {
            commands.forEach(cmd => commandRegistry.unregister(cmd.id));
        };
    }, [
        props.setActiveTab,
        props.createNewSession,
        props.clearChat,
        props.stopGeneration,
        props.toggleHistory,
        props.toggleSidebar,
        props.toggleInspector,
        props.toggleAnalytics,
        props.toggleRequestLog,
        props.exportChat,
        props.openExportDialog,
        props.exportToPDF,
        props.exportToDOCX,
        props.exportToHTML,
        props.exportToMarkdown,
        props.exportToJSON,
        props.openGlobalSearch,
        props.generateSummary,
        props.openTemplateLibrary,
        props.toggleBattleMode,
        props.battleMode,
        props.setExpertMode,
        props.selectProjectFolder,
        props.toggleThinkingMode,
        props.thinkingEnabled,
        props.toggleStreamingMode,
        props.streamingEnabled,
        props.setTheme,
        props.currentTheme,
        props.toggleShortcuts
    ]);
};
