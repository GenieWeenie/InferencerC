import React from 'react';
import { Activity, Lock, RefreshCw, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { encryptionService } from '../../services/encryption';
import { privacyService } from '../../services/privacy';

interface SettingsPrivacyTabProps {
    privacyMode: boolean;
    setPrivacyMode: React.Dispatch<React.SetStateAction<boolean>>;
    analyticsEnabled: boolean;
    setAnalyticsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    appVersion: string;
    updateAvailable: boolean;
    setUpdateAvailable: React.Dispatch<React.SetStateAction<boolean>>;
    updateInfo: any;
}

export const SettingsPrivacyTab: React.FC<SettingsPrivacyTabProps> = ({
    privacyMode,
    setPrivacyMode,
    analyticsEnabled,
    setAnalyticsEnabled,
    appVersion,
    updateAvailable,
    setUpdateAvailable,
    updateInfo,
}) => {
    return (
        <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
            <div>
                <h3 className="text-xl font-bold text-white mb-2">Privacy & Security</h3>
                <p className="text-slate-500 text-sm">Control data collection, encryption, and app updates</p>
            </div>

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
                            onChange={(event) => {
                                const enabled = event.target.checked;
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
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </label>
                </div>
            </div>

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
                            onChange={(event) => {
                                const enabled = event.target.checked;
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
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50" />
                    </label>
                </div>
                {privacyMode && (
                    <p className="text-xs text-slate-500 mt-2">Analytics are disabled when Privacy Mode is enabled</p>
                )}
            </div>

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
                            localStorage.clear();
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
    );
};
