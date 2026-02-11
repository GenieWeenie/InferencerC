import React from 'react';
import { AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '../../../shared/types';
import type { LaunchReadinessStep } from '../ChatEmptyState';
import {
    type ChatMessageAction,
    type ChatMessageActionCapabilities,
} from '../../lib/chatMessageActions';
import { LongPressActionMenu } from './ChatInlinePanels';
import { ChatEmptyState } from './chatLazyPanels';

interface VirtuosoHandleLike {
    scrollToIndex: (options: {
        index: number;
        align?: 'start' | 'center' | 'end';
        behavior?: ScrollBehavior;
    }) => void;
}

interface ChatMessagesViewportProps {
    messageListRef: React.RefObject<HTMLDivElement | null>;
    longPressMenuRef: React.RefObject<HTMLDivElement | null>;
    swipeSessionIndicator: 'previous' | 'next' | null;
    history: ChatMessage[];
    isLoadingMessages: boolean;
    VirtuosoComponent: React.ComponentType<Record<string, unknown>> | null;
    virtuosoRef: React.RefObject<VirtuosoHandleLike | null>;
    messageListFooterHeight: number;
    renderItemContent: (index: number, msg: ChatMessage) => React.ReactNode;
    showBottomControls: boolean;
    emptyStateReady: boolean;
    showLaunchChecklist: boolean;
    readinessCompletedCount: number;
    readinessSteps: LaunchReadinessStep[];
    onSelectPrompt: (prompt: string) => void;
    longPressMenu: { messageIndex: number; x: number; y: number } | null;
    longPressMessage: ChatMessage | null;
    isLongPressMessageBookmarked: boolean;
    longPressMessageCapabilities: ChatMessageActionCapabilities;
    onLongPressAction: (action: ChatMessageAction) => void;
}

export const ChatMessagesViewport: React.FC<ChatMessagesViewportProps> = React.memo(({
    messageListRef,
    longPressMenuRef,
    swipeSessionIndicator,
    history,
    isLoadingMessages,
    VirtuosoComponent,
    virtuosoRef,
    messageListFooterHeight,
    renderItemContent,
    showBottomControls,
    emptyStateReady,
    showLaunchChecklist,
    readinessCompletedCount,
    readinessSteps,
    onSelectPrompt,
    longPressMenu,
    longPressMessage,
    isLongPressMessageBookmarked,
    longPressMessageCapabilities,
    onLongPressAction,
}) => {
    const Virtuoso = VirtuosoComponent as React.ComponentType<Record<string, unknown> & {
        ref?: React.Ref<unknown>;
    }>;

    return (
        <>
            <div ref={messageListRef} className="flex-1 overflow-hidden bg-background relative min-w-0 max-w-full">
                {swipeSessionIndicator && (
                    <div className="absolute top-3 right-3 z-20 px-2 py-1 rounded bg-primary/20 border border-primary/40 text-primary text-xs font-semibold">
                        {swipeSessionIndicator === 'next' ? 'Swiped to next chat' : 'Swiped to previous chat'}
                    </div>
                )}
                {history.length === 0 ? (
                    <React.Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-slate-500">Loading starter workspace...</div>}>
                        <ChatEmptyState
                            showBottomControls={showBottomControls}
                            isReady={emptyStateReady}
                            showLaunchChecklist={showLaunchChecklist}
                            readinessCompletedCount={readinessCompletedCount}
                            readinessSteps={readinessSteps}
                            onSelectPrompt={onSelectPrompt}
                        />
                    </React.Suspense>
                ) : Virtuoso ? (
                    <Virtuoso
                        ref={virtuosoRef as unknown as React.Ref<unknown>}
                        style={{ height: '100%', width: '100%' }}
                        data={isLoadingMessages ? Array(6).fill(null) : history}
                        followOutput={(isAtBottom: boolean) => {
                            const lastMsg = history[history.length - 1];
                            if (lastMsg?.isLoading) return 'smooth';
                            return isAtBottom ? 'auto' : false;
                        }}
                        overscan={{
                            main: 300,
                            reverse: 300,
                        }}
                        increaseViewportBy={{
                            top: 200,
                            bottom: Math.max(220, messageListFooterHeight),
                        }}
                        defaultItemHeight={150}
                        atBottomThreshold={Math.max(100, Math.floor(messageListFooterHeight * 0.45))}
                        alignToBottom
                        className="custom-scrollbar px-6"
                        totalCount={isLoadingMessages ? 6 : history.length}
                        initialTopMostItemIndex={isLoadingMessages ? 0 : history.length - 1}
                        computeItemKey={(index: number, item: ChatMessage | null) =>
                            isLoadingMessages ? `skeleton-${index}` : `${index}-${item?.role || 'unknown'}`
                        }
                        itemContent={renderItemContent}
                        components={{
                            Footer: () => <div style={{ height: `${messageListFooterHeight}px` }} />,
                        }}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">
                        Loading conversation...
                    </div>
                )}
            </div>

            <AnimatePresence>
                {longPressMenu && longPressMessage && (
                    <LongPressActionMenu
                        menuRef={longPressMenuRef}
                        menuPosition={longPressMenu}
                        messageIndex={longPressMenu.messageIndex}
                        isBookmarked={isLongPressMessageBookmarked}
                        capabilities={longPressMessageCapabilities}
                        onAction={onLongPressAction}
                    />
                )}
            </AnimatePresence>
        </>
    );
}, (prev, next) => (
    prev.messageListRef === next.messageListRef &&
    prev.longPressMenuRef === next.longPressMenuRef &&
    prev.swipeSessionIndicator === next.swipeSessionIndicator &&
    prev.history === next.history &&
    prev.isLoadingMessages === next.isLoadingMessages &&
    prev.VirtuosoComponent === next.VirtuosoComponent &&
    prev.virtuosoRef === next.virtuosoRef &&
    prev.messageListFooterHeight === next.messageListFooterHeight &&
    prev.renderItemContent === next.renderItemContent &&
    prev.showBottomControls === next.showBottomControls &&
    prev.emptyStateReady === next.emptyStateReady &&
    prev.showLaunchChecklist === next.showLaunchChecklist &&
    prev.readinessCompletedCount === next.readinessCompletedCount &&
    prev.readinessSteps === next.readinessSteps &&
    prev.onSelectPrompt === next.onSelectPrompt &&
    prev.longPressMenu === next.longPressMenu &&
    prev.longPressMessage === next.longPressMessage &&
    prev.isLongPressMessageBookmarked === next.isLongPressMessageBookmarked &&
    prev.longPressMessageCapabilities.canCopy === next.longPressMessageCapabilities.canCopy &&
    prev.longPressMessageCapabilities.canBookmark === next.longPressMessageCapabilities.canBookmark &&
    prev.longPressMessageCapabilities.canEdit === next.longPressMessageCapabilities.canEdit &&
    prev.longPressMessageCapabilities.canRegenerate === next.longPressMessageCapabilities.canRegenerate &&
    prev.longPressMessageCapabilities.canBranch === next.longPressMessageCapabilities.canBranch &&
    prev.longPressMessageCapabilities.canDelete === next.longPressMessageCapabilities.canDelete &&
    prev.onLongPressAction === next.onLongPressAction
));
