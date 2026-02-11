import React from 'react';
import type { IntegrationAvailability } from '../components/chat/ChatHeaderCluster';
import { readIntegrationAvailability } from '../lib/chatIntegrations';
import type { ChatVirtuosoComponent } from '../lib/chatVirtuosoTypes';

const CLOUD_SYNC_CONFIG_KEY = 'cloud_sync_config_v1';
const MCP_SERVERS_CONFIG_KEY = 'mcp_servers';
const GITHUB_CREDENTIAL_MARKER_KEY = 'secure_marker_github_api_key';
const GITHUB_CREDENTIAL_LEGACY_KEY = 'github_api_key';

const EMPTY_INTEGRATION_AVAILABILITY: IntegrationAvailability = {
    notion: false,
    slack: false,
    discord: false,
    email: false,
    calendar: false,
};

type ResponsiveBreakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

export interface ResponsiveConfig {
    breakpoint: ResponsiveBreakpoint;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isWide: boolean;
    width: number;
    height: number;
}

interface UseChatLifecycleStateParams {
    historyLength: number;
    showSearchResultsList: boolean;
    searchResultsLength: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const parseJson = (raw: string): unknown | null => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

export const readCloudSyncAuthSnapshot = (): boolean => {
    try {
        const raw = localStorage.getItem(CLOUD_SYNC_CONFIG_KEY);
        if (!raw) return false;
        const parsed = parseJson(raw);
        if (!isRecord(parsed)) return false;
        const token = sanitizeNonEmptyString(parsed.token);
        const accountId = sanitizeNonEmptyString(parsed.accountId);
        const encryptionSalt = sanitizeNonEmptyString(parsed.encryptionSalt);
        return Boolean(token && accountId && encryptionSalt);
    } catch {
        return false;
    }
};

export const readHasConfiguredMcpServers = (): boolean => {
    try {
        const raw = localStorage.getItem(MCP_SERVERS_CONFIG_KEY);
        if (!raw) return false;
        const parsed = parseJson(raw);
        if (!Array.isArray(parsed)) return false;
        return parsed.some((entry) => {
            if (!isRecord(entry)) {
                return false;
            }
            return Boolean(sanitizeNonEmptyString(entry.id));
        });
    } catch {
        return false;
    }
};

const readHasGithubCredentialSnapshot = (): boolean => {
    try {
        return Boolean(
            localStorage.getItem(GITHUB_CREDENTIAL_MARKER_KEY) ||
            localStorage.getItem(GITHUB_CREDENTIAL_LEGACY_KEY)
        );
    } catch {
        return false;
    }
};

const applyResponsiveClasses = (config: ResponsiveConfig): void => {
    if (typeof document === 'undefined') return;

    document.documentElement.setAttribute('data-breakpoint', config.breakpoint);
    document.documentElement.classList.toggle('is-mobile', config.isMobile);
    document.documentElement.classList.toggle('is-tablet', config.isTablet);
    document.documentElement.classList.toggle('is-desktop', config.isDesktop);
    document.documentElement.classList.toggle('is-wide', config.isWide);
};

const getFallbackResponsiveConfig = (): ResponsiveConfig => {
    const width = typeof window === 'undefined' ? 1280 : window.innerWidth;
    const height = typeof window === 'undefined' ? 720 : window.innerHeight;
    const breakpoint = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : width < 1920 ? 'desktop' : 'wide';
    return {
        breakpoint,
        isMobile: breakpoint === 'mobile',
        isTablet: breakpoint === 'tablet',
        isDesktop: breakpoint === 'desktop' || breakpoint === 'wide',
        isWide: breakpoint === 'wide',
        width,
        height,
    };
};

export const useChatLifecycleState = ({
    historyLength,
    showSearchResultsList,
    searchResultsLength,
}: UseChatLifecycleStateParams) => {
    const [hasConfiguredMcpServers, setHasConfiguredMcpServers] = React.useState(readHasConfiguredMcpServers);
    const [responsiveConfig, setResponsiveConfig] = React.useState<ResponsiveConfig>(() => getFallbackResponsiveConfig());
    const [VirtuosoComponent, setVirtuosoComponent] = React.useState<ChatVirtuosoComponent | null>(null);
    const [isCloudSyncAuthenticated, setIsCloudSyncAuthenticated] = React.useState<boolean>(readCloudSyncAuthSnapshot);
    const [githubConfigured, setGithubConfigured] = React.useState<boolean>(readHasGithubCredentialSnapshot);
    const [integrationAvailability, setIntegrationAvailability] = React.useState<IntegrationAvailability>(EMPTY_INTEGRATION_AVAILABILITY);

    React.useEffect(() => {
        const refreshConfiguredMcpServers = () => {
            setHasConfiguredMcpServers(readHasConfiguredMcpServers());
        };

        window.addEventListener('focus', refreshConfiguredMcpServers);
        window.addEventListener('storage', refreshConfiguredMcpServers);
        return () => {
            window.removeEventListener('focus', refreshConfiguredMcpServers);
            window.removeEventListener('storage', refreshConfiguredMcpServers);
        };
    }, []);

    React.useEffect(() => {
        const updateResponsiveConfig = () => {
            const nextConfig = getFallbackResponsiveConfig();
            setResponsiveConfig(nextConfig);
            applyResponsiveClasses(nextConfig);
        };

        updateResponsiveConfig();
        window.addEventListener('resize', updateResponsiveConfig);
        return () => {
            window.removeEventListener('resize', updateResponsiveConfig);
        };
    }, []);

    React.useEffect(() => {
        const refreshAuthSnapshot = () => {
            setIsCloudSyncAuthenticated(readCloudSyncAuthSnapshot());
        };

        window.addEventListener('focus', refreshAuthSnapshot);
        window.addEventListener('storage', refreshAuthSnapshot);
        return () => {
            window.removeEventListener('focus', refreshAuthSnapshot);
            window.removeEventListener('storage', refreshAuthSnapshot);
        };
    }, []);

    React.useEffect(() => {
        const refreshGithubConfiguredSnapshot = () => {
            setGithubConfigured(readHasGithubCredentialSnapshot());
        };

        refreshGithubConfiguredSnapshot();
        window.addEventListener('credentials-updated', refreshGithubConfiguredSnapshot as EventListener);
        window.addEventListener('focus', refreshGithubConfiguredSnapshot);
        window.addEventListener('storage', refreshGithubConfiguredSnapshot);

        return () => {
            window.removeEventListener('credentials-updated', refreshGithubConfiguredSnapshot as EventListener);
            window.removeEventListener('focus', refreshGithubConfiguredSnapshot);
            window.removeEventListener('storage', refreshGithubConfiguredSnapshot);
        };
    }, []);

    React.useEffect(() => {
        const shouldLoadVirtuoso =
            historyLength > 0 || (showSearchResultsList && searchResultsLength > 0);
        if (!shouldLoadVirtuoso || VirtuosoComponent) return;

        let cancelled = false;
        import('react-virtuoso')
            .then((mod) => {
                if (cancelled) return;
                setVirtuosoComponent(() => mod.Virtuoso as ChatVirtuosoComponent);
            })
            .catch(() => {
                // Keep fallback UI if loading fails; app remains usable.
            });

        return () => {
            cancelled = true;
        };
    }, [historyLength, showSearchResultsList, searchResultsLength, VirtuosoComponent]);

    React.useEffect(() => {
        if (historyLength === 0) {
            setIntegrationAvailability(EMPTY_INTEGRATION_AVAILABILITY);
            return;
        }

        const refresh = () => {
            setIntegrationAvailability(readIntegrationAvailability());
        };
        refresh();
        const handleStorage = () => refresh();
        const handleFocus = () => refresh();
        const handleCredentialsUpdated = () => refresh();

        window.addEventListener('storage', handleStorage);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('credentials-updated', handleCredentialsUpdated as EventListener);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('credentials-updated', handleCredentialsUpdated as EventListener);
        };
    }, [historyLength]);

    return {
        hasConfiguredMcpServers,
        responsiveConfig,
        isCompactViewport: responsiveConfig.isMobile || responsiveConfig.isTablet,
        VirtuosoComponent,
        isCloudSyncAuthenticated,
        setIsCloudSyncAuthenticated,
        githubConfigured,
        integrationAvailability,
    };
};
