import React from 'react';
import type { ChatOverlaySlotsProps } from '../components/chat/chatOverlayTypes';

interface OverlayTreeState {
    treeManager: ChatOverlaySlotsProps['treeManager'];
    currentPath: ChatOverlaySlotsProps['currentPath'];
}

export interface UseChatOverlaySlotsPropsParams
    extends Omit<ChatOverlaySlotsProps, 'treeManager' | 'currentPath'> {
    treeState: OverlayTreeState;
}

export const buildChatOverlaySlotsProps = ({
    treeState,
    ...rest
}: UseChatOverlaySlotsPropsParams): ChatOverlaySlotsProps => ({
    ...rest,
    treeManager: treeState.treeManager,
    currentPath: treeState.currentPath,
});

export const useChatOverlaySlotsProps = (
    params: UseChatOverlaySlotsPropsParams
): ChatOverlaySlotsProps => {
    return React.useMemo(
        () => buildChatOverlaySlotsProps(params),
        [params]
    );
};
