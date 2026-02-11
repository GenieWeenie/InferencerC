import React from 'react';
import { Database, Globe, Key, Save } from 'lucide-react';

interface SettingsApiTabProps {
    openRouterKey: string;
    setOpenRouterKey: React.Dispatch<React.SetStateAction<string>>;
    githubKey: string;
    setGithubKey: React.Dispatch<React.SetStateAction<string>>;
    notionKey: string;
    setNotionKey: React.Dispatch<React.SetStateAction<string>>;
    notionDatabaseId: string;
    setNotionDatabaseId: React.Dispatch<React.SetStateAction<string>>;
    onSaveOpenRouterKey: () => void | Promise<void>;
    onSaveGithubKey: () => void | Promise<void>;
    onSaveNotionConfig: () => void | Promise<void>;
}

export const SettingsApiTab: React.FC<SettingsApiTabProps> = ({
    openRouterKey,
    setOpenRouterKey,
    githubKey,
    setGithubKey,
    notionKey,
    setNotionKey,
    notionDatabaseId,
    setNotionDatabaseId,
    onSaveOpenRouterKey,
    onSaveGithubKey,
    onSaveNotionConfig,
}) => (
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
                            onChange={(event) => setOpenRouterKey(event.target.value)}
                            placeholder="sk-or-..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none placeholder-slate-600 font-mono"
                        />
                        <button
                            onClick={onSaveOpenRouterKey}
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
                            onChange={(event) => setGithubKey(event.target.value)}
                            placeholder="ghp_..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none placeholder-slate-600 font-mono"
                        />
                        <button
                            onClick={onSaveGithubKey}
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
                        onChange={(event) => setNotionKey(event.target.value)}
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
                        onChange={(event) => setNotionDatabaseId(event.target.value)}
                        placeholder="32-character database ID"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none placeholder-slate-600 font-mono"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Get the database ID from the Notion database URL. The ID is the 32-character string after the workspace name.
                    </p>
                </div>
                <button
                    onClick={onSaveNotionConfig}
                    className="px-6 py-3 bg-primary text-slate-900 font-bold rounded-lg hover:brightness-110 transition-all flex items-center gap-2 w-full justify-center"
                >
                    <Save size={18} />
                    Save Configuration
                </button>
            </div>
        </div>
    </div>
);
