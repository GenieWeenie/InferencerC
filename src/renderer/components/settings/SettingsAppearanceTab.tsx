import React from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import type { ThemeConfig } from '../../services/theme';

export interface SettingsPreferences {
    defaultModel: string;
    codeFont: string;
    chatFont: string;
    codeFontSize: number;
    chatFontSize: number;
    layoutMode: string;
    autoScroll: boolean;
    notifications: boolean;
}

interface SettingsAppearanceTabProps {
    availableThemes: ThemeConfig[];
    currentTheme: ThemeConfig;
    onSelectTheme: (themeId: string) => void;
    preferences: SettingsPreferences;
    setPreferences: React.Dispatch<React.SetStateAction<SettingsPreferences>>;
}

export const SettingsAppearanceTab: React.FC<SettingsAppearanceTabProps> = ({
    availableThemes,
    currentTheme,
    onSelectTheme,
    preferences,
    setPreferences,
}) => {
    return (
        <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-2">
            <div>
                <h3 className="text-xl font-bold text-white mb-2">Theme Selection</h3>
                <p className="text-slate-500 text-sm">Choose a theme that matches your style and workflow.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableThemes.map((theme) => (
                    <button
                        key={theme.id}
                        onClick={() => {
                            onSelectTheme(theme.id);
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
                            <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.primaryColor }} title="Primary" />
                            <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.backgroundColor }} title="Background" />
                            <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.accentColor }} title="Accent" />
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
                    Themes are applied instantly. Your selection is saved automatically.
                </p>
            </div>

            <div className="space-y-6 mt-8">
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">Preferences</h3>
                    <p className="text-slate-500 text-sm">Customize your app experience.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <label className="block text-sm font-bold text-white mb-3">Default Model</label>
                    <select
                        value={preferences.defaultModel}
                        onChange={(event) => {
                            const next = { ...preferences, defaultModel: event.target.value };
                            setPreferences(next);
                            localStorage.setItem('app_default_model', event.target.value);
                            toast.success('Default model saved');
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                    >
                        <option value="">Use last selected</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-2">Model to use when starting a new chat</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <label className="block text-sm font-bold text-white">Font Settings</label>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Chat Font</label>
                            <select
                                value={preferences.chatFont}
                                onChange={(event) => {
                                    const next = { ...preferences, chatFont: event.target.value };
                                    setPreferences(next);
                                    localStorage.setItem('app_chat_font', event.target.value);
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
                                onChange={(event) => {
                                    const next = { ...preferences, chatFontSize: parseInt(event.target.value, 10) };
                                    setPreferences(next);
                                    localStorage.setItem('app_chat_font_size', event.target.value);
                                }}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Code Font</label>
                            <select
                                value={preferences.codeFont}
                                onChange={(event) => {
                                    const next = { ...preferences, codeFont: event.target.value };
                                    setPreferences(next);
                                    localStorage.setItem('app_code_font', event.target.value);
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
                                onChange={(event) => {
                                    const next = { ...preferences, codeFontSize: parseInt(event.target.value, 10) };
                                    setPreferences(next);
                                    localStorage.setItem('app_code_font_size', event.target.value);
                                }}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <label className="block text-sm font-bold text-white">Layout Options</label>

                    <div>
                        <label className="block text-xs text-slate-400 mb-2">Layout Mode</label>
                        <div className="flex gap-2">
                            {['normal', 'compact', 'wide'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => {
                                        const next = { ...preferences, layoutMode: mode };
                                        setPreferences(next);
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

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <label className="block text-sm font-bold text-white">Behavior</label>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-white font-medium">Auto-scroll to new messages</div>
                            <div className="text-xs text-slate-500">Automatically scroll when new messages arrive</div>
                        </div>
                        <button
                            onClick={() => {
                                const next = { ...preferences, autoScroll: !preferences.autoScroll };
                                setPreferences(next);
                                localStorage.setItem('app_auto_scroll', String(next.autoScroll));
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
                                const next = { ...preferences, notifications: !preferences.notifications };
                                setPreferences(next);
                                localStorage.setItem('app_notifications', String(next.notifications));
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
    );
};
