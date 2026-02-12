import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { ChatMessage } from '../../../shared/types';
import type { LaunchReadinessStep } from '../ChatEmptyState';
import type { ChatVirtuosoComponent, ChatVirtuosoHandle } from '../../lib/chatVirtuosoTypes';
import {
    type ChatMessageAction,
    type ChatMessageActionCapabilities,
} from '../../lib/chatMessageActions';
import { LongPressActionMenu } from './ChatInlinePanels';
import { ChatEmptyState } from './chatLazyPanels';

interface ChatMessagesViewportProps {
    messageListRef: React.RefObject<HTMLDivElement | null>;
    longPressMenuRef: React.RefObject<HTMLDivElement | null>;
    swipeSessionIndicator: 'previous' | 'next' | null;
    history: ChatMessage[];
    isLoadingMessages: boolean;
    VirtuosoComponent: ChatVirtuosoComponent | null;
    virtuosoRef: React.RefObject<ChatVirtuosoHandle | null>;
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
    hasCollapsibleContent: boolean;
    allCollapsibleContentCollapsed: boolean;
    onCollapseAllLongContent: () => void;
    onExpandAllLongContent: () => void;
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
    hasCollapsibleContent,
    allCollapsibleContentCollapsed,
    onCollapseAllLongContent,
    onExpandAllLongContent,
}) => {
    const Virtuoso = VirtuosoComponent as React.ComponentType<Record<string, unknown> & {
        ref?: React.Ref<unknown>;
    }>;

    return (
        <>
            <div ref={messageListRef} className="flex-1 overflow-hidden bg-background relative min-w-0 max-w-full">
                {history.length > 0 && hasCollapsibleContent && (
                    <div className="absolute top-3 left-3 z-20">
                        <button
                            onClick={allCollapsibleContentCollapsed ? onExpandAllLongContent : onCollapseAllLongContent}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-slate-900/85 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-200 shadow-sm backdrop-blur-sm transition-colors hover:border-cyan-400/70 hover:bg-slate-900"
                            title={allCollapsibleContentCollapsed ? 'Expand all long message content' : 'Minimize all long message content'}
                        >
                            {allCollapsibleContentCollapsed ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                            {allCollapsibleContentCollapsed ? 'Expand Long' : 'Minimize Long'}
                        </button>
                    </div>
                )}
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
    prev.hasCollapsibleContent === next.hasCollapsibleContent &&
    prev.allCollapsibleContentCollapsed === next.allCollapsibleContentCollapsed &&
    prev.longPressMessageCapabilities.canCopy === next.longPressMessageCapabilities.canCopy &&
    prev.longPressMessageCapabilities.canBookmark === next.longPressMessageCapabilities.canBookmark &&
    prev.longPressMessageCapabilities.canEdit === next.longPressMessageCapabilities.canEdit &&
    prev.longPressMessageCapabilities.canRegenerate === next.longPressMessageCapabilities.canRegenerate &&
    prev.longPressMessageCapabilities.canBranch === next.longPressMessageCapabilities.canBranch &&
    prev.longPressMessageCapabilities.canDelete === next.longPressMessageCapabilities.canDelete &&
    prev.onLongPressAction === next.onLongPressAction &&
    prev.onCollapseAllLongContent === next.onCollapseAllLongContent &&
    prev.onExpandAllLongContent === next.onExpandAllLongContent
));
