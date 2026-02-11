import React from 'react';
import { Cloud } from 'lucide-react';
import {
    ExperimentalFeaturesDropdown,
    HeaderConnectionStatus,
    TopHeaderModelUtilityControls,
    TopHeaderPrimaryActions,
    TopHeaderSecondaryActions,
    type ExperimentalFeatureAction,
    type HeaderPrimaryActionConfig,
    type IntegrationAvailability,
} from './ChatHeaderCluster';

interface ChatHeaderBarProps {
    isCompactViewport: boolean;
    showHistory: boolean;
    onToggleHistory: () => void;
    topHeaderPrimaryActions: HeaderPrimaryActionConfig[];
    experimentalFeatureActions: ExperimentalFeatureAction[];
    onOpenCloudSyncPanel: () => void;
    cloudSyncBadge: {
        label: string;
        className: string;
        title: string;
    };
    hasHistory: boolean;
    showTreeView: boolean;
    integrationAvailability: IntegrationAvailability;
    onOpenCodeIntegration: () => void;
    onClearChat: () => void;
    onOpenExportDialog: () => void;
    onToggleTreeView: () => void;
    onExportSessionToObsidian: () => void;
    onSaveToNotion: () => void;
    onSendToSlack: () => void;
    onSendToDiscord: () => void;
    onSendToEmail: () => void;
    onOpenCalendarSchedule: () => void;
    battleMode: boolean;
    currentModel: string;
    secondaryModel: string;
    allModelOptionElements: React.ReactNode;
    onCurrentModelChange: (value: string) => void;
    onSecondaryModelChange: (value: string) => void;
    showRequestLog: boolean;
    onToggleRequestLog: () => void;
    apiLogCount: number;
    showSearch: boolean;
    onToggleSearch: () => void;
    diagnosticsPanelRef: React.RefObject<HTMLDivElement | null>;
    diagnosticsButtonRef: React.RefObject<HTMLButtonElement | null>;
    diagnosticsStatusClassName: string;
    diagnosticsStatusLabel: string;
    diagnosticsReady: boolean;
    showDiagnosticsPanel: boolean;
    onToggleDiagnosticsPanel: () => void;
    diagnosticsPopover: React.ReactNode;
    connectionStatus: {
        local: 'online' | 'offline' | 'checking' | 'none';
        remote: 'online' | 'offline' | 'checking' | 'none';
    };
}

export const ChatHeaderBar: React.FC<ChatHeaderBarProps> = React.memo(({
    isCompactViewport,
    showHistory,
    onToggleHistory,
    topHeaderPrimaryActions,
    experimentalFeatureActions,
    onOpenCloudSyncPanel,
    cloudSyncBadge,
    hasHistory,
    showTreeView,
    integrationAvailability,
    onOpenCodeIntegration,
    onClearChat,
    onOpenExportDialog,
    onToggleTreeView,
    onExportSessionToObsidian,
    onSaveToNotion,
    onSendToSlack,
    onSendToDiscord,
    onSendToEmail,
    onOpenCalendarSchedule,
    battleMode,
    currentModel,
    secondaryModel,
    allModelOptionElements,
    onCurrentModelChange,
    onSecondaryModelChange,
    showRequestLog,
    onToggleRequestLog,
    apiLogCount,
    showSearch,
    onToggleSearch,
    diagnosticsPanelRef,
    diagnosticsButtonRef,
    diagnosticsStatusClassName,
    diagnosticsStatusLabel,
    diagnosticsReady,
    showDiagnosticsPanel,
    onToggleDiagnosticsPanel,
    diagnosticsPopover,
    connectionStatus,
}) => (
    <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 backdrop-blur-sm shadow-sm z-10 flex-wrap">
        <TopHeaderPrimaryActions
            isCompactViewport={isCompactViewport}
            showHistory={showHistory}
            onToggleHistory={onToggleHistory}
            actions={topHeaderPrimaryActions}
        />
        <ExperimentalFeaturesDropdown actions={experimentalFeatureActions} />
        <button
            onClick={onOpenCloudSyncPanel}
            title={cloudSyncBadge.title}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap ${cloudSyncBadge.className}`}
        >
            <Cloud size={14} /> <span>{cloudSyncBadge.label}</span>
        </button>
        <TopHeaderSecondaryActions
            hasHistory={hasHistory}
            showTreeView={showTreeView}
            integrationAvailability={integrationAvailability}
            onOpenCodeIntegration={onOpenCodeIntegration}
            onClearChat={onClearChat}
            onOpenExportDialog={onOpenExportDialog}
            onToggleTreeView={onToggleTreeView}
            onExportSessionToObsidian={onExportSessionToObsidian}
            onSaveToNotion={onSaveToNotion}
            onSendToSlack={onSendToSlack}
            onSendToDiscord={onSendToDiscord}
            onSendToEmail={onSendToEmail}
            onOpenCalendarSchedule={onOpenCalendarSchedule}
        />
        <TopHeaderModelUtilityControls
            battleMode={battleMode}
            currentModel={currentModel}
            secondaryModel={secondaryModel}
            allModelOptionElements={allModelOptionElements}
            onCurrentModelChange={onCurrentModelChange}
            onSecondaryModelChange={onSecondaryModelChange}
            showRequestLog={showRequestLog}
            onToggleRequestLog={onToggleRequestLog}
            apiLogCount={apiLogCount}
            hasHistory={hasHistory}
            showSearch={showSearch}
            onToggleSearch={onToggleSearch}
            diagnosticsPanelRef={diagnosticsPanelRef}
            diagnosticsButtonRef={diagnosticsButtonRef}
            diagnosticsStatusClassName={diagnosticsStatusClassName}
            diagnosticsStatusLabel={diagnosticsStatusLabel}
            diagnosticsReady={diagnosticsReady}
            showDiagnosticsPanel={showDiagnosticsPanel}
            onToggleDiagnosticsPanel={onToggleDiagnosticsPanel}
            diagnosticsPopover={diagnosticsPopover}
        />

        <HeaderConnectionStatus
            localStatus={connectionStatus.local}
            remoteStatus={connectionStatus.remote}
        />
    </div>
), (prev, next) => (
    prev.isCompactViewport === next.isCompactViewport &&
    prev.showHistory === next.showHistory &&
    prev.onToggleHistory === next.onToggleHistory &&
    prev.topHeaderPrimaryActions === next.topHeaderPrimaryActions &&
    prev.experimentalFeatureActions === next.experimentalFeatureActions &&
    prev.onOpenCloudSyncPanel === next.onOpenCloudSyncPanel &&
    prev.cloudSyncBadge.label === next.cloudSyncBadge.label &&
    prev.cloudSyncBadge.className === next.cloudSyncBadge.className &&
    prev.cloudSyncBadge.title === next.cloudSyncBadge.title &&
    prev.hasHistory === next.hasHistory &&
    prev.showTreeView === next.showTreeView &&
    prev.integrationAvailability === next.integrationAvailability &&
    prev.onOpenCodeIntegration === next.onOpenCodeIntegration &&
    prev.onClearChat === next.onClearChat &&
    prev.onOpenExportDialog === next.onOpenExportDialog &&
    prev.onToggleTreeView === next.onToggleTreeView &&
    prev.onExportSessionToObsidian === next.onExportSessionToObsidian &&
    prev.onSaveToNotion === next.onSaveToNotion &&
    prev.onSendToSlack === next.onSendToSlack &&
    prev.onSendToDiscord === next.onSendToDiscord &&
    prev.onSendToEmail === next.onSendToEmail &&
    prev.onOpenCalendarSchedule === next.onOpenCalendarSchedule &&
    prev.battleMode === next.battleMode &&
    prev.currentModel === next.currentModel &&
    prev.secondaryModel === next.secondaryModel &&
    prev.allModelOptionElements === next.allModelOptionElements &&
    prev.onCurrentModelChange === next.onCurrentModelChange &&
    prev.onSecondaryModelChange === next.onSecondaryModelChange &&
    prev.showRequestLog === next.showRequestLog &&
    prev.onToggleRequestLog === next.onToggleRequestLog &&
    prev.apiLogCount === next.apiLogCount &&
    prev.showSearch === next.showSearch &&
    prev.onToggleSearch === next.onToggleSearch &&
    prev.diagnosticsPanelRef === next.diagnosticsPanelRef &&
    prev.diagnosticsButtonRef === next.diagnosticsButtonRef &&
    prev.diagnosticsStatusClassName === next.diagnosticsStatusClassName &&
    prev.diagnosticsStatusLabel === next.diagnosticsStatusLabel &&
    prev.diagnosticsReady === next.diagnosticsReady &&
    prev.showDiagnosticsPanel === next.showDiagnosticsPanel &&
    prev.onToggleDiagnosticsPanel === next.onToggleDiagnosticsPanel &&
    prev.diagnosticsPopover === next.diagnosticsPopover &&
    prev.connectionStatus.local === next.connectionStatus.local &&
    prev.connectionStatus.remote === next.connectionStatus.remote
));
