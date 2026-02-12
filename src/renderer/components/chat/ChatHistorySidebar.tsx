import React from 'react';
import { Clock, X } from 'lucide-react';
import type { ChatSession } from '../../../shared/types';
import { SidebarHistory } from './chatLazyPanels';

interface ChatHistorySidebarProps {
    sessions: ChatSession[];
    currentSessionId: string;
    onClose: () => void;
    onLoadSession: (id: string) => void;
    onDeleteSession: (id: string) => void;
    onRenameSession: (id: string, newTitle: string) => void;
    onTogglePinSession: (id: string) => void;
    isLoading: boolean;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = React.memo(({
    sessions,
    currentSessionId,
    onClose,
    onLoadSession,
    onDeleteSession,
    onRenameSession,
    onTogglePinSession,
    isLoading,
}) => (
    <>
        <div className="p-4 border-b border-slate-800 font-bold flex justify-between items-center text-slate-200">
            <span className="flex items-center gap-2"><Clock size={16} /> Recent Chats</span>
            <button onClick={onClose} className="touch-target hover:text-white text-slate-400 transition-colors"><X size={18} /></button>
        </div>
        <React.Suspense fallback={<div className="p-4 text-xs text-slate-500">Loading chat history...</div>}>
            <SidebarHistory
                sessions={sessions}
                currentSessionId={currentSessionId}
                onLoadSession={onLoadSession}
                onDeleteSession={onDeleteSession}
                onRenameSession={onRenameSession}
                onTogglePinSession={onTogglePinSession}
                isLoading={isLoading}
            />
        </React.Suspense>
    </>
), (prev, next) => (
    prev.sessions === next.sessions &&
    prev.currentSessionId === next.currentSessionId &&
    prev.onClose === next.onClose &&
    prev.onLoadSession === next.onLoadSession &&
    prev.onDeleteSession === next.onDeleteSession &&
    prev.onRenameSession === next.onRenameSession &&
    prev.onTogglePinSession === next.onTogglePinSession &&
    prev.isLoading === next.isLoading
));
