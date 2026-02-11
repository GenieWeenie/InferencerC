import React from 'react';
import {
    AlertTriangle,
    Calendar,
    Check,
    ChevronDown,
    ChevronRight,
    Clock,
    Code2,
    Download,
    Eraser,
    FileText,
    Mail,
    Menu,
    MessageSquare,
    Network,
    Search,
    Sparkles,
    Users,
} from 'lucide-react';

export interface IntegrationAvailability {
    notion: boolean;
    slack: boolean;
    discord: boolean;
    email: boolean;
    calendar: boolean;
}

export interface HeaderPrimaryActionConfig {
    key: string;
    title: string;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    onClick: () => void;
    variant?: 'default' | 'primary';
}

interface TopHeaderPrimaryActionsProps {
    isCompactViewport: boolean;
    showHistory: boolean;
    onToggleHistory: () => void;
    actions: HeaderPrimaryActionConfig[];
}

export const TopHeaderPrimaryActions: React.FC<TopHeaderPrimaryActionsProps> = React.memo(({
    isCompactViewport,
    showHistory,
    onToggleHistory,
    actions,
}) => (
    <>
        <button
            onClick={onToggleHistory}
            title="View History"
            className={`p-1.5 rounded-md transition-colors border border-slate-700 flex-shrink-0 ${showHistory ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
        >
            {isCompactViewport ? <Menu size={16} /> : <Clock size={16} />}
        </button>
        {actions.map((action) => {
            const Icon = action.icon;
            const buttonClassName = action.variant === 'primary'
                ? 'flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-md hover:brightness-110 transition-all shadow-md shadow-emerald-900/20 font-medium text-xs flex-shrink-0'
                : 'flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap';

            return (
                <button
                    key={action.key}
                    onClick={action.onClick}
                    title={action.title}
                    className={buttonClassName}
                >
                    <Icon size={14} />
                    <span>{action.label}</span>
                </button>
            );
        })}
    </>
), (prev, next) => (
    prev.isCompactViewport === next.isCompactViewport &&
    prev.showHistory === next.showHistory &&
    prev.onToggleHistory === next.onToggleHistory &&
    prev.actions === next.actions
));

interface TopHeaderSecondaryActionsProps {
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
}

export const TopHeaderSecondaryActions: React.FC<TopHeaderSecondaryActionsProps> = React.memo(({
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
}) => {
    if (!hasHistory) {
        return null;
    }

    return (
        <>
            <button
                onClick={onOpenCodeIntegration}
                title="Code Integration (Review, Refactor, Docs, Tests, Git)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
            >
                <Code2 size={14} /> <span>Code</span>
            </button>
            <button
                onClick={onClearChat}
                title="Clear Chat"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
            >
                <Eraser size={14} /> <span>Clear</span>
            </button>
            <button
                onClick={onOpenExportDialog}
                title="Export Chat (Ctrl+Shift+E)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
            >
                <Download size={14} /> <span>Export</span>
            </button>
            <button
                onClick={onToggleTreeView}
                title="Conversation Tree (Ctrl+T)"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap ${showTreeView
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
            >
                <Network size={14} /> <span>Tree</span>
            </button>
            <button
                onClick={onExportSessionToObsidian}
                title="Export to Obsidian"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
            >
                <FileText size={14} /> <span>Obsidian</span>
            </button>
            {integrationAvailability.notion && (
                <button
                    onClick={onSaveToNotion}
                    title="Save to Notion"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                >
                    <FileText size={14} /> <span>Notion</span>
                </button>
            )}
            {integrationAvailability.slack && (
                <button
                    onClick={onSendToSlack}
                    title="Send to Slack"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                >
                    <MessageSquare size={14} /> <span>Slack</span>
                </button>
            )}
            {integrationAvailability.discord && (
                <button
                    onClick={onSendToDiscord}
                    title="Send to Discord"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                >
                    <MessageSquare size={14} /> <span>Discord</span>
                </button>
            )}
            {integrationAvailability.email && (
                <button
                    onClick={onSendToEmail}
                    title="Email Conversation"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                >
                    <Mail size={14} /> <span>Email</span>
                </button>
            )}
            {integrationAvailability.calendar && (
                <button
                    onClick={onOpenCalendarSchedule}
                    title="Schedule Reminder"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs flex-shrink-0 whitespace-nowrap"
                >
                    <Calendar size={14} /> <span>Schedule</span>
                </button>
            )}
        </>
    );
}, (prev, next) => (
    prev.hasHistory === next.hasHistory &&
    prev.showTreeView === next.showTreeView &&
    prev.integrationAvailability.notion === next.integrationAvailability.notion &&
    prev.integrationAvailability.slack === next.integrationAvailability.slack &&
    prev.integrationAvailability.discord === next.integrationAvailability.discord &&
    prev.integrationAvailability.email === next.integrationAvailability.email &&
    prev.integrationAvailability.calendar === next.integrationAvailability.calendar &&
    prev.onOpenCodeIntegration === next.onOpenCodeIntegration &&
    prev.onClearChat === next.onClearChat &&
    prev.onOpenExportDialog === next.onOpenExportDialog &&
    prev.onToggleTreeView === next.onToggleTreeView &&
    prev.onExportSessionToObsidian === next.onExportSessionToObsidian &&
    prev.onSaveToNotion === next.onSaveToNotion &&
    prev.onSendToSlack === next.onSendToSlack &&
    prev.onSendToDiscord === next.onSendToDiscord &&
    prev.onSendToEmail === next.onSendToEmail &&
    prev.onOpenCalendarSchedule === next.onOpenCalendarSchedule
));

export interface ExperimentalFeatureAction {
    key: string;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    onClick: () => void;
}

interface ExperimentalFeaturesDropdownProps {
    actions: ExperimentalFeatureAction[];
}

export const ExperimentalFeaturesDropdown: React.FC<ExperimentalFeaturesDropdownProps> = React.memo(({
    actions,
}) => (
    <div className="relative group flex-shrink-0">
        <button
            title="Experimental Features"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-all border border-slate-700 text-xs whitespace-nowrap"
        >
            <Sparkles size={14} /> <span>Experimental</span> <ChevronDown size={12} />
        </button>
        <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="p-2 space-y-1">
                {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <button
                            key={action.key}
                            onClick={action.onClick}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 rounded text-sm text-left"
                        >
                            <Icon size={14} /> <span>{action.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
), (prev, next) => prev.actions === next.actions);

interface TopHeaderModelUtilityControlsProps {
    battleMode: boolean;
    currentModel: string;
    secondaryModel: string;
    allModelOptionElements: React.ReactNode;
    onCurrentModelChange: (value: string) => void;
    onSecondaryModelChange: (value: string) => void;
    showRequestLog: boolean;
    onToggleRequestLog: () => void;
    apiLogCount: number;
    hasHistory: boolean;
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
}

export const TopHeaderModelUtilityControls: React.FC<TopHeaderModelUtilityControlsProps> = React.memo(({
    battleMode,
    currentModel,
    secondaryModel,
    allModelOptionElements,
    onCurrentModelChange,
    onSecondaryModelChange,
    showRequestLog,
    onToggleRequestLog,
    apiLogCount,
    hasHistory,
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
}) => {
    const handleCurrentModelSelect = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        onCurrentModelChange(event.target.value);
    }, [onCurrentModelChange]);

    const handleSecondaryModelSelect = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        onSecondaryModelChange(event.target.value);
    }, [onSecondaryModelChange]);

    return (
        <>
            <div className="h-6 w-px bg-slate-700 mx-1 flex-shrink-0"></div>
            <div className="flex items-center gap-2 min-w-0 max-w-[200px] flex-shrink-0">
                {!battleMode ? (
                    <>
                        <span className="font-medium text-slate-400 text-xs whitespace-nowrap flex-shrink-0">Model:</span>
                        <div className="relative min-w-0 flex-1">
                            <select value={currentModel} onChange={handleCurrentModelSelect} className="w-full bg-slate-800 border-none text-white text-xs rounded-md px-2 py-1 focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer hover:bg-slate-700 transition-colors truncate">
                                {allModelOptionElements}
                            </select>
                            <ChevronRight className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={10} />
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-1.5 w-full animate-in fade-in slide-in-from-top-1">
                        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 text-xs flex items-center gap-1 flex-shrink-0"><Users size={12} /> VS</span>
                        <div className="relative flex-1 min-w-0">
                            <select value={currentModel} onChange={handleCurrentModelSelect} className="w-full bg-slate-800 border-l-2 border-l-blue-500 text-white text-xs rounded px-1.5 py-1 appearance-none cursor-pointer hover:bg-slate-700 truncate">
                                {allModelOptionElements}
                            </select>
                        </div>
                        <div className="relative flex-1 min-w-0">
                            <select value={secondaryModel} onChange={handleSecondaryModelSelect} className="w-full bg-slate-800 border-l-2 border-l-orange-500 text-white text-xs rounded px-1.5 py-1 appearance-none cursor-pointer hover:bg-slate-700 truncate">
                                {allModelOptionElements}
                            </select>
                        </div>
                    </div>
                )}
            </div>
            <button
                onClick={onToggleRequestLog}
                title="View Request/Response Log"
                className={`p-1.5 rounded-md transition-colors border border-slate-700 relative flex-shrink-0 ${showRequestLog ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
            >
                <FileText size={14} />
                {apiLogCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                        {apiLogCount > 9 ? '9+' : apiLogCount}
                    </span>
                )}
            </button>
            {hasHistory && (
                <button
                    onClick={onToggleSearch}
                    title="Search in chat (Ctrl+F)"
                    className={`p-1.5 rounded-md transition-colors border border-slate-700 flex-shrink-0 ${showSearch ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                    <Search size={14} />
                </button>
            )}
            <div ref={diagnosticsPanelRef} className="relative flex-shrink-0">
                <button
                    ref={diagnosticsButtonRef}
                    onClick={onToggleDiagnosticsPanel}
                    title="Startup diagnostics and quick fixes"
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors border text-xs ${diagnosticsStatusClassName}`}
                >
                    {diagnosticsReady ? <Check size={12} /> : <AlertTriangle size={12} />}
                    <span>{diagnosticsStatusLabel}</span>
                </button>
                {showDiagnosticsPanel && diagnosticsPopover}
            </div>
        </>
    );
}, (prev, next) => (
    prev.battleMode === next.battleMode &&
    prev.currentModel === next.currentModel &&
    prev.secondaryModel === next.secondaryModel &&
    prev.allModelOptionElements === next.allModelOptionElements &&
    prev.onCurrentModelChange === next.onCurrentModelChange &&
    prev.onSecondaryModelChange === next.onSecondaryModelChange &&
    prev.showRequestLog === next.showRequestLog &&
    prev.onToggleRequestLog === next.onToggleRequestLog &&
    prev.apiLogCount === next.apiLogCount &&
    prev.hasHistory === next.hasHistory &&
    prev.showSearch === next.showSearch &&
    prev.onToggleSearch === next.onToggleSearch &&
    prev.diagnosticsPanelRef === next.diagnosticsPanelRef &&
    prev.diagnosticsButtonRef === next.diagnosticsButtonRef &&
    prev.diagnosticsStatusClassName === next.diagnosticsStatusClassName &&
    prev.diagnosticsStatusLabel === next.diagnosticsStatusLabel &&
    prev.diagnosticsReady === next.diagnosticsReady &&
    prev.showDiagnosticsPanel === next.showDiagnosticsPanel &&
    prev.onToggleDiagnosticsPanel === next.onToggleDiagnosticsPanel &&
    prev.diagnosticsPopover === next.diagnosticsPopover
));

export interface HeaderConnectionStatusProps {
    localStatus: 'online' | 'offline' | 'checking' | 'none';
    remoteStatus: 'online' | 'offline' | 'checking' | 'none';
}

export const getConnectionStatusDotClassName = (status: HeaderConnectionStatusProps['localStatus']): string => {
    if (status === 'online') {
        return 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]';
    }
    if (status === 'checking') {
        return 'bg-amber-500 animate-pulse';
    }
    return 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]';
};

export const HeaderConnectionStatus: React.FC<HeaderConnectionStatusProps> = React.memo(({
    localStatus,
    remoteStatus,
}) => (
    <div className="flex items-center gap-2 pl-2 border-l border-slate-800 h-6 self-center flex-shrink-0">
        <div className="flex flex-col items-center" title={`LM Studio: ${localStatus}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${getConnectionStatusDotClassName(localStatus)}`} />
            <span className="text-[7px] uppercase font-bold text-slate-500 tracking-tighter">Local</span>
        </div>
        {remoteStatus !== 'none' && (
            <div className="flex flex-col items-center" title={`OpenRouter: ${remoteStatus}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${getConnectionStatusDotClassName(remoteStatus)}`} />
                <span className="text-[7px] uppercase font-bold text-slate-500 tracking-tighter">OR</span>
            </div>
        )}
    </div>
), (prev, next) => (
    prev.localStatus === next.localStatus &&
    prev.remoteStatus === next.remoteStatus
));
