import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Cloud,
    KeyRound,
    Loader2,
    LogIn,
    LogOut,
    RefreshCw,
    Server,
    ShieldCheck,
    UserPlus,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ChatSession } from '../../shared/types';
import {
    cloudSyncService,
    CloudSyncConfig,
    CloudSyncProfileResponse,
    CloudSyncStatus,
    CloudSyncSummary,
} from '../services/cloudSync';
import { HistoryService } from '../services/history';

interface CloudSyncPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const formatBytes = (value: number): string => {
    if (!Number.isFinite(value) || value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = value;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index += 1;
    }
    return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatTimestamp = (value: number): string => {
    if (!value) return 'Never';
    return new Date(value).toLocaleString();
};

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({ isOpen, onClose }) => {
    const [config, setConfig] = React.useState<CloudSyncConfig>(cloudSyncService.getConfig());
    const [sessions, setSessions] = React.useState<ChatSession[]>([]);
    const [profile, setProfile] = React.useState<CloudSyncProfileResponse | null>(null);
    const [status, setStatus] = React.useState<CloudSyncStatus | null>(cloudSyncService.getSyncStatus());
    const [lastSummary, setLastSummary] = React.useState<CloudSyncSummary | null>(null);

    const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [passphrase, setPassphrase] = React.useState('');

    const [isBusy, setIsBusy] = React.useState(false);
    const [isSyncing, setIsSyncing] = React.useState(false);

    const refreshSessions = React.useCallback(() => {
        setSessions(HistoryService.getAllSessions());
    }, []);

    const refreshProfile = React.useCallback(async () => {
        if (!cloudSyncService.isAuthenticated()) {
            setProfile(null);
            setStatus(null);
            return;
        }

        try {
            const nextProfile = await cloudSyncService.getProfile();
            setProfile(nextProfile);
        } catch (error: any) {
            setProfile(null);
            toast.error(error?.message || 'Failed to load cloud profile');
        }

        setStatus(cloudSyncService.getSyncStatus());
    }, []);

    React.useEffect(() => {
        if (!isOpen) {
            return;
        }

        const nextConfig = cloudSyncService.getConfig();
        setConfig(nextConfig);
        setEmail(nextConfig.email || '');
        setPassword('');
        setPassphrase('');
        refreshSessions();
        setStatus(cloudSyncService.getSyncStatus());

        if (cloudSyncService.isAuthenticated()) {
            void refreshProfile();
        } else {
            setProfile(null);
        }
    }, [isOpen, refreshProfile, refreshSessions]);

    const updateConfig = (partial: Partial<CloudSyncConfig>) => {
        const next = cloudSyncService.updateConfig(partial);
        setConfig(next);
    };

    const handleAuth = async () => {
        const normalizedEmail = email.trim();
        if (!normalizedEmail || !password) {
            toast.error('Email and password are required');
            return;
        }

        setIsBusy(true);
        try {
            if (authMode === 'register') {
                await cloudSyncService.register(normalizedEmail, password);
                toast.success('Cloud account created');
            } else {
                await cloudSyncService.login(normalizedEmail, password);
                toast.success('Logged in to cloud sync');
            }
            setConfig(cloudSyncService.getConfig());
            setPassword('');
            await refreshProfile();
        } catch (error: any) {
            toast.error(error?.message || 'Authentication failed');
        } finally {
            setIsBusy(false);
        }
    };

    const handleLogout = async () => {
        setIsBusy(true);
        try {
            await cloudSyncService.logout();
            setConfig(cloudSyncService.getConfig());
            setProfile(null);
            setStatus(null);
            setPassphrase('');
            toast.info('Logged out of cloud sync');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to log out');
        } finally {
            setIsBusy(false);
        }
    };

    const allSessionIds = React.useMemo(() => sessions.map(session => session.id), [sessions]);

    const selectedSessionIds = React.useMemo(() => {
        if (config.selectedConversationIds.length === 0) {
            return allSessionIds;
        }
        return config.selectedConversationIds;
    }, [allSessionIds, config.selectedConversationIds]);

    const selectedSet = React.useMemo(() => new Set(selectedSessionIds), [selectedSessionIds]);

    const toggleSessionSelection = (sessionId: string) => {
        if (config.selectedConversationIds.length === 0) {
            const next = allSessionIds.filter(id => id !== sessionId);
            updateConfig({ selectedConversationIds: next });
            return;
        }

        const next = new Set(config.selectedConversationIds);
        if (next.has(sessionId)) {
            next.delete(sessionId);
        } else {
            next.add(sessionId);
        }
        updateConfig({ selectedConversationIds: Array.from(next) });
    };

    const setSyncAll = (enabled: boolean) => {
        if (enabled) {
            updateConfig({ selectedConversationIds: [] });
            return;
        }

        updateConfig({ selectedConversationIds: allSessionIds });
    };

    const handleSyncNow = async () => {
        if (!cloudSyncService.isAuthenticated()) {
            toast.error('Sign in to cloud sync first');
            return;
        }

        setIsSyncing(true);
        try {
            const normalizedPassphrase = passphrase.trim();
            if (normalizedPassphrase) {
                cloudSyncService.setPassphrase(normalizedPassphrase);
            }

            const summary = await cloudSyncService.syncNow(normalizedPassphrase || undefined);
            setLastSummary(summary);
            setStatus(cloudSyncService.getSyncStatus());
            await refreshProfile();
            toast.success('Sync completed');
        } catch (error: any) {
            toast.error(error?.message || 'Sync failed');
        } finally {
            setIsSyncing(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.97, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.97, opacity: 0 }}
                    onClick={(event) => event.stopPropagation()}
                    className="relative w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden"
                >
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <Cloud className="w-6 h-6 text-cyan-400" />
                            <div>
                                <h2 className="text-2xl font-bold text-white">Cloud Sync</h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    End-to-end encrypted cross-device sync with selective conversation control
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <section className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                                <Server size={16} className="text-cyan-400" /> Sync Endpoint
                            </div>
                            <input
                                type="text"
                                value={config.baseUrl}
                                onChange={(event) => updateConfig({ baseUrl: event.target.value })}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                                placeholder="http://localhost:3000"
                            />
                        </section>

                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                                    <ShieldCheck size={16} className="text-emerald-400" /> Account
                                </div>
                                {cloudSyncService.isAuthenticated() && (
                                    <button
                                        onClick={() => void refreshProfile()}
                                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200 flex items-center gap-1"
                                    >
                                        <RefreshCw size={12} /> Refresh
                                    </button>
                                )}
                            </div>

                            {!cloudSyncService.isAuthenticated() ? (
                                <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                                    <div className="flex items-center gap-2 text-xs">
                                        <button
                                            onClick={() => setAuthMode('login')}
                                            className={`px-2 py-1 rounded ${authMode === 'login' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                        >
                                            Login
                                        </button>
                                        <button
                                            onClick={() => setAuthMode('register')}
                                            className={`px-2 py-1 rounded ${authMode === 'register' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                        >
                                            Register
                                        </button>
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                        placeholder="you@example.com"
                                    />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                        placeholder="Password (min 8 chars)"
                                    />
                                    <button
                                        onClick={handleAuth}
                                        disabled={isBusy}
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white rounded transition-colors flex items-center gap-2"
                                    >
                                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : authMode === 'register' ? <UserPlus size={16} /> : <LogIn size={16} />}
                                        {authMode === 'register' ? 'Create Cloud Account' : 'Login'}
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-2 text-sm">
                                    <div className="text-slate-200">Signed in as <span className="font-semibold">{config.email}</span></div>
                                    {profile && (
                                        <div className="text-xs text-slate-400 space-y-1">
                                            <div>Cloud conversations: {profile.conversationCount}</div>
                                            <div>Server revision: {profile.revision}</div>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        disabled={isBusy}
                                        className="px-3 py-1.5 text-xs bg-rose-700/80 hover:bg-rose-700 disabled:opacity-60 text-white rounded transition-colors inline-flex items-center gap-1"
                                    >
                                        <LogOut size={12} /> Logout
                                    </button>
                                </div>
                            )}
                        </section>

                        <section className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                                <KeyRound size={16} className="text-amber-400" /> Encryption Passphrase
                            </div>
                            <input
                                type="password"
                                value={passphrase}
                                onChange={(event) => setPassphrase(event.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                                placeholder="Passphrase used to encrypt/decrypt sync payloads"
                            />
                            <p className="text-xs text-slate-400">
                                Sync payloads are encrypted client-side before upload. Keep this passphrase consistent across devices.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-slate-200">Sync Scope</div>
                                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={config.selectedConversationIds.length === 0}
                                        onChange={(event) => setSyncAll(event.target.checked)}
                                    />
                                    Sync all conversations
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="flex items-center justify-between p-3 rounded border border-slate-700 bg-slate-800/60 text-sm text-slate-200">
                                    <span>Sync app settings</span>
                                    <input
                                        type="checkbox"
                                        checked={config.syncSettings}
                                        onChange={(event) => updateConfig({ syncSettings: event.target.checked })}
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 rounded border border-slate-700 bg-slate-800/60 text-sm text-slate-200">
                                    <span>Sync templates</span>
                                    <input
                                        type="checkbox"
                                        checked={config.syncTemplates}
                                        onChange={(event) => updateConfig({ syncTemplates: event.target.checked })}
                                    />
                                </label>
                            </div>

                            <div className="max-h-52 overflow-y-auto border border-slate-700 rounded-lg bg-slate-800/40">
                                {sessions.length === 0 ? (
                                    <div className="px-3 py-4 text-sm text-slate-400">No local conversations available.</div>
                                ) : (
                                    sessions.map(session => (
                                        <label
                                            key={session.id}
                                            className="flex items-center justify-between gap-3 px-3 py-2 border-b last:border-b-0 border-slate-700/60 text-sm text-slate-200"
                                        >
                                            <div className="min-w-0">
                                                <div className="truncate">{session.title || 'Untitled conversation'}</div>
                                                <div className="text-[11px] text-slate-500 truncate">{session.id}</div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedSet.has(session.id)}
                                                onChange={() => toggleSessionSelection(session.id)}
                                            />
                                        </label>
                                    ))
                                )}
                            </div>
                            <p className="text-xs text-slate-400">
                                Bandwidth-efficient sync only transfers conversations whose hashes changed since last successful sync.
                            </p>
                        </section>
                    </div>

                    <div className="px-6 py-4 border-t border-slate-700 bg-slate-900/80 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <button
                                onClick={handleSyncNow}
                                disabled={isSyncing || !cloudSyncService.isAuthenticated()}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded transition-colors flex items-center gap-2"
                            >
                                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw size={16} />}
                                Sync Now
                            </button>
                            <div className="text-xs text-slate-400">
                                Last synced: {formatTimestamp(status?.lastSyncedAt || 0)}
                            </div>
                        </div>

                        {lastSummary && (
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
                                <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-200">Uploaded: {lastSummary.uploadedConversations}</div>
                                <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-200">Downloaded: {lastSummary.downloadedConversations}</div>
                                <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-200">Conflicts: {lastSummary.conflictsResolved}</div>
                                <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-200">Upload bytes: {formatBytes(lastSummary.uploadedBytes)}</div>
                                <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-200">Download bytes: {formatBytes(lastSummary.downloadedBytes)}</div>
                                <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-200">Revision: {lastSummary.serverRevision}</div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
