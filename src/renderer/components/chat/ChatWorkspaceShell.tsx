import React from 'react';

interface ChatWorkspaceShellProps {
    showHistory: boolean;
    isCompactViewport: boolean;
    historySidebar: React.ReactNode;
    header: React.ReactNode;
    searchPanel: React.ReactNode;
    summaryPanel: React.ReactNode;
    contextWindowPanel: React.ReactNode;
    messagesArea: React.ReactNode;
    composer: React.ReactNode;
    sidebar: React.ReactNode;
    overlays: React.ReactNode;
}

export const ChatWorkspaceShell: React.FC<ChatWorkspaceShellProps> = React.memo(({
    showHistory,
    isCompactViewport,
    historySidebar,
    header,
    searchPanel,
    summaryPanel,
    contextWindowPanel,
    messagesArea,
    composer,
    sidebar,
    overlays,
}) => (
    <div className="flex h-full flex-row relative bg-background text-text font-body overflow-hidden min-w-0 max-w-full">
        {showHistory && (
            <div className={`${isCompactViewport ? 'w-[min(88vw,320px)]' : 'w-64'} border-r border-slate-800 bg-slate-900/95 flex flex-col h-full absolute left-0 z-20 backdrop-blur-md shadow-2xl transition-all duration-300`}>
                {historySidebar}
            </div>
        )}

        <div className={`flex-1 flex flex-col h-full relative transition-[margin] duration-300 min-w-0 overflow-hidden ${showHistory && !isCompactViewport ? 'ml-64' : 'ml-0'}`}>
            {header}
            {searchPanel}
            {summaryPanel}
            {contextWindowPanel}
            {messagesArea}
            {composer}
        </div>

        {sidebar}
        {overlays}
    </div>
), (prev, next) => (
    prev.showHistory === next.showHistory &&
    prev.isCompactViewport === next.isCompactViewport &&
    prev.historySidebar === next.historySidebar &&
    prev.header === next.header &&
    prev.searchPanel === next.searchPanel &&
    prev.summaryPanel === next.summaryPanel &&
    prev.contextWindowPanel === next.contextWindowPanel &&
    prev.messagesArea === next.messagesArea &&
    prev.composer === next.composer &&
    prev.sidebar === next.sidebar &&
    prev.overlays === next.overlays
));
