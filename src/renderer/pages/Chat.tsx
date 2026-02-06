import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Send, Clock, Plus, Trash2, X, Globe, Settings, Activity, AlertTriangle, ChevronRight, ChevronLeft, Check, AlertCircle, Brain, Users, ImageIcon, Plug, Wrench, Copy, Eraser, Download, Edit2, Search, ChevronUp, ChevronDown, Star, FileText, ThumbsUp, ThumbsDown, Code2, BarChart3, FolderOpen, Eye, EyeOff, Github, GitBranch, Network, HelpCircle, Maximize2, Minimize2, RefreshCw, Zap, LayoutGrid, FileJson, TestTube, Sparkles, MessageSquare, Mail, Calendar, Package, Video, Link, Bot, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import MessageContent from '../components/MessageContent';
import MessageActionsMenu from '../components/MessageActionsMenu';
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';
import QuickReplyTemplates from '../components/QuickReplyTemplates';
import RequestResponseLog, { LogEntry } from '../components/RequestResponseLog';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ComparisonGrid from '../components/ComparisonGrid';
import BranchNavigator from '../components/BranchNavigator';
import ConversationTreeView from '../components/ConversationTreeView';
import ExportDialog from '../components/ExportDialog';
import GlobalSearchDialog from '../components/GlobalSearchDialog';
import ConversationSummaryPanel from '../components/ConversationSummaryPanel';
import TemplateLibraryDialog from '../components/TemplateLibraryDialog';
import { ABTestingPanel } from '../components/ABTestingPanel';
import { PromptOptimizationPanel } from '../components/PromptOptimizationPanel';
import { CalendarScheduleDialog } from '../components/CalendarScheduleDialog';
import { SmartSuggestionsPanel } from '../components/SmartSuggestionsPanel';
import { ConversationRecommendationsPanel } from '../components/ConversationRecommendationsPanel';
import { WorkflowsManager } from '../components/WorkflowsManager';
import { APIPlayground } from '../components/APIPlayground';
import { PluginManager } from '../components/PluginManager';
import { CodeIntegrationPanel } from '../components/CodeIntegrationPanel';
import { WorkspaceViewsPanel } from '../components/WorkspaceViewsPanel';
import { InteractiveTutorial } from '../components/InteractiveTutorial';
import { BCIPanel } from '../components/BCIPanel';
import { MultiModalAIPanel } from '../components/MultiModalAIPanel';
import { RealTimeCollaborationPanel } from '../components/RealTimeCollaborationPanel';
import { BlockchainPanel } from '../components/BlockchainPanel';
import { AIAgentsPanel } from '../components/AIAgentsPanel';
import { FederatedLearningPanel } from '../components/FederatedLearningPanel';
import { responsiveDesignService } from '../services/responsiveDesign';
import { onboardingService } from '../services/onboarding';
import { multiModalAIService } from '../services/multiModalAI';
const PromptManager = React.lazy(() => import('../components/PromptManager'));
import SidebarHistory from '../components/SidebarHistory';
import { useChat } from '../hooks/useChat';
import { usePrompts, PromptSnippet } from '../hooks/usePrompts';
import { useConversationTree } from '../hooks/useConversationTree';
import { calculateEntropy, compressImage } from '../lib/chatUtils';
import { useMCP } from '../hooks/useMCP';
import { analyticsService } from '../services/analytics';
import { projectContextService, ProjectContext } from '../services/projectContext';
import { githubService } from '../services/github';
import { HistoryService } from '../services/history';
import { notionService } from '../services/notion';
import { slackService } from '../services/slack';
import { discordService } from '../services/discord';
import { emailService } from '../services/email';
import { calendarService } from '../services/calendar';
import { autoCategorizationService } from '../services/autoCategorization';
import { autoTaggingService } from '../services/autoTagging';
import { workflowsService } from '../services/workflows';
import { TemplateService, ConversationTemplate } from '../services/templates';
import { PromptVariableService } from '../services/promptVariables';
import VariableInsertMenu from '../components/VariableInsertMenu';
import { AVAILABLE_TOOLS } from '../lib/tools';

const Chat: React.FC = () => {
    // API logs state (defined before useChat so it can be passed as callback)
    const [apiLogs, setApiLogs] = React.useState<LogEntry[]>([]);

    const [streamingEnabled, setStreamingEnabled] = React.useState(true);

    const handleApiLog = React.useCallback((log: LogEntry) => {
        setApiLogs(prev => [...prev, log]);
    }, []);

    const {
        input, setInput,
        prefill, setPrefill,
        thinkingEnabled, setThinkingEnabled,
        expertMode, setExpertMode,
        autoRouting, setAutoRouting,
        enabledTools, setEnabledTools,
        responseFormat, setResponseFormat,
        updateMessageToken,

        sessionId,
        history, setHistory,
        selectedToken, setSelectedToken,
        availableModels,
        currentModel, setCurrentModel,
        systemPrompt, setSystemPrompt,
        temperature, setTemperature,
        topP, setTopP,
        maxTokens, setMaxTokens,
        batchSize, setBatchSize,
        savedSessions,
        isFetchingWeb,
        showUrlInput, setShowUrlInput,
        urlInput, setUrlInput,
        showExpertMenu, setShowExpertMenu,
        showHistory, setShowHistory,

        handleExpertSelect,
        createNewSession,
        loadSession,
        deleteSession,
        executeWebFetch,
        deleteMessage,
        selectChoice,
        addAttachment,
        removeAttachment,
        attachments,
        imageAttachments,
        addImageAttachment,
        removeImageAttachment,
        sendMessage,
        stopGeneration,
        battleMode, setBattleMode,
        secondaryModel, setSecondaryModel,
        togglePinSession, renameSession,
        connectionStatus,
        loadMessageRange,
        loadedMessageIndices,
        getVisibleHistory
    } = useChat(handleApiLog, streamingEnabled);

    // Default secondary model if not set
    React.useEffect(() => {
        if (battleMode && !secondaryModel && availableModels.length > 1) {
            setSecondaryModel(availableModels.find(m => m.id !== currentModel)?.id || availableModels[0].id);
        }
    }, [battleMode, availableModels, currentModel, secondaryModel, setSecondaryModel]);

    const { prompts } = usePrompts();
    const { tools: mcpTools, connectedCount: mcpConnectedCount, isAvailable: mcpAvailable } = useMCP();
    const [isDragging, setIsDragging] = React.useState(false);
    const [showInspector, setShowInspector] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'inspector' | 'controls' | 'prompts'>('controls');
    const [isEditingSystemPrompt, setIsEditingSystemPrompt] = React.useState(false);
    const [editingMessageIndex, setEditingMessageIndex] = React.useState<number | null>(null);
    const [editedMessageContent, setEditedMessageContent] = React.useState<string>('');
    const [showShortcutsModal, setShowShortcutsModal] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
    const [showSearch, setShowSearch] = React.useState(false);
    const [searchResults, setSearchResults] = React.useState<number[]>([]);
    const [currentSearchIndex, setCurrentSearchIndex] = React.useState(0);
    const [showSearchResultsList, setShowSearchResultsList] = React.useState(false);
    const virtuosoRef = React.useRef<any>(null);
    const [bookmarkedMessages, setBookmarkedMessages] = React.useState<Set<number>>(new Set());
    const [showRequestLog, setShowRequestLog] = React.useState(false);
    const [messageRatings, setMessageRatings] = React.useState<Record<number, 'up' | 'down'>>({});
    const [jsonMode, setJsonMode] = React.useState(false);
    const [showAnalytics, setShowAnalytics] = React.useState(false);
    const [usageStats, setUsageStats] = React.useState(analyticsService.getUsageStats());
    const [comparisonIndex, setComparisonIndex] = React.useState<number | null>(null);
    const [projectContext, setProjectContext] = React.useState<ProjectContext | null>(null);
    const [includeContextInMessages, setIncludeContextInMessages] = React.useState(true);
    const [showGithubInput, setShowGithubInput] = React.useState(false);
    const [githubUrl, setGithubUrl] = React.useState('');
    const [isFetchingGithub, setIsFetchingGithub] = React.useState(false);

    // Conversation branching state
    const [showTreeView, setShowTreeView] = React.useState(false);
    const [branchingEnabled, setBranchingEnabled] = React.useState(false);

    // Export dialog state
    const [showExportDialog, setShowExportDialog] = React.useState(false);

    // Global search dialog state
    const [showGlobalSearch, setShowGlobalSearch] = React.useState(false);

    // A/B Testing panel state
    const [showABTesting, setShowABTesting] = React.useState(false);

    // Prompt Optimization panel state
    const [showPromptOptimization, setShowPromptOptimization] = React.useState(false);

    // Calendar schedule dialog state
    const [showCalendarSchedule, setShowCalendarSchedule] = React.useState(false);

    // Smart Suggestions state
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [showRecommendations, setShowRecommendations] = React.useState(false);
    const [showWorkflows, setShowWorkflows] = React.useState(false);
    const [showAPIPlayground, setShowAPIPlayground] = React.useState(false);
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const [showPluginManager, setShowPluginManager] = React.useState(false);
    const [showCodeIntegration, setShowCodeIntegration] = React.useState(false);
    const [selectedCode, setSelectedCode] = React.useState<{ code: string; language: string } | null>(null);
    const [showWorkspaceViews, setShowWorkspaceViews] = React.useState(false);
    const [responsiveConfig, setResponsiveConfig] = React.useState(responsiveDesignService.getConfig());
    const [showTutorial, setShowTutorial] = React.useState(false);
    const [currentTutorial, setCurrentTutorial] = React.useState<ReturnType<typeof onboardingService.getTutorials>[0] | null>(null);
    const [showBCI, setShowBCI] = React.useState(false);
    const [showMultiModal, setShowMultiModal] = React.useState(false);
    const [showCollaboration, setShowCollaboration] = React.useState(false);
    const [showBlockchain, setShowBlockchain] = React.useState(false);
    const [showAIAgents, setShowAIAgents] = React.useState(false);
    const [showFederatedLearning, setShowFederatedLearning] = React.useState(false);

    // Template library dialog state
    const [showTemplateLibrary, setShowTemplateLibrary] = React.useState(false);

    // Variable insert menu state
    const [showVariableMenu, setShowVariableMenu] = React.useState(false);

    // Initialize conversation tree (always initialize, will sync when enabled)
    const treeHook = useConversationTree();

    // Responsive design subscription
    React.useEffect(() => {
        const unsubscribe = responsiveDesignService.subscribe((config) => {
            setResponsiveConfig(config);
        });
        return unsubscribe;
    }, []);

    // Check for onboarding on mount
    React.useEffect(() => {
        if (!onboardingService.hasCompletedOnboarding()) {
            const tutorials = onboardingService.getTutorials();
            const welcomeTutorial = tutorials.find(t => t.id === 'welcome');
            if (welcomeTutorial && !welcomeTutorial.completed) {
                setCurrentTutorial(welcomeTutorial);
                setShowTutorial(true);
            }
        }
    }, []);


    // Sync tree with history when branching is enabled or when history changes
    React.useEffect(() => {
        if (branchingEnabled && history.length > 0) {
            // Replace messages in tree with current history
            console.log('[TreeSync] Syncing tree with history:', history.length, 'messages');
            treeHook.replaceMessages(history);
        }
    }, [branchingEnabled, history.length]); // Run when branching is enabled OR history length changes

    // GitHub file fetching
    const executeGithubFetch = async () => {
        if (!githubUrl.trim()) return;

        setIsFetchingGithub(true);
        try {
            const parsed = githubService.parseGitHubUrl(githubUrl.trim());
            if (!parsed) {
                toast.error('Invalid GitHub URL. Use format: owner/repo/path or full GitHub URL');
                return;
            }

            const result = await githubService.fetchFileContent(
                parsed.owner,
                parsed.repo,
                parsed.path,
                parsed.ref
            );

            if (result.success && result.content) {
                const content = `[CONTEXT FROM GITHUB: ${parsed.owner} /${parsed.repo}/${parsed.path}]\n\n\`\`\`${parsed.path.split('.').pop() || 'text'}\n${result.content}\n\`\`\``;
                setHistory(prev => [...prev, { role: 'user', content }]);
                toast.success("GitHub file added to conversation context.");
                setGithubUrl('');
            } else {
                toast.error(result.error || 'Failed to fetch file');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch from GitHub');
        } finally {
            setIsFetchingGithub(false);
        }
    };

    // Wrapper for sendMessage that processes variables and includes project context
    const sendMessageWithContext = React.useCallback(async () => {
        let textToSend = input;
        let hasChanges = false;

        // 1. Process Prompt Variables
        if (PromptVariableService.hasVariables(textToSend)) {
            try {
                const processed = await PromptVariableService.processText(textToSend, {
                    modelId: currentModel,
                    modelName: availableModels.find(m => m.id === currentModel)?.name,
                    sessionId: sessionId,
                    sessionTitle: savedSessions.find(s => s.id === sessionId)?.title,
                    messageCount: history.length,
                    userName: PromptVariableService.getUserName()
                });
                if (processed !== textToSend) {
                    textToSend = processed;
                    hasChanges = true;
                }
            } catch (e) {
                console.error("Failed to process variables", e);
            }
        }

        // 2. Add Project Context
        if (projectContext && includeContextInMessages) {
            const contextSummary = projectContextService.getContextSummary(10);
            if (contextSummary) {
                textToSend += contextSummary;
                hasChanges = true;
            }
        }

        if (hasChanges) {
            setInput(textToSend);
            // Allow state to update before sending
            setTimeout(() => {
                sendMessage();
            }, 100);
        } else {
            sendMessage();
        }
    }, [input, projectContext, includeContextInMessages, sendMessage, currentModel, availableModels, sessionId, savedSessions, history]);

    // Project Context subscription
    React.useEffect(() => {
        const unsubscribe = projectContextService.subscribe((context) => {
            setProjectContext(context);
        });
        // Load initial context
        setProjectContext(projectContextService.getContext());
        return unsubscribe;
    }, []);

    // Auto-categorization and auto-tagging
    React.useEffect(() => {
        if (history.length > 0 && sessionId) {
            // Auto-categorize after 3+ messages
            if (history.length >= 3) {
                autoCategorizationService.categorizeConversation(sessionId).catch(console.error);
            }
            // Auto-tag after 2+ messages
            if (history.length >= 2) {
                autoTaggingService.tagConversation(sessionId).catch(console.error);
            }
        }
    }, [history.length, sessionId]);

    // Check workflows when message is sent
    React.useEffect(() => {
        if (history.length > 0) {
            const lastMessage = history[history.length - 1];
            if (lastMessage?.role === 'user' && lastMessage.content) {
                workflowsService.checkWorkflows(
                    lastMessage.content,
                    history,
                    currentModel
                ).catch(console.error);
            }
        }
    }, [history.length, currentModel]);

    // Debounce search query (300ms delay)
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Search within chat
    React.useEffect(() => {
        if (debouncedSearchQuery.trim() === '') {
            setSearchResults([]);
            setCurrentSearchIndex(0);
            return;
        }

        const query = debouncedSearchQuery.toLowerCase();
        const matches: number[] = [];

        history.forEach((msg, index) => {
            if (msg.content && msg.content.toLowerCase().includes(query)) {
                matches.push(index);
            }
        });

        setSearchResults(matches);
        setCurrentSearchIndex(0);
    }, [debouncedSearchQuery, history]);

    // Navigate to specific search result
    const navigateToSearchResult = React.useCallback((resultIndex: number) => {
        setCurrentSearchIndex(resultIndex);
        setShowSearchResultsList(false);
    }, []);

    // Scroll to current search result
    React.useEffect(() => {
        if (searchResults.length > 0 && virtuosoRef.current) {
            const targetIndex = searchResults[currentSearchIndex];
            virtuosoRef.current.scrollToIndex({
                index: targetIndex,
                align: 'center',
                behavior: 'smooth'
            });
        }
    }, [currentSearchIndex, searchResults]);

    // Confirm before closing unsaved
    React.useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (input.trim() !== '' || (history.length > 0 && history[history.length - 1].isLoading)) {
                e.preventDefault();
                e.returnValue = ''; // Required for Chrome/Electron
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [input, history]);

    // Slash Command State
    const [slashMatch, setSlashMatch] = React.useState<{ query: string; index: number } | null>(null);
    const [activePromptIndex, setActivePromptIndex] = React.useState(0);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const filteredPrompts = React.useMemo(() => {
        if (!slashMatch) return [];
        return prompts.filter(p => p.alias.toLowerCase().startsWith(slashMatch.query.toLowerCase()));
    }, [slashMatch, prompts]);

    const insertPrompt = (p: PromptSnippet) => {
        if (!slashMatch || !textareaRef.current) return;

        const cursorEnd = textareaRef.current.selectionEnd;
        // The slash is at slashMatch.index - 1
        const prefix = input.substring(0, slashMatch.index - 1);
        const suffix = input.substring(cursorEnd);

        setInput(prefix + p.content + suffix);
        setSlashMatch(null);

        // Wait for render to re-focus
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                // move cursor to end of inserted content
                // const newCursorPos = prefix.length + p.content.length;
                // textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 10);
    };

    // Message Actions Handlers
    const handleEditMessage = (index: number) => {
        const message = history[index];
        if (message && message.role === 'user') {
            setEditingMessageIndex(index);
            setEditedMessageContent(message.content || '');
        }
    };

    const handleSaveEdit = (index: number) => {
        if (editedMessageContent.trim() === '') {
            toast.error('Message cannot be empty');
            return;
        }

        // Update the message content
        const newHistory = [...history];
        newHistory[index] = {
            ...newHistory[index],
            content: editedMessageContent
        };

        // Remove all messages after this one (since we're re-prompting)
        const updatedHistory = newHistory.slice(0, index + 1);
        setHistory(updatedHistory);

        // Clear editing state
        setEditingMessageIndex(null);
        setEditedMessageContent('');

        // Re-send the message
        toast.success('Message updated. Regenerating response...');

        // Trigger regeneration
        setTimeout(() => {
            sendMessageWithContext();
        }, 100);
    };

    const handleCancelEdit = () => {
        setEditingMessageIndex(null);
        setEditedMessageContent('');
    };

    const handleRegenerateResponse = (index: number) => {
        // Remove all messages after and including this assistant message
        const newHistory = history.slice(0, index);
        setHistory(newHistory);

        // Re-send to get a new response
        toast.info('Regenerating response...');
        setTimeout(() => {
            sendMessageWithContext();
        }, 100);
    };

    const handleBranchConversation = (index: number) => {
        // Create a new session with history up to this point
        const branchHistory = history.slice(0, index + 1);

        // Create new session ID
        const newSessionId = `session-${Date.now()}`;

        // Save current session first
        const currentSession = {
            id: sessionId,
            title: `Chat ${new Date().toLocaleDateString()}`,
            lastModified: Date.now(),
            modelId: currentModel,
            messages: history,
            expertMode,
            thinkingEnabled
        };

        // Create branched session
        const branchedSession = {
            id: newSessionId,
            title: `Branch from ${new Date().toLocaleDateString()}`,
            lastModified: Date.now(),
            modelId: currentModel,
            messages: branchHistory,
            expertMode,
            thinkingEnabled
        };

        // Save both sessions to localStorage
        try {
            const sessions = JSON.parse(localStorage.getItem('app_chat_sessions') || '[]');
            const updatedSessions = sessions.map((s: any) =>
                s.id === sessionId ? currentSession : s
            );
            updatedSessions.push(branchedSession);
            localStorage.setItem('app_chat_sessions', JSON.stringify(updatedSessions));

            // Load the new branched session
            loadSession(newSessionId);
            toast.success('Conversation branched!');
        } catch (err) {
            toast.error('Failed to branch conversation');
        }
    };

    const handleInsertToFile = React.useCallback(async (code: string, language: string) => {
        // TODO: Implement MCP file writing
        // For now, just show a toast
        toast.info('MCP file writing integration coming soon!');
        console.log('Insert to file:', { code, language });
    }, []);

    const handleRateMessage = (index: number, rating: 'up' | 'down') => {
        setMessageRatings(prev => {
            const newRatings = { ...prev };
            if (newRatings[index] === rating) {
                // Remove rating if clicking the same button
                delete newRatings[index];
            } else {
                newRatings[index] = rating;
            }
            return newRatings;
        });
    };

    const toggleBookmark = (index: number) => {
        setBookmarkedMessages(prev => {
            const newBookmarks = new Set(prev);
            if (newBookmarks.has(index)) {
                newBookmarks.delete(index);
                toast.success('Bookmark removed');
            } else {
                newBookmarks.add(index);
                toast.success('Message bookmarked');
            }

            // Save to localStorage
            try {
                const bookmarkKey = `bookmarks_${sessionId}`;
                localStorage.setItem(bookmarkKey, JSON.stringify(Array.from(newBookmarks)));
            } catch (err) {
                console.error('Failed to save bookmarks:', err);
            }

            return newBookmarks;
        });
    };

    // Load bookmarks when session changes
    React.useEffect(() => {
        try {
            const bookmarkKey = `bookmarks_${sessionId}`;
            const saved = localStorage.getItem(bookmarkKey);
            if (saved) {
                setBookmarkedMessages(new Set(JSON.parse(saved)));
            } else {
                setBookmarkedMessages(new Set());
            }
        } catch (err) {
            console.error('Failed to load bookmarks:', err);
            setBookmarkedMessages(new Set());
        }
    }, [sessionId]);

    // Keyboard Shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore shortcuts when typing in input fields
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT';

            // Ctrl+?: Show keyboard shortcuts modal
            if ((e.metaKey || e.ctrlKey) && (e.key === '?' || e.key === '/') && e.shiftKey) {
                e.preventDefault();
                setShowShortcutsModal(true);
                return;
            }

            // Ctrl+N: New Chat
            if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !isTyping) {
                e.preventDefault();
                createNewSession();
                return;
            }

            // Ctrl+K: Focus on model selector (or new chat as fallback)
            if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !isTyping) {
                e.preventDefault();
                createNewSession();
                return;
            }

            // Ctrl+/: Toggle History
            if ((e.metaKey || e.ctrlKey) && e.key === '/' && !e.shiftKey) {
                e.preventDefault();
                setShowHistory(prev => !prev);
                return;
            }

            // Ctrl+L: Clear Chat
            if ((e.metaKey || e.ctrlKey) && e.key === 'l' && !isTyping) {
                e.preventDefault();
                if (history.length > 0 && confirm('Clear all messages in this chat?')) {
                    setHistory([]);
                }
                return;
            }

            // Ctrl+F: Toggle Search
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                setShowSearch(prev => !prev);
                return;
            }

            // Ctrl+Shift+C: Copy last response
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C' && !isTyping) {
                e.preventDefault();
                const lastAssistantMessage = [...history].reverse().find(m => m.role === 'assistant');
                if (lastAssistantMessage?.content) {
                    navigator.clipboard.writeText(lastAssistantMessage.content);
                    toast.success('Last response copied to clipboard');
                }
                return;
            }

            // Ctrl+Shift+E: Open Export Dialog
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'E' && !isTyping) {
                e.preventDefault();
                if (history.length > 0) {
                    setShowExportDialog(true);
                } else {
                    toast.info('No messages to export');
                }
                return;
            }

            // Ctrl+Shift+F: Open Global Search
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                setShowGlobalSearch(true);
                return;
            }

            // Ctrl+Shift+R: Open Recommendations
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'r') {
                e.preventDefault();
                setShowRecommendations(true);
                return;
            }

            // Ctrl+T: Toggle Tree View
            if ((e.metaKey || e.ctrlKey) && e.key === 't' && !isTyping) {
                e.preventDefault();
                setShowTreeView(prev => !prev);
                if (!branchingEnabled) {
                    setBranchingEnabled(true);
                    toast.info('Conversation branching enabled');
                }
                return;
            }

            // Ctrl+B: Create Branch (enable branching first if needed)
            if ((e.metaKey || e.ctrlKey) && e.key === 'b' && !isTyping) {
                e.preventDefault();
                if (!branchingEnabled) {
                    setBranchingEnabled(true);
                    toast.success('Conversation branching enabled! Create branches by sending different messages.');
                } else {
                    toast.info('Branching is ready - send a different message to create a branch');
                }
                return;
            }

            // Alt+Left/Right: Navigate branches
            if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && branchingEnabled) {
                e.preventDefault();
                const direction = e.key === 'ArrowLeft' ? -1 : 1;
                const currentIndex = treeHook.getCurrentSiblingIndex();
                treeHook.switchToSibling(currentIndex + direction);
                return;
            }

            // Esc: Stop Generation or Close Modals
            if (e.key === 'Escape') {
                if (showShortcutsModal) {
                    setShowShortcutsModal(false);
                } else if (editingMessageIndex !== null) {
                    handleCancelEdit();
                } else {
                    stopGeneration();
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [createNewSession, setShowHistory, stopGeneration, showShortcutsModal, editingMessageIndex, history, handleCancelEdit, setHistory]);

    // Memoized itemContent callback to prevent recreation on every render
    const renderItemContent = React.useCallback((index: number, msg: any) => {
        const isSearchResult = searchResults.includes(index);
        const isCurrentSearchResult = searchResults[currentSearchIndex] === index;
        const isLastMessage = index === history.length - 1;
        const activeChoice = msg.choices?.[msg.selectedChoiceIndex || 0];
        const currentLogprobs = activeChoice?.logprobs?.content || [];
        const hasLogprobs = Array.isArray(currentLogprobs) && currentLogprobs.length > 0;
        const showMissingLogprobsWarning = msg.role === 'assistant' && !hasLogprobs && isLastMessage;

        // Check if this is a Battle Mode pair
        const isBattleModePair = msg.role === 'assistant' &&
            index < history.length - 1 &&
            history[index + 1]?.role === 'assistant' &&
            msg.content?.includes('Model A:') &&
            history[index + 1].content?.includes('Model B:');

        const isShowingComparison = comparisonIndex === index;

        // Hide second message in Battle Mode pair when comparison is shown
        const isSecondInBattlePair = msg.role === 'assistant' &&
            index > 0 &&
            history[index - 1]?.role === 'assistant' &&
            history[index - 1].content?.includes('Model A:') &&
            msg.content?.includes('Model B:') &&
            comparisonIndex === index - 1;

        if (isSecondInBattlePair) {
            return null; // Hide second message when comparison is shown
        }

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group py-3 min-w-0 w-full overflow-hidden`}
            >
                <div className={`relative p-4 rounded-2xl max-w-[85%] min-w-0 shadow-md transition-all break-words overflow-hidden ${isCurrentSearchResult
                    ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-background'
                    : isSearchResult
                        ? 'ring-1 ring-yellow-500/50'
                        : ''
                    } ${msg.role === 'user' ? 'bg-primary/20 text-white rounded-tr-sm border border-primary/20' : 'bg-slate-800/80 text-slate-200 rounded-tl-sm border border-slate-700/50 backdrop-blur-sm'}`}
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {/* Message actions */}
                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                            onClick={() => toggleBookmark(index)}
                            className={`w-6 h-6 rounded-full text-white flex items-center justify-center shadow-lg cursor-pointer transition-all ${bookmarkedMessages.has(index)
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : 'bg-slate-700 hover:bg-slate-600'
                                }`}
                            title={bookmarkedMessages.has(index) ? 'Remove bookmark' : 'Bookmark message'}
                        >
                            <Star size={12} fill={bookmarkedMessages.has(index) ? 'currentColor' : 'none'} />
                        </button>
                        <MessageActionsMenu
                            messageContent={msg.content || ''}
                            messageIndex={index}
                            messageRole={msg.role}
                            onCopy={() => {
                                navigator.clipboard.writeText(msg.content || '');
                                toast.success('Copied to clipboard');
                            }}
                            onDelete={() => deleteMessage(index)}
                            onEdit={msg.role === 'user' ? () => handleEditMessage(index) : undefined}
                            onRegenerate={msg.role === 'assistant' && !msg.isLoading ? () => handleRegenerateResponse(index) : undefined}
                            onBranch={() => handleBranchConversation(index)}
                        />
                    </div>
                    {msg.role === 'assistant' ? (
                        <div>
                            {msg.isLoading ? (
                                <div className="flex flex-col gap-2">
                                    {msg.tool_calls && msg.tool_calls.length > 0 && (
                                        <div className="mb-2 space-y-2 animate-in slide-in-from-top-1 fade-in duration-300">
                                            {msg.tool_calls.map((tc: any, idx: number) => (
                                                <div key={tc.id || idx} className="p-2 bg-slate-900/80 border border-slate-700/50 rounded-lg text-xs font-mono shadow-sm">
                                                    <div className="flex items-center gap-2 mb-1 text-primary">
                                                        <Wrench size={12} />
                                                        <span className="font-bold">{tc.function.name}</span>
                                                    </div>
                                                    <div className="bg-slate-950 p-2 rounded text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
                                                        {tc.function.arguments}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {msg.content && <MessageContent
                                        content={msg.content}
                                        isUser={false}
                                        mcpAvailable={mcpAvailable}
                                        onInsertToFile={handleInsertToFile}
                                        isStreaming={true}
                                        isLazyLoaded={!loadedMessageIndices.has(index)}
                                        onLoadContent={() => loadMessageRange(index, index, history)}
                                        messageIndex={index}
                                    />}
                                    <div className="flex items-center gap-2 text-slate-400 italic text-sm animate-pulse">
                                        <Brain size={16} className="text-primary" /> Thinking...
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Normal View */}
                                    {(!showInspector || !hasLogprobs) && (
                                        <>
                                            {msg.tool_calls && msg.tool_calls.length > 0 && (
                                                <div className="mb-2 space-y-2">
                                                    {msg.tool_calls.map((tc: any, idx: number) => (
                                                        <div key={tc.id || idx} className="p-2 bg-slate-900/80 border border-slate-700/50 rounded-lg text-xs font-mono shadow-sm">
                                                            <div className="flex items-center gap-2 mb-1 text-primary">
                                                                <Wrench size={12} />
                                                                <span className="font-bold">{tc.function.name}</span>
                                                            </div>
                                                            <div className="bg-slate-950 p-2 rounded text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
                                                                {tc.function.arguments}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <MessageContent
                                                content={msg.content || ""}
                                                isUser={false}
                                                mcpAvailable={mcpAvailable}
                                                onInsertToFile={handleInsertToFile}
                                                isLazyLoaded={!loadedMessageIndices.has(index)}
                                                onLoadContent={() => loadMessageRange(index, index, history)}
                                                messageIndex={index}
                                            />
                                        </>
                                    )}

                                    {/* Inspector View */}
                                    {showInspector && hasLogprobs && (
                                        <div className="leading-relaxed font-mono text-[15px] animate-in fade-in duration-300">
                                            {currentLogprobs.map((lp: any, i: number) => {
                                                if (!lp || typeof lp !== 'object') return null;
                                                const entropy = calculateEntropy(lp.top_logprobs);
                                                const isSelected = selectedToken?.logprob === lp;
                                                const redIntensity = Math.min(255, entropy * 100);
                                                const bgAlpha = entropy > 0.5 ? 0.3 : 0.05;

                                                const style = {
                                                    backgroundColor: isSelected ? 'rgba(251, 191, 36, 0.9)' : `rgba(${redIntensity}, 50, 50, ${bgAlpha})`,
                                                    color: isSelected ? '#000' : 'inherit',
                                                    borderBottom: entropy > 1.0 ? '1px dotted #ef4444' : 'none',
                                                };

                                                return (
                                                    <span key={i} onClick={() => { setSelectedToken({ logprob: lp, messageIndex: index, tokenIndex: i }); setActiveTab('inspector'); }}
                                                        title={`Token: "${lp.token}"\nLogprob: ${lp.logprob}`}
                                                        className={`cursor-pointer rounded-[2px] px-[1px] transition-colors ${isSelected ? 'font-bold ring-2 ring-yellow-400 z-10 relative' : 'hover:bg-slate-700'}`} style={style}>{lp.token}</span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                            {/* Comparison View Toggle (only for first message in Battle Mode pair) */}
                            {isBattleModePair && !msg.isLoading && !history[index + 1]?.isLoading && (
                                <div className="mt-2 mb-2">
                                    <button
                                        onClick={() => setComparisonIndex(isShowingComparison ? null : index)}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-primary/50 text-slate-300 hover:text-primary"
                                    >
                                        <Code2 size={14} />
                                        {isShowingComparison ? 'Hide Comparison' : 'Show Comparison Grid'}
                                    </button>
                                </div>
                            )}

                            {/* Comparison Grid View */}
                            {isShowingComparison && isBattleModePair && !msg.isLoading && !history[index + 1]?.isLoading && (
                                <div className="mt-4 mb-4">
                                    {(() => {
                                        const msgB = history[index + 1];
                                        // Extract model names from content
                                        const modelAMatch = msg.content?.match(/\*\*Model A:\s*(.+?)\*\*/);
                                        const modelBMatch = msgB.content?.match(/\*\*Model B:\s*(.+?)\*\*/);
                                        const modelAName = modelAMatch?.[1] || availableModels.find((m: any) => m.id === currentModel)?.name || 'Model A';
                                        const modelBName = modelBMatch?.[1] || availableModels.find((m: any) => m.id === secondaryModel)?.name || 'Model B';

                                        return (
                                            <ComparisonGrid
                                                messageA={msg}
                                                messageB={msgB}
                                                modelAName={modelAName}
                                                modelBName={modelBName}
                                                onClose={() => setComparisonIndex(null)}
                                                mcpAvailable={mcpAvailable}
                                                onInsertToFile={handleInsertToFile}
                                            />
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Rating and Generation Time */}
                            <div className="mt-2 flex items-center justify-between gap-2">
                                {/* Rating Buttons */}
                                {!msg.isLoading && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleRateMessage(index, 'up')}
                                            className={`p-1 rounded transition-colors ${messageRatings[index] === 'up'
                                                ? 'text-green-500 bg-green-500/20'
                                                : 'text-slate-500 hover:text-green-400 hover:bg-slate-800'
                                                }`}
                                            title="Good response"
                                        >
                                            <ThumbsUp size={12} fill={messageRatings[index] === 'up' ? 'currentColor' : 'none'} />
                                        </button>
                                        <button
                                            onClick={() => handleRateMessage(index, 'down')}
                                            className={`p-1 rounded transition-colors ${messageRatings[index] === 'down'
                                                ? 'text-red-500 bg-red-500/20'
                                                : 'text-slate-500 hover:text-red-400 hover:bg-slate-800'
                                                }`}
                                            title="Poor response"
                                        >
                                            <ThumbsDown size={12} fill={messageRatings[index] === 'down' ? 'currentColor' : 'none'} />
                                        </button>
                                    </div>
                                )}
                                {/* Generation Time */}
                                {msg.generationTime && (
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                        <Clock size={10} />
                                        {(msg.generationTime / 1000).toFixed(2)}s
                                    </div>
                                )}
                            </div>
                            {/* Quick Reply Templates */}
                            {!msg.isLoading && isLastMessage && msg.content && (
                                <QuickReplyTemplates
                                    lastAssistantMessage={msg.content}
                                    onSelectTemplate={(template: string) => {
                                        setInput(template);
                                        if (textareaRef.current) {
                                            textareaRef.current.focus();
                                        }
                                    }}
                                />
                            )}
                        </div>
                    ) : (
                        <>
                            {editingMessageIndex === index ? (
                                <div className="flex flex-col gap-2">
                                    <textarea
                                        value={editedMessageContent}
                                        onChange={(e) => setEditedMessageContent(e.target.value)}
                                        className="w-full min-h-[100px] p-2 bg-slate-900/50 border border-primary/30 rounded-lg text-white resize-y focus:outline-none focus:border-primary/60"
                                        autoFocus
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={handleCancelEdit}
                                            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleSaveEdit(index)}
                                            className="px-3 py-1 text-sm bg-primary hover:bg-primary/80 rounded-lg transition-colors"
                                        >
                                            Save & Resend
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <MessageContent
                                        content={msg.content}
                                        isUser={true}
                                        mcpAvailable={mcpAvailable}
                                        onInsertToFile={handleInsertToFile}
                                        isLazyLoaded={!loadedMessageIndices.has(index)}
                                        onLoadContent={() => loadMessageRange(index, index, history)}
                                        messageIndex={index}
                                    />
                                    {/* Display attached images */}
                                    {msg.images && msg.images.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {msg.images.map((img: any, imgIdx: number) => (
                                                <a
                                                    key={imgIdx}
                                                    href={img.thumbnailUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block"
                                                >
                                                    <img
                                                        src={img.thumbnailUrl}
                                                        alt={img.name}
                                                        className="max-w-[200px] max-h-[150px] object-cover rounded-lg border border-slate-600 hover:border-primary/50 transition-colors cursor-pointer"
                                                    />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
                {showMissingLogprobsWarning && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-2 p-3 bg-amber-900/20 text-amber-200 rounded-lg text-sm border border-amber-900/50 flex flex-col gap-2 max-w-[85%]"
                    >
                        <div className="flex items-center gap-2 font-bold"><AlertTriangle size={14} /> Token Data Missing</div>
                        <p className="opacity-80">The LM Studio server refused to send token data. (Note: Remote models like OpenRouter may not support logprobs yet)</p>
                    </motion.div>
                )}
                {msg.role === 'assistant' && msg.choices && Array.isArray(msg.choices) && msg.choices.length > 1 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto max-w-full pb-1">
                        {msg.choices.map((c: any, cIdx: number) => (
                            <button key={cIdx} onClick={() => selectChoice(index, cIdx)} className={`px-2 py-1 text-xs border rounded-md transition-colors whitespace-nowrap ${(msg.selectedChoiceIndex || 0) === cIdx ? 'bg-slate-700 text-white border-slate-600' : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300'}`}>Option {cIdx + 1}</button>
                        ))}
                    </div>
                )}
            </motion.div>
        );
    }, [
        searchResults,
        currentSearchIndex,
        history,
        comparisonIndex,
        bookmarkedMessages,
        deleteMessage,
        handleEditMessage,
        handleRegenerateResponse,
        handleBranchConversation,
        mcpAvailable,
        handleInsertToFile,
        selectedToken,
        setSelectedToken,
        setActiveTab,
        setComparisonIndex,
        availableModels,
        currentModel,
        secondaryModel,
        handleRateMessage,
        messageRatings,
        showInspector,
        textareaRef,
        setInput,
        editingMessageIndex,
        editedMessageContent,
        setEditedMessageContent,
        handleCancelEdit,
        handleSaveEdit,
        selectChoice,
        toggleBookmark,
    ]);

    return (
        <div className="flex h-full flex-row relative bg-background text-text font-body overflow-hidden min-w-0 max-w-full">
            {/* History Sidebar */}
            {showHistory && (
                <div className="w-64 border-r border-slate-800 bg-slate-900/95 flex flex-col h-full absolute left-0 z-20 backdrop-blur-md shadow-2xl transition-all duration-300">
                    <div className="p-4 border-b border-slate-800 font-bold flex justify-between items-center text-slate-200">
                        <span className="flex items-center gap-2"><Clock size={16} /> Recent Chats</span>
                        <button onClick={() => setShowHistory(false)} className="hover:text-white text-slate-400 transition-colors"><X size={18} /></button>
                    </div>
                    <SidebarHistory
                        sessions={savedSessions}
                        currentSessionId={sessionId}
                        onLoadSession={loadSession}
                        onDeleteSession={deleteSession}
                        onRenameSession={renameSession}
                        onTogglePinSession={togglePinSession}
                    />
                </div>
            )}

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col h-full relative transition-[margin] duration-300 min-w-0 overflow-hidden ${showHistory ? 'ml-64' : 'ml-0'}`}>
                {/* Top Header */}
                <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 backdrop-blur-sm shadow-sm z-10 flex-wrap">
                    <button onClick={() => setShowHistory(!showHistory)} title="View History" className={`p-1.5 rounded-md transition-colors border border-slate-700 flex-shrink-0 ${showHistory ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
                        <Clock size={16} />
                    </button>
                    <button onClick={createNewSession} title="New Chat" className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-md hover:brightness-110 transition-all shadow-md shadow-emerald-900/20 font-medium text-xs flex-shrink-0">
                        <Plus size={14} /> <span>New</span>
                    </button>
                    <button
                        onClick={() => setShowTemplateLibrary(true)}
                        title="Templates"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <FileText size={14} /> <span>Templates</span>
                    </button>
                    <button
                        onClick={() => setShowABTesting(true)}
                        title="A/B Testing (Test different prompts)"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <TestTube size={14} /> <span>A/B Test</span>
                    </button>
                    <button
                        onClick={() => setShowPromptOptimization(true)}
                        title="Prompt Optimization (AI-powered suggestions)"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <Sparkles size={14} /> <span>Optimize</span>
                    </button>
                    <button
                        onClick={() => setShowWorkflows(true)}
                        title="Workflows (Automation)"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <Zap size={14} /> <span>Workflows</span>
                    </button>
                    <button
                        onClick={() => setShowAPIPlayground(true)}
                        title="API Playground (Developer Tools)"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <Code2 size={14} /> <span>API</span>
                    </button>
                    <button
                        onClick={() => setShowPluginManager(true)}
                        title="Plugin Manager"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <Package size={14} /> <span>Plugins</span>
                    </button>
                    <button
                        onClick={() => setShowWorkspaceViews(true)}
                        title="Workspace Views"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                    >
                        <LayoutGrid size={14} /> <span>Views</span>
                    </button>
                    {history.length > 0 && (
                        <button
                            onClick={() => {
                                // Extract code from last assistant message
                                const lastMessage = history[history.length - 1];
                                if (lastMessage?.content) {
                                    // Try to extract code block
                                    const codeBlockMatch = lastMessage.content.match(/```(\w+)?\n([\s\S]*?)```/);
                                    if (codeBlockMatch) {
                                        setSelectedCode({
                                            code: codeBlockMatch[2],
                                            language: codeBlockMatch[1] || 'javascript',
                                        });
                                    } else {
                                        setSelectedCode({
                                            code: lastMessage.content,
                                            language: 'javascript',
                                        });
                                    }
                                    setShowCodeIntegration(true);
                                }
                            }}
                            title="Code Integration (Review, Refactor, Docs, Tests, Git)"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                        >
                            <Code2 size={14} /> <span>Code</span>
                        </button>
                    )}
                    {/* Experimental Features Dropdown */}
                    <div className="relative group flex-shrink-0">
                        <button
                            title="Experimental Features"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs whitespace-nowrap"
                        >
                            <Sparkles size={14} /> <span>Experimental</span> <ChevronDown size={12} />
                        </button>
                        <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => setShowBCI(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Brain size={14} /> <span>Brain-Computer Interface</span>
                                </button>
                                <button
                                    onClick={() => setShowMultiModal(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Video size={14} /> <span>Multi-Modal AI</span>
                                </button>
                                <button
                                    onClick={() => setShowCollaboration(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Users size={14} /> <span>Real-Time Collaboration</span>
                                </button>
                                <button
                                    onClick={() => setShowBlockchain(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Link size={14} /> <span>Blockchain Integration</span>
                                </button>
                                <button
                                    onClick={() => setShowAIAgents(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Bot size={14} /> <span>AI Agents</span>
                                </button>
                                <button
                                    onClick={() => setShowFederatedLearning(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                                >
                                    <Shield size={14} /> <span>Federated Learning</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    {history.length > 0 && (
                        <button
                            onClick={() => {
                                if (window.confirm('Clear all messages in this chat?')) {
                                    setHistory([]);
                                    toast.success('Chat cleared');
                                }
                            }}
                            title="Clear Chat"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                        >
                            <Eraser size={14} /> <span>Clear</span>
                        </button>
                    )}
                    {history.length > 0 && (
                        <>
                            <button
                                onClick={() => setShowExportDialog(true)}
                                title="Export Chat (Ctrl+Shift+E)"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                            >
                                <Download size={14} /> <span>Export</span>
                            </button>
                            <button
                                onClick={() => {
                                    setShowTreeView(!showTreeView);
                                    if (!branchingEnabled) {
                                        setBranchingEnabled(true);
                                        toast.info('Conversation branching enabled');
                                    }
                                }}
                                title="Conversation Tree (Ctrl+T)"
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap ${showTreeView
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                    }`}
                            >
                                <Network size={14} /> <span>Tree</span>
                            </button>
                            <button
                                onClick={() => {
                                    try {
                                        HistoryService.exportSessionToObsidian(sessionId);
                                        toast.success('Chat exported as Obsidian markdown');
                                    } catch (error: any) {
                                        toast.error(error.message || 'Failed to export');
                                    }
                                }}
                                title="Export to Obsidian"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                            >
                                <FileText size={14} /> <span>Obsidian</span>
                            </button>
                            {notionService.isConfigured() && (
                                <button
                                    onClick={async () => {
                                        const session = HistoryService.getSession(sessionId);
                                        if (!session) {
                                            toast.error('Session not found');
                                            return;
                                        }

                                        try {
                                            const result = await notionService.saveConversation(
                                                session.title,
                                                session.messages,
                                                {
                                                    model: session.modelId,
                                                    date: new Date(session.lastModified).toLocaleString(),
                                                }
                                            );

                                            if (result.success && result.page) {
                                                toast.success('Saved to Notion!', {
                                                    action: {
                                                        label: 'Open',
                                                        onClick: () => window.open(result.page!.url, '_blank')
                                                    }
                                                });
                                            } else {
                                                toast.error(result.error || 'Failed to save to Notion');
                                            }
                                        } catch (error: any) {
                                            toast.error(error.message || 'Failed to save to Notion');
                                    }
                                }}
                                title="Save to Notion"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                            >
                                <FileText size={14} /> <span>Notion</span>
                            </button>
                            )}
                            {slackService.isConfigured() && (
                                <button
                                    onClick={async () => {
                                        const session = HistoryService.getSession(sessionId);
                                        if (!session) {
                                            toast.error('Session not found');
                                            return;
                                        }

                                        try {
                                            const result = await slackService.sendConversation(
                                                session.title,
                                                session.messages.map(m => ({
                                                    role: m.role,
                                                    content: m.content || '',
                                                }))
                                            );

                                            if (result.success) {
                                                toast.success('Sent to Slack!');
                                            } else {
                                                toast.error(result.error || 'Failed to send to Slack');
                                            }
                                        } catch (error: any) {
                                            toast.error(error.message || 'Failed to send to Slack');
                                        }
                                    }}
                                    title="Send to Slack"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                                >
                                    <MessageSquare size={14} /> <span>Slack</span>
                                </button>
                            )}
                            {discordService.isConfigured() && (
                                <button
                                    onClick={async () => {
                                        const session = HistoryService.getSession(sessionId);
                                        if (!session) {
                                            toast.error('Session not found');
                                            return;
                                        }

                                        try {
                                            const result = await discordService.sendConversation(
                                                session.title,
                                                session.messages.map(m => ({
                                                    role: m.role,
                                                    content: m.content || '',
                                                }))
                                            );

                                            if (result.success) {
                                                toast.success('Sent to Discord!');
                                            } else {
                                                toast.error(result.error || 'Failed to send to Discord');
                                            }
                                        } catch (error: any) {
                                            toast.error(error.message || 'Failed to send to Discord');
                                        }
                                    }}
                                    title="Send to Discord"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                                >
                                    <MessageSquare size={14} /> <span>Discord</span>
                                </button>
                            )}
                            {emailService.isConfigured() && (
                                <button
                                    onClick={async () => {
                                        const session = HistoryService.getSession(sessionId);
                                        if (!session) {
                                            toast.error('Session not found');
                                            return;
                                        }

                                        try {
                                            const result = await emailService.sendConversation(
                                                session.title,
                                                session.messages.map(m => ({
                                                    role: m.role,
                                                    content: m.content || '',
                                                }))
                                            );

                                            if (result.success) {
                                                toast.success('Email client opened!');
                                            } else {
                                                toast.error(result.error || 'Failed to open email');
                                            }
                                        } catch (error: any) {
                                            toast.error(error.message || 'Failed to send email');
                                        }
                                    }}
                                    title="Email Conversation"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                                >
                                    <Mail size={14} /> <span>Email</span>
                                </button>
                            )}
                            {calendarService.isConfigured() && (
                                <button
                                    onClick={() => setShowCalendarSchedule(true)}
                                    title="Schedule Reminder"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                                >
                                    <Calendar size={14} /> <span>Schedule</span>
                                </button>
                            )}
                        </>
                    )}
                    <div className="h-6 w-px bg-slate-700 mx-1 flex-shrink-0"></div>
                    <div className="flex items-center gap-2 min-w-0 max-w-[200px] flex-shrink-0">
                        {!battleMode ? (
                            <>
                                <span className="font-medium text-slate-400 text-xs whitespace-nowrap flex-shrink-0">Model:</span>
                                <div className="relative min-w-0 flex-1">
                                    <select value={currentModel} onChange={e => setCurrentModel(e.target.value)} className="w-full bg-slate-800 border-none text-white text-xs rounded-md px-2 py-1 focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer hover:bg-slate-700 transition-colors truncate">
                                        {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                    <ChevronRight className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={10} />
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-1.5 w-full animate-in fade-in slide-in-from-top-1">
                                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 text-xs flex items-center gap-1 flex-shrink-0"><Users size={12} /> VS</span>
                                <div className="relative flex-1 min-w-0">
                                    <select value={currentModel} onChange={e => setCurrentModel(e.target.value)} className="w-full bg-slate-800 border-l-2 border-l-blue-500 text-white text-xs rounded px-1.5 py-1 appearance-none cursor-pointer hover:bg-slate-700 truncate">
                                        {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="relative flex-1 min-w-0">
                                    <select value={secondaryModel} onChange={e => setSecondaryModel(e.target.value)} className="w-full bg-slate-800 border-l-2 border-l-orange-500 text-white text-xs rounded px-1.5 py-1 appearance-none cursor-pointer hover:bg-slate-700 truncate">
                                        {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Request Log Button */}
                    <button
                        onClick={() => setShowRequestLog(!showRequestLog)}
                        title="View Request/Response Log"
                        className={`p-1.5 rounded-md transition-colors border border-slate-700 relative flex-shrink-0 ${showRequestLog ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <FileText size={14} />
                        {apiLogs.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                {apiLogs.length > 9 ? '9+' : apiLogs.length}
                            </span>
                        )}
                    </button>

                    {/* Search Button */}
                    {history.length > 0 && (
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            title="Search in chat (Ctrl+F)"
                            className={`p-1.5 rounded-md transition-colors border border-slate-700 flex-shrink-0 ${showSearch ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                        >
                            <Search size={14} />
                        </button>
                    )}

                    {/* Connection Status Indicator */}
                    <div className="flex items-center gap-2 pl-2 border-l border-slate-800 h-6 self-center flex-shrink-0">
                        <div className="flex flex-col items-center" title={`LM Studio: ${connectionStatus.local}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus.local === 'online' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : connectionStatus.local === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'}`} />
                            <span className="text-[7px] uppercase font-bold text-slate-500 tracking-tighter">Local</span>
                        </div>
                        {connectionStatus.remote !== 'none' && (
                            <div className="flex flex-col items-center" title={`OpenRouter: ${connectionStatus.remote}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus.remote === 'online' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : connectionStatus.remote === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'}`} />
                                <span className="text-[7px] uppercase font-bold text-slate-500 tracking-tighter">OR</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <AnimatePresence>
                    {showSearch && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-b border-slate-800 bg-slate-900/50 overflow-hidden min-w-0"
                        >
                            <div className="relative">
                                <div className="px-6 py-3 flex items-center gap-3 min-w-0 overflow-hidden">
                                    <div className="flex-1 relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search in this conversation..."
                                            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
                                            autoFocus
                                        />
                                    </div>
                                    {searchResults.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowSearchResultsList(!showSearchResultsList)}
                                                className="px-2 py-1.5 hover:bg-slate-700 rounded transition-colors text-sm text-slate-400 hover:text-white flex items-center gap-1"
                                                title="Show all results"
                                            >
                                                <span>{currentSearchIndex + 1} / {searchResults.length}</span>
                                                {showSearchResultsList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                            <button
                                                onClick={() => setCurrentSearchIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1))}
                                                className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                                                title="Previous result"
                                            >
                                                <ChevronUp size={16} className="text-slate-400" />
                                            </button>
                                            <button
                                                onClick={() => setCurrentSearchIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0))}
                                                className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                                                title="Next result"
                                            >
                                                <ChevronDown size={16} className="text-slate-400" />
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            setShowSearch(false);
                                            setSearchQuery('');
                                            setShowSearchResultsList(false);
                                        }}
                                        className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                                        title="Close search"
                                    >
                                        <X size={16} className="text-slate-400" />
                                    </button>
                                </div>

                                {/* Virtualized search results list */}
                                <AnimatePresence>
                                    {showSearchResultsList && searchResults.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="border-t border-slate-800 bg-slate-900 overflow-hidden"
                                        >
                                            <div className="max-h-80 overflow-y-auto">
                                                <Virtuoso
                                                    style={{ height: Math.min(searchResults.length * 60, 320) }}
                                                    totalCount={searchResults.length}
                                                    itemContent={(index) => {
                                                        const messageIndex = searchResults[index];
                                                        const message = history[messageIndex];
                                                        const isActive = index === currentSearchIndex;
                                                        const preview = message.content ?
                                                            message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '') :
                                                            '';

                                                        return (
                                                            <button
                                                                onClick={() => navigateToSearchResult(index)}
                                                                className={`w-full text-left px-6 py-3 hover:bg-slate-800 transition-colors border-b border-slate-800/50 ${
                                                                    isActive ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                                                                }`}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                                                                        {index + 1}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className={`text-xs font-semibold ${
                                                                                message.role === 'user' ? 'text-blue-400' : 'text-emerald-400'
                                                                            }`}>
                                                                                {message.role === 'user' ? 'You' : 'Assistant'}
                                                                            </span>
                                                                            <span className="text-xs text-slate-500">
                                                                                Message #{messageIndex + 1}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm text-slate-300 truncate">
                                                                            {preview}
                                                                        </p>
                                                                    </div>
                                                                    {isActive && (
                                                                        <Check size={16} className="text-primary flex-shrink-0 mt-1" />
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    }}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* AI Summary Panel */}
                {history.length >= 5 && (
                    <div className="px-6 py-2">
                        <ConversationSummaryPanel
                            sessionId={sessionId}
                            messages={history}
                            modelId={currentModel}
                        />
                    </div>
                )}

                {/* Messages List */}
                <div className="flex-1 overflow-hidden bg-background relative min-w-0 max-w-full">
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-8 text-center space-y-8 animate-in fade-in duration-700">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-blue-500/10 flex items-center justify-center shadow-inner">
                                    <Brain size={48} className="text-primary animate-pulse" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-xl">
                                    <Activity size={20} className="text-emerald-500" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl font-heading font-bold text-white tracking-tight">How can I help you today?</h2>
                                <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                                    InferencerC 3.0 is ready. Select a model or an expert persona to begin your journey.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                                {[
                                    { icon: <Plus size={14} />, text: "Write a React component", prompt: "Write a clean, responsive React component for a Pricing Table using Tailwind CSS." },
                                    { icon: <Clock size={14} />, text: "Analyze code performance", prompt: "Explain the time and space complexity of this recursive Fibonacci function and suggest an optimized iterative approach." },
                                    { icon: <Brain size={14} />, text: "Reason about logic", prompt: "If all men are mortal, and Socrates is a man, walk me through the first principles of why Socrates is mortal." },
                                    { icon: <Globe size={14} />, text: "Summarize a concept", prompt: "Explain Quantum Entanglement like I'm five years old, using simple analogies." }
                                ].map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInput(suggestion.prompt)}
                                        className="flex flex-col items-start gap-2 p-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                                    >
                                        <div className="text-primary group-hover:scale-110 transition-transform">{suggestion.icon}</div>
                                        <span className="text-xs font-semibold text-slate-300 group-hover:text-white">{suggestion.text}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <Virtuoso
                            ref={virtuosoRef}
                            style={{ height: '100%', width: '100%' }}
                            data={history}
                            followOutput={(isAtBottom: boolean) => {
                                // If we are streaming (last message is loading), force scroll to bottom
                                const lastMsg = history[history.length - 1];
                                if (lastMsg?.isLoading) return 'smooth';
                                // Otherwise maintain stickiness if already at bottom
                                return isAtBottom ? 'auto' : false;
                            }}
                            overscan={{
                                main: 300,
                                reverse: 300
                            }}
                            increaseViewportBy={{
                                top: 200,
                                bottom: 200
                            }}
                            defaultItemHeight={150}
                            atBottomThreshold={100}
                            alignToBottom
                            className="custom-scrollbar px-6"
                            totalCount={history.length}
                            initialTopMostItemIndex={history.length - 1}
                            computeItemKey={(index, item) => `${index}-${item.role}`}
                            itemContent={renderItemContent}
                            components={{
                                Footer: () => <div className="h-48" />
                            }}
                        />
                    )}
                </div>

                {/* Floating Input Area with Control Bar */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-20 min-w-0 overflow-x-hidden">
                    <div
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                        onDrop={async (e) => {
                            e.preventDefault(); e.stopPropagation(); setIsDragging(false);
                            const files = Array.from(e.dataTransfer.files);
                            if (files.length === 0) return;

                            for (const file of files) {
                                // Handle image files
                                if (file.type.startsWith('image/')) {
                                    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
                                    if (validTypes.includes(file.type)) {
                                        try {
                                            const { base64, thumbnailUrl } = await compressImage(file);
                                            addImageAttachment({
                                                name: file.name,
                                                mimeType: 'image/webp', // compressImage outputs webp
                                                base64: base64,
                                                thumbnailUrl: thumbnailUrl
                                            });
                                        } catch (err) {
                                            console.error("Failed to read/compress image", file.name, err);
                                            toast.error(`Failed to process image: ${file.name}`);
                                        }
                                    }
                                }
                                // Handle text files
                                else if (file.type.startsWith('text/') || file.name.match(/\.(md|txt|js|ts|tsx|jsx|json|py|html|css|c|cpp|h|rs|go|java|yaml|xml)$/)) {
                                    try {
                                        const text = await file.text();
                                        addAttachment({ name: file.name, content: text });
                                    } catch (err) {
                                        console.error("Failed to read file", file.name);
                                    }
                                }
                            }
                        }}
                        className={`bg-slate-900/90 border backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col transition-all duration-300 min-w-0 max-w-full overflow-x-hidden ${isDragging ? 'border-primary ring-2 ring-primary/50 bg-slate-800/90' : 'border-slate-700/50'}`}
                    >
                        {/* 0. Attachment List */}
                        {(attachments.length > 0 || imageAttachments.length > 0) && (
                            <div className="flex flex-wrap gap-2 px-4 pt-4 pb-1 animate-in slide-in-from-bottom-2 duration-200">
                                {/* Image Thumbnails */}
                                {imageAttachments.map(img => (
                                    <div key={img.id} className="relative group">
                                        <img
                                            src={img.thumbnailUrl}
                                            alt={img.name}
                                            className="w-16 h-16 object-cover rounded-lg border border-slate-700/50 group-hover:border-primary/50 transition-colors"
                                        />
                                        <button
                                            onClick={() => removeImageAttachment(img.id)}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        >
                                            <X size={10} />
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm rounded-b-lg px-1 py-0.5">
                                            <span className="text-[8px] text-white truncate block">{img.name.slice(0, 10)}</span>
                                        </div>
                                    </div>
                                ))}
                                {/* Text File Attachments */}
                                {attachments.map(a => (
                                    <div key={a.id} className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/50 rounded-lg pl-3 pr-2 py-1.5 text-xs text-slate-200 group hover:border-slate-600 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="font-bold truncate max-w-[150px]">{a.name}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">{(a.content.length / 1024).toFixed(1)} KB</span>
                                        </div>
                                        <button
                                            onClick={() => removeAttachment(a.id)}
                                            className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-red-400 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Smart Suggestions Panel */}
                        {showSuggestions && history.length > 0 && (
                            <div className="px-4">
                                <SmartSuggestionsPanel
                                    conversationHistory={history}
                                    lastMessage={history[history.length - 1]?.content}
                                    onSelectSuggestion={(suggestion) => {
                                        setInput(suggestion);
                                        setShowSuggestions(false);
                                        textareaRef.current?.focus();
                                    }}
                                    isOpen={showSuggestions}
                                    onClose={() => setShowSuggestions(false)}
                                />
                            </div>
                        )}

                        {/* 1. Main User Input */}
                        <div className="flex items-start p-4 gap-3 bg-slate-950/30 rounded-t-2xl relative min-w-0 max-w-full overflow-x-hidden">
                            {isDragging && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 rounded-t-2xl backdrop-blur-sm pointer-events-none">
                                    <div className="text-primary font-bold text-lg animate-bounce flex items-center gap-2">
                                        <ImageIcon size={24} /> Drop files or images
                                    </div>
                                </div>
                            )}
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => {
                                    const newValue = e.target.value;
                                    const cursor = e.target.selectionEnd || newValue.length;
                                    const upToCursor = newValue.slice(0, cursor);

                                    // Detect Slash Command: word boundary followed by slash and optional chars
                                    const match = /(?:^|\s)\/([a-zA-Z0-9-]*)$/.exec(upToCursor);

                                    if (match) {
                                        const query = match[1];
                                        // match[0] includes the space before slash if any, so we find the slash pos
                                        const slashIndex = match.index + match[0].lastIndexOf('/') + 1;
                                        setSlashMatch({ query, index: slashIndex });
                                        setActivePromptIndex(0);
                                    } else {
                                        setSlashMatch(null);
                                    }

                                    setInput(newValue);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
                                }}
                                onPaste={async (e) => {
                                    const items = Array.from(e.clipboardData.items);
                                    for (const item of items) {
                                        if (item.type.startsWith('image/')) {
                                            e.preventDefault();
                                            const file = item.getAsFile();
                                            if (file) {
                                                try {
                                                    const { base64, thumbnailUrl } = await compressImage(file);
                                                    addImageAttachment({
                                                        name: file.name || `pasted-${Date.now()}.png`,
                                                        mimeType: 'image/webp',
                                                        base64,
                                                        thumbnailUrl
                                                    });
                                                    toast.success('Image pasted');
                                                } catch (err) {
                                                    console.error("Paste failed", err);
                                                    toast.error("Failed to paste image");
                                                }
                                            }
                                        }
                                    }
                                }}
                                onKeyDown={e => {
                                    // Handle Slash Menu Navigation
                                    if (slashMatch && filteredPrompts.length > 0) {
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setActivePromptIndex(prev => Math.max(0, prev - 1));
                                            return;
                                        }
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setActivePromptIndex(prev => Math.min(filteredPrompts.length - 1, prev + 1));
                                            return;
                                        }
                                        if (e.key === 'Enter' || e.key === 'Tab') {
                                            e.preventDefault();
                                            insertPrompt(filteredPrompts[activePromptIndex]);
                                            return;
                                        }
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            setSlashMatch(null);
                                            return;
                                        }
                                    }

                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessageWithContext();
                                    }
                                }}
                                className={`flex-1 bg-transparent text-white placeholder-slate-400 border-none outline-none resize-none max-h-64 py-2 font-sans text-base leading-relaxed custom-scrollbar min-w-0 overflow-x-hidden break-words ${slashMatch ? 'text-primary' : ''}`}
                                placeholder="Type your prompt here... (Try '/')"
                                rows={1}
                            />
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setShowSuggestions(!showSuggestions)}
                                    disabled={history.length === 0}
                                    title="Smart Suggestions"
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
                                >
                                    <Sparkles size={16} />
                                </button>
                                <button
                                    onClick={sendMessageWithContext}
                                    disabled={!input.trim()}
                                    className="p-2 bg-primary text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-primary/20"
                                >
                                    <Send size={18} fill="currentColor" />
                                </button>
                            </div>
                        </div>

                        {/* 2. Prefill / Steering Input (Controlled by Toggle) */}
                        {prefill !== null && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="relative">
                                    <div className="absolute left-3 top-3 text-primary">
                                        <ChevronRight size={16} strokeWidth={3} />
                                    </div>
                                    <input
                                        type="text"
                                        value={prefill}
                                        onChange={e => setPrefill(e.target.value)}
                                        className="w-full bg-slate-950 border-2 border-primary/30 rounded-lg pl-9 pr-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors shadow-inner"
                                        placeholder="Type the response here... (Steer the model)"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 ml-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                                    This seeds the model's response, forcing it to continue from your text.
                                </p>
                            </div>
                        )}

                        {/* 2b. Web Fetch Input (Tools Toggle) */}
                        {showUrlInput && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="relative flex gap-2 items-center">
                                    <div className="absolute left-3 top-3 text-primary">
                                        <Globe size={16} strokeWidth={3} />
                                    </div>
                                    <input
                                        type="text"
                                        value={urlInput}
                                        onChange={e => setUrlInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') executeWebFetch();
                                        }}
                                        className="flex-1 bg-slate-950 border-2 border-primary/30 rounded-lg pl-9 pr-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors shadow-inner"
                                        placeholder="Enter URL to fetch context from..."
                                    />
                                    <button
                                        onClick={executeWebFetch}
                                        disabled={isFetchingWeb || !urlInput}
                                        className="px-4 py-3 bg-primary hover:bg-primary-600 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        {isFetchingWeb ? <span className="animate-spin inline-block mr-1">⌛</span> : "Fetch"}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 ml-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                    Fetches the text content of the URL and adds it to the chat context.
                                </p>
                            </div>
                        )}

                        {/* 2d. GitHub Fetch Input */}
                        {showGithubInput && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="relative flex gap-2 items-center">
                                    <div className="absolute left-3 top-3 text-primary">
                                        <Github size={16} strokeWidth={3} />
                                    </div>
                                    <input
                                        type="text"
                                        value={githubUrl}
                                        onChange={e => setGithubUrl(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') executeGithubFetch();
                                        }}
                                        className="flex-1 bg-slate-950 border-2 border-primary/30 rounded-lg pl-9 pr-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors shadow-inner"
                                        placeholder="owner/repo/path or full GitHub URL..."
                                    />
                                    <button
                                        onClick={executeGithubFetch}
                                        disabled={isFetchingGithub || !githubUrl || !githubService.isConfigured()}
                                        className="px-4 py-3 bg-primary hover:bg-primary-600 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        {isFetchingGithub ? <span className="animate-spin inline-block mr-1">⌛</span> : "Fetch"}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 ml-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                                    {githubService.isConfigured()
                                        ? "Fetches file contents from GitHub repositories. Format: owner/repo/path/to/file"
                                        : "Configure GitHub API key in Settings → API Keys to use this feature."
                                    }
                                </p>
                            </div>
                        )}

                        {/* 2c. Project Context Display */}
                        {projectContext && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="bg-slate-950 border-2 border-blue-500/30 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <FolderOpen size={16} className="text-blue-400" />
                                            <span className="text-xs font-bold text-blue-400">Project Context</span>
                                            {projectContext.isWatching && (
                                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Watching</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setIncludeContextInMessages(!includeContextInMessages)}
                                                className="p-1 hover:bg-slate-800 rounded transition-colors"
                                                title={includeContextInMessages ? "Context is included" : "Context is excluded"}
                                            >
                                                {includeContextInMessages ? <Eye size={14} className="text-blue-400" /> : <EyeOff size={14} className="text-slate-500" />}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    projectContextService.clearContext();
                                                    toast.success('Project context cleared');
                                                }}
                                                className="p-1 hover:bg-slate-800 rounded transition-colors"
                                                title="Clear context"
                                            >
                                                <X size={14} className="text-slate-500 hover:text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-mono truncate mb-2" title={projectContext.folderPath}>
                                        {projectContext.folderPath}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400">
                                            {projectContext.files.length} file{projectContext.files.length !== 1 ? 's' : ''} loaded
                                        </span>
                                        {!projectContext.isWatching && (
                                            <button
                                                onClick={async () => {
                                                    const success = await projectContextService.startWatching();
                                                    if (success) {
                                                        toast.success('Started watching folder for changes');
                                                    } else {
                                                        toast.error('Failed to start watching');
                                                    }
                                                }}
                                                className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                                            >
                                                Start watching
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Slash Command Menu */}
                        {slashMatch && (
                            <div className="absolute bottom-full left-4 mb-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                                <div className="p-2 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center">
                                    <span>Prompt Library</span>
                                    <span className="bg-slate-800 px-1 rounded text-slate-400">/</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {filteredPrompts.length === 0 ? (
                                        <div className="p-3 text-xs text-slate-500 italic text-center">No matching prompts</div>
                                    ) : (
                                        filteredPrompts.map((p, i) => (
                                            <button
                                                key={p.id}
                                                onClick={() => insertPrompt(p)}
                                                className={`w-full text-left px-3 py-2 text-xs border-b border-slate-800/50 last:border-0 transition-colors flex flex-col gap-0.5 ${i === activePromptIndex ? 'bg-primary/20 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                                            >
                                                <span className="font-bold flex items-center gap-2">/{p.alias} <span className="font-normal opacity-50 text-[10px] ml-auto">↵</span></span>
                                                <span className="opacity-70 truncate w-full block">{p.title}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. Control Pills Bar */}
                        <div className="px-4 py-3 bg-slate-950/50 border-t border-slate-800/50 flex flex-wrap gap-2 items-center relative rounded-b-2xl">
                            {/* Toggle 1: Control Response */}
                            <button
                                onClick={() => setPrefill(prefill === null ? '' : null)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${prefill !== null
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                {prefill !== null ? <Check size={12} strokeWidth={3} /> : <Settings size={12} strokeWidth={2.5} />} Control Response
                            </button>

                            {/* Toggle 2: Tools */}
                            <button
                                onClick={() => setShowUrlInput(!showUrlInput)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${showUrlInput
                                    ? 'bg-primary text-white border-primary animate-pulse'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <Globe size={12} strokeWidth={2.5} /> Tools
                            </button>

                            {/* Toggle 2c: GitHub */}
                            {githubService.isConfigured() && (
                                <button
                                    onClick={() => setShowGithubInput(!showGithubInput)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${showGithubInput
                                        ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                        }`}
                                >
                                    <Github size={12} strokeWidth={2.5} /> GitHub
                                </button>
                            )}

                            {/* Toggle 2b: Project Context */}
                            <button
                                onClick={async () => {
                                    if (projectContext) {
                                        projectContextService.clearContext();
                                        toast.success('Project context cleared');
                                    } else {
                                        const success = await projectContextService.selectFolder();
                                        if (success) {
                                            toast.success('Project folder loaded');
                                            // Auto-start watching
                                            setTimeout(async () => {
                                                await projectContextService.startWatching();
                                            }, 500);
                                        } else {
                                            toast.error('Failed to select folder');
                                        }
                                    }
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${projectContext
                                    ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <FolderOpen size={12} strokeWidth={2.5} /> {projectContext ? 'Context' : 'Project'}
                            </button>

                            {/* Toggle 3: Thinking */}
                            <button
                                onClick={() => setThinkingEnabled(!thinkingEnabled)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${thinkingEnabled
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <Brain size={12} strokeWidth={2.5} /> Thinking
                            </button>

                            {/* Toggle 3b: Battle Mode */}
                            <button
                                onClick={() => setBattleMode(!battleMode)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${battleMode
                                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <Users size={12} strokeWidth={2.5} /> Battle
                            </button>

                            {/* Toggle 5: Token Inspector */}
                            <button
                                onClick={() => setShowInspector(!showInspector)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${showInspector
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <Activity size={12} strokeWidth={2.5} /> Inspector
                            </button>

                            {/* Toggle 4: Mixture of Experts / Config */}
                            <button
                                onClick={() => setShowExpertMenu(!showExpertMenu)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${expertMode
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <Users size={12} strokeWidth={2.5} /> {expertMode ? `Expert: ${expertMode}` : "Expert Config"}
                            </button>

                            {/* Toggle 4b: Variables */}
                            <button
                                onClick={() => setShowVariableMenu(!showVariableMenu)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${showVariableMenu
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                                title="Insert variables like {{date}}, {{time}}, {{user_name}}"
                            >
                                <Code2 size={12} strokeWidth={2.5} /> Variables
                            </button>



                            {/* JSON Mode Toggle */}
                            <button
                                onClick={() => {
                                    setJsonMode(!jsonMode);
                                    toast.success(jsonMode ? 'JSON mode disabled' : 'JSON mode enabled');
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${jsonMode
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                                title="Enable JSON output format"
                            >
                                <Code2 size={12} strokeWidth={2.5} /> JSON
                            </button>

                            {/* Streaming Toggle */}
                            <button
                                onClick={() => {
                                    setStreamingEnabled(!streamingEnabled);
                                    toast.success(streamingEnabled ? 'Streaming disabled' : 'Streaming enabled');
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${streamingEnabled
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                                title={streamingEnabled ? "Disable streaming (get full response at once)" : "Enable streaming (real-time token display)"}
                            >
                                <Activity size={12} strokeWidth={2.5} /> Stream
                            </button>

                            {/* Analytics Dashboard */}
                            <button
                                onClick={() => {
                                    setShowAnalytics(true);
                                    setUsageStats(analyticsService.getUsageStats());
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                                title="View usage analytics and statistics"
                            >
                                <BarChart3 size={12} strokeWidth={2.5} /> Analytics
                            </button>

                            {/* Conversation Recommendations */}
                            {history.length > 0 && (
                                <button
                                    onClick={() => setShowRecommendations(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                                    title="Find relevant conversations (Ctrl+Shift+R)"
                                >
                                    <Sparkles size={12} strokeWidth={2.5} /> Recommendations
                                </button>
                            )}

                            {/* Controls Toggle */}
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${sidebarOpen
                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                                title="Toggle Controls Panel"
                            >
                                <Settings size={12} strokeWidth={2.5} /> Controls
                            </button>

                            {/* MCP Status Indicator */}
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${mcpAvailable
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800/50 text-slate-500 border-slate-700/50'
                                }`}
                                title={mcpAvailable ? `${mcpConnectedCount} server(s), ${mcpTools.length} tools` : 'No MCP servers connected'}
                            >
                                <Plug size={12} strokeWidth={2.5} />
                                {mcpAvailable ? (
                                    <span className="flex items-center gap-1">
                                        MCP
                                        <span className="bg-emerald-500/30 text-emerald-300 text-[10px] px-1 rounded">{mcpTools.length}</span>
                                    </span>
                                ) : (
                                    <span className="opacity-50">MCP</span>
                                )}
                            </div>

                            {/* Expert Dropdown Menu */}
                            {showExpertMenu && (
                                <div className="absolute bottom-12 right-4 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50">
                                    <div className="p-2 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Expert Persona</div>
                                    <button onClick={() => handleExpertSelect(null)} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">None (Default)</button>
                                    <button onClick={() => handleExpertSelect('coding')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">👨‍💻 Coding Expert</button>
                                    <button onClick={() => handleExpertSelect('reasoning')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">🧠 Logic & Reasoning</button>
                                    <button onClick={() => handleExpertSelect('creative')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">🎨 Creative Writer</button>
                                    <button onClick={() => handleExpertSelect('math')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">📐 Mathematician</button>
                                </div>
                            )}

                            {/* Variable Insert Menu */}
                            <VariableInsertMenu
                                isOpen={showVariableMenu}
                                onClose={() => setShowVariableMenu(false)}
                                onInsert={(variable) => {
                                    setInput(prev => prev + variable);
                                    setShowVariableMenu(false);
                                }}
                                context={{
                                    modelId: currentModel,
                                    modelName: availableModels.find(m => m.id === currentModel)?.name || currentModel,
                                    sessionId: sessionId,
                                    sessionTitle: savedSessions.find(s => s.id === sessionId)?.title || 'New Chat',
                                    messageCount: history.length
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Inspector / Sidebar */}
            {sidebarOpen && (
                <div className="w-[420px] min-w-[420px] bg-slate-950/50 border-1 border-slate-800 flex flex-col h-full border-l backdrop-blur-xl relative">
                <div className="flex border-b border-slate-800 relative">
                    <button onClick={() => setActiveTab('inspector')} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'inspector' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Inspector</button>
                    <button onClick={() => setActiveTab('controls')} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'controls' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Controls</button>
                    <button onClick={() => setActiveTab('prompts')} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'prompts' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Prompts</button>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="absolute top-2 right-2 p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                        title="Close Sidebar"
                    >
                        <X size={14} />
                    </button>
                </div>

                {activeTab === 'controls' && (
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-4">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider block">System Prompt</label>
                                {!isEditingSystemPrompt && (
                                    <span className="text-[10px] text-slate-500 italic">Double-click to edit</span>
                                )}
                            </div>
                            {isEditingSystemPrompt ? (
                                <textarea
                                    value={systemPrompt}
                                    autoFocus
                                    onBlur={() => setIsEditingSystemPrompt(false)}
                                    onChange={e => setSystemPrompt(e.target.value)}
                                    className="w-full h-32 bg-white text-slate-900 border-2 border-primary rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary outline-none resize-none transition-all shadow-xl"
                                />
                            ) : (
                                <div
                                    onDoubleClick={() => setIsEditingSystemPrompt(true)}
                                    className="w-full min-h-32 bg-slate-900 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-400 overflow-y-auto custom-scrollbar cursor-pointer hover:border-primary/50 hover:bg-slate-900/80 transition-all select-none group relative break-words"
                                    title="Double-click to edit"
                                >
                                    <div className="whitespace-pre-wrap break-words">{systemPrompt || "No system prompt set."}</div>
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Edit2 size={24} className="text-primary/30" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-6">
                            {/* Battle Mode Toggle */}
                            <div className="pb-4 border-b border-slate-800">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className={battleMode ? "text-primary" : "text-slate-400"} />
                                        <label className="text-sm font-medium text-slate-300">Battle Mode</label>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newVal = !battleMode;
                                            setBattleMode(newVal);
                                            if (newVal && !secondaryModel && availableModels.length > 1) {
                                                setSecondaryModel(availableModels.find(m => m.id !== currentModel)?.id || '');
                                            }
                                        }}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${battleMode ? 'bg-primary' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${battleMode ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                {battleMode && (
                                    <div className="space-y-2 animate-in slide-in-from-top-1 fade-in duration-200">
                                        <label className="text-xs text-slate-400 flex justify-between">
                                            <span>Opponent Model</span>
                                            <span className="text-primary font-mono">{availableModels.find(m => m.id === secondaryModel)?.name || 'Select...'}</span>
                                        </label>
                                        <select
                                            value={secondaryModel}
                                            onChange={(e) => setSecondaryModel(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-primary outline-none"
                                        >
                                            <option value="">Select Model...</option>
                                            {availableModels.filter(m => m.id !== currentModel).map(m => (
                                                <option key={m.id} value={m.id}>{m.name || m.id}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Reasoning Mode Toggle */}
                            <div className="pb-4 border-b border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Brain size={16} className={thinkingEnabled ? "text-primary" : "text-slate-400"} />
                                        <div className="flex flex-col">
                                            <label className="text-sm font-medium text-slate-300">Reasoning Mode</label>
                                            <span className="text-[10px] text-slate-500">Injects &lt;thinking&gt; tags logic</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setThinkingEnabled(!thinkingEnabled)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${thinkingEnabled ? 'bg-primary' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${thinkingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Auto Model Routing Toggle */}
                            <div className="pb-4 border-b border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Network size={16} className={autoRouting ? "text-primary" : "text-slate-400"} />
                                        <div className="flex flex-col">
                                            <label className="text-sm font-medium text-slate-300">Auto Model Routing</label>
                                            <span className="text-[10px] text-slate-500">Selects best model for query intent</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setAutoRouting(!autoRouting)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${autoRouting ? 'bg-primary' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${autoRouting ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Tools Section */}
                            <div className="pb-4 border-b border-slate-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <Wrench size={16} className="text-slate-400" />
                                    <label className="text-sm font-medium text-slate-300">Tools</label>
                                </div>
                                <div className="space-y-2">
                                    {AVAILABLE_TOOLS.map(tool => {
                                        const isEnabled = enabledTools.has(tool.name);
                                        return (
                                            <div key={tool.name} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-700/50">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-200 font-medium">{tool.name}</span>
                                                    <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{tool.description}</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newSet = new Set(enabledTools);
                                                        if (isEnabled) newSet.delete(tool.name);
                                                        else newSet.add(tool.name);
                                                        setEnabledTools(newSet);
                                                    }}
                                                    className={`w-8 h-4 rounded-full transition-colors relative ${isEnabled ? 'bg-primary' : 'bg-slate-700'}`}
                                                >
                                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* JSON Mode Toggle */}
                            <div className="pb-4 border-b border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileJson size={16} className={responseFormat === 'json_object' ? "text-primary" : "text-slate-400"} />
                                        <div className="flex flex-col">
                                            <label className="text-sm font-medium text-slate-300">JSON Mode</label>
                                            <span className="text-[10px] text-slate-500">Force model to output valid JSON</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setResponseFormat(responseFormat === 'text' ? 'json_object' : 'text')}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${responseFormat === 'json_object' ? 'bg-primary' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${responseFormat === 'json_object' ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2"><div className="flex justify-between text-sm"><label className="text-slate-400">Batch Size</label><span className="font-mono text-primary">{batchSize}</span></div><input type="range" min="1" max="5" value={batchSize} onChange={e => setBatchSize(parseInt(e.target.value))} className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" /></div>
                            <div className="space-y-2"><div className="flex justify-between text-sm"><label className="text-slate-400">Temperature</label><span className="font-mono text-primary">{temperature}</span></div><input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" /></div>
                            <div className="space-y-2"><div className="flex justify-between text-sm"><label className="text-slate-400">Top P</label><span className="font-mono text-primary">{topP}</span></div><input type="range" min="0" max="1" step="0.05" value={topP} onChange={e => setTopP(parseFloat(e.target.value))} className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" /></div>
                            {(() => {
                                const currentModelObj = availableModels.find(m => m.id === currentModel);
                                // Use model's contextLength if available, otherwise use sensible defaults
                                // For modern models: 8K, 32K, 128K, 200K are common
                                const maxContextLength = currentModelObj?.contextLength || 32768;
                                // Allow up to 95% of context length for output tokens (leave room for input)
                                const maxAllowedTokens = Math.floor(maxContextLength * 0.95);
                                const sliderMax = Math.max(4096, maxAllowedTokens); // At least 4K, but can go higher

                                return (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <label className="text-slate-400">Max Tokens</label>
                                            <span className="font-mono text-primary">{maxTokens.toLocaleString()}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max={sliderMax}
                                            step={sliderMax > 10000 ? 100 : 10}
                                            value={maxTokens}
                                            onChange={e => setMaxTokens(parseInt(e.target.value))}
                                            className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                        />
                                        {currentModelObj?.contextLength && (
                                            <div className="text-[10px] text-slate-500 text-right">
                                                Model context: {currentModelObj.contextLength.toLocaleString()} tokens
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {activeTab === 'prompts' && (
                    <React.Suspense fallback={<div className="p-6 text-slate-500 animate-pulse">Loading Library...</div>}>
                        <PromptManager />
                    </React.Suspense>
                )}

                {activeTab === 'inspector' && (
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar pr-4">
                        {selectedToken ? (
                            <div className="animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-white text-slate-900 rounded-xl p-6 text-center shadow-lg mb-6 border-4 border-slate-800 relative">
                                    <div className="text-3xl font-heading font-bold mb-1">"{selectedToken.logprob.token}"</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Selected Token</div>

                                    {/* Token Editor */}
                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 bg-slate-100 border border-slate-300 rounded px-2 py-1 text-sm font-mono"
                                                defaultValue={selectedToken.logprob.token}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const newVal = e.currentTarget.value;
                                                        updateMessageToken(selectedToken.messageIndex, selectedToken.tokenIndex, newVal);
                                                        toast.success("Token updated");
                                                    }
                                                }}
                                            />
                                            <button className="text-xs bg-slate-900 text-white px-2 py-1 rounded hover:bg-slate-700">Update</button>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1">Press Enter to apply changes</div>
                                    </div>
                                </div>
                                <div className="space-y-4 mb-6">
                                    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                                        <div className="flex justify-between items-center mb-2"><span className="text-slate-400 text-sm">Logprob</span><span className="font-mono text-emerald-400">{selectedToken.logprob.logprob?.toFixed(4) ?? "N/A"}</span></div>
                                        <div className="flex justify-between items-center mb-2"><span className="text-slate-400 text-sm">Probability</span><span className="font-mono text-emerald-400">{(Math.exp(selectedToken.logprob.logprob || 0) * 100).toFixed(2)}%</span></div>
                                        <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Entropy</span><span className="font-mono text-amber-400">{calculateEntropy(selectedToken.logprob.top_logprobs).toFixed(3)}</span></div>
                                    </div>
                                </div>
                                <details className="mb-6 group"><summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors list-none flex items-center gap-1"><ChevronRight size={12} className="group-open:rotate-90 transition-transform" /> Debug Data</summary><pre className="mt-2 text-[10px] bg-slate-950 p-2 rounded text-slate-400 overflow-x-auto border border-slate-800 font-mono">{JSON.stringify(selectedToken.logprob, null, 2)}</pre></details>
                                <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2"><Activity size={14} className="text-primary" /> Top Alternatives</h4>
                                {(!selectedToken.logprob.top_logprobs || selectedToken.logprob.top_logprobs.length === 0) ? (
                                    <div className="p-4 bg-amber-900/20 border border-amber-900/50 rounded-lg text-amber-200 text-sm flex items-start gap-3"><AlertCircle size={16} className="mt-0.5 flex-shrink-0" /><div><p className="font-bold">No alternatives found.</p><p className="opacity-80 text-xs mt-1">If you just updated the server, please restart the application.</p></div></div>
                                ) : (
                                    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                                        {selectedToken.logprob.top_logprobs.map((topLp, idx) => {
                                            if (!topLp) return null;
                                            const prob = Math.exp(topLp.logprob);
                                            const width = Math.min(100, Math.max(1, prob * 100));
                                            return (
                                                <div key={`${idx}-${topLp.token}`} className="p-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors group">
                                                    <div className="flex justify-between items-center mb-1.5"><span className="font-mono font-bold text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded text-xs">"{topLp.token}"</span><span className="text-xs text-slate-400 group-hover:text-white font-mono">{(prob * 100).toFixed(1)}%</span></div>
                                                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500" style={{ width: `${width}%` }}></div></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center space-y-4 p-8">
                                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-2 animate-pulse"><Activity size={32} className="text-slate-700" /></div>
                                <p className="font-medium">Inspect Token Details</p>
                                <p className="text-sm opacity-70">Select any token in the chat message to view its probabilities and entropy.</p>
                                <div className="text-xs bg-slate-900/50 p-3 rounded border border-slate-800"><span className="text-amber-500">Note:</span> If tokens are not clickable, logprobs might be disabled on the server.</div>
                            </div>
                        )}
                    </div>
                )}
                </div>
            )}

            {/* Sidebar Toggle Button (when closed) */}

            {/* Keyboard Shortcuts Modal */}
            <KeyboardShortcutsModal
                isOpen={showShortcutsModal}
                onClose={() => setShowShortcutsModal(false)}
            />

            {/* Request/Response Log */}
            <RequestResponseLog
                isOpen={showRequestLog}
                onClose={() => setShowRequestLog(false)}
                logs={apiLogs}
                onClear={() => setApiLogs([])}
            />

            {/* Analytics Dashboard */}
            <AnalyticsDashboard
                isOpen={showAnalytics}
                onClose={() => setShowAnalytics(false)}
                usageHistory={usageStats}
            />

            {/* Conversation Tree View */}
            {branchingEnabled && (
                <ConversationTreeView
                    isOpen={showTreeView}
                    onClose={() => setShowTreeView(false)}
                    treeManager={treeHook.treeManager}
                    currentPath={treeHook.currentPath}
                    onNavigateToNode={(nodeId) => {
                        // Close tree view
                        // Note: We don't navigate here to prevent truncating the conversation
                        // Navigation is only useful when switching between actual branches,
                        // which is handled by Alt+Left/Right keyboard shortcuts
                        setShowTreeView(false);
                    }}
                />
            )}

            {/* Export Dialog */}
            <ExportDialog
                isOpen={showExportDialog}
                onClose={() => setShowExportDialog(false)}
                messages={history}
                sessionTitle={savedSessions.find(s => s.id === sessionId)?.title || 'Conversation'}
            />

            {/* Global Search Dialog */}
            <GlobalSearchDialog
                isOpen={showGlobalSearch}
                onClose={() => setShowGlobalSearch(false)}
                onNavigateToMessage={(targetSessionId, messageIndex) => {
                    // If different session, load it first
                    if (targetSessionId !== sessionId) {
                        loadSession(targetSessionId);
                    }
                    // Scroll to the message after a short delay to allow session loading
                    setTimeout(() => {
                        if (virtuosoRef.current && messageIndex >= 0) {
                            virtuosoRef.current.scrollToIndex({
                                index: messageIndex,
                                align: 'center',
                                behavior: 'smooth'
                            });
                            toast.success(`Jumped to message #${messageIndex + 1}`);
                        }
                    }, 300);
                }}
            />

            {/* Template Library Dialog */}
            <TemplateLibraryDialog
                isOpen={showTemplateLibrary}
                onClose={() => setShowTemplateLibrary(false)}
                onUseTemplate={(template: ConversationTemplate) => {
                    // Create new session with template
                    createNewSession();

                    // Apply template settings
                    if (template.systemPrompt) {
                        setSystemPrompt(template.systemPrompt);
                    }
                    if (template.settings) {
                        if (template.settings.temperature !== undefined) setTemperature(template.settings.temperature);
                        if (template.settings.topP !== undefined) setTopP(template.settings.topP);
                        if (template.settings.maxTokens !== undefined) setMaxTokens(template.settings.maxTokens);
                        if (template.settings.expertMode !== undefined) setExpertMode(template.settings.expertMode);
                        if (template.settings.thinkingEnabled !== undefined) setThinkingEnabled(template.settings.thinkingEnabled);
                    }

                    // Apply initial messages
                    if (template.initialMessages.length > 0) {
                        setHistory(template.initialMessages.map(m => ({
                            ...m,
                            isLoading: false
                        })));
                    }
                }}
                currentMessages={history}
                currentSystemPrompt={systemPrompt}
                currentSettings={{
                    temperature,
                    topP,
                    maxTokens,
                    expertMode,
                    thinkingEnabled
                }}
            />

            {/* A/B Testing Panel */}
            <ABTestingPanel
                isOpen={showABTesting}
                onClose={() => setShowABTesting(false)}
                onExecutePrompt={async (prompt, systemPrompt, modelId, temperature, topP, maxTokens) => {
                    // Create a temporary message array for the test
                    const testMessages: any[] = [];
                    if (systemPrompt) {
                        testMessages.push({ role: 'system', content: systemPrompt });
                    }
                    testMessages.push({ role: 'user', content: prompt });

                    // Use the current model or the specified one
                    const testModelId = modelId || currentModel || availableModels[0]?.id;
                    const testTemperature = temperature ?? 0.7;
                    const testTopP = topP ?? 1.0;
                    const testMaxTokens = maxTokens ?? 2000;

                    // Execute the prompt using the chat hook's internal method
                    // We'll need to create a wrapper that calls the API directly
                    try {
                        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                        let url = 'http://localhost:3000/v1/chat/completions';
                        let actualModelId = testModelId;

                        if (testModelId.startsWith('openrouter/') && openRouterApiKey) {
                            url = 'https://openrouter.ai/api/v1/chat/completions';
                            actualModelId = testModelId.replace('openrouter/', '');
                            headers['Authorization'] = `Bearer ${openRouterApiKey}`;
                            headers['HTTP-Referer'] = 'http://localhost:5173';
                            headers['X-Title'] = 'WinInferencer';
                        }

                        const response = await fetch(url, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                model: actualModelId,
                                messages: testMessages,
                                temperature: testTemperature,
                                top_p: testTopP,
                                max_tokens: testMaxTokens,
                                stream: false,
                            }),
                        });

                        if (!response.ok) {
                            throw new Error(`API error: ${response.statusText}`);
                        }

                        const data = await response.json();
                        const content = data.choices?.[0]?.message?.content || '';
                        const tokensUsed = data.usage?.total_tokens;

                        return { content, tokensUsed };
                    } catch (error) {
                        throw error;
                    }
                }}
                currentInput={input}
                currentContext={history}
            />

            {/* A/B Testing Panel */}
            <ABTestingPanel
                isOpen={showABTesting}
                onClose={() => setShowABTesting(false)}
                onExecutePrompt={async (prompt, systemPrompt, modelId, temperature, topP, maxTokens) => {
                    // Create a temporary message array for the test
                    const testMessages: any[] = [];
                    if (systemPrompt) {
                        testMessages.push({ role: 'system', content: systemPrompt });
                    }
                    testMessages.push({ role: 'user', content: prompt });

                    // Use the current model or the specified one
                    const testModelId = modelId || currentModel || availableModels[0]?.id;
                    const testTemperature = temperature ?? 0.7;
                    const testTopP = topP ?? 1.0;
                    const testMaxTokens = maxTokens ?? 2000;

                    // Execute the prompt using the API directly
                    try {
                        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                        let url = 'http://localhost:3000/v1/chat/completions';
                        let actualModelId = testModelId;

                        if (testModelId.startsWith('openrouter/') && openRouterApiKey) {
                            url = 'https://openrouter.ai/api/v1/chat/completions';
                            actualModelId = testModelId.replace('openrouter/', '');
                            headers['Authorization'] = `Bearer ${openRouterApiKey}`;
                            headers['HTTP-Referer'] = 'http://localhost:5173';
                            headers['X-Title'] = 'WinInferencer';
                        }

                        const response = await fetch(url, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                model: actualModelId,
                                messages: testMessages,
                                temperature: testTemperature,
                                top_p: testTopP,
                                max_tokens: testMaxTokens,
                                stream: false,
                            }),
                        });

                        if (!response.ok) {
                            throw new Error(`API error: ${response.statusText}`);
                        }

                        const data = await response.json();
                        const content = data.choices?.[0]?.message?.content || '';
                        const tokensUsed = data.usage?.total_tokens;

                        return { content, tokensUsed };
                    } catch (error) {
                        throw error;
                    }
                }}
                currentInput={input}
                currentContext={history}
            />

            {/* Prompt Optimization Panel */}
            <PromptOptimizationPanel
                isOpen={showPromptOptimization}
                onClose={() => setShowPromptOptimization(false)}
                initialPrompt={input}
                initialSystemPrompt={systemPrompt}
                onApplyOptimized={(optimizedPrompt, optimizedSystemPrompt) => {
                    setInput(optimizedPrompt);
                    if (optimizedSystemPrompt) {
                        setSystemPrompt(optimizedSystemPrompt);
                    }
                }}
            />

            {/* Calendar Schedule Dialog */}
            <CalendarScheduleDialog
                isOpen={showCalendarSchedule}
                onClose={() => setShowCalendarSchedule(false)}
                conversationTitle={savedSessions.find(s => s.id === sessionId)?.title || 'Conversation'}
                conversationSummary={history.length > 0 ? `Review conversation with ${history.length} messages` : undefined}
            />

            {/* Conversation Recommendations Panel */}
            <ConversationRecommendationsPanel
                isOpen={showRecommendations}
                onClose={() => setShowRecommendations(false)}
                currentSessionId={sessionId}
                currentMessage={input}
                conversationHistory={history}
                onSelectConversation={(sessionId) => {
                    loadSession(sessionId);
                    setShowRecommendations(false);
                }}
            />

            {/* Workflows Manager */}
            <WorkflowsManager
                isOpen={showWorkflows}
                onClose={() => setShowWorkflows(false)}
            />

            {/* API Playground */}
            <APIPlayground
                isOpen={showAPIPlayground}
                onClose={() => setShowAPIPlayground(false)}
            />

            {/* Plugin Manager */}
            <PluginManager
                isOpen={showPluginManager}
                onClose={() => setShowPluginManager(false)}
            />

            {/* Code Integration Panel */}
            <CodeIntegrationPanel
                isOpen={showCodeIntegration}
                onClose={() => {
                    setShowCodeIntegration(false);
                    setSelectedCode(null);
                }}
                code={selectedCode?.code}
                language={selectedCode?.language || 'javascript'}
                conversationHistory={history}
                onExecutePrompt={async (prompt, systemPrompt) => {
                    // Execute prompt using current model
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    let url = 'http://localhost:3000/v1/chat/completions';
                    let actualModelId = currentModel;
                    const openRouterApiKey = localStorage.getItem('openRouterApiKey');

                    if (currentModel.startsWith('openrouter/') && openRouterApiKey) {
                        url = 'https://openrouter.ai/api/v1/chat/completions';
                        actualModelId = currentModel.replace('openrouter/', '');
                        headers['Authorization'] = `Bearer ${openRouterApiKey}`;
                        headers['HTTP-Referer'] = 'http://localhost:5173';
                        headers['X-Title'] = 'WinInferencer';
                    }

                    const response = await fetch(url, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            model: actualModelId,
                            messages: [
                                ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                                { role: 'user', content: prompt },
                            ],
                            temperature,
                            top_p: topP,
                            max_tokens: maxTokens,
                            stream: false,
                        }),
                    });

                    const data = await response.json();
                    return { content: data.choices?.[0]?.message?.content || ''                     };
                }}
            />

            {/* Workspace Views */}
            <WorkspaceViewsPanel
                isOpen={showWorkspaceViews}
                onClose={() => setShowWorkspaceViews(false)}
                conversations={savedSessions.map(s => ({
                    id: s.id,
                    title: s.title,
                    messageCount: s.messageCount || 0,
                    lastActivity: s.lastMessageTime || s.createdAt,
                    pinned: s.pinned,
                    archived: false,
                    category: undefined,
                    tags: [],
                    model: undefined,
                }))}
                onSelectConversation={(id) => {
                    loadSession(id);
                    setShowWorkspaceViews(false);
                }}
            />

            {/* Interactive Tutorial */}
            {showTutorial && currentTutorial && (
                <InteractiveTutorial
                    tutorial={currentTutorial}
                    onComplete={() => {
                        setShowTutorial(false);
                        setCurrentTutorial(null);
                        onboardingService.completeOnboarding();
                    }}
                    onSkip={() => {
                        setShowTutorial(false);
                        setCurrentTutorial(null);
                    }}
                />
            )}

            {/* Brain-Computer Interface */}
            <BCIPanel
                isOpen={showBCI}
                onClose={() => setShowBCI(false)}
            />

            {/* Multi-Modal AI */}
            <MultiModalAIPanel
                isOpen={showMultiModal}
                onClose={() => setShowMultiModal(false)}
                onSend={async (media, text) => {
                    // Process multi-modal request
                    const response = await multiModalAIService.sendMultiModalRequest(
                        { text, media },
                        async (prompt, systemPrompt) => {
                            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                            let url = 'http://localhost:3000/v1/chat/completions';
                            let actualModelId = currentModel;
                            const openRouterApiKey = localStorage.getItem('openRouterApiKey');

                            if (currentModel.startsWith('openrouter/') && openRouterApiKey) {
                                url = 'https://openrouter.ai/api/v1/chat/completions';
                                actualModelId = currentModel.replace('openrouter/', '');
                                headers['Authorization'] = `Bearer ${openRouterApiKey}`;
                                headers['HTTP-Referer'] = 'http://localhost:5173';
                                headers['X-Title'] = 'WinInferencer';
                            }

                            const response = await fetch(url, {
                                method: 'POST',
                                headers,
                                body: JSON.stringify({
                                    model: actualModelId,
                                    messages: [
                                        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                                        { role: 'user', content: prompt },
                                    ],
                                    temperature,
                                    top_p: topP,
                                    max_tokens: maxTokens,
                                    stream: false,
                                }),
                            });

                            const data = await response.json();
                            return { content: data.choices?.[0]?.message?.content || '' };
                        }
                    );
                    // Add response to conversation
                    setHistory(prev => [...prev, {
                        role: 'assistant',
                        content: response.content,
                        isLoading: false,
                    }]);
                }}
            />

            {/* Real-Time Collaboration */}
            <RealTimeCollaborationPanel
                isOpen={showCollaboration}
                onClose={() => setShowCollaboration(false)}
            />

            {/* Blockchain Integration */}
            <BlockchainPanel
                isOpen={showBlockchain}
                onClose={() => setShowBlockchain(false)}
                sessionId={sessionId}
                conversationData={history}
            />

            {/* AI Agents */}
            <AIAgentsPanel
                isOpen={showAIAgents}
                onClose={() => setShowAIAgents(false)}
                onExecutePrompt={async (prompt, systemPrompt) => {
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    let url = 'http://localhost:3000/v1/chat/completions';
                    let actualModelId = currentModel;
                    const openRouterApiKey = localStorage.getItem('openRouterApiKey');

                    if (currentModel.startsWith('openrouter/') && openRouterApiKey) {
                        url = 'https://openrouter.ai/api/v1/chat/completions';
                        actualModelId = currentModel.replace('openrouter/', '');
                        headers['Authorization'] = `Bearer ${openRouterApiKey}`;
                        headers['HTTP-Referer'] = 'http://localhost:5173';
                        headers['X-Title'] = 'WinInferencer';
                    }

                    const response = await fetch(url, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            model: actualModelId,
                            messages: [
                                ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                                { role: 'user', content: prompt },
                            ],
                            temperature,
                            top_p: topP,
                            max_tokens: maxTokens,
                            stream: false,
                        }),
                    });

                    const data = await response.json();
                    return { content: data.choices?.[0]?.message?.content || '' };
                }}
            />

            {/* Federated Learning */}
            <FederatedLearningPanel
                isOpen={showFederatedLearning}
                onClose={() => setShowFederatedLearning(false)}
            />
        </div>
    );
};

export default Chat;