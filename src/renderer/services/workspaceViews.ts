/**
 * Workspace Views Service
 *
 * Multiple workspace view modes (grid, list, kanban)
 */

export type WorkspaceViewMode = 'list' | 'grid' | 'kanban' | 'compact';

export interface WorkspaceViewConfig {
    mode: WorkspaceViewMode;
    groupBy?: 'date' | 'category' | 'model' | 'tag' | 'none';
    sortBy?: 'date' | 'title' | 'messageCount' | 'lastActivity';
    sortOrder?: 'asc' | 'desc';
    showPinned?: boolean;
    showArchived?: boolean;
    itemsPerPage?: number;
}

export interface ConversationGroup {
    id: string;
    label: string;
    conversations: Array<{
        id: string;
        title: string;
        lastMessage?: string;
        messageCount: number;
        lastActivity: number;
        pinned?: boolean;
        archived?: boolean;
        category?: string;
        tags?: string[];
        model?: string;
    }>;
}

export class WorkspaceViewsService {
    private static instance: WorkspaceViewsService;
    private readonly STORAGE_KEY = 'workspace_view_config';

    private constructor() {}

    static getInstance(): WorkspaceViewsService {
        if (!WorkspaceViewsService.instance) {
            WorkspaceViewsService.instance = new WorkspaceViewsService();
        }
        return WorkspaceViewsService.instance;
    }

    /**
     * Get workspace view configuration
     */
    getConfig(): WorkspaceViewConfig {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load workspace view config:', error);
        }

        return {
            mode: 'list',
            groupBy: 'date',
            sortBy: 'lastActivity',
            sortOrder: 'desc',
            showPinned: true,
            showArchived: false,
            itemsPerPage: 20,
        };
    }

    /**
     * Update workspace view configuration
     */
    updateConfig(config: Partial<WorkspaceViewConfig>): void {
        const current = this.getConfig();
        const updated = { ...current, ...config };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    }

    /**
     * Group conversations by criteria
     */
    groupConversations(
        conversations: Array<{
            id: string;
            title: string;
            lastMessage?: string;
            messageCount: number;
            lastActivity: number;
            pinned?: boolean;
            archived?: boolean;
            category?: string;
            tags?: string[];
            model?: string;
        }>,
        groupBy: WorkspaceViewConfig['groupBy']
    ): ConversationGroup[] {
        if (!groupBy || groupBy === 'none') {
            return [{
                id: 'all',
                label: 'All Conversations',
                conversations,
            }];
        }

        const groups = new Map<string, ConversationGroup>();

        conversations.forEach(conv => {
            let groupKey = 'other';
            let groupLabel = 'Other';

            switch (groupBy) {
                case 'date':
                    const date = new Date(conv.lastActivity);
                    const today = new Date();
                    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays === 0) {
                        groupKey = 'today';
                        groupLabel = 'Today';
                    } else if (diffDays === 1) {
                        groupKey = 'yesterday';
                        groupLabel = 'Yesterday';
                    } else if (diffDays < 7) {
                        groupKey = 'this-week';
                        groupLabel = 'This Week';
                    } else if (diffDays < 30) {
                        groupKey = 'this-month';
                        groupLabel = 'This Month';
                    } else {
                        groupKey = 'older';
                        groupLabel = 'Older';
                    }
                    break;
                case 'category':
                    groupKey = conv.category || 'uncategorized';
                    groupLabel = conv.category || 'Uncategorized';
                    break;
                case 'model':
                    groupKey = conv.model || 'unknown';
                    groupLabel = conv.model || 'Unknown Model';
                    break;
                case 'tag':
                    if (conv.tags && conv.tags.length > 0) {
                        groupKey = conv.tags[0];
                        groupLabel = conv.tags[0];
                    } else {
                        groupKey = 'untagged';
                        groupLabel = 'Untagged';
                    }
                    break;
            }

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    id: groupKey,
                    label: groupLabel,
                    conversations: [],
                });
            }
            groups.get(groupKey)!.conversations.push(conv);
        });

        return Array.from(groups.values());
    }

    /**
     * Sort conversations
     */
    sortConversations(
        conversations: ConversationGroup['conversations'],
        sortBy: WorkspaceViewConfig['sortBy'],
        sortOrder: WorkspaceViewConfig['sortOrder']
    ): ConversationGroup['conversations'] {
        const sorted = [...conversations];

        sorted.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'date':
                case 'lastActivity':
                    comparison = a.lastActivity - b.lastActivity;
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'messageCount':
                    comparison = a.messageCount - b.messageCount;
                    break;
                default:
                    comparison = 0;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        // Always show pinned first
        return sorted.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0;
        });
    }
}

export const workspaceViewsService = WorkspaceViewsService.getInstance();
