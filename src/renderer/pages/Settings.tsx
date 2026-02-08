import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Save, Key, Globe, ShieldCheck, Server, Plus, Trash2, Edit2, Check, X,
    Palette, Database, DollarSign, Activity, Settings as SettingsIcon, Sparkles, Plug, Download,
    Shield, Lock, RefreshCw, BarChart3, MessageSquare, Mail, Calendar, Code, Eye, GraduationCap
} from 'lucide-react';
import MCPSettings from '../components/MCPSettings';
import ModelDownloader from '../components/ModelDownloader';
import { ThemeService, ThemeConfig } from '../services/theme';
import { githubService } from '../services/github';
import { notionService } from '../services/notion';
import { webhookService, WebhookConfig } from '../services/webhooks';
import { privacyService } from '../services/privacy';
import { encryptionService } from '../services/encryption';
import { slackService, SlackConfig } from '../services/slack';
import { discordService, DiscordConfig } from '../services/discord';
import { emailService, EmailConfig } from '../services/email';
import { calendarService, CalendarConfig } from '../services/calendar';
import { apiAccessService } from '../services/apiAccess';
import { ConversationAnalyticsDashboard } from '../components/ConversationAnalyticsDashboard';
import { AccessibilitySettingsContent } from '../components/AccessibilitySettingsContent';
import { InteractiveTutorial } from '../components/InteractiveTutorial';
import { PluginManager } from '../components/PluginManager';
import { onboardingService } from '../services/onboarding';
import { credentialService } from '../services/credentials';

interface ModelEndpoint {
    id: string;
    name: string;
    url: string;
    type: 'lm-studio' | 'openai-compatible' | 'ollama';
}

interface SystemPreset {
    id: string;
    name: string;
    prompt: string;
}

const Settings: React.FC = () => {
    // API Keys
    const [openRouterKey, setOpenRouterKey] = useState('');
    const [githubKey, setGithubKey] = useState('');
    const [notionKey, setNotionKey] = useState('');
    const [notionDatabaseId, setNotionDatabaseId] = useState('');

    // Model Endpoints
    const [endpoints, setEndpoints] = useState<ModelEndpoint[]>([]);
    const [newEndpoint, setNewEndpoint] = useState<Partial<ModelEndpoint>>({ type: 'lm-studio', name: '', url: '' });
    const [showAddEndpoint, setShowAddEndpoint] = useState(false);

    // System Presets
    const [presets, setPresets] = useState<SystemPreset[]>([]);
    const [editingPreset, setEditingPreset] = useState<string | null>(null);
    const [newPreset, setNewPreset] = useState<Partial<SystemPreset>>({ name: '', prompt: '' });
    const [showAddPreset, setShowAddPreset] = useState(false);

    // Usage Tracking (mock data for now)
    const [usageStats, setUsageStats] = useState({
        totalTokens: 0,
        estimatedCost: 0,
        sessionCount: 0
    });

    // Active Tab
    const [activeTab, setActiveTab] = useState<'api' | 'endpoints' | 'presets' | 'usage' | 'mcp' | 'downloader' | 'appearance' | 'webhooks' | 'privacy' | 'analytics' | 'integrations' | 'accessibility' | 'onboarding' | 'plugins'>('api');
    
    // Conversation Analytics
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showPluginManager, setShowPluginManager] = useState(false);
    
    // Privacy & Security
    const [privacyMode, setPrivacyMode] = useState(false);
    const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
    const [appVersion, setAppVersion] = useState('');
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    
    // Webhooks
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [newWebhook, setNewWebhook] = useState({ name: '', url: '', enabled: true, events: ['conversation_complete'] });
    const [showAddWebhook, setShowAddWebhook] = useState(false);
    
    // Theme
    const themeService = ThemeService.getInstance();
    const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(themeService.getCurrentTheme());
    const [availableThemes, setAvailableThemes] = useState<ThemeConfig[]>(themeService.getAllThemes());
    
    // Preferences
    const [preferences, setPreferences] = useState({
        defaultModel: localStorage.getItem('app_default_model') || '',
        codeFont: localStorage.getItem('app_code_font') || 'JetBrains Mono',
        chatFont: localStorage.getItem('app_chat_font') || 'Inter',
        codeFontSize: parseInt(localStorage.getItem('app_code_font_size') || '13'),
        chatFontSize: parseInt(localStorage.getItem('app_chat_font_size') || '14'),
        layoutMode: localStorage.getItem('app_layout_mode') || 'normal', // normal, compact, wide
        autoScroll: localStorage.getItem('app_auto_scroll') !== 'false', // default true
        notifications: localStorage.getItem('app_notifications') !== 'false', // default true
    });

    useEffect(() => {
        // Load saved data
        let isMounted = true;
        const loadCredentials = async () => {
            try {
                const [key, ghKey, nKey] = await Promise.all([
                    credentialService.getOpenRouterApiKey(),
                    credentialService.getGithubApiKey(),
                    credentialService.getNotionApiKey(),
                ]);

                if (!isMounted) return;
                if (key) setOpenRouterKey(key);
                if (ghKey) setGithubKey(ghKey);
                if (nKey) setNotionKey(nKey);
            } catch (error) {
                console.error('Failed to load saved credentials:', error);
            }
        };

        void loadCredentials();
        
        const nDbId = localStorage.getItem('notion_database_id');
        if (nDbId) setNotionDatabaseId(nDbId);

        const savedEndpoints = localStorage.getItem('modelEndpoints');
        if (savedEndpoints) setEndpoints(JSON.parse(savedEndpoints));
        
        // Load webhooks
        setWebhooks(webhookService.getWebhooks());
        
        // Load privacy settings
        const privacySettings = privacyService.getSettings();
        setPrivacyMode(privacySettings.privacyMode);
        setAnalyticsEnabled(privacySettings.analyticsEnabled);
        
        // Load app version
        if (window.electronAPI?.getAppVersion) {
            window.electronAPI.getAppVersion().then(version => setAppVersion(version));
        }
        
        // Listen for update notifications
        if (window.electronAPI?.onUpdateDownloaded) {
            window.electronAPI.onUpdateDownloaded((event: any, info: any) => {
                setUpdateAvailable(true);
                setUpdateInfo(info);
                toast.success(`Update ${info.version} downloaded! Restart to install.`);
            });
        }

        const savedPresets = localStorage.getItem('systemPresets');
        if (savedPresets) {
            setPresets(JSON.parse(savedPresets));
        } else {
            // Default presets
            setPresets([
                { id: '1', name: 'Assistant', prompt: 'You are a helpful assistant.' },
                { id: '2', name: 'Coder', prompt: 'You are an expert software engineer. Write clean, efficient, well-documented code.' },
                { id: '3', name: 'Creative', prompt: 'You are a creative writer. Use vivid imagery and engaging language.' }
            ]);
        }

        // Load usage stats
        const savedUsage = localStorage.getItem('usageStats');
        if (savedUsage) setUsageStats(JSON.parse(savedUsage));
        
        // Subscribe to theme changes
        const handleThemeChange = (theme: ThemeConfig) => {
            setCurrentTheme(theme);
        };
        themeService.subscribe(handleThemeChange);
        
        return () => {
            isMounted = false;
            themeService.unsubscribe(handleThemeChange);
        };
    }, []);

    const saveOpenRouterKey = async () => {
        if (!openRouterKey.trim()) {
            await credentialService.clearOpenRouterApiKey();
            toast.success('OpenRouter API key cleared');
            return;
        }

        await credentialService.setOpenRouterApiKey(openRouterKey);
        toast.success('OpenRouter API key saved securely');
    };

    const saveGithubKey = async () => {
        await githubService.setApiKey(githubKey);
        toast.success(githubKey.trim() ? 'GitHub API key saved securely' : 'GitHub API key cleared');
    };

    const saveNotionConfig = async () => {
        if (!notionKey || !notionDatabaseId) {
            toast.error('Both API key and Database ID are required');
            return;
        }
        await notionService.setConfig(notionKey, notionDatabaseId);
        toast.success('Notion configuration saved securely');
    };

    // Endpoint Management
    const addEndpoint = () => {
        if (!newEndpoint.name || !newEndpoint.url) {
            toast.error('Name and URL are required');
            return;
        }
        const endpoint: ModelEndpoint = {
            id: crypto.randomUUID(),
            name: newEndpoint.name,
            url: newEndpoint.url,
            type: newEndpoint.type as ModelEndpoint['type']
        };
        const updated = [...endpoints, endpoint];
        setEndpoints(updated);
        localStorage.setItem('modelEndpoints', JSON.stringify(updated));
        setNewEndpoint({ type: 'lm-studio', name: '', url: '' });
        setShowAddEndpoint(false);
        toast.success('Endpoint added!');
    };

    const deleteEndpoint = (id: string) => {
        const updated = endpoints.filter(e => e.id !== id);
        setEndpoints(updated);
        localStorage.setItem('modelEndpoints', JSON.stringify(updated));
        toast.success('Endpoint removed');
    };

    // Preset Management
    const addPreset = () => {
        if (!newPreset.name || !newPreset.prompt) {
            toast.error('Name and prompt are required');
            return;
        }
        const preset: SystemPreset = {
            id: crypto.randomUUID(),
            name: newPreset.name,
            prompt: newPreset.prompt
        };
        const updated = [...presets, preset];
        setPresets(updated);
        localStorage.setItem('systemPresets', JSON.stringify(updated));
        setNewPreset({ name: '', prompt: '' });
        setShowAddPreset(false);
        toast.success('Preset saved!');
    };

    const updatePreset = (id: string, prompt: string) => {
        const updated = presets.map(p => p.id === id ? { ...p, prompt } : p);
        setPresets(updated);
        localStorage.setItem('systemPresets', JSON.stringify(updated));
        setEditingPreset(null);
        toast.success('Preset updated!');
    };

    const deletePreset = (id: string) => {
        const updated = presets.filter(p => p.id !== id);
        setPresets(updated);
        localStorage.setItem('systemPresets', JSON.stringify(updated));
        toast.success('Preset deleted');
    };

    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === id
                ? 'text-primary border-primary bg-primary/5'
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-3">
                    <SettingsIcon className="text-primary" size={28} />
                    Settings Dashboard
                </h2>
                <p className="text-slate-500 mt-1">Configure your API keys, model endpoints, and preferences.</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/30 overflow-x-auto">
                <TabButton id="api" label="API Keys" icon={Key} />
                <TabButton id="endpoints" label="Endpoints" icon={Server} />
                <TabButton id="presets" label="Presets" icon={Sparkles} />
                <TabButton id="appearance" label="Appearance" icon={Palette} />
                <TabButton id="mcp" label="MCP" icon={Plug} />
                <TabButton id="downloader" label="Downloader" icon={Download} />
                <TabButton id="webhooks" label="Webhooks" icon={Activity} />
                <TabButton id="privacy" label="Privacy & Security" icon={Shield} />
                <TabButton id="analytics" label="Analytics" icon={BarChart3} />
                <TabButton id="plugins" label="Plugins" icon={Plug} />
                <TabButton id="integrations" label="Integrations" icon={Plug} />
                <TabButton id="accessibility" label="Accessibility" icon={Eye} />
                <TabButton id="onboarding" label="Onboarding" icon={GraduationCap} />
                <TabButton id="usage" label="Usage" icon={DollarSign} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {activeTab === 'plugins' && (
                    <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <Plug className="text-primary" size={22} />
                                Plugin System
                            </h3>
                            <p className="text-slate-400 mb-4">
                                Install and manage plugins that add command palette actions, custom export formats, and UI extensions.
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => setShowPluginManager(true)}
                                    className="px-4 py-2 bg-primary text-slate-900 font-semibold rounded-lg hover:brightness-110 transition-all"
                                >
                                    Open Plugin Manager
                                </button>
                                <span className="text-xs text-slate-500">
                                    Plugin API docs: <code>docs/project-history/PLUGIN_API.md</code>
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* API Keys Tab */}
                {activeTab === 'api' && (
                    <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-right-2">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Globe className="text-primary" size={24} /> OpenRouter Integration
                            </h3>
                            <p className="text-slate-400 mb-6">
                                Connect to OpenRouter to access hundreds of top-tier models like GPT-4, Claude 3, and Llama 3.
                            </p>

                            <div className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                        <Key size={16} /> API Key
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="password"
                                            value={openRouterKey}
                                            onChange={(e) => setOpenRouterKey(e.target.value)}
                                            placeholder="sk-or-..."
                                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none placeholder-slate-600 font-mono"
                                        />
                                        <button
                                            onClick={saveOpenRouterKey}
                                            className="px-6 py-3 bg-primary text-slate-900 font-bold rounded-lg hover:brightness-110 transition-all flex items-center gap-2"
                                        >
                                            <Save size={18} />
                                            Save
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Your key is stored locally and never sent to our servers.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* GitHub Integration */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg mt-6">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Globe className="text-primary" size={24} /> GitHub Integration
                            </h3>
                            <p className="text-slate-400 mb-6">
                                Connect to GitHub to fetch file contents from repositories and create gists from code blocks.
                            </p>

                            <div className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                        <Key size={16} /> GitHub Personal Access Token
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="password"
                                            value={githubKey}
                                            onChange={(e) => setGithubKey(e.target.value)}
                                            placeholder="ghp_..."
                                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none placeholder-slate-600 font-mono"
                                        />
                                        <button
                                            onClick={saveGithubKey}
                                            className="px-6 py-3 bg-primary text-slate-900 font-bold rounded-lg hover:brightness-110 transition-all flex items-center gap-2"
                                        >
                                            <Save size={18} />
                                            Save
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Create a token at <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">github.com/settings/tokens</a>. Required scopes: <code className="bg-slate-800 px-1 rounded">gist</code> and <code className="bg-slate-800 px-1 rounded">repo</code> (for private repos).
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notion Integration */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg mt-6">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Database className="text-primary" size={24} /> Notion Integration
                            </h3>
                            <p className="text-slate-400 mb-6">
                                Save conversations directly to your Notion workspace. Create a database in Notion and connect it here.
                            </p>

                            <div className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                        <Key size={16} /> Notion API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={notionKey}
                                        onChange={(e) => setNotionKey(e.target.value)}
                                        placeholder="secret_..."
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none placeholder-slate-600 font-mono"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Create an integration at <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">notion.so/my-integrations</a>
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                        <Database size={16} /> Database ID
                                    </label>
                                    <input
                                        type="text"
                                        value={notionDatabaseId}
                                        onChange={(e) => setNotionDatabaseId(e.target.value)}
                                        placeholder="32-character database ID"
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none placeholder-slate-600 font-mono"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Get the database ID from the Notion database URL. The ID is the 32-character string after the workspace name.
                                    </p>
                                </div>
                                <button
                                    onClick={saveNotionConfig}
                                    className="px-6 py-3 bg-primary text-slate-900 font-bold rounded-lg hover:brightness-110 transition-all flex items-center gap-2 w-full justify-center"
                                >
                                    <Save size={18} />
                                    Save Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Model Endpoints Tab */}
                {activeTab === 'endpoints' && (
                    <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white">Model Endpoints</h3>
                                <p className="text-slate-500 text-sm">Configure custom LLM endpoints (LM Studio, Ollama, etc.)</p>
                            </div>
                            <button
                                onClick={() => setShowAddEndpoint(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg hover:brightness-110 transition-all"
                            >
                                <Plus size={16} /> Add Endpoint
                            </button>
                        </div>

                        {/* Add Endpoint Form */}
                        {showAddEndpoint && (
                            <div className="bg-slate-900 border border-primary/30 rounded-xl p-6 animate-in slide-in-from-top-2">
                                <h4 className="font-bold text-white mb-4">New Endpoint</h4>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 block mb-1">Name</label>
                                        <input
                                            value={newEndpoint.name}
                                            onChange={e => setNewEndpoint({ ...newEndpoint, name: e.target.value })}
                                            placeholder="My LM Studio"
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 block mb-1">Type</label>
                                        <select
                                            value={newEndpoint.type}
                                            onChange={e => setNewEndpoint({ ...newEndpoint, type: e.target.value as ModelEndpoint['type'] })}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                                        >
                                            <option value="lm-studio">LM Studio</option>
                                            <option value="openai-compatible">OpenAI Compatible</option>
                                            <option value="ollama">Ollama</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-slate-400 block mb-1">URL</label>
                                    <input
                                        value={newEndpoint.url}
                                        onChange={e => setNewEndpoint({ ...newEndpoint, url: e.target.value })}
                                        placeholder="http://localhost:1234/v1"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setShowAddEndpoint(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                                    <button onClick={addEndpoint} className="px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg">Save</button>
                                </div>
                            </div>
                        )}

                        {/* Endpoints List */}
                        <div className="space-y-3">
                            {/* Default LM Studio Entry */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                        <Server size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">Local LM Studio</div>
                                        <div className="text-xs text-slate-500 font-mono">http://localhost:3000</div>
                                    </div>
                                </div>
                                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold">Default</span>
                            </div>

                            {endpoints.map(ep => (
                                <div key={ep.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center group">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                                            <Server size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{ep.name}</div>
                                            <div className="text-xs text-slate-500 font-mono">{ep.url}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">{ep.type}</span>
                                        <button
                                            onClick={() => deleteEndpoint(ep.id)}
                                            className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* System Presets Tab */}
                {activeTab === 'presets' && (
                    <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white">System Prompt Presets</h3>
                                <p className="text-slate-500 text-sm">Create reusable system prompts for different use cases.</p>
                            </div>
                            <button
                                onClick={() => setShowAddPreset(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg hover:brightness-110 transition-all"
                            >
                                <Plus size={16} /> New Preset
                            </button>
                        </div>

                        {/* Add Preset Form */}
                        {showAddPreset && (
                            <div className="bg-slate-900 border border-primary/30 rounded-xl p-6 animate-in slide-in-from-top-2">
                                <h4 className="font-bold text-white mb-4">New System Preset</h4>
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-slate-400 block mb-1">Name</label>
                                    <input
                                        value={newPreset.name}
                                        onChange={e => setNewPreset({ ...newPreset, name: e.target.value })}
                                        placeholder="My Expert Persona"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-slate-400 block mb-1">System Prompt</label>
                                    <textarea
                                        value={newPreset.prompt}
                                        onChange={e => setNewPreset({ ...newPreset, prompt: e.target.value })}
                                        placeholder="You are an expert..."
                                        rows={4}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setShowAddPreset(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                                    <button onClick={addPreset} className="px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg">Save</button>
                                </div>
                            </div>
                        )}

                        {/* Presets List */}
                        <div className="space-y-3">
                            {presets.map(preset => (
                                <div key={preset.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <Sparkles size={16} className="text-primary" />
                                            <span className="font-bold text-white">{preset.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingPreset(preset.id)}
                                                className="p-1.5 text-slate-500 hover:text-blue-400"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => deletePreset(preset.id)}
                                                className="p-1.5 text-slate-500 hover:text-red-400"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    {editingPreset === preset.id ? (
                                        <div className="mt-2">
                                            <textarea
                                                defaultValue={preset.prompt}
                                                id={`preset-${preset.id}`}
                                                rows={3}
                                                className="w-full bg-slate-950 border border-primary/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none"
                                            />
                                            <div className="flex gap-2 justify-end mt-2">
                                                <button onClick={() => setEditingPreset(null)} className="px-3 py-1 text-slate-400 text-sm">Cancel</button>
                                                <button
                                                    onClick={() => {
                                                        const el = document.getElementById(`preset-${preset.id}`) as HTMLTextAreaElement;
                                                        updatePreset(preset.id, el.value);
                                                    }}
                                                    className="px-3 py-1 bg-primary text-slate-900 text-sm font-bold rounded"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-sm line-clamp-2">{preset.prompt}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                    <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Theme Selection</h3>
                            <p className="text-slate-500 text-sm">Choose a theme that matches your style and workflow.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {availableThemes.map(theme => (
                                <button
                                    key={theme.id}
                                    onClick={() => {
                                        themeService.setTheme(theme.id);
                                        // Force a re-render by updating state
                                        setCurrentTheme(themeService.getCurrentTheme());
                                        toast.success(`Switched to ${theme.name}`);
                                    }}
                                    className={`relative p-4 rounded-xl border-2 transition-all text-left group ${
                                        currentTheme.id === theme.id
                                            ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                                            : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800/50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-bold text-white">{theme.name}</span>
                                        {currentTheme.id === theme.id && (
                                            <Check size={18} className="text-primary" />
                                        )}
                                    </div>
                                    <div className="flex gap-2 mb-3">
                                        <div
                                            className="w-8 h-8 rounded"
                                            style={{ backgroundColor: theme.primaryColor }}
                                            title="Primary"
                                        />
                                        <div
                                            className="w-8 h-8 rounded"
                                            style={{ backgroundColor: theme.backgroundColor }}
                                            title="Background"
                                        />
                                        <div
                                            className="w-8 h-8 rounded"
                                            style={{ backgroundColor: theme.accentColor }}
                                            title="Accent"
                                        />
                                        <div
                                            className="w-8 h-8 rounded border border-slate-700"
                                            style={{ backgroundColor: theme.surfaceColor }}
                                            title="Surface"
                                        />
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {theme.id === 'oled-dark' && 'Pure black for OLED displays'}
                                        {theme.id === 'deep-purple' && 'Rich purple tones for creativity'}
                                        {theme.id === 'forest-green' && 'Natural green palette'}
                                        {theme.id === 'solarized-dark' && 'Classic Solarized color scheme'}
                                        {theme.id === 'light' && 'Clean light mode for daytime'}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <p className="text-xs text-slate-500">
                                💡 Themes are applied instantly. Your selection is saved automatically.
                            </p>
                        </div>

                        {/* Preferences */}
                        <div className="space-y-6 mt-8">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Preferences</h3>
                                <p className="text-slate-500 text-sm">Customize your app experience.</p>
                            </div>

                            {/* Default Model */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                                <label className="block text-sm font-bold text-white mb-3">Default Model</label>
                                <select
                                    value={preferences.defaultModel}
                                    onChange={(e) => {
                                        const newPrefs = { ...preferences, defaultModel: e.target.value };
                                        setPreferences(newPrefs);
                                        localStorage.setItem('app_default_model', e.target.value);
                                        toast.success('Default model saved');
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                                >
                                    <option value="">Use last selected</option>
                                    {/* Models would be loaded from availableModels hook if needed */}
                                </select>
                                <p className="text-xs text-slate-500 mt-2">Model to use when starting a new chat</p>
                            </div>

                            {/* Font Settings */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                                <label className="block text-sm font-bold text-white">Font Settings</label>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Chat Font</label>
                                        <select
                                            value={preferences.chatFont}
                                            onChange={(e) => {
                                                const newPrefs = { ...preferences, chatFont: e.target.value };
                                                setPreferences(newPrefs);
                                                localStorage.setItem('app_chat_font', e.target.value);
                                            }}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                                        >
                                            <option value="Inter">Inter</option>
                                            <option value="Roboto">Roboto</option>
                                            <option value="Open Sans">Open Sans</option>
                                            <option value="Lato">Lato</option>
                                            <option value="Poppins">Poppins</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Chat Font Size</label>
                                        <input
                                            type="number"
                                            min="10"
                                            max="20"
                                            value={preferences.chatFontSize}
                                            onChange={(e) => {
                                                const newPrefs = { ...preferences, chatFontSize: parseInt(e.target.value) };
                                                setPreferences(newPrefs);
                                                localStorage.setItem('app_chat_font_size', e.target.value);
                                            }}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Code Font</label>
                                        <select
                                            value={preferences.codeFont}
                                            onChange={(e) => {
                                                const newPrefs = { ...preferences, codeFont: e.target.value };
                                                setPreferences(newPrefs);
                                                localStorage.setItem('app_code_font', e.target.value);
                                            }}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                                        >
                                            <option value="JetBrains Mono">JetBrains Mono</option>
                                            <option value="Fira Code">Fira Code</option>
                                            <option value="Source Code Pro">Source Code Pro</option>
                                            <option value="Consolas">Consolas</option>
                                            <option value="Monaco">Monaco</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Code Font Size</label>
                                        <input
                                            type="number"
                                            min="10"
                                            max="18"
                                            value={preferences.codeFontSize}
                                            onChange={(e) => {
                                                const newPrefs = { ...preferences, codeFontSize: parseInt(e.target.value) };
                                                setPreferences(newPrefs);
                                                localStorage.setItem('app_code_font_size', e.target.value);
                                            }}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Layout Options */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                                <label className="block text-sm font-bold text-white">Layout Options</label>
                                
                                <div>
                                    <label className="block text-xs text-slate-400 mb-2">Layout Mode</label>
                                    <div className="flex gap-2">
                                        {['normal', 'compact', 'wide'].map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => {
                                                    const newPrefs = { ...preferences, layoutMode: mode };
                                                    setPreferences(newPrefs);
                                                    localStorage.setItem('app_layout_mode', mode);
                                                    toast.success(`Switched to ${mode} mode`);
                                                }}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    preferences.layoutMode === mode
                                                        ? 'bg-primary text-white'
                                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                }`}
                                            >
                                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Behavior Preferences */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                                <label className="block text-sm font-bold text-white">Behavior</label>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-white font-medium">Auto-scroll to new messages</div>
                                        <div className="text-xs text-slate-500">Automatically scroll when new messages arrive</div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newPrefs = { ...preferences, autoScroll: !preferences.autoScroll };
                                            setPreferences(newPrefs);
                                            localStorage.setItem('app_auto_scroll', String(newPrefs.autoScroll));
                                        }}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            preferences.autoScroll ? 'bg-primary' : 'bg-slate-700'
                                        }`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                            preferences.autoScroll ? 'translate-x-6' : 'translate-x-0'
                                        }`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-white font-medium">Desktop Notifications</div>
                                        <div className="text-xs text-slate-500">Show notifications for long responses</div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newPrefs = { ...preferences, notifications: !preferences.notifications };
                                            setPreferences(newPrefs);
                                            localStorage.setItem('app_notifications', String(newPrefs.notifications));
                                        }}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            preferences.notifications ? 'bg-primary' : 'bg-slate-700'
                                        }`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                            preferences.notifications ? 'translate-x-6' : 'translate-x-0'
                                        }`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Webhooks Tab */}
                {activeTab === 'webhooks' && (
                    <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white">Webhooks</h3>
                                <p className="text-slate-500 text-sm">Configure webhooks to receive notifications when conversations complete</p>
                            </div>
                            <button
                                onClick={() => setShowAddWebhook(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg hover:brightness-110 transition-all"
                            >
                                <Plus size={16} /> Add Webhook
                            </button>
                        </div>

                        {/* Add Webhook Form */}
                        {showAddWebhook && (
                            <div className="bg-slate-900 border border-primary/30 rounded-xl p-6 animate-in slide-in-from-top-2">
                                <h4 className="font-bold text-white mb-4">New Webhook</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 block mb-1">Name</label>
                                        <input
                                            value={newWebhook.name}
                                            onChange={e => setNewWebhook({ ...newWebhook, name: e.target.value })}
                                            placeholder="My Webhook"
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 block mb-1">URL</label>
                                        <input
                                            value={newWebhook.url}
                                            onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })}
                                            placeholder="https://example.com/webhook"
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 block mb-2">Events</label>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-sm text-slate-300">
                                                <input
                                                    type="checkbox"
                                                    checked={newWebhook.events.includes('conversation_complete')}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setNewWebhook({ ...newWebhook, events: [...newWebhook.events, 'conversation_complete'] });
                                                        } else {
                                                            setNewWebhook({ ...newWebhook, events: newWebhook.events.filter(e => e !== 'conversation_complete') });
                                                        }
                                                    }}
                                                    className="rounded"
                                                />
                                                Conversation Complete
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setShowAddWebhook(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                                        <button
                                            onClick={() => {
                                                if (!newWebhook.name || !newWebhook.url) {
                                                    toast.error('Name and URL are required');
                                                    return;
                                                }
                                                webhookService.addWebhook(newWebhook);
                                                setWebhooks(webhookService.getWebhooks());
                                                setNewWebhook({ name: '', url: '', enabled: true, events: ['conversation_complete'] });
                                                setShowAddWebhook(false);
                                                toast.success('Webhook added!');
                                            }}
                                            className="px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Webhooks List */}
                        <div className="space-y-3">
                            {webhooks.length === 0 ? (
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                                    <Activity size={32} className="mx-auto text-slate-600 mb-3" />
                                    <p className="text-slate-500">No webhooks configured</p>
                                    <p className="text-xs text-slate-600 mt-1">Add a webhook to receive notifications</p>
                                </div>
                            ) : (
                                webhooks.map(webhook => (
                                    <div key={webhook.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${webhook.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                                <Activity size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{webhook.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">{webhook.url}</div>
                                                <div className="text-xs text-slate-600 mt-1">
                                                    Events: {webhook.events.join(', ')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    webhookService.updateWebhook(webhook.id, { enabled: !webhook.enabled });
                                                    setWebhooks(webhookService.getWebhooks());
                                                    toast.success(webhook.enabled ? 'Webhook disabled' : 'Webhook enabled');
                                                }}
                                                className={`px-3 py-1 text-xs rounded ${webhook.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}
                                            >
                                                {webhook.enabled ? 'Enabled' : 'Disabled'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    webhookService.deleteWebhook(webhook.id);
                                                    setWebhooks(webhookService.getWebhooks());
                                                    toast.success('Webhook deleted');
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Privacy & Security Tab */}
                {activeTab === 'privacy' && (
                    <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Privacy & Security</h3>
                            <p className="text-slate-500 text-sm">Control data collection, encryption, and app updates</p>
                        </div>

                        {/* Privacy Mode */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                                        <Shield size={20} className="text-primary" /> Privacy Mode
                                    </h4>
                                    <p className="text-sm text-slate-400">Disable all analytics and telemetry when enabled</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={privacyMode}
                                        onChange={(e) => {
                                            const enabled = e.target.checked;
                                            setPrivacyMode(enabled);
                                            if (enabled) {
                                                privacyService.enablePrivacyMode();
                                                setAnalyticsEnabled(false);
                                                toast.success('Privacy mode enabled - all analytics disabled');
                                            } else {
                                                privacyService.disablePrivacyMode();
                                                setAnalyticsEnabled(true);
                                                toast.success('Privacy mode disabled');
                                            }
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        </div>

                        {/* Analytics Toggle */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                                        <Activity size={20} className="text-primary" /> Analytics
                                    </h4>
                                    <p className="text-sm text-slate-400">Track usage statistics and token counts</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={analyticsEnabled && !privacyMode}
                                        disabled={privacyMode}
                                        onChange={(e) => {
                                            const enabled = e.target.checked;
                                            setAnalyticsEnabled(enabled);
                                            if (enabled) {
                                                privacyService.enableAnalytics();
                                            } else {
                                                privacyService.disableAnalytics();
                                            }
                                            toast.success(`Analytics ${enabled ? 'enabled' : 'disabled'}`);
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                                </label>
                            </div>
                            {privacyMode && (
                                <p className="text-xs text-slate-500 mt-2">Analytics are disabled when Privacy Mode is enabled</p>
                            )}
                        </div>

                        {/* Encryption */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                <Lock size={20} className="text-primary" /> Data Encryption
                            </h4>
                            <p className="text-sm text-slate-400 mb-4">
                                Sensitive data (API keys, tokens) can be encrypted at rest using AES-GCM encryption.
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg">
                                    <span className="text-sm text-slate-300">Encryption Available</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${encryptionService.isAvailable() ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {encryptionService.isAvailable() ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                {!encryptionService.isAvailable() && (
                                    <p className="text-xs text-slate-500">Web Crypto API not available in this environment</p>
                                )}
                            </div>
                        </div>

                        {/* Secure Wipe */}
                        <div className="bg-slate-900 border border-red-500/30 rounded-xl p-6">
                            <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                <Trash2 size={20} className="text-red-400" /> Secure Wipe
                            </h4>
                            <p className="text-sm text-slate-400 mb-4">
                                Permanently delete all conversation data, API keys, and settings. This action cannot be undone.
                            </p>
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to permanently delete ALL data? This cannot be undone.')) {
                                        // Clear all localStorage
                                        localStorage.clear();
                                        // Clear encryption key
                                        encryptionService.clearKey();
                                        toast.success('All data wiped. Please restart the app.');
                                        setTimeout(() => {
                                            window.location.reload();
                                        }, 2000);
                                    }
                                }}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded-lg transition-colors border border-red-500/30"
                            >
                                Wipe All Data
                            </button>
                        </div>

                        {/* App Updates */}
                        {appVersion && (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                                <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                    <RefreshCw size={20} className="text-primary" /> App Updates
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg">
                                        <span className="text-sm text-slate-300">Current Version</span>
                                        <span className="text-sm font-mono text-slate-400">{appVersion}</span>
                                    </div>
                                    {updateAvailable && updateInfo && (
                                        <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                                            <p className="text-sm text-primary font-bold mb-2">Update Available: {updateInfo.version}</p>
                                            <button
                                                onClick={async () => {
                                                    if (window.electronAPI?.quitAndInstall) {
                                                        await window.electronAPI.quitAndInstall();
                                                    }
                                                }}
                                                className="px-4 py-2 bg-primary text-slate-900 font-bold rounded-lg hover:brightness-110 transition-all"
                                            >
                                                Restart & Install
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={async () => {
                                            if (window.electronAPI?.checkForUpdates) {
                                                const result = await window.electronAPI.checkForUpdates();
                                                if (result.available) {
                                                    toast.success(`Update available: ${result.version}`);
                                                    setUpdateAvailable(true);
                                                } else {
                                                    toast.info(result.message || 'No updates available');
                                                }
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors"
                                    >
                                        Check for Updates
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Conversation Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Conversation Analytics</h3>
                            <p className="text-slate-500 text-sm">Analyze conversation patterns, model performance, and effectiveness metrics</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <p className="text-slate-400 mb-4">
                                Get insights into your conversation patterns, model performance, usage trends, and effectiveness metrics.
                            </p>
                            <button
                                onClick={() => setShowAnalytics(true)}
                                className="px-6 py-3 bg-primary hover:bg-primary/80 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                            >
                                <BarChart3 size={20} />
                                Open Analytics Dashboard
                            </button>
                        </div>
                    </div>
                )}

                {/* Integrations Tab */}
                {activeTab === 'integrations' && (
                    <IntegrationsTab />
                )}

                {/* Usage & Cost Tab */}
                {activeTab === 'usage' && (
                    <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
                        <h3 className="text-xl font-bold text-white">Token Usage & Cost Tracking</h3>
                        <p className="text-slate-500">Track your API usage for OpenRouter models. Local models are free!</p>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                                <Activity size={24} className="mx-auto text-primary mb-2" />
                                <div className="text-3xl font-bold text-white">{usageStats.totalTokens.toLocaleString()}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total Tokens</div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                                <DollarSign size={24} className="mx-auto text-emerald-400 mb-2" />
                                <div className="text-3xl font-bold text-white">${usageStats.estimatedCost.toFixed(4)}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Estimated Cost</div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                                <Database size={24} className="mx-auto text-blue-400 mb-2" />
                                <div className="text-3xl font-bold text-white">{usageStats.sessionCount}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Sessions</div>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                            <p className="text-slate-400 text-sm">
                                💡 <strong>Tip:</strong> Usage tracking is currently based on estimates. For accurate billing, check your OpenRouter dashboard.
                            </p>
                        </div>
                    </div>
                )}

                {/* MCP Servers Tab */}
                {activeTab === 'mcp' && (
                    <div className="max-w-4xl animate-in fade-in slide-in-from-right-2">
                        <MCPSettings />
                    </div>
                )}

                {/* Model Downloader Tab */}
                {activeTab === 'downloader' && (
                    <div className="max-w-4xl animate-in fade-in slide-in-from-right-2">
                        <ModelDownloader />
                    </div>
                )}

                {/* Accessibility Tab */}
                {activeTab === 'accessibility' && (
                    <div className="max-w-4xl animate-in fade-in slide-in-from-right-2">
                        <AccessibilitySettingsContent />
                    </div>
                )}

                {/* Onboarding Tab */}
                {activeTab === 'onboarding' && (
                    <div className="max-w-4xl animate-in fade-in slide-in-from-right-2">
                        <OnboardingSettingsContent />
                    </div>
                )}
            </div>

            {/* Conversation Analytics Dashboard Modal */}
            <ConversationAnalyticsDashboard
                isOpen={showAnalytics}
                onClose={() => setShowAnalytics(false)}
            />
            <PluginManager
                isOpen={showPluginManager}
                onClose={() => setShowPluginManager(false)}
            />
        </div>
    );
};

// Onboarding Settings Content Component
const OnboardingSettingsContent: React.FC = () => {
    const [tutorials, setTutorials] = useState(onboardingService.getTutorials());
    const [showTutorial, setShowTutorial] = useState(false);
    const [currentTutorial, setCurrentTutorial] = useState<ReturnType<typeof onboardingService.getTutorials>[0] | null>(null);

    const handleStartTutorial = (tutorialId: string) => {
        const tutorial = tutorials.find(t => t.id === tutorialId);
        if (tutorial) {
            setCurrentTutorial(tutorial);
            setShowTutorial(true);
        }
    };

    const handleResetOnboarding = () => {
        if (confirm('Reset all onboarding progress? This will show tutorials again.')) {
            onboardingService.resetOnboarding();
            setTutorials(onboardingService.getTutorials());
            toast.success('Onboarding reset!');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Interactive Tutorials</h3>
                <p className="text-sm text-slate-400 mb-4">
                    Step-by-step guides to help you learn InferencerC
                </p>
                <div className="space-y-3">
                    {tutorials.map((tutorial) => (
                        <div
                            key={tutorial.id}
                            className="p-4 bg-slate-800 rounded border border-slate-700"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-white">{tutorial.name}</h4>
                                        {tutorial.completed && (
                                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                                                Completed
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-400">{tutorial.description}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {tutorial.steps.length} steps
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleStartTutorial(tutorial.id)}
                                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded transition-colors"
                                >
                                    {tutorial.completed ? 'Restart' : 'Start'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Onboarding Settings</h3>
                <div className="p-4 bg-slate-800 rounded border border-slate-700">
                    <button
                        onClick={handleResetOnboarding}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                    >
                        Reset Onboarding Progress
                    </button>
                </div>
            </div>

            {/* Tutorial Modal */}
            {showTutorial && currentTutorial && (
                <InteractiveTutorial
                    tutorial={currentTutorial}
                    onComplete={() => {
                        setShowTutorial(false);
                        setCurrentTutorial(null);
                        setTutorials(onboardingService.getTutorials());
                    }}
                    onSkip={() => {
                        setShowTutorial(false);
                        setCurrentTutorial(null);
                    }}
                />
            )}
        </div>
    );
};

// Integrations Tab Component
const IntegrationsTab: React.FC = () => {
    const [slackWebhook, setSlackWebhook] = useState('');
    const [discordWebhook, setDiscordWebhook] = useState('');
    const [emailRecipient, setEmailRecipient] = useState('');
    const [calendarProvider, setCalendarProvider] = useState<'google' | 'outlook' | 'ical'>('google');
    const [apiEnabled, setApiEnabled] = useState(false);
    const [apiPort, setApiPort] = useState(3001);
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        // Load existing configs
        const slackConfig = slackService.getConfig();
        if (slackConfig?.webhookUrl) setSlackWebhook(slackConfig.webhookUrl);

        const discordConfig = discordService.getConfig();
        if (discordConfig?.webhookUrl) setDiscordWebhook(discordConfig.webhookUrl);

        const emailConfig = emailService.getConfig();
        if (emailConfig?.defaultRecipient) setEmailRecipient(emailConfig.defaultRecipient);

        const calendarConfig = calendarService.getConfig();
        if (calendarConfig?.provider) setCalendarProvider(calendarConfig.provider);

        const apiConfig = apiAccessService.getConfig();
        setApiEnabled(apiConfig.enabled);
        setApiPort(apiConfig.port);
        if (apiConfig.apiKey) setApiKey(apiConfig.apiKey);
    }, []);

    const saveSlack = () => {
        if (slackWebhook.trim()) {
            slackService.setConfig({ webhookUrl: slackWebhook.trim() });
            toast.success('Slack configuration saved!');
        } else {
            slackService.setConfig({ webhookUrl: '' });
            toast.success('Slack configuration cleared');
        }
    };

    const saveDiscord = () => {
        if (discordWebhook.trim()) {
            discordService.setConfig({ webhookUrl: discordWebhook.trim() });
            toast.success('Discord configuration saved!');
        } else {
            discordService.setConfig({ webhookUrl: '' });
            toast.success('Discord configuration cleared');
        }
    };

    const saveEmail = () => {
        if (emailRecipient.trim()) {
            emailService.setConfig({ defaultRecipient: emailRecipient.trim() });
            toast.success('Email configuration saved!');
        } else {
            emailService.setConfig({ defaultRecipient: '' });
            toast.success('Email configuration cleared');
        }
    };

    const saveCalendar = () => {
        calendarService.setConfig({ provider: calendarProvider });
        toast.success('Calendar provider saved!');
    };

    const saveAPI = () => {
        apiAccessService.setConfig({
            enabled: apiEnabled,
            port: apiPort,
            apiKey: apiKey.trim() || undefined,
        });
        toast.success('API configuration saved!');
    };

    return (
        <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
            <div>
                <h3 className="text-xl font-bold text-white mb-2">Integrations</h3>
                <p className="text-slate-500 text-sm">Connect InferencerC with external services</p>
            </div>

            {/* Slack Integration */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <MessageSquare className="w-6 h-6 text-purple-400" />
                    <h4 className="text-lg font-bold text-white">Slack Integration</h4>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                    Send conversations to Slack channels using webhooks
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Webhook URL
                        </label>
                        <input
                            type="text"
                            value={slackWebhook}
                            onChange={(e) => setSlackWebhook(e.target.value)}
                            placeholder="https://hooks.slack.com/services/..."
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Create a webhook at <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">api.slack.com</a>
                        </p>
                    </div>
                    <button
                        onClick={saveSlack}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>

            {/* Discord Integration */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <MessageSquare className="w-6 h-6 text-indigo-400" />
                    <h4 className="text-lg font-bold text-white">Discord Integration</h4>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                    Send conversations to Discord channels using webhooks
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Webhook URL
                        </label>
                        <input
                            type="text"
                            value={discordWebhook}
                            onChange={(e) => setDiscordWebhook(e.target.value)}
                            placeholder="https://discord.com/api/webhooks/..."
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Create a webhook in your Discord server settings
                        </p>
                    </div>
                    <button
                        onClick={saveDiscord}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>

            {/* Email Integration */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Mail className="w-6 h-6 text-blue-400" />
                    <h4 className="text-lg font-bold text-white">Email Export</h4>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                    Set default email recipient for conversation exports
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Default Recipient
                        </label>
                        <input
                            type="email"
                            value={emailRecipient}
                            onChange={(e) => setEmailRecipient(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={saveEmail}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>

            {/* Calendar Integration */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-6 h-6 text-green-400" />
                    <h4 className="text-lg font-bold text-white">Calendar Integration</h4>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                    Choose your preferred calendar provider for scheduling
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Calendar Provider
                        </label>
                        <select
                            value={calendarProvider}
                            onChange={(e) => setCalendarProvider(e.target.value as any)}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            <option value="google">Google Calendar</option>
                            <option value="outlook">Outlook Calendar</option>
                            <option value="ical">iCal (.ics file)</option>
                        </select>
                    </div>
                    <button
                        onClick={saveCalendar}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>

            {/* API Access */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Code className="w-6 h-6 text-orange-400" />
                    <h4 className="text-lg font-bold text-white">REST API Access</h4>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                    Enable REST API for programmatic access to conversations
                </p>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={apiEnabled}
                            onChange={(e) => setApiEnabled(e.target.checked)}
                            className="w-4 h-4 text-orange-600 bg-slate-800 border-slate-700 rounded focus:ring-orange-500"
                        />
                        <label className="text-sm text-slate-300">Enable REST API</label>
                    </div>
                    {apiEnabled && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Port
                                </label>
                                <input
                                    type="number"
                                    value={apiPort}
                                    onChange={(e) => setApiPort(parseInt(e.target.value) || 3001)}
                                    min={1024}
                                    max={65535}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    API Key (Optional)
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Leave empty for no authentication"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400">
                                <p className="font-semibold mb-1">API Base URL:</p>
                                <code className="text-orange-400">http://localhost:{apiPort}/api</code>
                            </div>
                        </>
                    )}
                    <button
                        onClick={saveAPI}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
