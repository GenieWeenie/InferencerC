import React, { useState, useRef, useEffect } from 'react';
import { Copy, Trash2, Edit2, RotateCcw, GitBranch, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageActionsMenuProps {
    messageContent: string;
    messageIndex: number;
    messageRole: 'user' | 'assistant' | 'system' | 'tool';
    onCopy: () => void;
    onDelete: () => void;
    onEdit?: () => void;
    onRegenerate?: () => void;
    onBranch?: () => void;
}

const MessageActionsMenu: React.FC<MessageActionsMenuProps> = ({
    messageContent,
    messageIndex,
    messageRole,
    onCopy,
    onDelete,
    onEdit,
    onRegenerate,
    onBranch
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleAction = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    return (
        <div ref={menuRef} className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-8 w-8 bg-slate-700/90 hover:bg-slate-600 rounded-lg text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors"
                title="Message actions"
            >
                <MoreVertical size={13} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-9 right-0 bg-slate-800 rounded-lg shadow-xl border border-slate-700/50 overflow-hidden z-50 min-w-[180px]"
                    >
                        {/* Copy */}
                        <button
                            onClick={() => handleAction(onCopy)}
                            className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/50 transition-colors text-slate-200 text-sm text-left"
                        >
                            <Copy size={14} className="text-blue-400" />
                            <span>Copy message</span>
                        </button>

                        {/* Edit (User messages only) */}
                        {messageRole === 'user' && onEdit && (
                            <button
                                onClick={() => handleAction(onEdit)}
                                className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/50 transition-colors text-slate-200 text-sm text-left"
                            >
                                <Edit2 size={14} className="text-green-400" />
                                <span>Edit message</span>
                            </button>
                        )}

                        {/* Regenerate (Assistant messages only) */}
                        {messageRole === 'assistant' && onRegenerate && (
                            <button
                                onClick={() => handleAction(onRegenerate)}
                                className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/50 transition-colors text-slate-200 text-sm text-left"
                            >
                                <RotateCcw size={14} className="text-purple-400" />
                                <span>Regenerate</span>
                            </button>
                        )}

                        {/* Branch conversation */}
                        {onBranch && (
                            <button
                                onClick={() => handleAction(onBranch)}
                                className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/50 transition-colors text-slate-200 text-sm text-left"
                            >
                                <GitBranch size={14} className="text-yellow-400" />
                                <span>Branch from here</span>
                            </button>
                        )}

                        {/* Divider */}
                        <div className="border-t border-slate-700/50 my-1" />

                        {/* Delete from here */}
                        <button
                            onClick={() => handleAction(onDelete)}
                            className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-red-500/20 transition-colors text-red-400 text-sm text-left"
                        >
                            <Trash2 size={14} />
                            <span>Delete from here</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MessageActionsMenu;
