import React from 'react';
import {
    Copy,
    Edit2,
    GitBranch,
    Maximize2,
    Minimize2,
    Plug,
    RefreshCw,
    Send,
    Sparkles,
    Star,
    Trash2,
    X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { type ChatMessageAction, type ChatMessageActionCapabilities } from '../../lib/chatMessageActions';
import { buildLongPressMenuActionItems, type ComposerControlPillKey } from '../../lib/chatUiModels';

const VariableInsertMenu = React.lazy(() => import('../VariableInsertMenu'));

export interface LongPressActionMenuProps {
    menuRef: React.RefObject<HTMLDivElement | null>;
    menuPosition: { x: number; y: number } | null;
    messageIndex: number;
    isBookmarked: boolean;
    capabilities: ChatMessageActionCapabilities;
    onAction: (action: ChatMessageAction) => void;
}

const LONG_PRESS_ACTION_ICON_MAP: Record<ChatMessageAction, React.ComponentType<{ size?: number; className?: string }>> = {
    copy: Copy,
    bookmark: Star,
    edit: Edit2,
    regenerate: RefreshCw,
    branch: GitBranch,
    delete: Trash2,
};

const LONG_PRESS_ACTION_ICON_CLASS_MAP: Record<ChatMessageAction, string> = {
    copy: 'text-blue-400',
    bookmark: 'text-yellow-400',
    edit: 'text-green-400',
    regenerate: 'text-purple-400',
    branch: 'text-yellow-400',
    delete: '',
};

export const LongPressActionMenu: React.FC<LongPressActionMenuProps> = React.memo(({
    menuRef,
    menuPosition,
    messageIndex,
    isBookmarked,
    capabilities,
    onAction,
}) => {
    const visibleItems = React.useMemo(
        () => buildLongPressMenuActionItems(capabilities, isBookmarked).filter((item) => item.visible),
        [capabilities, isBookmarked]
    );
    const regularItems = React.useMemo(
        () => visibleItems.filter((item) => !item.destructive),
        [visibleItems]
    );
    const destructiveItems = React.useMemo(
        () => visibleItems.filter((item) => item.destructive),
        [visibleItems]
    );

    if (!menuPosition) {
        return null;
    }

    return (
        <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.15 }}
            className="fixed z-40 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl min-w-[220px] overflow-hidden"
            style={{ left: menuPosition.x, top: menuPosition.y }}
            data-long-press-message-index={messageIndex}
        >
            {regularItems.map((item) => {
                const Icon = LONG_PRESS_ACTION_ICON_MAP[item.action];
                return (
                    <button
                        key={item.action}
                        onClick={() => onAction(item.action)}
                        className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-700/50 text-slate-200 text-sm transition-colors"
                    >
                        <Icon size={14} className={LONG_PRESS_ACTION_ICON_CLASS_MAP[item.action]} />
                        <span>{item.label}</span>
                    </button>
                );
            })}
            {destructiveItems.length > 0 && regularItems.length > 0 && (
                <div className="border-t border-slate-700/50" />
            )}
            {destructiveItems.map((item) => {
                const Icon = LONG_PRESS_ACTION_ICON_MAP[item.action];
                return (
                    <button
                        key={item.action}
                        onClick={() => onAction(item.action)}
                        className="touch-target w-full px-3 py-2 flex items-center gap-2 hover:bg-red-500/20 text-red-400 text-sm transition-colors"
                    >
                        <Icon size={14} />
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </motion.div>
    );
}, (prev, next) => (
    prev.menuRef === next.menuRef &&
    prev.menuPosition === next.menuPosition &&
    prev.messageIndex === next.messageIndex &&
    prev.isBookmarked === next.isBookmarked &&
    prev.capabilities.canCopy === next.capabilities.canCopy &&
    prev.capabilities.canBookmark === next.capabilities.canBookmark &&
    prev.capabilities.canEdit === next.capabilities.canEdit &&
    prev.capabilities.canRegenerate === next.capabilities.canRegenerate &&
    prev.capabilities.canBranch === next.capabilities.canBranch &&
    prev.capabilities.canDelete === next.capabilities.canDelete &&
    prev.onAction === next.onAction
));

export interface ComposerActionButtonsProps {
    showBottomControls: boolean;
    showSuggestions: boolean;
    canToggleSuggestions: boolean;
    canSend: boolean;
    onToggleBottomControls: () => void;
    onToggleSuggestions: () => void;
    onSend: () => void;
}

export const ComposerActionButtons: React.FC<ComposerActionButtonsProps> = React.memo(({
    showBottomControls,
    showSuggestions,
    canToggleSuggestions,
    canSend,
    onToggleBottomControls,
    onToggleSuggestions,
    onSend,
}) => (
    <div className="flex flex-col gap-2">
        <button
            onClick={onToggleBottomControls}
            title={showBottomControls ? 'Hide bottom controls' : 'Show bottom controls'}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all border border-slate-700"
        >
            {showBottomControls ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button
            onClick={onToggleSuggestions}
            disabled={!canToggleSuggestions}
            title={showSuggestions ? 'Hide smart suggestions' : 'Smart Suggestions'}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
        >
            <Sparkles size={16} />
        </button>
        <button
            onClick={onSend}
            disabled={!canSend}
            className="p-2 bg-primary text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-primary/20"
        >
            <Send size={18} fill="currentColor" />
        </button>
    </div>
), (prev, next) => (
    prev.showBottomControls === next.showBottomControls &&
    prev.showSuggestions === next.showSuggestions &&
    prev.canToggleSuggestions === next.canToggleSuggestions &&
    prev.canSend === next.canSend &&
    prev.onToggleBottomControls === next.onToggleBottomControls &&
    prev.onToggleSuggestions === next.onToggleSuggestions &&
    prev.onSend === next.onSend
));

export type SidebarTab = 'inspector' | 'controls' | 'prompts' | 'documents';

export interface ComposerControlPillActionConfig {
    key: ComposerControlPillKey;
    label: string;
    icon: React.ReactNode;
    className: string;
    title?: string;
    onClick: () => void;
}

export interface ComposerVariableContext {
    modelId: string;
    modelName: string;
    sessionId: string;
    sessionTitle: string;
    messageCount: number;
}

export interface ComposerControlPillsProps {
    actions: ComposerControlPillActionConfig[];
    mcpAvailable: boolean;
    mcpConnectedCount: number;
    mcpToolCount: number;
    showExpertMenu: boolean;
    onSelectExpert: (mode: string | null) => void;
    showVariableMenu: boolean;
    onCloseVariableMenu: () => void;
    onInsertVariable: (variable: string) => void;
    variableContext: ComposerVariableContext;
}

export const ComposerControlPills: React.FC<ComposerControlPillsProps> = React.memo(({
    actions,
    mcpAvailable,
    mcpConnectedCount,
    mcpToolCount,
    showExpertMenu,
    onSelectExpert,
    showVariableMenu,
    onCloseVariableMenu,
    onInsertVariable,
    variableContext,
}) => (
    <div className="px-4 py-3 bg-slate-950/50 border-t border-slate-800/50 flex flex-wrap gap-2 items-center relative rounded-b-2xl">
        {actions.map((action) => (
            <button
                key={action.key}
                onClick={action.onClick}
                className={action.className}
                title={action.title}
            >
                {action.icon} {action.label}
            </button>
        ))}
        <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${mcpAvailable
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800/50 text-slate-500 border-slate-700/50'
                }`}
            title={mcpAvailable ? `${mcpConnectedCount} server(s), ${mcpToolCount} tools` : 'No MCP servers connected'}
        >
            <Plug size={12} strokeWidth={2.5} />
            {mcpAvailable ? (
                <span className="flex items-center gap-1">
                    MCP
                    <span className="bg-emerald-500/30 text-emerald-300 text-[10px] px-1 rounded">{mcpToolCount}</span>
                </span>
            ) : (
                <span className="opacity-50">MCP</span>
            )}
        </div>

        {showExpertMenu && (
            <div className="absolute bottom-12 right-4 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50">
                <div className="p-2 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Expert Persona</div>
                <button onClick={() => onSelectExpert(null)} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">None (Default)</button>
                <button onClick={() => onSelectExpert('coding')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">👨‍💻 Coding Expert</button>
                <button onClick={() => onSelectExpert('reasoning')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">🧠 Logic & Reasoning</button>
                <button onClick={() => onSelectExpert('creative')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">🎨 Creative Writer</button>
                <button onClick={() => onSelectExpert('math')} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">📐 Mathematician</button>
            </div>
        )}

        {showVariableMenu && (
            <React.Suspense fallback={null}>
                <VariableInsertMenu
                    isOpen={showVariableMenu}
                    onClose={onCloseVariableMenu}
                    onInsert={onInsertVariable}
                    context={variableContext}
                />
            </React.Suspense>
        )}
    </div>
), (prev, next) => (
    prev.actions === next.actions &&
    prev.mcpAvailable === next.mcpAvailable &&
    prev.mcpConnectedCount === next.mcpConnectedCount &&
    prev.mcpToolCount === next.mcpToolCount &&
    prev.showExpertMenu === next.showExpertMenu &&
    prev.onSelectExpert === next.onSelectExpert &&
    prev.showVariableMenu === next.showVariableMenu &&
    prev.onCloseVariableMenu === next.onCloseVariableMenu &&
    prev.onInsertVariable === next.onInsertVariable &&
    prev.variableContext === next.variableContext
));

export interface SidebarTabsHeaderProps {
    activeTab: SidebarTab;
    onSelectInspectorTab: () => void;
    onSelectControlsTab: () => void;
    onSelectPromptsTab: () => void;
    onSelectDocumentsTab: () => void;
    onCloseSidebar: () => void;
}

export const SidebarTabsHeader: React.FC<SidebarTabsHeaderProps> = React.memo(({
    activeTab,
    onSelectInspectorTab,
    onSelectControlsTab,
    onSelectPromptsTab,
    onSelectDocumentsTab,
    onCloseSidebar,
}) => (
    <div className="flex border-b border-slate-800 relative">
        <button onClick={onSelectInspectorTab} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'inspector' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Inspector</button>
        <button onClick={onSelectControlsTab} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'controls' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Controls</button>
        <button onClick={onSelectPromptsTab} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'prompts' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Prompts</button>
        <button onClick={onSelectDocumentsTab} className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${activeTab === 'documents' ? 'text-primary border-primary bg-slate-900/50' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/30'}`}>Docs</button>
        <button
            onClick={onCloseSidebar}
            className="absolute top-2 right-2 p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Close Sidebar"
        >
            <X size={14} />
        </button>
    </div>
), (prev, next) => (
    prev.activeTab === next.activeTab &&
    prev.onSelectInspectorTab === next.onSelectInspectorTab &&
    prev.onSelectControlsTab === next.onSelectControlsTab &&
    prev.onSelectPromptsTab === next.onSelectPromptsTab &&
    prev.onSelectDocumentsTab === next.onSelectDocumentsTab &&
    prev.onCloseSidebar === next.onCloseSidebar
));
