import React from 'react';
import { Activity, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { webhookService } from '../../services/webhooks';

interface WebhookDraft {
    name: string;
    url: string;
    enabled: boolean;
    events: string[];
}

interface SettingsWebhooksTabProps {
    webhooks: any[];
    setWebhooks: React.Dispatch<React.SetStateAction<any[]>>;
    newWebhook: WebhookDraft;
    setNewWebhook: React.Dispatch<React.SetStateAction<WebhookDraft>>;
    showAddWebhook: boolean;
    setShowAddWebhook: React.Dispatch<React.SetStateAction<boolean>>;
}

export const SettingsWebhooksTab: React.FC<SettingsWebhooksTabProps> = ({
    webhooks,
    setWebhooks,
    newWebhook,
    setNewWebhook,
    showAddWebhook,
    setShowAddWebhook,
}) => {
    return (
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

            {showAddWebhook && (
                <div className="bg-slate-900 border border-primary/30 rounded-xl p-6 animate-in slide-in-from-top-2">
                    <h4 className="font-bold text-white mb-4">New Webhook</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1">Name</label>
                            <input
                                value={newWebhook.name}
                                onChange={(event) => setNewWebhook({ ...newWebhook, name: event.target.value })}
                                placeholder="My Webhook"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1">URL</label>
                            <input
                                value={newWebhook.url}
                                onChange={(event) => setNewWebhook({ ...newWebhook, url: event.target.value })}
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
                                        onChange={(event) => {
                                            if (event.target.checked) {
                                                setNewWebhook({ ...newWebhook, events: [...newWebhook.events, 'conversation_complete'] });
                                            } else {
                                                setNewWebhook({
                                                    ...newWebhook,
                                                    events: newWebhook.events.filter((value) => value !== 'conversation_complete'),
                                                });
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

            <div className="space-y-3">
                {webhooks.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                        <Activity size={32} className="mx-auto text-slate-600 mb-3" />
                        <p className="text-slate-500">No webhooks configured</p>
                        <p className="text-xs text-slate-600 mt-1">Add a webhook to receive notifications</p>
                    </div>
                ) : (
                    webhooks.map((webhook) => (
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
    );
};
