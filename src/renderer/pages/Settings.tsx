import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Key, Server, Palette, Database, DollarSign, Activity, Settings as SettingsIcon, Sparkles, Plug, Download,
    Shield, BarChart3, Eye, GraduationCap, RefreshCw, type LucideIcon
} from 'lucide-react';
import MCPSettings from '../components/MCPSettings';
import ModelDownloader from '../components/ModelDownloader';
import { SettingsApiTab } from '../components/settings/SettingsApiTab';
import { SettingsAppearanceTab, type SettingsPreferences } from '../components/settings/SettingsAppearanceTab';
import { SettingsEndpointsTab, type SettingsModelEndpoint } from '../components/settings/SettingsEndpointsTab';
import { SettingsIntegrationsTab } from '../components/settings/SettingsIntegrationsTab';
import { SettingsPresetsTab, type SettingsSystemPreset } from '../components/settings/SettingsPresetsTab';
import { SettingsPrivacyTab } from '../components/settings/SettingsPrivacyTab';
import { SettingsWebhooksTab } from '../components/settings/SettingsWebhooksTab';
import type {
    SettingsTabId,
    SettingsUpdateInfo,
    SettingsWebhook,
    SettingsWebhookDraft,
} from '../components/settings/settingsModels';
import { ThemeService, ThemeConfig, type ThemeType } from '../services/theme';
import { githubService } from '../services/github';
import { notionService } from '../services/notion';
import { webhookService } from '../services/webhooks';
import { privacyService } from '../services/privacy';
import { ConversationAnalyticsDashboard } from '../components/ConversationAnalyticsDashboard';
import { AccessibilitySettingsContent } from '../components/AccessibilitySettingsContent';
import { InteractiveTutorial } from '../components/InteractiveTutorial';
import { PluginManager } from '../components/PluginManager';
import { onboardingService } from '../services/onboarding';
import { credentialService } from '../services/credentials';
import { readAnalyticsUsageStats } from '../services/analyticsStore';
import {
    fetchOpenRouterAuthoritativeBilling,
    type OpenRouterAuthoritativeBilling,
} from '../services/openRouterBilling';
import {
    DEFAULT_SYSTEM_PRESETS,
    DEFAULT_USAGE_STATS,
    buildOpenRouterUsageStats,
    readStoredBooleanWithFallback,
    parseStoredModelEndpoints,
    parseStoredSystemPresets,
    readStoredIntegerWithFallback,
    readStoredStringWithFallback,
} from './settingsStorage';

const AUTHORITATIVE_BILLING_TOGGLE_KEY = 'settings_usage_authoritative_billing_enabled';

const formatUsd = (value: number | null): string => {
    if (value === null) {
        return '—';
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
};

const formatSyncTime = (isoDate: string): string => {
    const parsedDate = new Date(isoDate);
    if (Number.isNaN(parsedDate.getTime())) {
        return 'Unknown';
    }
    return parsedDate.toLocaleString();
};

const getSourceLabel = (source: OpenRouterAuthoritativeBilling['source']): string => {
    if (source === 'credits+key') {
        return '/credits + /key';
    }
    if (source === 'credits') {
        return '/credits';
    }
    return '/key';
};

const Settings: React.FC = () => {
    // API Keys
    const [openRouterKey, setOpenRouterKey] = useState('');
    const [githubKey, setGithubKey] = useState('');
    const [notionKey, setNotionKey] = useState('');
    const [notionDatabaseId, setNotionDatabaseId] = useState('');

    // Model Endpoints
    const [endpoints, setEndpoints] = useState<SettingsModelEndpoint[]>([]);
    const [newEndpoint, setNewEndpoint] = useState<Partial<SettingsModelEndpoint>>({ type: 'lm-studio', name: '', url: '' });
    const [showAddEndpoint, setShowAddEndpoint] = useState(false);

    // System Presets
    const [presets, setPresets] = useState<SettingsSystemPreset[]>([]);
    const [editingPreset, setEditingPreset] = useState<string | null>(null);
    const [newPreset, setNewPreset] = useState<Partial<SettingsSystemPreset>>({ name: '', prompt: '' });
    const [showAddPreset, setShowAddPreset] = useState(false);

    // Usage Tracking
    const [usageStats, setUsageStats] = useState(DEFAULT_USAGE_STATS);
    const [authoritativeBillingEnabled, setAuthoritativeBillingEnabled] = useState(() =>
        readStoredBooleanWithFallback(AUTHORITATIVE_BILLING_TOGGLE_KEY, true)
    );
    const [authoritativeBilling, setAuthoritativeBilling] = useState<OpenRouterAuthoritativeBilling | null>(null);
    const [authoritativeBillingLoading, setAuthoritativeBillingLoading] = useState(false);
    const [authoritativeBillingError, setAuthoritativeBillingError] = useState<string | null>(null);

    // Active Tab
    const [activeTab, setActiveTab] = useState<SettingsTabId>('api');
    
    // Conversation Analytics
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showPluginManager, setShowPluginManager] = useState(false);
    
    // Privacy & Security
    const [privacyMode, setPrivacyMode] = useState(false);
    const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
    const [appVersion, setAppVersion] = useState('');
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<SettingsUpdateInfo | null>(null);
    
    // Webhooks
    const [webhooks, setWebhooks] = useState<SettingsWebhook[]>([]);
    const [newWebhook, setNewWebhook] = useState<SettingsWebhookDraft>({ name: '', url: '', enabled: true, events: ['conversation_complete'] });
    const [showAddWebhook, setShowAddWebhook] = useState(false);
    
    // Theme
    const themeService = ThemeService.getInstance();
    const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(themeService.getCurrentTheme());
    const [availableThemes, setAvailableThemes] = useState<ThemeConfig[]>(themeService.getAllThemes());
    
    // Preferences
    const [preferences, setPreferences] = useState<SettingsPreferences>({
        defaultModel: readStoredStringWithFallback('app_default_model', ''),
        codeFont: readStoredStringWithFallback('app_code_font', 'JetBrains Mono'),
        chatFont: readStoredStringWithFallback('app_chat_font', 'Inter'),
        codeFontSize: readStoredIntegerWithFallback('app_code_font_size', 13),
        chatFontSize: readStoredIntegerWithFallback('app_chat_font_size', 14),
        layoutMode: readStoredStringWithFallback('app_layout_mode', 'normal'), // normal, compact, wide
        autoScroll: readStoredStringWithFallback('app_auto_scroll', 'true') !== 'false', // default true
        notifications: readStoredStringWithFallback('app_notifications', 'true') !== 'false', // default true
    });

    const refreshUsageStats = React.useCallback(() => {
        const usageHistory = readAnalyticsUsageStats();
        setUsageStats(buildOpenRouterUsageStats(usageHistory));
    }, []);

    const refreshAuthoritativeBilling = React.useCallback(async () => {
        if (!authoritativeBillingEnabled) {
            setAuthoritativeBillingError(null);
            return;
        }

        const apiKey = await credentialService.getOpenRouterApiKey();
        if (!apiKey || apiKey.trim().length === 0) {
            setAuthoritativeBilling(null);
            setAuthoritativeBillingError('Add an OpenRouter API key in API Keys to fetch authoritative billing.');
            return;
        }

        setAuthoritativeBillingLoading(true);
        setAuthoritativeBillingError(null);

        try {
            const billing = await fetchOpenRouterAuthoritativeBilling(apiKey);
            setAuthoritativeBilling(billing);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch OpenRouter authoritative billing.';
            setAuthoritativeBilling(null);
            setAuthoritativeBillingError(message);
        } finally {
            setAuthoritativeBillingLoading(false);
        }
    }, [authoritativeBillingEnabled]);

    useEffect(() => {
        let removeUpdateDownloadedListener: (() => void) | undefined;
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
        if (savedEndpoints) {
            const parsedEndpoints = parseStoredModelEndpoints(savedEndpoints);
            setEndpoints(parsedEndpoints || []);
        }

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
            removeUpdateDownloadedListener = window.electronAPI.onUpdateDownloaded((_event: unknown, info: SettingsUpdateInfo) => {
                setUpdateAvailable(true);
                setUpdateInfo(info);
                toast.success(`Update ${info.version} downloaded! Restart to install.`);
            });
        }

        const savedPresets = localStorage.getItem('systemPresets');
        if (savedPresets) {
            const parsedPresets = parseStoredSystemPresets(savedPresets);
            setPresets(parsedPresets || DEFAULT_SYSTEM_PRESETS);
        } else {
            setPresets(DEFAULT_SYSTEM_PRESETS);
        }
        refreshUsageStats();
        
        // Subscribe to theme changes
        const handleThemeChange = (theme: ThemeConfig) => {
            setCurrentTheme(theme);
        };
        themeService.subscribe(handleThemeChange);
        
        return () => {
            isMounted = false;
            themeService.unsubscribe(handleThemeChange);
            removeUpdateDownloadedListener?.();
        };
    }, [refreshUsageStats]);

    useEffect(() => {
        if (activeTab !== 'usage') {
            return;
        }
        refreshUsageStats();
        void refreshAuthoritativeBilling();

        const usageInterval = setInterval(refreshUsageStats, 3000);
        const authoritativeInterval = setInterval(() => {
            void refreshAuthoritativeBilling();
        }, 60000);

        return () => {
            clearInterval(usageInterval);
            clearInterval(authoritativeInterval);
        };
    }, [activeTab, refreshUsageStats, refreshAuthoritativeBilling]);

    const saveOpenRouterKey = async () => {
        if (!openRouterKey.trim()) {
            await credentialService.clearOpenRouterApiKey();
            toast.success('OpenRouter API key cleared');
            if (authoritativeBillingEnabled) {
                setAuthoritativeBilling(null);
                setAuthoritativeBillingError('Add an OpenRouter API key in API Keys to fetch authoritative billing.');
            }
            return;
        }

        await credentialService.setOpenRouterApiKey(openRouterKey);
        toast.success('OpenRouter API key saved securely');
        if (activeTab === 'usage' && authoritativeBillingEnabled) {
            void refreshAuthoritativeBilling();
        }
    };

    const handleToggleAuthoritativeBilling = (enabled: boolean) => {
        setAuthoritativeBillingEnabled(enabled);
        localStorage.setItem(AUTHORITATIVE_BILLING_TOGGLE_KEY, enabled ? 'true' : 'false');
        if (!enabled) {
            setAuthoritativeBillingLoading(false);
            setAuthoritativeBillingError(null);
            setAuthoritativeBilling(null);
        }
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

    const handleSelectTheme = (themeId: ThemeType) => {
        themeService.setTheme(themeId);
        setCurrentTheme(themeService.getCurrentTheme());
    };

    // Endpoint Management
    const addEndpoint = () => {
        if (!newEndpoint.name || !newEndpoint.url) {
            toast.error('Name and URL are required');
            return;
        }
        const endpoint: SettingsModelEndpoint = {
            id: crypto.randomUUID(),
            name: newEndpoint.name,
            url: newEndpoint.url,
            type: newEndpoint.type as SettingsModelEndpoint['type']
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
        const preset: SettingsSystemPreset = {
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

    const TabButton = ({ id, label, icon: Icon }: { id: SettingsTabId; label: string; icon: LucideIcon }) => (
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
                    <SettingsApiTab
                        openRouterKey={openRouterKey}
                        setOpenRouterKey={setOpenRouterKey}
                        githubKey={githubKey}
                        setGithubKey={setGithubKey}
                        notionKey={notionKey}
                        setNotionKey={setNotionKey}
                        notionDatabaseId={notionDatabaseId}
                        setNotionDatabaseId={setNotionDatabaseId}
                        onSaveOpenRouterKey={saveOpenRouterKey}
                        onSaveGithubKey={saveGithubKey}
                        onSaveNotionConfig={saveNotionConfig}
                    />
                )}

                {/* Model Endpoints Tab */}
                {activeTab === 'endpoints' && (
                    <SettingsEndpointsTab
                        showAddEndpoint={showAddEndpoint}
                        setShowAddEndpoint={setShowAddEndpoint}
                        newEndpoint={newEndpoint}
                        setNewEndpoint={setNewEndpoint}
                        endpoints={endpoints}
                        onAddEndpoint={addEndpoint}
                        onDeleteEndpoint={deleteEndpoint}
                    />
                )}

                {/* System Presets Tab */}
                {activeTab === 'presets' && (
                    <SettingsPresetsTab
                        showAddPreset={showAddPreset}
                        setShowAddPreset={setShowAddPreset}
                        newPreset={newPreset}
                        setNewPreset={setNewPreset}
                        presets={presets}
                        editingPreset={editingPreset}
                        setEditingPreset={setEditingPreset}
                        onAddPreset={addPreset}
                        onUpdatePreset={updatePreset}
                        onDeletePreset={deletePreset}
                    />
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                    <SettingsAppearanceTab
                        availableThemes={availableThemes}
                        currentTheme={currentTheme}
                        onSelectTheme={handleSelectTheme}
                        preferences={preferences}
                        setPreferences={setPreferences}
                    />
                )}

                {/* Webhooks Tab */}
                {activeTab === 'webhooks' && (
                    <SettingsWebhooksTab
                        webhooks={webhooks}
                        setWebhooks={setWebhooks}
                        newWebhook={newWebhook}
                        setNewWebhook={setNewWebhook}
                        showAddWebhook={showAddWebhook}
                        setShowAddWebhook={setShowAddWebhook}
                    />
                )}

                {/* Privacy & Security Tab */}
                {activeTab === 'privacy' && (
                    <SettingsPrivacyTab
                        privacyMode={privacyMode}
                        setPrivacyMode={setPrivacyMode}
                        analyticsEnabled={analyticsEnabled}
                        setAnalyticsEnabled={setAnalyticsEnabled}
                        appVersion={appVersion}
                        updateAvailable={updateAvailable}
                        setUpdateAvailable={setUpdateAvailable}
                        updateInfo={updateInfo}
                    />
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
                    <SettingsIntegrationsTab />
                )}

                {/* Usage & Cost Tab */}
                {activeTab === 'usage' && (
                    <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-bold text-white">Token Usage & Cost Tracking</h3>
                                <p className="text-slate-500">Track local estimates and optional OpenRouter authoritative billing.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={authoritativeBillingEnabled}
                                        onChange={(event) => handleToggleAuthoritativeBilling(event.target.checked)}
                                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary/50"
                                    />
                                    Authoritative OpenRouter billing
                                </label>
                                <button
                                    type="button"
                                    onClick={() => void refreshAuthoritativeBilling()}
                                    disabled={!authoritativeBillingEnabled || authoritativeBillingLoading}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <RefreshCw size={14} className={authoritativeBillingLoading ? 'animate-spin' : ''} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                                <Activity size={24} className="mx-auto text-primary mb-2" />
                                <div className="text-3xl font-bold text-white">{usageStats.totalTokens.toLocaleString()}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Local Total Tokens</div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                                <DollarSign size={24} className="mx-auto text-emerald-400 mb-2" />
                                <div className="text-3xl font-bold text-white">${usageStats.estimatedCost.toFixed(4)}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Local Estimated Cost</div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                                <Database size={24} className="mx-auto text-blue-400 mb-2" />
                                <div className="text-3xl font-bold text-white">{usageStats.sessionCount}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Local Sessions</div>
                            </div>
                        </div>

                        {authoritativeBillingEnabled && (
                            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                                <div className="flex items-center justify-between gap-3">
                                    <h4 className="text-base font-semibold text-white">OpenRouter Authoritative Billing</h4>
                                    <span className="text-xs text-slate-400">
                                        {authoritativeBilling
                                            ? `Last synced ${formatSyncTime(authoritativeBilling.fetchedAt)}`
                                            : 'Not synced yet'}
                                    </span>
                                </div>

                                {authoritativeBillingError && (
                                    <p className="rounded-lg border border-rose-700/50 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
                                        {authoritativeBillingError}
                                    </p>
                                )}

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wider text-slate-500">Used (USD)</p>
                                        <p className="mt-1 text-lg font-semibold text-white">
                                            {authoritativeBillingLoading && !authoritativeBilling ? 'Loading...' : formatUsd(authoritativeBilling?.usedUsd ?? null)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wider text-slate-500">Remaining (USD)</p>
                                        <p className="mt-1 text-lg font-semibold text-white">
                                            {authoritativeBillingLoading && !authoritativeBilling ? 'Loading...' : formatUsd(authoritativeBilling?.remainingUsd ?? null)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wider text-slate-500">Limit (USD)</p>
                                        <p className="mt-1 text-lg font-semibold text-white">
                                            {authoritativeBillingLoading && !authoritativeBilling ? 'Loading...' : formatUsd(authoritativeBilling?.limitUsd ?? null)}
                                        </p>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-400">
                                    Source: {authoritativeBilling ? getSourceLabel(authoritativeBilling.source) : '—'}.
                                    Data is fetched live from your OpenRouter account for billing truth.
                                </p>
                            </div>
                        )}

                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                            <p className="text-slate-400 text-sm">
                                💡 <strong>Tip:</strong> Local cards are app-side estimates from tracked requests. Authoritative billing uses OpenRouter account endpoints.
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

export default Settings;
