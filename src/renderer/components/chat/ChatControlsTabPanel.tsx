import React from 'react';
import { Brain, Clock, Edit2, FileJson, Network, Users, Wrench } from 'lucide-react';
import type { ContextUsage } from '../../services/contextManagement';
import type { RecentContextMessageRow } from '../../lib/chatUiModels';
import { AVAILABLE_TOOLS } from '../../lib/tools';

interface ControlToggleRowProps {
    icon: React.ReactNode;
    label: string;
    description?: string;
    enabled: boolean;
    onToggle: () => void;
    borderClassName?: string;
    children?: React.ReactNode;
    title?: string;
}

const ControlToggleRow: React.FC<ControlToggleRowProps> = React.memo(({
    icon,
    label,
    description,
    enabled,
    onToggle,
    borderClassName = 'pb-4 border-b border-slate-800',
    children,
    title,
}) => (
    <div className={borderClassName}>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                {icon}
                <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-300">{label}</label>
                    {description && (
                        <span className="text-[10px] text-slate-500">{description}</span>
                    )}
                </div>
            </div>
            <button
                onClick={onToggle}
                className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-slate-700'}`}
                title={title}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
        {children}
    </div>
), (prev, next) => (
    prev.icon === next.icon &&
    prev.label === next.label &&
    prev.description === next.description &&
    prev.enabled === next.enabled &&
    prev.onToggle === next.onToggle &&
    prev.borderClassName === next.borderClassName &&
    prev.children === next.children &&
    prev.title === next.title
));

interface ToolsToggleListProps {
    enabledTools: Set<string>;
    onToggleTool: (toolName: string) => void;
}

const ToolsToggleList: React.FC<ToolsToggleListProps> = React.memo(({
    enabledTools,
    onToggleTool,
}) => (
    <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-3">
            <Wrench size={16} className="text-slate-400" />
            <label className="text-sm font-medium text-slate-300">Tools</label>
        </div>
        <div className="space-y-2">
            {AVAILABLE_TOOLS.map((tool) => {
                const isEnabled = enabledTools.has(tool.name);
                return (
                    <div key={tool.name} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-700/50">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-200 font-medium">{tool.name}</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{tool.description}</span>
                        </div>
                        <button
                            onClick={() => onToggleTool(tool.name)}
                            className={`w-8 h-4 rounded-full transition-colors relative ${isEnabled ? 'bg-primary' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                );
            })}
        </div>
    </div>
), (prev, next) => (
    prev.enabledTools === next.enabledTools &&
    prev.onToggleTool === next.onToggleTool
));

interface ContextOptimizerPanelProps {
    contextUsage: ContextUsage;
    autoSummarizeContext: boolean;
    onToggleAutoSummarizeContext: () => void;
    onApplySuggestedTrim: () => void;
    onIncludeAll: () => void;
    trimSuggestionRows: Array<{
        key: string;
        messageIndex: number;
        label: string;
        preview: string;
    }>;
    onExcludeTrimSuggestion: (messageIndex: number) => void;
    recentContextRows: RecentContextMessageRow[];
    onToggleContextMessage: (messageIndex: number) => void;
}

const ContextOptimizerPanel: React.FC<ContextOptimizerPanelProps> = React.memo(({
    contextUsage,
    autoSummarizeContext,
    onToggleAutoSummarizeContext,
    onApplySuggestedTrim,
    onIncludeAll,
    trimSuggestionRows,
    onExcludeTrimSuggestion,
    recentContextRows,
    onToggleContextMessage,
}) => (
    <div className="pb-4 border-b border-slate-800 space-y-3">
        <ControlToggleRow
            icon={<Clock size={16} className={contextUsage.warning ? 'text-amber-400' : 'text-slate-400'} />}
            label="Context Optimizer"
            description={`${Math.round(contextUsage.fillRatio * 100)}% of ${contextUsage.maxContextTokens.toLocaleString()} tokens used`}
            enabled={autoSummarizeContext}
            onToggle={onToggleAutoSummarizeContext}
            borderClassName="space-y-0"
            title="Auto-summarize old messages when context is near full"
        />

        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
                className={`h-full transition-all ${contextUsage.fillRatio >= 0.9 ? 'bg-red-500' : contextUsage.fillRatio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, contextUsage.fillRatio * 100)}%` }}
            />
        </div>

        <div className="text-[10px] text-slate-500">
            Input: {contextUsage.inputTokens.toLocaleString()} • Reserved output: {contextUsage.reservedOutputTokens.toLocaleString()}
        </div>

        <div className="flex items-center gap-2">
            <button
                onClick={onApplySuggestedTrim}
                disabled={trimSuggestionRows.length === 0}
                className="px-2 py-1 text-[10px] rounded bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40"
            >
                Apply Suggested Trim
            </button>
            <button
                onClick={onIncludeAll}
                className="px-2 py-1 text-[10px] rounded bg-slate-800 border border-slate-700 text-slate-300"
            >
                Include All
            </button>
        </div>

        {trimSuggestionRows.length > 0 && (
            <div className="space-y-1">
                {trimSuggestionRows.map((suggestion) => (
                    <div key={suggestion.key} className="flex items-start justify-between gap-2 p-2 rounded bg-slate-900 border border-slate-700/50">
                        <div className="min-w-0">
                            <div className="text-[10px] text-slate-300">{suggestion.label}</div>
                            <div className="text-[10px] text-slate-500 truncate">{suggestion.preview}</div>
                        </div>
                        <button
                            onClick={() => onExcludeTrimSuggestion(suggestion.messageIndex)}
                            className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                        >
                            Exclude
                        </button>
                    </div>
                ))}
            </div>
        )}

        {recentContextRows.length > 0 && (
            <div className="space-y-1 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                {recentContextRows.map((item) => (
                    <label key={item.key} className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-slate-900/60">
                        <span className="text-[10px] text-slate-400 truncate">
                            #{item.index + 1} {item.role} • ~{item.estimatedTokens}t
                        </span>
                        <input
                            type="checkbox"
                            checked={item.included}
                            onChange={() => onToggleContextMessage(item.index)}
                            className="rounded border-slate-600 bg-slate-800"
                            title="Include this message in model context"
                        />
                    </label>
                ))}
            </div>
        )}
    </div>
), (prev, next) => (
    prev.contextUsage === next.contextUsage &&
    prev.autoSummarizeContext === next.autoSummarizeContext &&
    prev.onToggleAutoSummarizeContext === next.onToggleAutoSummarizeContext &&
    prev.onApplySuggestedTrim === next.onApplySuggestedTrim &&
    prev.onIncludeAll === next.onIncludeAll &&
    prev.trimSuggestionRows === next.trimSuggestionRows &&
    prev.onExcludeTrimSuggestion === next.onExcludeTrimSuggestion &&
    prev.recentContextRows === next.recentContextRows &&
    prev.onToggleContextMessage === next.onToggleContextMessage
));

interface SamplingControlsPanelProps {
    batchSize: number;
    onBatchSizeChange: (value: number) => void;
    temperature: number;
    onTemperatureChange: (value: number) => void;
    topP: number;
    onTopPChange: (value: number) => void;
    maxTokens: number;
    onMaxTokensChange: (value: number) => void;
    sliderMax: number;
    sliderStep: number;
    modelContextLength?: number;
}

const SamplingControlsPanel: React.FC<SamplingControlsPanelProps> = React.memo(({
    batchSize,
    onBatchSizeChange,
    temperature,
    onTemperatureChange,
    topP,
    onTopPChange,
    maxTokens,
    onMaxTokensChange,
    sliderMax,
    sliderStep,
    modelContextLength,
}) => (
    <>
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <label className="text-slate-400">Batch Size</label>
                <span className="font-mono text-primary">{batchSize}</span>
            </div>
            <input
                type="range"
                min="1"
                max="5"
                value={batchSize}
                onChange={(e) => onBatchSizeChange(parseInt(e.target.value, 10))}
                className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
        </div>
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <label className="text-slate-400">Temperature</label>
                <span className="font-mono text-primary">{temperature}</span>
            </div>
            <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
        </div>
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <label className="text-slate-400">Top P</label>
                <span className="font-mono text-primary">{topP}</span>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={(e) => onTopPChange(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
        </div>
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <label className="text-slate-400">Max Tokens</label>
                <span className="font-mono text-primary">{maxTokens.toLocaleString()}</span>
            </div>
            <input
                type="range"
                min="1"
                max={sliderMax}
                step={sliderStep}
                value={maxTokens}
                onChange={(e) => onMaxTokensChange(parseInt(e.target.value, 10))}
                className="w-full accent-primary h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            {modelContextLength && (
                <div className="text-[10px] text-slate-500 text-right">
                    Model context: {modelContextLength.toLocaleString()} tokens
                </div>
            )}
        </div>
    </>
), (prev, next) => (
    prev.batchSize === next.batchSize &&
    prev.onBatchSizeChange === next.onBatchSizeChange &&
    prev.temperature === next.temperature &&
    prev.onTemperatureChange === next.onTemperatureChange &&
    prev.topP === next.topP &&
    prev.onTopPChange === next.onTopPChange &&
    prev.maxTokens === next.maxTokens &&
    prev.onMaxTokensChange === next.onMaxTokensChange &&
    prev.sliderMax === next.sliderMax &&
    prev.sliderStep === next.sliderStep &&
    prev.modelContextLength === next.modelContextLength
));

export interface ChatControlsTabPanelProps {
    systemPrompt: string;
    isEditingSystemPrompt: boolean;
    onStartEditingSystemPrompt: () => void;
    onStopEditingSystemPrompt: () => void;
    onSystemPromptChange: (value: string) => void;
    battleMode: boolean;
    onToggleBattleMode: () => void;
    secondaryModel: string;
    secondaryModelDisplayName: string;
    nonCurrentModelOptionElements: React.ReactNode;
    onSecondaryModelChange: (value: string) => void;
    thinkingEnabled: boolean;
    onToggleThinkingEnabled: () => void;
    autoRouting: boolean;
    onToggleAutoRouting: () => void;
    enabledTools: Set<string>;
    onToggleTool: (toolName: string) => void;
    jsonModeEnabled: boolean;
    onToggleJsonMode: () => void;
    contextUsage: ContextUsage;
    autoSummarizeContext: boolean;
    onToggleAutoSummarizeContext: () => void;
    onApplySuggestedTrim: () => void;
    onIncludeAllContext: () => void;
    trimSuggestionRows: Array<{
        key: string;
        messageIndex: number;
        label: string;
        preview: string;
    }>;
    onExcludeTrimSuggestion: (messageIndex: number) => void;
    recentContextRows: RecentContextMessageRow[];
    onToggleContextMessage: (messageIndex: number) => void;
    batchSize: number;
    onBatchSizeChange: (value: number) => void;
    temperature: number;
    onTemperatureChange: (value: number) => void;
    topP: number;
    onTopPChange: (value: number) => void;
    maxTokens: number;
    onMaxTokensChange: (value: number) => void;
    maxTokenSliderMax: number;
    maxTokenSliderStep: number;
    modelContextLength?: number;
}

export const ChatControlsTabPanel: React.FC<ChatControlsTabPanelProps> = React.memo(({
    systemPrompt,
    isEditingSystemPrompt,
    onStartEditingSystemPrompt,
    onStopEditingSystemPrompt,
    onSystemPromptChange,
    battleMode,
    onToggleBattleMode,
    secondaryModel,
    secondaryModelDisplayName,
    nonCurrentModelOptionElements,
    onSecondaryModelChange,
    thinkingEnabled,
    onToggleThinkingEnabled,
    autoRouting,
    onToggleAutoRouting,
    enabledTools,
    onToggleTool,
    jsonModeEnabled,
    onToggleJsonMode,
    contextUsage,
    autoSummarizeContext,
    onToggleAutoSummarizeContext,
    onApplySuggestedTrim,
    onIncludeAllContext,
    trimSuggestionRows,
    onExcludeTrimSuggestion,
    recentContextRows,
    onToggleContextMessage,
    batchSize,
    onBatchSizeChange,
    temperature,
    onTemperatureChange,
    topP,
    onTopPChange,
    maxTokens,
    onMaxTokensChange,
    maxTokenSliderMax,
    maxTokenSliderStep,
    modelContextLength,
}) => (
    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-4">
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider block">System Prompt</label>
                {!isEditingSystemPrompt && (
                    <span className="text-[10px] text-slate-500 italic">Double-click to edit</span>
                )}
            </div>
            {isEditingSystemPrompt ? (
                <textarea
                    value={systemPrompt}
                    autoFocus
                    onBlur={onStopEditingSystemPrompt}
                    onChange={(event) => onSystemPromptChange(event.target.value)}
                    className="w-full h-32 bg-white text-slate-900 border-2 border-primary rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary outline-none resize-none transition-all shadow-xl"
                />
            ) : (
                <div
                    onDoubleClick={onStartEditingSystemPrompt}
                    className="w-full min-h-32 bg-slate-900 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-400 overflow-y-auto custom-scrollbar cursor-pointer hover:border-primary/50 hover:bg-slate-900/80 transition-all select-none group relative break-words"
                    title="Double-click to edit"
                >
                    <div className="whitespace-pre-wrap break-words">{systemPrompt || 'No system prompt set.'}</div>
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Edit2 size={24} className="text-primary/30" />
                    </div>
                </div>
            )}
        </div>
        <div className="space-y-6">
            <ControlToggleRow
                icon={<Users size={16} className={battleMode ? 'text-primary' : 'text-slate-400'} />}
                label="Battle Mode"
                enabled={battleMode}
                onToggle={onToggleBattleMode}
            >
                {battleMode && (
                    <div className="space-y-2 animate-in slide-in-from-top-1 fade-in duration-200 mt-3">
                        <label className="text-xs text-slate-400 flex justify-between">
                            <span>Opponent Model</span>
                            <span className="text-primary font-mono">{secondaryModelDisplayName}</span>
                        </label>
                        <select
                            value={secondaryModel}
                            onChange={(event) => onSecondaryModelChange(event.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-primary outline-none"
                        >
                            <option value="">Select Model...</option>
                            {nonCurrentModelOptionElements}
                        </select>
                    </div>
                )}
            </ControlToggleRow>

            <ControlToggleRow
                icon={<Brain size={16} className={thinkingEnabled ? 'text-primary' : 'text-slate-400'} />}
                label="Reasoning Mode"
                description="Injects <thinking> tags logic"
                enabled={thinkingEnabled}
                onToggle={onToggleThinkingEnabled}
            />

            <ControlToggleRow
                icon={<Network size={16} className={autoRouting ? 'text-primary' : 'text-slate-400'} />}
                label="Auto Model Routing"
                description="Selects best model for query intent"
                enabled={autoRouting}
                onToggle={onToggleAutoRouting}
            />

            <ToolsToggleList enabledTools={enabledTools} onToggleTool={onToggleTool} />

            <ControlToggleRow
                icon={<FileJson size={16} className={jsonModeEnabled ? 'text-primary' : 'text-slate-400'} />}
                label="JSON Mode"
                description="Force model to output valid JSON"
                enabled={jsonModeEnabled}
                onToggle={onToggleJsonMode}
            />

            <ContextOptimizerPanel
                contextUsage={contextUsage}
                autoSummarizeContext={autoSummarizeContext}
                onToggleAutoSummarizeContext={onToggleAutoSummarizeContext}
                onApplySuggestedTrim={onApplySuggestedTrim}
                onIncludeAll={onIncludeAllContext}
                trimSuggestionRows={trimSuggestionRows}
                onExcludeTrimSuggestion={onExcludeTrimSuggestion}
                recentContextRows={recentContextRows}
                onToggleContextMessage={onToggleContextMessage}
            />

            <SamplingControlsPanel
                batchSize={batchSize}
                onBatchSizeChange={onBatchSizeChange}
                temperature={temperature}
                onTemperatureChange={onTemperatureChange}
                topP={topP}
                onTopPChange={onTopPChange}
                maxTokens={maxTokens}
                onMaxTokensChange={onMaxTokensChange}
                sliderMax={maxTokenSliderMax}
                sliderStep={maxTokenSliderStep}
                modelContextLength={modelContextLength}
            />
        </div>
    </div>
), (prev, next) => (
    prev.systemPrompt === next.systemPrompt &&
    prev.isEditingSystemPrompt === next.isEditingSystemPrompt &&
    prev.onStartEditingSystemPrompt === next.onStartEditingSystemPrompt &&
    prev.onStopEditingSystemPrompt === next.onStopEditingSystemPrompt &&
    prev.onSystemPromptChange === next.onSystemPromptChange &&
    prev.battleMode === next.battleMode &&
    prev.onToggleBattleMode === next.onToggleBattleMode &&
    prev.secondaryModel === next.secondaryModel &&
    prev.secondaryModelDisplayName === next.secondaryModelDisplayName &&
    prev.nonCurrentModelOptionElements === next.nonCurrentModelOptionElements &&
    prev.onSecondaryModelChange === next.onSecondaryModelChange &&
    prev.thinkingEnabled === next.thinkingEnabled &&
    prev.onToggleThinkingEnabled === next.onToggleThinkingEnabled &&
    prev.autoRouting === next.autoRouting &&
    prev.onToggleAutoRouting === next.onToggleAutoRouting &&
    prev.enabledTools === next.enabledTools &&
    prev.onToggleTool === next.onToggleTool &&
    prev.jsonModeEnabled === next.jsonModeEnabled &&
    prev.onToggleJsonMode === next.onToggleJsonMode &&
    prev.contextUsage === next.contextUsage &&
    prev.autoSummarizeContext === next.autoSummarizeContext &&
    prev.onToggleAutoSummarizeContext === next.onToggleAutoSummarizeContext &&
    prev.onApplySuggestedTrim === next.onApplySuggestedTrim &&
    prev.onIncludeAllContext === next.onIncludeAllContext &&
    prev.trimSuggestionRows === next.trimSuggestionRows &&
    prev.onExcludeTrimSuggestion === next.onExcludeTrimSuggestion &&
    prev.recentContextRows === next.recentContextRows &&
    prev.onToggleContextMessage === next.onToggleContextMessage &&
    prev.batchSize === next.batchSize &&
    prev.onBatchSizeChange === next.onBatchSizeChange &&
    prev.temperature === next.temperature &&
    prev.onTemperatureChange === next.onTemperatureChange &&
    prev.topP === next.topP &&
    prev.onTopPChange === next.onTopPChange &&
    prev.maxTokens === next.maxTokens &&
    prev.onMaxTokensChange === next.onMaxTokensChange &&
    prev.maxTokenSliderMax === next.maxTokenSliderMax &&
    prev.maxTokenSliderStep === next.maxTokenSliderStep &&
    prev.modelContextLength === next.modelContextLength
));
