import React from 'react';
import { ChatControlsTabPanel } from '../components/chat/ChatControlsTabPanel';
import { ChatInspectorTabPanel } from '../components/chat/ChatInspectorComposerPanels';
import { SidebarTabsHeader } from '../components/chat/ChatInlinePanels';
import {
    type ChatSidebarPanels,
    type ChatSidebarTab,
} from '../components/chat/ChatSidebar';
import {
    DocumentChatPanel,
    PromptManager,
} from '../components/chat/chatLazyPanels';
import type { SelectedTokenContext } from '../lib/chatSelectionTypes';

interface BuildChatSidebarPanelsParams {
    controlsTabPanelProps: React.ComponentProps<typeof ChatControlsTabPanel>;
    selectedToken: SelectedTokenContext | null;
    onUpdateToken: (messageIndex: number, tokenIndex: number, newToken: string) => void;
}

export const buildChatSidebarPanels = ({
    controlsTabPanelProps,
    selectedToken,
    onUpdateToken,
}: BuildChatSidebarPanelsParams): ChatSidebarPanels => ({
    controls: (
        <ChatControlsTabPanel {...controlsTabPanelProps} />
    ),
    prompts: (
        <React.Suspense fallback={<div className="p-6 text-slate-500 animate-pulse">Loading Library...</div>}>
            <PromptManager />
        </React.Suspense>
    ),
    documents: (
        <React.Suspense fallback={<div className="p-6 text-slate-500 animate-pulse">Loading Documents...</div>}>
            <DocumentChatPanel />
        </React.Suspense>
    ),
    inspector: (
        <ChatInspectorTabPanel
            selectedToken={selectedToken}
            onUpdateToken={onUpdateToken}
        />
    ),
});

interface UseChatSidebarPanelsParams extends BuildChatSidebarPanelsParams {
    activeTab: ChatSidebarTab;
    onSelectInspectorTab: () => void;
    onSelectControlsTab: () => void;
    onSelectPromptsTab: () => void;
    onSelectDocumentsTab: () => void;
    onCloseSidebar: () => void;
}

export const useChatSidebarPanels = ({
    activeTab,
    onSelectInspectorTab,
    onSelectControlsTab,
    onSelectPromptsTab,
    onSelectDocumentsTab,
    onCloseSidebar,
    controlsTabPanelProps,
    selectedToken,
    onUpdateToken,
}: UseChatSidebarPanelsParams) => {
    const sidebarTabsHeader = React.useMemo(() => (
        <SidebarTabsHeader
            activeTab={activeTab}
            onSelectInspectorTab={onSelectInspectorTab}
            onSelectControlsTab={onSelectControlsTab}
            onSelectPromptsTab={onSelectPromptsTab}
            onSelectDocumentsTab={onSelectDocumentsTab}
            onCloseSidebar={onCloseSidebar}
        />
    ), [
        activeTab,
        onSelectInspectorTab,
        onSelectControlsTab,
        onSelectPromptsTab,
        onSelectDocumentsTab,
        onCloseSidebar,
    ]);

    const sidebarPanels = React.useMemo(() => buildChatSidebarPanels({
        controlsTabPanelProps,
        selectedToken,
        onUpdateToken,
    }), [controlsTabPanelProps, selectedToken, onUpdateToken]);

    return {
        sidebarTabsHeader,
        sidebarPanels,
    };
};
