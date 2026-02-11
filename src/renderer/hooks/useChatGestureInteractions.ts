import React from 'react';
import { toast } from 'sonner';
import { useLongPress, usePinchZoom, useSwipeNavigation } from './useGestures';
import { clampFloatingMenuPosition, getSwipeSessionNextIndex } from '../lib/chatGestureModels';
import {
    isLongPressActionAllowed,
    type ChatMessageAction,
} from '../lib/chatMessageActions';

interface SessionLike {
    id: string;
}

interface MessageLike {
    role: string;
    content?: string;
    isLoading?: boolean;
}

interface UseChatGestureInteractionsParams {
    history: MessageLike[];
    sessionId: string;
    savedSessions: SessionLike[];
    loadSession: (sessionId: string) => void;
    messageListRef: React.RefObject<HTMLDivElement | null>;
    longPressMenuRef: React.RefObject<HTMLDivElement | null>;
    onEditMessage: (index: number) => void;
    onRegenerateResponse: (index: number) => void;
    onBranchConversation: (index: number) => void;
    onDeleteMessage: (index: number) => void;
}

export const useChatGestureInteractions = ({
    history,
    sessionId,
    savedSessions,
    loadSession,
    messageListRef,
    longPressMenuRef,
    onEditMessage,
    onRegenerateResponse,
    onBranchConversation,
    onDeleteMessage,
}: UseChatGestureInteractionsParams) => {
    const [bookmarkedMessages, setBookmarkedMessages] = React.useState<Set<number>>(new Set());
    const [conversationFontSize, setConversationFontSize] = React.useState<number>(() => {
        const stored = Number(localStorage.getItem('chat_font_size'));
        return Number.isFinite(stored) && stored > 0 ? stored : 16;
    });
    const [longPressMenu, setLongPressMenu] = React.useState<{ messageIndex: number; x: number; y: number } | null>(null);
    const [swipeSessionIndicator, setSwipeSessionIndicator] = React.useState<'previous' | 'next' | null>(null);
    const swipeSessionTimerRef = React.useRef<number | null>(null);

    const toggleBookmark = React.useCallback((index: number) => {
        setBookmarkedMessages((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
                toast.success('Bookmark removed');
            } else {
                next.add(index);
                toast.success('Message bookmarked');
            }

            try {
                localStorage.setItem(`bookmarks_${sessionId}`, JSON.stringify(Array.from(next)));
            } catch (error) {
                console.error('Failed to save bookmarks:', error);
            }

            return next;
        });
    }, [sessionId]);

    const closeLongPressMenu = React.useCallback(() => {
        setLongPressMenu(null);
    }, []);

    const longPressActionHandlers = React.useMemo<Record<ChatMessageAction, (index: number, message: MessageLike) => void>>(() => ({
        copy: (_index, message) => {
            navigator.clipboard.writeText(message.content || '');
            toast.success('Copied to clipboard');
        },
        bookmark: (index) => {
            toggleBookmark(index);
        },
        edit: (index) => {
            onEditMessage(index);
        },
        regenerate: (index) => {
            onRegenerateResponse(index);
        },
        branch: (index) => {
            onBranchConversation(index);
        },
        delete: (index) => {
            onDeleteMessage(index);
        },
    }), [
        toggleBookmark,
        onEditMessage,
        onRegenerateResponse,
        onBranchConversation,
        onDeleteMessage,
    ]);

    const handleLongPressAction = React.useCallback((action: ChatMessageAction) => {
        if (!longPressMenu) return;

        const index = longPressMenu.messageIndex;
        const message = history[index];
        if (!message) return;

        if (isLongPressActionAllowed(action, message)) {
            longPressActionHandlers[action](index, message);
        }

        closeLongPressMenu();
    }, [closeLongPressMenu, history, longPressActionHandlers, longPressMenu]);

    usePinchZoom((event) => {
        const targetNode = event.target as Node | null;
        if (!targetNode || !messageListRef.current?.contains(targetNode)) {
            return;
        }

        setConversationFontSize((prev) => {
            const next = Math.max(12, Math.min(28, prev + (event.delta * 8)));
            return Number(next.toFixed(2));
        });
    }, history.length > 0);

    useLongPress((event) => {
        const targetElement = event.target instanceof Element ? event.target : null;
        if (!targetElement) return;

        const bubble = targetElement.closest('[data-message-bubble-index]') as HTMLElement | null;
        if (!bubble || !messageListRef.current?.contains(bubble)) {
            return;
        }

        const messageIndex = Number(bubble.dataset.messageBubbleIndex);
        if (!Number.isInteger(messageIndex)) {
            return;
        }

        const position = clampFloatingMenuPosition(
            event.x,
            event.y,
            window.innerWidth,
            window.innerHeight
        );

        setLongPressMenu({
            messageIndex,
            x: position.x,
            y: position.y,
        });
    }, history.length > 0);

    React.useEffect(() => {
        localStorage.setItem('chat_font_size', String(conversationFontSize));
    }, [conversationFontSize]);

    React.useEffect(() => {
        if (!longPressMenu) {
            return;
        }

        const handleDocumentClick = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null;
            if (!target) return;

            if (longPressMenuRef.current && longPressMenuRef.current.contains(target)) {
                return;
            }

            closeLongPressMenu();
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeLongPressMenu();
            }
        };

        document.addEventListener('mousedown', handleDocumentClick);
        document.addEventListener('touchstart', handleDocumentClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleDocumentClick);
            document.removeEventListener('touchstart', handleDocumentClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [closeLongPressMenu, longPressMenu, longPressMenuRef]);

    React.useEffect(() => {
        return () => {
            if (swipeSessionTimerRef.current !== null) {
                window.clearTimeout(swipeSessionTimerRef.current);
            }
        };
    }, []);

    useSwipeNavigation((event) => {
        const targetNode = event.target as Node | null;
        if (!targetNode || !messageListRef.current?.contains(targetNode)) {
            return;
        }

        if (event.direction !== 'left' && event.direction !== 'right') {
            return;
        }

        if (savedSessions.length <= 1) {
            return;
        }

        const currentIndex = savedSessions.findIndex((session) => session.id === sessionId);
        if (currentIndex === -1) {
            return;
        }

        const nextIndex = getSwipeSessionNextIndex(event.direction, currentIndex, savedSessions.length);
        if (nextIndex === currentIndex) {
            return;
        }

        loadSession(savedSessions[nextIndex].id);
        setSwipeSessionIndicator(event.direction === 'left' ? 'next' : 'previous');

        if (swipeSessionTimerRef.current !== null) {
            window.clearTimeout(swipeSessionTimerRef.current);
        }

        swipeSessionTimerRef.current = window.setTimeout(() => {
            setSwipeSessionIndicator(null);
        }, 700);
    }, history.length > 0 && savedSessions.length > 1);

    React.useEffect(() => {
        try {
            const saved = localStorage.getItem(`bookmarks_${sessionId}`);
            if (saved) {
                setBookmarkedMessages(new Set(JSON.parse(saved)));
            } else {
                setBookmarkedMessages(new Set());
            }
        } catch (error) {
            console.error('Failed to load bookmarks:', error);
            setBookmarkedMessages(new Set());
        }
    }, [sessionId]);

    return {
        bookmarkedMessages,
        conversationFontSize,
        longPressMenu,
        swipeSessionIndicator,
        toggleBookmark,
        handleLongPressAction,
    };
};
