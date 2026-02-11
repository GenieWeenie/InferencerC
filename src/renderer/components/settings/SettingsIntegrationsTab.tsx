import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Calendar, Code, Mail, MessageSquare } from 'lucide-react';
import { slackService } from '../../services/slack';
import { discordService } from '../../services/discord';
import { emailService } from '../../services/email';
import { calendarService } from '../../services/calendar';
import { apiAccessService } from '../../services/apiAccess';

export const SettingsIntegrationsTab: React.FC = () => {
    const [slackWebhook, setSlackWebhook] = useState('');
    const [discordWebhook, setDiscordWebhook] = useState('');
    const [emailRecipient, setEmailRecipient] = useState('');
    const [calendarProvider, setCalendarProvider] = useState<'google' | 'outlook' | 'ical'>('google');
    const [apiEnabled, setApiEnabled] = useState(false);
    const [apiPort, setApiPort] = useState(3001);
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
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
                            onChange={(event) => setSlackWebhook(event.target.value)}
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
                            onChange={(event) => setDiscordWebhook(event.target.value)}
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
                            onChange={(event) => setEmailRecipient(event.target.value)}
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
                            onChange={(event) => setCalendarProvider(event.target.value as 'google' | 'outlook' | 'ical')}
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
                            onChange={(event) => setApiEnabled(event.target.checked)}
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
                                    onChange={(event) => setApiPort(parseInt(event.target.value, 10) || 3001)}
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
                                    onChange={(event) => setApiKey(event.target.value)}
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
