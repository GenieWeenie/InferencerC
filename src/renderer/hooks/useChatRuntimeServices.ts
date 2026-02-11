import React from 'react';
import type { LogEntry } from '../components/RequestResponseLog';
import type { UsageStatsRecord } from '../services/analyticsStore';
import type { CloudSyncStatus } from '../services/cloudSync';
import {
    loadActivityLogService,
    loadAnalyticsStore,
    loadCloudSyncService,
} from '../lib/chatLazyServices';

interface CloudSyncBadge {
    label: string;
    className: string;
    title: string;
}

interface UseChatRuntimeServicesParams {
    showRequestLog: boolean;
    hasHydratedApiLogs: boolean;
    setApiLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
    setApiLogCount: React.Dispatch<React.SetStateAction<number>>;
    setHasHydratedApiLogs: React.Dispatch<React.SetStateAction<boolean>>;
    showAnalytics: boolean;
    setUsageStats: React.Dispatch<React.SetStateAction<UsageStatsRecord[]>>;
    shouldLoadCloudSyncService: boolean;
    isCloudSyncAuthenticated: boolean;
    setIsCloudSyncAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useChatRuntimeServices = ({
    showRequestLog,
    hasHydratedApiLogs,
    setApiLogs,
    setApiLogCount,
    setHasHydratedApiLogs,
    showAnalytics,
    setUsageStats,
    shouldLoadCloudSyncService,
    isCloudSyncAuthenticated,
    setIsCloudSyncAuthenticated,
}: UseChatRuntimeServicesParams) => {
    const [cloudSyncStatus, setCloudSyncStatus] = React.useState<CloudSyncStatus | null>(null);

    React.useEffect(() => {
        if (!shouldLoadCloudSyncService) {
            setCloudSyncStatus(null);
            return;
        }

        let cancelled = false;

        const refreshCloudSyncStatus = async () => {
            try {
                const cloudSyncService = await loadCloudSyncService();
                if (cancelled) return;
                setCloudSyncStatus(cloudSyncService.getSyncStatus());
                setIsCloudSyncAuthenticated(cloudSyncService.isAuthenticated());
            } catch {
                if (cancelled) return;
                setCloudSyncStatus(null);
            }
        };

        void refreshCloudSyncStatus();
        const interval = setInterval(() => {
            void refreshCloudSyncStatus();
        }, 5000);

        const handleRefresh = () => {
            void refreshCloudSyncStatus();
        };
        window.addEventListener('focus', handleRefresh);
        window.addEventListener('storage', handleRefresh);

        return () => {
            cancelled = true;
            clearInterval(interval);
            window.removeEventListener('focus', handleRefresh);
            window.removeEventListener('storage', handleRefresh);
        };
    }, [setIsCloudSyncAuthenticated, shouldLoadCloudSyncService]);

    const cloudSyncBadge = React.useMemo<CloudSyncBadge>(() => {
        if (!isCloudSyncAuthenticated) {
            return {
                label: 'Cloud Off',
                className: 'bg-slate-800 hover:bg-slate-700 text-slate-300',
                title: 'Cloud sync is not authenticated',
            };
        }

        if (!cloudSyncStatus?.lastSyncedAt) {
            return {
                label: 'Cloud Ready',
                className: 'bg-cyan-900/40 hover:bg-cyan-800/40 text-cyan-300 border-cyan-700/60',
                title: 'Cloud sync is authenticated and ready',
            };
        }

        const ageMs = Date.now() - cloudSyncStatus.lastSyncedAt;
        if (ageMs < 5 * 60 * 1000) {
            return {
                label: 'Cloud Synced',
                className: 'bg-emerald-900/40 hover:bg-emerald-800/40 text-emerald-300 border-emerald-700/60',
                title: `Last sync ${new Date(cloudSyncStatus.lastSyncedAt).toLocaleString()}`,
            };
        }

        return {
            label: 'Cloud Stale',
            className: 'bg-amber-900/40 hover:bg-amber-800/40 text-amber-300 border-amber-700/60',
            title: `Last sync ${new Date(cloudSyncStatus.lastSyncedAt).toLocaleString()}`,
        };
    }, [cloudSyncStatus, isCloudSyncAuthenticated]);

    React.useEffect(() => {
        if (!showRequestLog || hasHydratedApiLogs) return;
        let cancelled = false;
        void loadActivityLogService()
            .then((service) => {
                if (cancelled) return;
                setApiLogs(service.getEntries());
                setApiLogCount(service.getEntryCount());
                setHasHydratedApiLogs(true);
            })
            .catch(() => {
                if (cancelled) return;
                setApiLogs([]);
                setHasHydratedApiLogs(true);
            });
        return () => {
            cancelled = true;
        };
    }, [hasHydratedApiLogs, setApiLogCount, setApiLogs, setHasHydratedApiLogs, showRequestLog]);

    React.useEffect(() => {
        if (!showAnalytics) return;
        void loadAnalyticsStore()
            .then((analyticsStore) => {
                setUsageStats(analyticsStore.readAnalyticsUsageStats());
            })
            .catch(() => {
                setUsageStats([]);
            });
    }, [setUsageStats, showAnalytics]);

    const clearApiLogs = React.useCallback(() => {
        void loadActivityLogService()
            .then((service) => {
                service.clear();
            })
            .catch(() => {
                // Keep UI state cleared even if persistent store clear fails.
            });
        setApiLogs([]);
        setApiLogCount(0);
        setHasHydratedApiLogs(true);
    }, [setApiLogCount, setApiLogs, setHasHydratedApiLogs]);

    return {
        cloudSyncBadge,
        clearApiLogs,
    };
};
