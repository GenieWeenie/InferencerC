/**
 * Real-Time Collaboration Panel
 *
 * WebRTC-based real-time collaboration
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, UserPlus, MessageSquare, Radio, Copy, Share2 } from 'lucide-react';
import {
    realTimeCollaborationService,
    CollaborationSession,
    CollaborationMessage,
    CollaborationParticipant,
} from '../services/realTimeCollaboration';
import { toast } from 'sonner';

interface RealTimeCollaborationPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RealTimeCollaborationPanel: React.FC<RealTimeCollaborationPanelProps> = ({
    isOpen,
    onClose,
}) => {
    const [config, setConfig] = useState(realTimeCollaborationService.getConfig());
    const [currentSession, setCurrentSession] = useState<CollaborationSession | null>(null);
    const [messages, setMessages] = useState<CollaborationMessage[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [sessionName, setSessionName] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        const unsubscribe = realTimeCollaborationService.subscribe((message) => {
            setMessages(prev => [...prev, message]);
        });

        const session = realTimeCollaborationService.getCurrentSession();
        setCurrentSession(session);

        return unsubscribe;
    }, [isOpen]);

    const handleCreateSession = () => {
        if (!sessionName.trim()) {
            toast.error('Please enter a session name');
            return;
        }

        const session = realTimeCollaborationService.createSession(sessionName.trim());
        setCurrentSession(session);
        setSessionName('');
        toast.success('Session created!');
    };

    const handleJoinSession = () => {
        const sessionId = prompt('Enter session ID:');
        if (sessionId) {
            realTimeCollaborationService.joinSession(sessionId).then(session => {
                if (session) {
                    setCurrentSession(session);
                    toast.success('Joined session!');
                } else {
                    toast.error('Failed to join session');
                }
            });
        }
    };

    const handleSendMessage = () => {
        if (!messageInput.trim()) return;

        realTimeCollaborationService.sendMessage(messageInput.trim());
        setMessageInput('');
    };

    const handleLeaveSession = () => {
        realTimeCollaborationService.leaveSession();
        setCurrentSession(null);
        setMessages([]);
        toast.info('Left session');
    };

    const handleCopySessionId = () => {
        if (currentSession) {
            navigator.clipboard.writeText(currentSession.id);
            toast.success('Session ID copied!');
        }
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
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-4xl h-[90vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <Users className="w-6 h-6 text-green-400" />
                            <h2 className="text-2xl font-bold text-white">Real-Time Collaboration</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {!currentSession ? (
                            /* Session Creation/Join */
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">Create Session</h3>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={sessionName}
                                            onChange={(e) => setSessionName(e.target.value)}
                                            placeholder="Session name..."
                                            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                                            onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                                        />
                                        <button
                                            onClick={handleCreateSession}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                        >
                                            Create
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-slate-700 pt-4">
                                    <h3 className="text-lg font-semibold text-white mb-4">Join Session</h3>
                                    <button
                                        onClick={handleJoinSession}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-2"
                                    >
                                        <UserPlus size={16} />
                                        Join by ID
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Active Session */
                            <>
                                {/* Session Info */}
                                <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-white">{currentSession.name}</h3>
                                        <button
                                            onClick={handleCopySessionId}
                                            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center gap-1"
                                        >
                                            <Copy size={12} />
                                            Copy ID
                                        </button>
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        {currentSession.participants.length} participant(s)
                                    </div>
                                </div>

                                {/* Participants */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Participants</h4>
                                    <div className="space-y-2">
                                        {currentSession.participants.map((participant) => (
                                            <ParticipantItem key={participant.id} participant={participant} />
                                        ))}
                                    </div>
                                </div>

                                {/* Messages */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Messages</h4>
                                    <div className="bg-slate-800 rounded border border-slate-700 p-4 h-64 overflow-y-auto space-y-2">
                                        {messages.length === 0 ? (
                                            <div className="text-center text-slate-500 text-sm py-8">
                                                No messages yet
                                            </div>
                                        ) : (
                                            messages.map((msg) => (
                                                <div key={msg.id} className="p-2 bg-slate-900 rounded">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-semibold text-white">{msg.senderName}</span>
                                                        <span className="text-xs text-slate-500">
                                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-300">{msg.content}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Message Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Type a message..."
                                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                    >
                                        Send
                                    </button>
                                </div>

                                <button
                                    onClick={handleLeaveSession}
                                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                >
                                    Leave Session
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Participant Item Component
const ParticipantItem: React.FC<{ participant: CollaborationParticipant }> = ({ participant }) => (
    <div className="flex items-center gap-2 p-2 bg-slate-800 rounded">
        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
            <Users size={14} className="text-green-400" />
        </div>
        <div className="flex-1">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{participant.name}</span>
                {participant.isHost && (
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Host</span>
                )}
                {participant.isTyping && (
                                    <span className="text-xs text-slate-400">typing...</span>
                                )}
            </div>
        </div>
    </div>
);
