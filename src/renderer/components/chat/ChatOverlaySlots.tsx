import React from 'react';
import { ChatOverlays } from './ChatOverlays';
import { buildChatCoreOverlaySlots } from './ChatCoreOverlays';
import { buildChatFeatureOverlaySlots } from './ChatFeatureOverlays';
import type { ChatOverlaySlotsProps } from './chatOverlayTypes';

export const ChatOverlaySlots: React.FC<ChatOverlaySlotsProps> = ({
    savedSessions,
    sessionId,
    ...props
}) => {
    const currentSessionTitle = savedSessions.find((session) => session.id === sessionId)?.title || 'Conversation';

    const coreSlots = buildChatCoreOverlaySlots({
        ...props,
        savedSessions,
        sessionId,
        currentSessionTitle,
    });
    const featureSlots = buildChatFeatureOverlaySlots({
        ...props,
        savedSessions,
        sessionId,
        currentSessionTitle,
    });

    return (
        <ChatOverlays
            slots={{
                ...coreSlots,
                ...featureSlots,
            }}
        />
    );
};
