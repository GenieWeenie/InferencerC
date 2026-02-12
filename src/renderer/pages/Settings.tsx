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
    buildOpenRouterDailySpend,
    buildOpenRouterBillingCsv,
    buildOpenRouterBillingReconciliation,
    buildOpenRouterModelCostBreakdown,
    clearOpenRouterActivityCache,
    clearOpenRouterBillingCache,
    fetchOpenRouterActivityWithCache,
    fetchOpenRouterAuthoritativeBillingWithCache,
    loadOpenRouterActivityCache,
    loadOpenRouterBillingCache,
    paginateOpenRouterBillingHistory,
    type OpenRouterActivityRow,
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
const AUTHORITATIVE_BILLING_REFRESH_SECONDS_KEY = 'settings_usage_authoritative_refresh_seconds';
const AUTHORITATIVE_BILLING_CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const AUTHORITATIVE_HISTORY_PAGE_SIZE = 12;
const DEFAULT_AUTHORITATIVE_REFRESH_SECONDS = 60;
const DRIFT_WARNING_THRESHOLD_PERCENT = 20;
const DRIFT_WARNING_THRESHOLD_USD = 1;

const AUTHORITATIVE_REFRESH_OPTIONS = [
    { value: 0, label: 'Manual only' },
    { value: 30, label: '30s' },
    { value: 60, label: '1m' },
    { value: 300, label: '5m' },
] as const;

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

const formatTrendLabel = (isoDate: string): string => {
    const parsedDate = new Date(isoDate);
    if (Number.isNaN(parsedDate.getTime())) {
        return 'Unknown';
    }
    return parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDayLabel = (isoDate: string): string => {
    const parsedDate = new Date(isoDate);
    if (Number.isNaN(parsedDate.getTime())) {
        return 'Unknown';
    }
    return parsedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const readStoredRefreshSeconds = (): number => {
    try {
        const raw = localStorage.getItem(AUTHORITATIVE_BILLING_REFRESH_SECONDS_KEY);
        if (!raw) {
            return DEFAULT_AUTHORITATIVE_REFRESH_SECONDS;
        }
        const parsed = Number(raw.trim());
        if (!Number.isFinite(parsed)) {
            return DEFAULT_AUTHORITATIVE_REFRESH_SECONDS;
        }
        const normalized = Math.floor(parsed);
        const allowed = AUTHORITATIVE_REFRESH_OPTIONS.some((option) => option.value === normalized);
        return allowed ? normalized : DEFAULT_AUTHORITATIVE_REFRESH_SECONDS;
    } catch {
        return DEFAULT_AUTHORITATIVE_REFRESH_SECONDS;
    }
};

const formatDurationSince = (ageMs: number | null): string => {
    if (ageMs === null || ageMs < 0) {
        return 'unknown age';
    }
    if (ageMs < 1_000) {
        return 'just now';
    }
    if (ageMs < 60_000) {
        return `${Math.floor(ageMs / 1_000)}s ago`;
    }
    if (ageMs < 3_600_000) {
        return `${Math.floor(ageMs / 60_000)}m ago`;
    }
    return `${Math.floor(ageMs / 3_600_000)}h ago`;
};

const formatSignedUsd = (value: number): string => {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}${formatUsd(Math.abs(value))}`;
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
    const [authoritativeRefreshSeconds, setAuthoritativeRefreshSeconds] = useState(readStoredRefreshSeconds);
    const [authoritativeBilling, setAuthoritativeBilling] = useState<OpenRouterAuthoritativeBilling | null>(null);
    const [authoritativeBillingHistory, setAuthoritativeBillingHistory] = useState<OpenRouterAuthoritativeBilling[]>([]);
    const [authoritativeActivityRows, setAuthoritativeActivityRows] = useState<OpenRouterActivityRow[]>([]);
    const [authoritativeActivityFetchedAt, setAuthoritativeActivityFetchedAt] = useState<string | null>(null);
    const [authoritativeBillingHistoryPageIndex, setAuthoritativeBillingHistoryPageIndex] = useState(0);
    const [authoritativeBillingLoading, setAuthoritativeBillingLoading] = useState(false);
    const [authoritativeBillingError, setAuthoritativeBillingError] = useState<string | null>(null);
    const [authoritativeActivityError, setAuthoritativeActivityError] = useState<string | null>(null);

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

    const pagedAuthoritativeHistory = React.useMemo(() => (
        paginateOpenRouterBillingHistory(
            authoritativeBillingHistory,
            authoritativeBillingHistoryPageIndex,
            AUTHORITATIVE_HISTORY_PAGE_SIZE
        )
    ), [authoritativeBillingHistory, authoritativeBillingHistoryPageIndex]);

    const authoritativeHistoryBars = React.useMemo(() => {
        const points = pagedAuthoritativeHistory.items.map((snapshot) => snapshot.usedUsd);
        const values = points.filter((value): value is number => value !== null);
        const min = values.length > 0 ? Math.min(...values) : 0;
        const max = values.length > 0 ? Math.max(...values) : 0;
        const range = max - min;

        return pagedAuthoritativeHistory.items.map((snapshot) => {
            if (snapshot.usedUsd === null) {
                return {
                    snapshot,
                    heightPercent: 8,
                    hasValue: false,
                };
            }

            if (range <= 0) {
                return {
                    snapshot,
                    heightPercent: 70,
                    hasValue: true,
                };
            }

            const normalized = (snapshot.usedUsd - min) / range;
            return {
                snapshot,
                heightPercent: Math.max(12, Math.round(normalized * 100)),
                hasValue: true,
            };
        });
    }, [pagedAuthoritativeHistory.items]);

    const authoritativeDailySpend = React.useMemo(
        () => buildOpenRouterDailySpend(authoritativeActivityRows),
        [authoritativeActivityRows]
    );

    const authoritativeDailySpendWindow = React.useMemo(
        () => authoritativeDailySpend.slice(-30),
        [authoritativeDailySpend]
    );

    const authoritativeDailySpendBars = React.useMemo(() => {
        const values = authoritativeDailySpendWindow.map((point) => point.usageUsd);
        const min = values.length > 0 ? Math.min(...values) : 0;
        const max = values.length > 0 ? Math.max(...values) : 0;
        const range = max - min;

        return authoritativeDailySpendWindow.map((point) => {
            if (range <= 0) {
                return {
                    point,
                    heightPercent: point.usageUsd > 0 ? 72 : 8,
                };
            }
            const normalized = (point.usageUsd - min) / range;
            return {
                point,
                heightPercent: Math.max(10, Math.round(normalized * 100)),
            };
        });
    }, [authoritativeDailySpendWindow]);

    const authoritativeModelBreakdown = React.useMemo(
        () => buildOpenRouterModelCostBreakdown(authoritativeActivityRows).slice(0, 12),
        [authoritativeActivityRows]
    );

    const authoritativeCacheAgeMs = React.useMemo(() => {
        if (!authoritativeBilling) {
            return null;
        }
        const parsed = new Date(authoritativeBilling.fetchedAt).getTime();
        if (!Number.isFinite(parsed)) {
            return null;
        }
        const ageMs = Date.now() - parsed;
        return ageMs >= 0 ? ageMs : null;
    }, [authoritativeBilling]);

    const authoritativeBillingStale = authoritativeCacheAgeMs !== null
        && authoritativeCacheAgeMs > AUTHORITATIVE_BILLING_CACHE_MAX_AGE_MS;

    const authoritativeActivityCacheAgeMs = React.useMemo(() => {
        if (!authoritativeActivityFetchedAt) {
            return null;
        }
        const parsed = new Date(authoritativeActivityFetchedAt).getTime();
        if (!Number.isFinite(parsed)) {
            return null;
        }
        const ageMs = Date.now() - parsed;
        return ageMs >= 0 ? ageMs : null;
    }, [authoritativeActivityFetchedAt]);

    const authoritativeActivityStale = authoritativeActivityCacheAgeMs !== null
        && authoritativeActivityCacheAgeMs > AUTHORITATIVE_BILLING_CACHE_MAX_AGE_MS;

    const authoritativeReconciliation = React.useMemo(() => (
        buildOpenRouterBillingReconciliation(usageStats.estimatedCost, authoritativeBilling)
    ), [usageStats.estimatedCost, authoritativeBilling]);

    const authoritativeDriftWarning = React.useMemo(() => {
        const driftPercent = authoritativeReconciliation.driftPercent;
        const driftUsd = authoritativeReconciliation.driftUsd;
        if (driftPercent === null || driftUsd === null) {
            return false;
        }
        return Math.abs(driftPercent) >= DRIFT_WARNING_THRESHOLD_PERCENT
            && Math.abs(driftUsd) >= DRIFT_WARNING_THRESHOLD_USD;
    }, [authoritativeReconciliation.driftPercent, authoritativeReconciliation.driftUsd]);

    useEffect(() => {
        if (authoritativeBillingHistoryPageIndex !== pagedAuthoritativeHistory.page) {
            setAuthoritativeBillingHistoryPageIndex(pagedAuthoritativeHistory.page);
        }
    }, [authoritativeBillingHistoryPageIndex, pagedAuthoritativeHistory.page]);

    const hydrateAuthoritativeBillingFromCache = React.useCallback(() => {
        const cached = loadOpenRouterBillingCache();
        const activityCached = loadOpenRouterActivityCache();
        setAuthoritativeBilling(cached.latest);
        setAuthoritativeBillingHistory(cached.history);
        setAuthoritativeActivityRows(activityCached.rows);
        setAuthoritativeActivityFetchedAt(activityCached.fetchedAt);
    }, []);

    const refreshAuthoritativeBilling = React.useCallback(async (options?: { forceRefresh?: boolean }) => {
        if (!authoritativeBillingEnabled) {
            setAuthoritativeBillingError(null);
            setAuthoritativeActivityError(null);
            return;
        }

        const apiKey = await credentialService.getOpenRouterApiKey();
        if (!apiKey || apiKey.trim().length === 0) {
            setAuthoritativeBilling(null);
            setAuthoritativeActivityRows([]);
            setAuthoritativeActivityFetchedAt(null);
            setAuthoritativeBillingError('Add an OpenRouter API key in API Keys to fetch authoritative billing.');
            setAuthoritativeActivityError('Add an OpenRouter API key in API Keys to fetch OpenRouter activity.');
            return;
        }

        setAuthoritativeBillingLoading(true);
        setAuthoritativeBillingError(null);
        setAuthoritativeActivityError(null);

        const [billingResult, activityResult] = await Promise.allSettled([
            fetchOpenRouterAuthoritativeBillingWithCache(apiKey, {
                forceRefresh: options?.forceRefresh === true,
                maxAgeMs: AUTHORITATIVE_BILLING_CACHE_MAX_AGE_MS,
            }),
            fetchOpenRouterActivityWithCache(apiKey, {
                forceRefresh: options?.forceRefresh === true,
                maxAgeMs: AUTHORITATIVE_BILLING_CACHE_MAX_AGE_MS,
            }),
        ]);

        if (billingResult.status === 'fulfilled') {
            setAuthoritativeBilling(billingResult.value.billing);
            setAuthoritativeBillingHistory(billingResult.value.history);
        } else {
            const message = billingResult.reason instanceof Error
                ? billingResult.reason.message
                : 'Failed to fetch OpenRouter authoritative billing.';
            setAuthoritativeBillingError(message);
        }

        if (activityResult.status === 'fulfilled') {
            setAuthoritativeActivityRows(activityResult.value.rows);
            setAuthoritativeActivityFetchedAt(activityResult.value.fetchedAt);
        } else {
            const message = activityResult.reason instanceof Error
                ? activityResult.reason.message
                : 'Failed to fetch OpenRouter activity.';
            setAuthoritativeActivityError(message);
        }

        setAuthoritativeBillingLoading(false);
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
        hydrateAuthoritativeBillingFromCache();
        setAuthoritativeBillingHistoryPageIndex(0);
        void refreshAuthoritativeBilling();

        const usageInterval = setInterval(refreshUsageStats, 3000);
        const authoritativeInterval = authoritativeRefreshSeconds > 0
            ? setInterval(() => {
                void refreshAuthoritativeBilling();
            }, authoritativeRefreshSeconds * 1000)
            : null;

        return () => {
            clearInterval(usageInterval);
            if (authoritativeInterval) {
                clearInterval(authoritativeInterval);
            }
        };
    }, [activeTab, refreshUsageStats, refreshAuthoritativeBilling, hydrateAuthoritativeBillingFromCache, authoritativeRefreshSeconds]);

    const saveOpenRouterKey = async () => {
        if (!openRouterKey.trim()) {
            await credentialService.clearOpenRouterApiKey();
            clearOpenRouterBillingCache();
            clearOpenRouterActivityCache();
            toast.success('OpenRouter API key cleared');
            if (authoritativeBillingEnabled) {
                setAuthoritativeBilling(null);
                setAuthoritativeBillingHistory([]);
                setAuthoritativeActivityRows([]);
                setAuthoritativeActivityFetchedAt(null);
                setAuthoritativeBillingHistoryPageIndex(0);
                setAuthoritativeBillingError('Add an OpenRouter API key in API Keys to fetch authoritative billing.');
                setAuthoritativeActivityError('Add an OpenRouter API key in API Keys to fetch OpenRouter activity.');
            }
            return;
        }

        await credentialService.setOpenRouterApiKey(openRouterKey);
        toast.success('OpenRouter API key saved securely');
        if (activeTab === 'usage' && authoritativeBillingEnabled) {
            setAuthoritativeBillingHistoryPageIndex(0);
            void refreshAuthoritativeBilling({ forceRefresh: true });
        }
    };

    const handleToggleAuthoritativeBilling = (enabled: boolean) => {
        setAuthoritativeBillingEnabled(enabled);
        localStorage.setItem(AUTHORITATIVE_BILLING_TOGGLE_KEY, enabled ? 'true' : 'false');
        if (!enabled) {
            setAuthoritativeBillingLoading(false);
            setAuthoritativeBillingError(null);
            setAuthoritativeActivityError(null);
            setAuthoritativeBilling(null);
            setAuthoritativeBillingHistory([]);
            setAuthoritativeActivityRows([]);
            setAuthoritativeActivityFetchedAt(null);
            setAuthoritativeBillingHistoryPageIndex(0);
            return;
        }

        hydrateAuthoritativeBillingFromCache();
        setAuthoritativeBillingHistoryPageIndex(0);
        if (activeTab === 'usage') {
            void refreshAuthoritativeBilling();
        }
    };

    const handleAuthoritativeRefreshSecondsChange = (nextSeconds: number) => {
        const allowed = AUTHORITATIVE_REFRESH_OPTIONS.some((option) => option.value === nextSeconds);
        if (!allowed) {
            return;
        }
        setAuthoritativeRefreshSeconds(nextSeconds);
        localStorage.setItem(AUTHORITATIVE_BILLING_REFRESH_SECONDS_KEY, String(nextSeconds));
    };

    const exportAuthoritativeBillingCsv = () => {
        const csv = buildOpenRouterBillingCsv(authoritativeBillingHistory, usageStats.estimatedCost, authoritativeBilling);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const dateSegment = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const link = document.createElement('a');
        link.href = url;
        link.download = `openrouter-billing-${dateSegment}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Exported authoritative billing CSV');
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
                    <div className="max-w-5xl space-y-6 animate-in fade-in slide-in-from-right-2">
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
                                <select
                                    value={authoritativeRefreshSeconds}
                                    onChange={(event) => handleAuthoritativeRefreshSecondsChange(Number(event.target.value))}
                                    disabled={!authoritativeBillingEnabled}
                                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {AUTHORITATIVE_REFRESH_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            Refresh: {option.label}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => void refreshAuthoritativeBilling({ forceRefresh: true })}
                                    disabled={!authoritativeBillingEnabled || authoritativeBillingLoading}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <RefreshCw size={14} className={authoritativeBillingLoading ? 'animate-spin' : ''} />
                                    Refresh
                                </button>
                                <button
                                    type="button"
                                    onClick={exportAuthoritativeBillingCsv}
                                    disabled={!authoritativeBillingEnabled || authoritativeBillingHistory.length === 0}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Download size={14} />
                                    Export CSV
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
                            <div className={`space-y-4 rounded-xl border p-6 ${
                                authoritativeBillingStale
                                    ? 'border-amber-700/70 bg-amber-950/10'
                                    : 'border-slate-800 bg-slate-900/50'
                            }`}>
                                <div className="flex items-center justify-between gap-3">
                                    <h4 className="text-base font-semibold text-white">OpenRouter Authoritative Billing</h4>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        {authoritativeBillingStale && (
                                            <span className="rounded-full border border-amber-600/70 bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                                                Stale cache
                                            </span>
                                        )}
                                        {authoritativeActivityStale && (
                                            <span className="rounded-full border border-amber-600/70 bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                                                Activity stale
                                            </span>
                                        )}
                                        {authoritativeDriftWarning && (
                                            <span className="rounded-full border border-rose-600/70 bg-rose-500/20 px-2 py-0.5 text-[11px] font-medium text-rose-300">
                                                Drift warning
                                            </span>
                                        )}
                                        <span className="text-xs text-slate-400">
                                            {authoritativeBilling
                                                ? `Last synced ${formatSyncTime(authoritativeBilling.fetchedAt)} (${formatDurationSince(authoritativeCacheAgeMs)})`
                                                : 'Not synced yet'}
                                        </span>
                                    </div>
                                </div>

                                {authoritativeBillingError && (
                                    <p className="rounded-lg border border-rose-700/50 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
                                        {authoritativeBillingError}
                                    </p>
                                )}
                                {authoritativeActivityError && (
                                    <p className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
                                        {authoritativeActivityError}
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

                                <div className={`grid grid-cols-1 gap-4 rounded-lg border px-4 py-3 md:grid-cols-3 ${
                                    authoritativeDriftWarning
                                        ? 'border-rose-700/60 bg-rose-950/20'
                                        : 'border-slate-800 bg-slate-900'
                                }`}>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-slate-500">App estimate (local)</p>
                                        <p className="mt-1 text-base font-semibold text-white">{formatUsd(authoritativeReconciliation.localEstimatedCostUsd)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-slate-500">OpenRouter account total</p>
                                        <p className="mt-1 text-base font-semibold text-white">{formatUsd(authoritativeReconciliation.authoritativeUsedUsd)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-slate-500">Difference (app - account)</p>
                                        <p className={`mt-1 text-base font-semibold ${
                                            authoritativeDriftWarning ? 'text-rose-300' : 'text-slate-200'
                                        }`}>
                                            {authoritativeReconciliation.driftUsd === null
                                                ? '—'
                                                : formatSignedUsd(authoritativeReconciliation.driftUsd)}
                                            {authoritativeReconciliation.driftPercent === null
                                                ? ''
                                                : ` (${authoritativeReconciliation.driftPercent >= 0 ? '+' : ''}${authoritativeReconciliation.driftPercent.toFixed(2)}%)`}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs uppercase tracking-wider text-slate-500">Daily Spend (OpenRouter activity)</p>
                                        <p className="text-xs text-slate-400">
                                            {authoritativeDailySpendWindow.length > 0
                                                ? `${authoritativeDailySpendWindow.length} days`
                                                : 'No activity rows'}
                                        </p>
                                    </div>

                                    {authoritativeDailySpendWindow.length === 0 ? (
                                        <p className="mt-3 text-xs text-slate-500">
                                            No authoritative activity rows available yet.
                                        </p>
                                    ) : (
                                        <>
                                            <div className="mt-4 flex h-28 items-end gap-1 rounded-md border border-slate-800/80 bg-slate-950/60 px-2 py-2">
                                                {authoritativeDailySpendBars.map((entry, index) => (
                                                    <div
                                                        key={`${entry.point.date}-${index}`}
                                                        className="flex-1 rounded-sm bg-gradient-to-t from-emerald-500/50 to-emerald-400"
                                                        style={{ height: `${entry.heightPercent}%` }}
                                                        title={`${formatDayLabel(entry.point.date)} • ${formatUsd(entry.point.usageUsd)}`}
                                                    />
                                                ))}
                                            </div>
                                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                                <span>{formatDayLabel(authoritativeDailySpendWindow[0].date)}</span>
                                                <span>{formatDayLabel(authoritativeDailySpendWindow[authoritativeDailySpendWindow.length - 1].date)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs uppercase tracking-wider text-slate-500">Per-model cost breakdown (OpenRouter activity)</p>
                                        <p className="text-xs text-slate-400">
                                            {authoritativeModelBreakdown.length} models
                                        </p>
                                    </div>
                                    {authoritativeModelBreakdown.length === 0 ? (
                                        <p className="mt-3 text-xs text-slate-500">
                                            No model-level activity rows available.
                                        </p>
                                    ) : (
                                        <div className="mt-3 overflow-x-auto rounded-md border border-slate-800">
                                            <table className="min-w-full text-left text-xs">
                                                <thead className="bg-slate-950/80 text-slate-400">
                                                    <tr>
                                                        <th className="px-3 py-2 font-medium">Model</th>
                                                        <th className="px-3 py-2 font-medium">Cost</th>
                                                        <th className="px-3 py-2 font-medium">Share</th>
                                                        <th className="px-3 py-2 font-medium">Requests</th>
                                                        <th className="px-3 py-2 font-medium">Tokens</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {authoritativeModelBreakdown.map((row) => (
                                                        <tr key={row.model} className="border-t border-slate-800 text-slate-200">
                                                            <td className="px-3 py-2 font-mono">{row.model}</td>
                                                            <td className="px-3 py-2">{formatUsd(row.usageUsd)}</td>
                                                            <td className="px-3 py-2">{row.sharePercent.toFixed(2)}%</td>
                                                            <td className="px-3 py-2">{row.requests.toLocaleString()}</td>
                                                            <td className="px-3 py-2">{(row.promptTokens + row.completionTokens + row.reasoningTokens).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs uppercase tracking-wider text-slate-500">Authoritative Snapshot Trend</p>
                                        <p className="text-xs text-slate-400">
                                            Cached snapshots ({pagedAuthoritativeHistory.totalItems})
                                        </p>
                                    </div>

                                    {pagedAuthoritativeHistory.items.length === 0 ? (
                                        <p className="mt-3 text-xs text-slate-500">
                                            No snapshots yet. Click Refresh to fetch and start trend history.
                                        </p>
                                    ) : (
                                        <>
                                            <div className="mt-4 flex h-24 items-end gap-1 rounded-md border border-slate-800/80 bg-slate-950/60 px-2 py-2">
                                                {authoritativeHistoryBars.map((entry, index) => (
                                                    <div
                                                        key={`${entry.snapshot.fetchedAt}-${index}`}
                                                        className={`flex-1 rounded-sm transition-all ${
                                                            entry.hasValue
                                                                ? 'bg-gradient-to-t from-primary/50 to-primary'
                                                                : 'bg-slate-700/50'
                                                        }`}
                                                        style={{ height: `${entry.heightPercent}%` }}
                                                        title={`${formatTrendLabel(entry.snapshot.fetchedAt)} • Used ${formatUsd(entry.snapshot.usedUsd)}`}
                                                    />
                                                ))}
                                            </div>

                                            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                                                <span>{formatTrendLabel(pagedAuthoritativeHistory.items[0].fetchedAt)}</span>
                                                <span>{formatTrendLabel(pagedAuthoritativeHistory.items[pagedAuthoritativeHistory.items.length - 1].fetchedAt)}</span>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between gap-2">
                                                <p className="text-xs text-slate-400">
                                                    Page {pagedAuthoritativeHistory.page + 1} / {pagedAuthoritativeHistory.totalPages}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAuthoritativeBillingHistoryPageIndex((current) => Math.max(0, current - 1))}
                                                        disabled={!pagedAuthoritativeHistory.hasNewer}
                                                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Newer
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAuthoritativeBillingHistoryPageIndex((current) => current + 1)}
                                                        disabled={!pagedAuthoritativeHistory.hasOlder}
                                                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Older
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <p className="text-xs text-slate-400">
                                    Source: {authoritativeBilling ? getSourceLabel(authoritativeBilling.source) : '—'}.
                                    Activity synced {authoritativeActivityFetchedAt ? `${formatSyncTime(authoritativeActivityFetchedAt)} (${formatDurationSince(authoritativeActivityCacheAgeMs)})` : 'not yet'}.
                                    Cache is reused for up to {Math.round(AUTHORITATIVE_BILLING_CACHE_MAX_AGE_MS / 60000)} minutes.
                                    Auto refresh is {authoritativeRefreshSeconds === 0 ? 'manual only' : `every ${authoritativeRefreshSeconds}s`}.
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
