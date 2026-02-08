import { Plugin, PluginManifest } from './pluginSystem';

export interface MarketplaceReview {
    author: string;
    rating: number;
    comment: string;
    date: string;
}

export interface MarketplacePublisher {
    name: string;
    verified: boolean;
}

export interface MarketplacePluginEntry {
    id: string;
    manifest: PluginManifest;
    publisher: MarketplacePublisher;
    tags: string[];
    category: string;
    rating: number;
    reviewCount: number;
    downloads: number;
    featured?: boolean;
    reviews: MarketplaceReview[];
}

export interface PluginUpdateInfo {
    pluginId: string;
    currentVersion: string;
    latestVersion: string;
    entry: MarketplacePluginEntry;
}

const MARKETPLACE_CATALOG: MarketplacePluginEntry[] = [
    {
        id: 'devtools.workflow-accelerator',
        manifest: {
            id: 'devtools.workflow-accelerator',
            name: 'Workflow Accelerator',
            version: '1.4.0',
            description: 'Adds automation commands for daily developer workflows.',
            author: 'DevTools Collective',
            entryPoint: 'index.js',
            apiVersion: '1.0.0',
            permissions: [{ type: 'storage' }],
            commands: [
                {
                    id: 'daily-standup',
                    label: 'Generate Daily Standup',
                    description: 'Creates a standup summary from recent sessions.',
                    category: 'Actions',
                    keywords: ['standup', 'summary', 'daily'],
                },
            ],
        },
        publisher: { name: 'DevTools Collective', verified: true },
        tags: ['automation', 'productivity', 'dev'],
        category: 'Productivity',
        rating: 4.8,
        reviewCount: 189,
        downloads: 12240,
        featured: true,
        reviews: [
            { author: 'dev_jules', rating: 5, comment: 'Saves me at least 20 minutes every day.', date: '2026-01-18' },
            { author: 'qa-bot', rating: 4, comment: 'Solid command set and very stable updates.', date: '2026-01-07' },
        ],
    },
    {
        id: 'export.jsonl-suite',
        manifest: {
            id: 'export.jsonl-suite',
            name: 'JSONL Export Suite',
            version: '2.1.0',
            description: 'Adds JSONL and transcript-friendly export options.',
            author: 'DataForge Labs',
            entryPoint: 'index.js',
            apiVersion: '1.0.0',
            permissions: [{ type: 'storage' }],
            exportFormats: [
                {
                    id: 'conversation-jsonl',
                    label: 'Conversation JSONL',
                    description: 'Structured message stream for analytics pipelines.',
                    fileExtension: 'jsonl',
                    mimeType: 'application/x-ndjson',
                    strategy: 'jsonl',
                },
            ],
        },
        publisher: { name: 'DataForge Labs', verified: true },
        tags: ['export', 'analytics', 'data'],
        category: 'Exports',
        rating: 4.7,
        reviewCount: 112,
        downloads: 7801,
        reviews: [
            { author: 'analyst_91', rating: 5, comment: 'Perfect for downstream BI workflows.', date: '2026-01-22' },
            { author: 'infraalex', rating: 4, comment: 'Straightforward and works as advertised.', date: '2026-01-04' },
        ],
    },
    {
        id: 'security.scope-auditor',
        manifest: {
            id: 'security.scope-auditor',
            name: 'Scope Auditor',
            version: '1.2.3',
            description: 'Audits plugin scopes and permission usage.',
            author: 'SecureOps',
            entryPoint: 'index.js',
            apiVersion: '1.0.0',
            permissions: [{ type: 'storage' }],
            commands: [
                {
                    id: 'audit-scopes',
                    label: 'Audit Plugin Scopes',
                    description: 'Validates file and network scope declarations.',
                    category: 'Settings',
                    keywords: ['security', 'scope', 'audit'],
                },
            ],
        },
        publisher: { name: 'SecureOps', verified: true },
        tags: ['security', 'audit'],
        category: 'Security',
        rating: 4.9,
        reviewCount: 76,
        downloads: 4210,
        reviews: [
            { author: 'sec-team', rating: 5, comment: 'Great visibility into plugin permissions.', date: '2026-01-15' },
            { author: 'lina', rating: 5, comment: 'Must-have for enterprise installs.', date: '2025-12-30' },
        ],
    },
    {
        id: 'writer.prompt-pack',
        manifest: {
            id: 'writer.prompt-pack',
            name: 'Prompt Pack Pro',
            version: '0.9.5',
            description: 'Adds reusable prompt actions for writing and editing tasks.',
            author: 'Creative Scripts',
            entryPoint: 'index.js',
            apiVersion: '1.0.0',
            permissions: [{ type: 'storage' }],
            commands: [
                {
                    id: 'rewrite-polish',
                    label: 'Rewrite and Polish',
                    description: 'Runs rewrite pass tuned for clarity and brevity.',
                    category: 'Actions',
                    keywords: ['rewrite', 'writing', 'edit'],
                },
            ],
        },
        publisher: { name: 'Creative Scripts', verified: false },
        tags: ['writing', 'prompts', 'editing'],
        category: 'Writing',
        rating: 4.2,
        reviewCount: 43,
        downloads: 1988,
        reviews: [
            { author: 'copywriter', rating: 4, comment: 'Useful set of starter templates.', date: '2026-01-11' },
            { author: 'content_ops', rating: 4, comment: 'Good balance between speed and quality.', date: '2025-12-19' },
        ],
    },
];

export class PluginMarketplaceService {
    private static instance: PluginMarketplaceService;

    static getInstance(): PluginMarketplaceService {
        if (!PluginMarketplaceService.instance) {
            PluginMarketplaceService.instance = new PluginMarketplaceService();
        }
        return PluginMarketplaceService.instance;
    }

    getCatalog(): MarketplacePluginEntry[] {
        return MARKETPLACE_CATALOG
            .slice()
            .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.rating - a.rating);
    }

    searchCatalog(query: string): MarketplacePluginEntry[] {
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
            return this.getCatalog();
        }

        return this.getCatalog().filter(entry => {
            const haystack = [
                entry.manifest.name,
                entry.manifest.description,
                entry.publisher.name,
                entry.category,
                ...entry.tags,
            ].join(' ').toLowerCase();
            return haystack.includes(normalized);
        });
    }

    getMarketplacePlugin(pluginId: string): MarketplacePluginEntry | undefined {
        return MARKETPLACE_CATALOG.find(entry => entry.manifest.id === pluginId || entry.id === pluginId);
    }

    getAvailableUpdates(installed: Plugin[]): PluginUpdateInfo[] {
        const updates: PluginUpdateInfo[] = [];
        installed.forEach(plugin => {
            const entry = this.getMarketplacePlugin(plugin.manifest.id);
            if (!entry) return;

            const currentVersion = plugin.manifest.version;
            const latestVersion = entry.manifest.version;
            if (this.compareVersions(latestVersion, currentVersion) > 0) {
                updates.push({
                    pluginId: plugin.manifest.id,
                    currentVersion,
                    latestVersion,
                    entry,
                });
            }
        });

        return updates.sort((a, b) => this.compareVersions(b.latestVersion, a.latestVersion));
    }

    private compareVersions(a: string, b: string): number {
        const parse = (version: string) => version.split('.').map(part => parseInt(part, 10) || 0);
        const av = parse(a);
        const bv = parse(b);
        const maxLen = Math.max(av.length, bv.length);

        for (let i = 0; i < maxLen; i++) {
            const ai = av[i] ?? 0;
            const bi = bv[i] ?? 0;
            if (ai > bi) return 1;
            if (ai < bi) return -1;
        }
        return 0;
    }
}

export const pluginMarketplaceService = PluginMarketplaceService.getInstance();
