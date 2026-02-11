import React from 'react';

export type ChatSidebarTab = 'inspector' | 'controls' | 'prompts' | 'documents';

export interface ChatSidebarPanels {
    controls: React.ReactNode;
    prompts: React.ReactNode;
    documents: React.ReactNode;
    inspector: React.ReactNode;
}

export const resolveChatSidebarPanel = (activeTab: ChatSidebarTab, panels: ChatSidebarPanels): React.ReactNode => {
    switch (activeTab) {
        case 'controls':
            return panels.controls;
        case 'prompts':
            return panels.prompts;
        case 'documents':
            return panels.documents;
        case 'inspector':
        default:
            return panels.inspector;
    }
};

interface ChatSidebarProps {
    sidebarOpen: boolean;
    isCompactViewport: boolean;
    activeTab: ChatSidebarTab;
    onCloseSidebar: () => void;
    tabsHeader: React.ReactNode;
    panels: ChatSidebarPanels;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = React.memo(({
    sidebarOpen,
    isCompactViewport,
    activeTab,
    onCloseSidebar,
    tabsHeader,
    panels,
}) => {
    if (!sidebarOpen) {
        return null;
    }

    return (
        <>
            {isCompactViewport && (
                <div
                    className="absolute inset-0 bg-black/40 z-20"
                    onClick={onCloseSidebar}
                />
            )}
            <div className={`${isCompactViewport ? 'absolute inset-y-0 right-0 z-30 w-[92vw] max-w-[420px]' : 'w-[420px] min-w-[420px]'} bg-slate-950/50 border-1 border-slate-800 flex flex-col h-full border-l backdrop-blur-xl relative`}>
                {tabsHeader}
                {resolveChatSidebarPanel(activeTab, panels)}
            </div>
        </>
    );
}, (prev, next) => (
    prev.sidebarOpen === next.sidebarOpen &&
    prev.isCompactViewport === next.isCompactViewport &&
    prev.activeTab === next.activeTab &&
    prev.onCloseSidebar === next.onCloseSidebar &&
    prev.tabsHeader === next.tabsHeader &&
    prev.panels === next.panels
));
