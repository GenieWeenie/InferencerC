import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    BarChart3,
    Check,
    Cloud,
    Copy,
    Plus,
    Settings,
    Shield,
    Users,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ChatSession, Model } from '../../shared/types';
import { TemplateService } from '../services/templates';
import {
    teamWorkspacesService,
    TeamWorkspace,
    WorkspaceIdentity,
    WorkspaceRole,
    WorkspaceUsageSummary,
} from '../services/teamWorkspaces';

interface TeamWorkspacesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    availableModels: Model[];
    conversations: ChatSession[];
}

const roleOrder: WorkspaceRole[] = ['admin', 'member', 'viewer'];

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
};

const providerFromModel = (model: Model): string => {
    if (model.id.startsWith('openrouter/')) return 'openrouter';
    if (model.type === 'local-folder') return 'local';
    if (model.pathOrUrl.includes('localhost')) return 'local';
    return 'custom';
};

const formatDate = (value: number): string => new Date(value).toLocaleString();

export const TeamWorkspacesPanel: React.FC<TeamWorkspacesPanelProps> = ({
    isOpen,
    onClose,
    availableModels,
    conversations,
}) => {
    const [identity, setIdentity] = React.useState<WorkspaceIdentity>(teamWorkspacesService.getIdentity());
    const [workspaces, setWorkspaces] = React.useState<TeamWorkspace[]>(teamWorkspacesService.getWorkspaces());
    const [activeWorkspaceId, setActiveWorkspaceId] = React.useState<string | null>(teamWorkspacesService.getActiveWorkspaceId());
    const [usage, setUsage] = React.useState<WorkspaceUsageSummary | null>(null);

    const [newWorkspaceName, setNewWorkspaceName] = React.useState('');
    const [newWorkspaceDescription, setNewWorkspaceDescription] = React.useState('');

    const [inviteRole, setInviteRole] = React.useState<WorkspaceRole>('member');
    const [joinToken, setJoinToken] = React.useState('');
    const [displayNameInput, setDisplayNameInput] = React.useState(identity.displayName);

    const templates = React.useMemo(() => TemplateService.getAllTemplates(), []);

    const refresh = React.useCallback(() => {
        const nextIdentity = teamWorkspacesService.getIdentity();
        const nextWorkspaces = teamWorkspacesService.getWorkspaces();
        const storedActiveId = teamWorkspacesService.getActiveWorkspaceId();

        setIdentity(nextIdentity);
        setWorkspaces(nextWorkspaces);

        const fallbackActive = storedActiveId || nextWorkspaces[0]?.id || null;
        setActiveWorkspaceId(fallbackActive);

        if (fallbackActive) {
            try {
                setUsage(teamWorkspacesService.getWorkspaceUsageSummary(fallbackActive));
            } catch {
                setUsage(null);
            }
        } else {
            setUsage(null);
        }
    }, []);

    React.useEffect(() => {
        if (!isOpen) return;

        refresh();
        setDisplayNameInput(teamWorkspacesService.getIdentity().displayName);

        const unsubscribe = teamWorkspacesService.subscribe(() => refresh());
        return unsubscribe;
    }, [isOpen, refresh]);

    const activeWorkspace = React.useMemo(
        () => workspaces.find(workspace => workspace.id === activeWorkspaceId) || null,
        [activeWorkspaceId, workspaces]
    );

    const currentMember = React.useMemo(() => {
        if (!activeWorkspace) return null;
        return activeWorkspace.members.find(member => member.id === identity.userId) || null;
    }, [activeWorkspace, identity.userId]);

    const isAdmin = currentMember?.role === 'admin';
    const canManageShared = currentMember?.role === 'admin' || currentMember?.role === 'member';

    const providerOptions = React.useMemo(() => {
        const providers = new Set<string>();
        availableModels.forEach(model => providers.add(providerFromModel(model)));
        return Array.from(providers.values()).sort();
    }, [availableModels]);

    const setActiveWorkspace = (workspaceId: string | null) => {
        teamWorkspacesService.setActiveWorkspace(workspaceId);
        setActiveWorkspaceId(workspaceId);
        refresh();
    };

    const handleCreateWorkspace = () => {
        try {
            const created = teamWorkspacesService.createWorkspace(newWorkspaceName, newWorkspaceDescription);
            setNewWorkspaceName('');
            setNewWorkspaceDescription('');
            setActiveWorkspace(created.id);
            toast.success('Workspace created');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to create workspace'));
        }
    };

    const handleSaveIdentity = () => {
        const name = displayNameInput.trim();
        if (!name) {
            toast.error('Display name is required');
            return;
        }

        teamWorkspacesService.setIdentity({ displayName: name });
        refresh();
        toast.success('Display name updated');
    };

    const handleGenerateInvite = () => {
        if (!activeWorkspace) return;
        try {
            const invite = teamWorkspacesService.generateInvite(activeWorkspace.id, inviteRole);
            navigator.clipboard.writeText(invite.inviteLink);
            refresh();
            toast.success('Invite link copied to clipboard');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to generate invite'));
        }
    };

    const handleAcceptInvite = () => {
        try {
            const workspace = teamWorkspacesService.acceptInvite(joinToken);
            setJoinToken('');
            setActiveWorkspace(workspace.id);
            toast.success(`Joined workspace: ${workspace.name}`);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to accept invite'));
        }
    };

    const toggleConversation = (sessionId: string) => {
        if (!activeWorkspace || !canManageShared) return;

        const next = new Set(activeWorkspace.conversationIds);
        if (next.has(sessionId)) next.delete(sessionId);
        else next.add(sessionId);

        try {
            teamWorkspacesService.setConversationCollection(activeWorkspace.id, Array.from(next));
            refresh();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to update collection'));
        }
    };

    const toggleTemplate = (templateId: string) => {
        if (!activeWorkspace || !canManageShared) return;

        const next = new Set(activeWorkspace.sharedTemplateIds);
        if (next.has(templateId)) next.delete(templateId);
        else next.add(templateId);

        try {
            teamWorkspacesService.setSharedTemplates(activeWorkspace.id, Array.from(next));
            refresh();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to update shared templates'));
        }
    };

    const toggleAllowedProvider = (provider: string) => {
        if (!activeWorkspace || !isAdmin) return;

        const next = new Set(activeWorkspace.modelPolicy.allowedProviders);
        if (next.has(provider)) next.delete(provider);
        else next.add(provider);

        try {
            teamWorkspacesService.updateModelPolicy(activeWorkspace.id, {
                allowedProviders: Array.from(next),
            });
            refresh();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to update provider policy'));
        }
    };

    const toggleAllowedModel = (modelId: string) => {
        if (!activeWorkspace || !isAdmin) return;

        const next = new Set(activeWorkspace.modelPolicy.allowedModelIds);
        if (next.has(modelId)) next.delete(modelId);
        else next.add(modelId);

        try {
            teamWorkspacesService.updateModelPolicy(activeWorkspace.id, {
                allowedModelIds: Array.from(next),
            });
            refresh();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to update model policy'));
        }
    };

    const clearModelPolicy = () => {
        if (!activeWorkspace || !isAdmin) return;
        teamWorkspacesService.updateModelPolicy(activeWorkspace.id, {
            allowedProviders: [],
            allowedModelIds: [],
        });
        refresh();
    };

    const handleMemberRoleChange = (memberId: string, role: WorkspaceRole) => {
        if (!activeWorkspace) return;
        try {
            teamWorkspacesService.updateMemberRole(activeWorkspace.id, memberId, role);
            refresh();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to update role'));
        }
    };

    const handleRemoveMember = (memberId: string) => {
        if (!activeWorkspace) return;
        try {
            teamWorkspacesService.removeMember(activeWorkspace.id, memberId);
            refresh();
            toast.success('Member removed');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to remove member'));
        }
    };

    const handleCopyInvite = (link: string) => {
        navigator.clipboard.writeText(link);
        toast.success('Invite link copied');
    };

    if (!isOpen) return null;

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
                    className="relative w-full max-w-6xl h-[92vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <Users className="w-6 h-6 text-cyan-400" />
                            <div>
                                <h2 className="text-2xl font-bold text-white">Team Workspaces</h2>
                                <p className="text-xs text-slate-400">Workspaces, roles, shared templates, and model access control</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                                <div className="text-sm text-slate-300 font-medium flex items-center gap-2">
                                    <Settings size={14} /> Identity
                                </div>
                                <input
                                    type="text"
                                    value={displayNameInput}
                                    onChange={(event) => setDisplayNameInput(event.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                    placeholder="Display name"
                                />
                                <button
                                    onClick={handleSaveIdentity}
                                    className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 rounded text-white"
                                >
                                    Save Name
                                </button>
                                <div className="text-[11px] text-slate-500 break-all">User ID: {identity.userId}</div>
                            </div>

                            <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3 lg:col-span-2">
                                <div className="text-sm text-slate-300 font-medium flex items-center gap-2">
                                    <Shield size={14} /> Workspace Selection
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={activeWorkspaceId || ''}
                                        onChange={(event) => setActiveWorkspace(event.target.value || null)}
                                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                    >
                                        <option value="">No active workspace</option>
                                        {workspaces.map(workspace => (
                                            <option key={workspace.id} value={workspace.id}>
                                                {workspace.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setActiveWorkspace(null)}
                                        className="px-3 py-2 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-200"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <input
                                        type="text"
                                        value={newWorkspaceName}
                                        onChange={(event) => setNewWorkspaceName(event.target.value)}
                                        className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                        placeholder="New workspace name"
                                    />
                                    <input
                                        type="text"
                                        value={newWorkspaceDescription}
                                        onChange={(event) => setNewWorkspaceDescription(event.target.value)}
                                        className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                        placeholder="Description"
                                    />
                                    <button
                                        onClick={handleCreateWorkspace}
                                        className="px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 rounded text-white flex items-center justify-center gap-2"
                                    >
                                        <Plus size={14} /> Create Workspace
                                    </button>
                                </div>
                            </div>
                        </section>

                        {activeWorkspace ? (
                            <>
                                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-slate-200 font-medium">Members</div>
                                            <div className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300">
                                                Your role: {currentMember?.role || 'none'}
                                            </div>
                                        </div>
                                        <div className="space-y-2 max-h-52 overflow-y-auto">
                                            {activeWorkspace.members.map(member => (
                                                <div key={member.id} className="p-2 bg-slate-900 border border-slate-700 rounded flex items-center gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-white truncate">
                                                            {member.name}
                                                            {member.id === identity.userId && ' (you)'}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">Joined {formatDate(member.joinedAt)}</div>
                                                    </div>
                                                    {isAdmin ? (
                                                        <>
                                                            <select
                                                                value={member.role}
                                                                onChange={(event) => handleMemberRoleChange(member.id, event.target.value as WorkspaceRole)}
                                                                className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200"
                                                            >
                                                                {roleOrder.map(role => (
                                                                    <option key={role} value={role}>{role}</option>
                                                                ))}
                                                            </select>
                                                            {member.id !== identity.userId && (
                                                                <button
                                                                    onClick={() => handleRemoveMember(member.id)}
                                                                    className="px-2 py-1 text-xs bg-rose-700/80 hover:bg-rose-700 rounded text-white"
                                                                >
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="text-xs text-slate-300 capitalize">{member.role}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                                        <div className="text-sm text-slate-200 font-medium">Invite Links</div>
                                        <div className="flex gap-2">
                                            <select
                                                value={inviteRole}
                                                onChange={(event) => setInviteRole(event.target.value as WorkspaceRole)}
                                                disabled={!isAdmin}
                                                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white disabled:opacity-50"
                                            >
                                                {roleOrder.map(role => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={handleGenerateInvite}
                                                disabled={!isAdmin}
                                                className="px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 rounded text-white"
                                            >
                                                Generate Invite
                                            </button>
                                        </div>
                                        <div className="space-y-2 max-h-36 overflow-y-auto">
                                            {activeWorkspace.invites.length === 0 ? (
                                                <div className="text-xs text-slate-500">No pending invites</div>
                                            ) : (
                                                activeWorkspace.invites.map(invite => (
                                                    <div key={invite.token} className="p-2 bg-slate-900 border border-slate-700 rounded flex items-center gap-2">
                                                        <div className="flex-1 min-w-0 text-xs">
                                                            <div className="text-slate-200">{invite.role} invite</div>
                                                            <div className="text-slate-500 truncate">{invite.inviteLink}</div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleCopyInvite(invite.inviteLink)}
                                                            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-100"
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={joinToken}
                                                onChange={(event) => setJoinToken(event.target.value)}
                                                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                                                placeholder="Paste invite token"
                                            />
                                            <button
                                                onClick={handleAcceptInvite}
                                                className="px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 rounded text-white flex items-center gap-1"
                                            >
                                                <Check size={14} /> Join
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                                        <div className="text-sm text-slate-200 font-medium">Shared Template Library</div>
                                        <div className="max-h-56 overflow-y-auto space-y-2">
                                            {templates.map(template => (
                                                <label key={template.id} className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200">
                                                    <input
                                                        type="checkbox"
                                                        checked={activeWorkspace.sharedTemplateIds.includes(template.id)}
                                                        onChange={() => toggleTemplate(template.id)}
                                                        disabled={!canManageShared}
                                                    />
                                                    <span className="truncate">{template.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {activeWorkspace.sharedTemplateIds.length} shared templates in this workspace.
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                                        <div className="text-sm text-slate-200 font-medium">Conversation Collection</div>
                                        <div className="max-h-56 overflow-y-auto space-y-2">
                                            {conversations.map(session => (
                                                <label key={session.id} className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200">
                                                    <input
                                                        type="checkbox"
                                                        checked={activeWorkspace.conversationIds.includes(session.id)}
                                                        onChange={() => toggleConversation(session.id)}
                                                        disabled={!canManageShared}
                                                    />
                                                    <span className="truncate">{session.title || 'Untitled conversation'}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {activeWorkspace.conversationIds.length} conversations included for workspace analytics.
                                        </div>
                                    </div>
                                </section>

                                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-slate-200 font-medium">Model & Provider Access Control</div>
                                            {isAdmin && (
                                                <button
                                                    onClick={clearModelPolicy}
                                                    className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200"
                                                >
                                                    Allow All
                                                </button>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400">Providers</div>
                                        <div className="flex flex-wrap gap-2">
                                            {providerOptions.map(provider => (
                                                <label key={provider} className="inline-flex items-center gap-2 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200">
                                                    <input
                                                        type="checkbox"
                                                        checked={activeWorkspace.modelPolicy.allowedProviders.includes(provider)}
                                                        onChange={() => toggleAllowedProvider(provider)}
                                                        disabled={!isAdmin}
                                                    />
                                                    {provider}
                                                </label>
                                            ))}
                                        </div>
                                        <div className="text-xs text-slate-400">Models</div>
                                        <div className="max-h-44 overflow-y-auto space-y-1">
                                            {availableModels.map(model => (
                                                <label key={model.id} className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200">
                                                    <input
                                                        type="checkbox"
                                                        checked={activeWorkspace.modelPolicy.allowedModelIds.includes(model.id)}
                                                        onChange={() => toggleAllowedModel(model.id)}
                                                        disabled={!isAdmin}
                                                    />
                                                    <span className="truncate">{model.name}</span>
                                                    <span className="text-slate-500">({providerFromModel(model)})</span>
                                                </label>
                                            ))}
                                        </div>
                                        {!isAdmin && <div className="text-xs text-amber-400">Only admins can modify access control policies.</div>}
                                    </div>

                                    <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                                        <div className="text-sm text-slate-200 font-medium flex items-center gap-2">
                                            <BarChart3 size={14} /> Workspace Usage Analytics
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div className="p-2 rounded bg-slate-900 border border-slate-700 text-slate-200">
                                                <div className="text-slate-500">Tokens</div>
                                                <div className="text-sm font-semibold">{usage?.totalTokens || 0}</div>
                                            </div>
                                            <div className="p-2 rounded bg-slate-900 border border-slate-700 text-slate-200">
                                                <div className="text-slate-500">Messages</div>
                                                <div className="text-sm font-semibold">{usage?.totalMessages || 0}</div>
                                            </div>
                                            <div className="p-2 rounded bg-slate-900 border border-slate-700 text-slate-200">
                                                <div className="text-slate-500">Sessions</div>
                                                <div className="text-sm font-semibold">{usage?.totalSessions || 0}</div>
                                            </div>
                                        </div>
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                            {(usage?.topModels || []).length === 0 ? (
                                                <div className="text-xs text-slate-500">No analytics yet. Add conversations to collection and use chat.</div>
                                            ) : (
                                                (usage?.topModels || []).map(model => (
                                                    <div key={model.modelId} className="p-2 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 flex items-center justify-between gap-2">
                                                        <span className="truncate">{model.modelId}</span>
                                                        <span className="text-slate-400">{model.tokenCount} tokens</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </>
                        ) : (
                            <div className="p-6 rounded-lg border border-slate-700 bg-slate-800/40 text-slate-300 text-sm">
                                Create a workspace to enable invite links, role-based access, shared templates, model restrictions, and workspace analytics.
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-4 border-t border-slate-700 bg-slate-900/80 text-xs text-slate-400 flex items-center gap-2">
                        <Cloud size={12} className="text-cyan-400" />
                        Workspace model policies are enforced in model selection for the active workspace.
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
