/**
 * Real-Time Collaboration Panel
 *
 * Networked collaboration with shared conversation editing,
 * presence indicators, host access control, and conflict handling.
 */

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Check,
    Copy,
    Crown,
    Edit2,
    Loader2,
    Save,
    Send,
    UserMinus,
    Users,
    X,
} from 'lucide-react';
import {
    CollaborationConversationMessage,
    CollaborationEvent,
    CollaborationSession,
    realTimeCollaborationService,
} from '../services/realTimeCollaboration';
import { toast } from 'sonner';

interface RealTimeCollaborationPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const parseCursor = (text: string, offset: number): { line: number; column: number } => {
    const safeOffset = Math.max(0, Math.min(offset, text.length));
    const before = text.slice(0, safeOffset);
    const line = before.split('\n').length;
    const lastBreak = before.lastIndexOf('\n');
    const column = safeOffset - (lastBreak >= 0 ? lastBreak : -1);
    return { line, column };
};

export const RealTimeCollaborationPanel: React.FC<RealTimeCollaborationPanelProps> = ({
    isOpen,
    onClose,
}) => {
    const [config, setConfig] = React.useState(realTimeCollaborationService.getConfig());
    const [currentSession, setCurrentSession] = React.useState<CollaborationSession | null>(
        realTimeCollaborationService.getCurrentSession()
    );
    const [eventFeed, setEventFeed] = React.useState<CollaborationEvent[]>([]);

    const [sessionName, setSessionName] = React.useState('');
    const [joinSessionId, setJoinSessionId] = React.useState('');
    const [messageInput, setMessageInput] = React.useState('');

    const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null);
    const [editingContent, setEditingContent] = React.useState('');

    const [isBusy, setIsBusy] = React.useState(false);

    const messageInputRef = React.useRef<HTMLTextAreaElement | null>(null);

    const localParticipantId = realTimeCollaborationService.getCurrentParticipantId();
    const isHost = realTimeCollaborationService.isCurrentUserHost();

    React.useEffect(() => {
        if (!isOpen) {
            return;
        }

        const unsubscribeSession = realTimeCollaborationService.subscribeSession((session) => {
            setCurrentSession(session);
            if (!session) {
                setEditingMessageId(null);
                setEditingContent('');
            }
        });

        const unsubscribeEvents = realTimeCollaborationService.subscribeEvent((event) => {
            setEventFeed(prev => [...prev.slice(-39), event]);
        });

        setConfig(realTimeCollaborationService.getConfig());

        return () => {
            unsubscribeSession();
            unsubscribeEvents();
        };
    }, [isOpen]);

    const persistConfig = (next: Partial<typeof config>) => {
        const saved = realTimeCollaborationService.saveConfig(next);
        setConfig(saved);
    };

    const handleCreateSession = async () => {
        if (!sessionName.trim()) {
            toast.error('Enter a session name');
            return;
        }

        setIsBusy(true);
        try {
            await realTimeCollaborationService.createSession(sessionName.trim());
            setSessionName('');
            toast.success('Collaboration session created');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to create session');
        } finally {
            setIsBusy(false);
        }
    };

    const handleJoinSession = async () => {
        if (!joinSessionId.trim()) {
            toast.error('Enter a session ID');
            return;
        }

        setIsBusy(true);
        try {
            await realTimeCollaborationService.joinSession(joinSessionId.trim());
            setJoinSessionId('');
            toast.success('Joined collaboration session');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to join session');
        } finally {
            setIsBusy(false);
        }
    };

    const handleLeave = async () => {
        setIsBusy(true);
        try {
            await realTimeCollaborationService.leaveSession();
            setMessageInput('');
            toast.info('Left collaboration session');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to leave session');
        } finally {
            setIsBusy(false);
        }
    };

    const handleSendMessage = async () => {
        const next = messageInput.trim();
        if (!next) {
            return;
        }

        try {
            await realTimeCollaborationService.sendMessage(next);
            realTimeCollaborationService.stopTyping();
            setMessageInput('');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to send message');
        }
    };

    const beginEdit = (message: CollaborationConversationMessage) => {
        setEditingMessageId(message.id);
        setEditingContent(message.content);
    };

    const cancelEdit = () => {
        setEditingMessageId(null);
        setEditingContent('');
    };

    const saveEdit = async (message: CollaborationConversationMessage) => {
        const next = editingContent.trim();
        if (!next) {
            toast.error('Message cannot be empty');
            return;
        }

        try {
            const result = await realTimeCollaborationService.editMessage(message.id, next, message.version);
            if (result.conflict) {
                toast.warning('Conflict detected. Server merged both edits.');
            } else {
                toast.success('Message updated');
            }
            cancelEdit();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to edit message');
        }
    };

    const handleKickParticipant = async (participantId: string, participantName: string) => {
        try {
            await realTimeCollaborationService.kickParticipant(participantId);
            toast.success(`Removed ${participantName} from session`);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to remove participant');
        }
    };

    const handleCopySessionId = () => {
        if (!currentSession) {
            return;
        }
        navigator.clipboard.writeText(currentSession.id);
        toast.success('Session ID copied');
    };

    const sortedParticipants = React.useMemo(() => {
        if (!currentSession) {
            return [];
        }
        return [...currentSession.participants].sort((a, b) => {
            if (a.isHost && !b.isHost) return -1;
            if (!a.isHost && b.isHost) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [currentSession]);

    const typingParticipants = React.useMemo(() => {
        if (!currentSession) {
            return [];
        }
        return currentSession.participants.filter(participant =>
            participant.id !== localParticipantId && participant.isTyping
        );
    }, [currentSession, localParticipantId]);

    const cursorParticipants = React.useMemo(() => {
        if (!currentSession) {
            return [];
        }
        return currentSession.participants.filter(participant =>
            participant.id !== localParticipantId && participant.cursorPosition
        );
    }, [currentSession, localParticipantId]);

    if (!isOpen) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    onClick={(event) => event.stopPropagation()}
                    className="relative w-full max-w-6xl h-[90vh] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden"
                >
                    <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <Users size={18} className="text-emerald-400" />
                            <h2 className="text-lg font-semibold">Real-Time Collaboration</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded hover:bg-slate-800 text-slate-300"
                            title="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-4 border-b border-slate-800 bg-slate-950/60 grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <label className="text-xs text-slate-400 flex flex-col gap-1">
                            Server URL
                            <input
                                value={config.baseUrl}
                                onChange={(event) => setConfig(prev => ({ ...prev, baseUrl: event.target.value }))}
                                onBlur={() => persistConfig({ baseUrl: config.baseUrl })}
                                placeholder="http://localhost:3000"
                                className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                            />
                        </label>
                        <label className="text-xs text-slate-400 flex flex-col gap-1">
                            Display Name
                            <input
                                value={config.displayName}
                                onChange={(event) => setConfig(prev => ({ ...prev, displayName: event.target.value }))}
                                onBlur={() => persistConfig({ displayName: config.displayName })}
                                placeholder="Your name"
                                className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                            />
                        </label>
                    </div>

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] overflow-hidden">
                        <aside className="border-r border-slate-800 p-4 overflow-y-auto custom-scrollbar space-y-4">
                            {!currentSession ? (
                                <>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-slate-200">Create Session</h3>
                                        <input
                                            value={sessionName}
                                            onChange={(event) => setSessionName(event.target.value)}
                                            placeholder="Sprint planning"
                                            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-sm"
                                        />
                                        <button
                                            onClick={handleCreateSession}
                                            disabled={isBusy}
                                            className="w-full px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold"
                                        >
                                            {isBusy ? 'Creating...' : 'Create'}
                                        </button>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-800">
                                        <h3 className="text-sm font-semibold text-slate-200">Join Session</h3>
                                        <input
                                            value={joinSessionId}
                                            onChange={(event) => setJoinSessionId(event.target.value)}
                                            placeholder="Session ID"
                                            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-sm"
                                        />
                                        <button
                                            onClick={handleJoinSession}
                                            disabled={isBusy}
                                            className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold"
                                        >
                                            {isBusy ? 'Joining...' : 'Join'}
                                        </button>
                                    </div>

                                    <p className="text-xs text-slate-500 pt-2">
                                        Share server URL + session ID with collaborators on other machines.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-slate-200">Session</h3>
                                        <div className="p-3 rounded bg-slate-900 border border-slate-700 space-y-2">
                                            <div className="text-sm text-white font-medium">{currentSession.name}</div>
                                            <div className="text-xs text-slate-400 break-all">{currentSession.id}</div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleCopySessionId}
                                                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1"
                                                >
                                                    <Copy size={12} /> Copy ID
                                                </button>
                                                <button
                                                    onClick={handleLeave}
                                                    className="px-2 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs"
                                                >
                                                    Leave
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-slate-200">Participants</h3>
                                        <div className="space-y-2">
                                            {sortedParticipants.map(participant => (
                                                <div key={participant.id} className="p-2 rounded bg-slate-900 border border-slate-700">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="text-sm text-slate-100 truncate flex items-center gap-1">
                                                                {participant.name}
                                                                {participant.isHost && <Crown size={12} className="text-amber-400" />}
                                                                {participant.id === localParticipantId && <Check size={12} className="text-emerald-400" />}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500">
                                                                {participant.isTyping ? 'Typing' : 'Idle'}
                                                                {participant.cursorPosition
                                                                    ? ` · L${participant.cursorPosition.line}:C${participant.cursorPosition.column}`
                                                                    : ''}
                                                            </div>
                                                        </div>
                                                        {isHost && participant.id !== localParticipantId && (
                                                            <button
                                                                onClick={() => handleKickParticipant(participant.id, participant.name)}
                                                                className="p-1.5 rounded bg-rose-800/60 hover:bg-rose-700 text-rose-200"
                                                                title="Remove participant"
                                                            >
                                                                <UserMinus size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-slate-200">Recent Events</h3>
                                        <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1">
                                            {eventFeed.length === 0 && (
                                                <div className="text-xs text-slate-500">No events yet</div>
                                            )}
                                            {eventFeed.slice().reverse().map(event => (
                                                <div key={`${event.seq}-${event.timestamp}`} className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 rounded px-2 py-1">
                                                    <span className="text-slate-300">{event.type}</span> · {new Date(event.timestamp).toLocaleTimeString()}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </aside>

                        <section className="p-4 overflow-hidden flex flex-col gap-3">
                            {!currentSession ? (
                                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                                    Create or join a session to start collaborative editing.
                                </div>
                            ) : (
                                <>
                                    {(typingParticipants.length > 0 || cursorParticipants.length > 0) && (
                                        <div className="text-xs text-slate-400 bg-slate-950/60 border border-slate-800 rounded px-3 py-2">
                                            {typingParticipants.length > 0 && (
                                                <div>
                                                    Typing: {typingParticipants.map(participant => participant.name).join(', ')}
                                                </div>
                                            )}
                                            {cursorParticipants.length > 0 && (
                                                <div>
                                                    Cursors: {cursorParticipants
                                                        .map(participant => `${participant.name} L${participant.cursorPosition!.line}:C${participant.cursorPosition!.column}`)
                                                        .join(' | ')}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 border border-slate-800 rounded p-3 bg-slate-950/50">
                                        {currentSession.messages.length === 0 ? (
                                            <div className="text-sm text-slate-500 text-center py-8">
                                                No shared messages yet.
                                            </div>
                                        ) : (
                                            currentSession.messages.map(message => {
                                                const isEditing = editingMessageId === message.id;
                                                return (
                                                    <div key={message.id} className="rounded border border-slate-800 bg-slate-900 p-3 space-y-2">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="text-xs text-slate-400">
                                                                <span className="text-slate-200 font-semibold">{message.authorName}</span>
                                                                {' · '}v{message.version}
                                                                {' · '}{new Date(message.updatedAt).toLocaleTimeString()}
                                                                {message.hasConflict && (
                                                                    <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">conflict merged</span>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => beginEdit(message)}
                                                                className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
                                                            >
                                                                <Edit2 size={11} /> Edit
                                                            </button>
                                                        </div>

                                                        {isEditing ? (
                                                            <div className="space-y-2">
                                                                <textarea
                                                                    value={editingContent}
                                                                    onChange={(event) => setEditingContent(event.target.value)}
                                                                    className="w-full min-h-[90px] px-3 py-2 rounded bg-slate-950 border border-slate-700 text-slate-100 text-sm"
                                                                />
                                                                <div className="flex items-center gap-2 justify-end">
                                                                    <button
                                                                        onClick={cancelEdit}
                                                                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={() => saveEdit(message)}
                                                                        className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1"
                                                                    >
                                                                        <Save size={11} /> Save
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-slate-100 whitespace-pre-wrap">{message.content}</div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <textarea
                                            ref={messageInputRef}
                                            value={messageInput}
                                            onChange={(event) => {
                                                const nextText = event.target.value;
                                                setMessageInput(nextText);
                                                realTimeCollaborationService.markTyping();

                                                const cursor = parseCursor(nextText, event.target.selectionStart || 0);
                                                realTimeCollaborationService.updateCursor(cursor.line, cursor.column);
                                            }}
                                            onClick={(event) => {
                                                const target = event.target as HTMLTextAreaElement;
                                                const cursor = parseCursor(target.value, target.selectionStart || 0);
                                                realTimeCollaborationService.updateCursor(cursor.line, cursor.column);
                                            }}
                                            onKeyUp={(event) => {
                                                const target = event.target as HTMLTextAreaElement;
                                                const cursor = parseCursor(target.value, target.selectionStart || 0);
                                                realTimeCollaborationService.updateCursor(cursor.line, cursor.column);
                                            }}
                                            placeholder="Type a shared conversation message..."
                                            className="w-full min-h-[90px] px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100 text-sm"
                                        />

                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-xs text-slate-500">
                                                {localParticipantId ? `You: ${config.displayName}` : 'Not connected'}
                                            </div>
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={isBusy || !messageInput.trim()}
                                                className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2"
                                            >
                                                {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </section>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
