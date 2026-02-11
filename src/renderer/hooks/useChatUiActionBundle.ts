import React from 'react';

interface UseChatUiActionBundleParams {
    onToggleHistory: () => void;
    onCloseHistory: () => void;
    onOpenCodeIntegration: () => void;
    onOpenExportDialog: () => void;
    onExportSessionToObsidian: () => void;
    onSaveSessionToNotion: () => void;
    onSendSessionToSlack: () => void;
    onSendSessionToDiscord: () => void;
    onSendSessionByEmail: () => void;
    onOpenCalendarSchedule: () => void;
    onToggleBottomControls: () => void;
    onToggleSuggestions: () => void;
    onSendComposerMessage: () => void;
}

export interface ChatUiActionBundle {
    history: {
        toggle: () => void;
        close: () => void;
    };
    integrations: {
        openCodeIntegration: () => void;
        openExportDialog: () => void;
        exportSessionToObsidian: () => void;
        saveSessionToNotion: () => void;
        sendSessionToSlack: () => void;
        sendSessionToDiscord: () => void;
        sendSessionByEmail: () => void;
        openCalendarSchedule: () => void;
    };
    composer: {
        toggleBottomControls: () => void;
        toggleSuggestions: () => void;
        sendMessage: () => void;
    };
}

export const createChatUiActionBundle = ({
    onToggleHistory,
    onCloseHistory,
    onOpenCodeIntegration,
    onOpenExportDialog,
    onExportSessionToObsidian,
    onSaveSessionToNotion,
    onSendSessionToSlack,
    onSendSessionToDiscord,
    onSendSessionByEmail,
    onOpenCalendarSchedule,
    onToggleBottomControls,
    onToggleSuggestions,
    onSendComposerMessage,
}: UseChatUiActionBundleParams): ChatUiActionBundle => ({
    history: {
        toggle: onToggleHistory,
        close: onCloseHistory,
    },
    integrations: {
        openCodeIntegration: onOpenCodeIntegration,
        openExportDialog: onOpenExportDialog,
        exportSessionToObsidian: onExportSessionToObsidian,
        saveSessionToNotion: onSaveSessionToNotion,
        sendSessionToSlack: onSendSessionToSlack,
        sendSessionToDiscord: onSendSessionToDiscord,
        sendSessionByEmail: onSendSessionByEmail,
        openCalendarSchedule: onOpenCalendarSchedule,
    },
    composer: {
        toggleBottomControls: onToggleBottomControls,
        toggleSuggestions: onToggleSuggestions,
        sendMessage: onSendComposerMessage,
    },
});

export const useChatUiActionBundle = ({
    onToggleHistory,
    onCloseHistory,
    onOpenCodeIntegration,
    onOpenExportDialog,
    onExportSessionToObsidian,
    onSaveSessionToNotion,
    onSendSessionToSlack,
    onSendSessionToDiscord,
    onSendSessionByEmail,
    onOpenCalendarSchedule,
    onToggleBottomControls,
    onToggleSuggestions,
    onSendComposerMessage,
}: UseChatUiActionBundleParams) => {
    return React.useMemo(() => createChatUiActionBundle({
        onToggleHistory,
        onCloseHistory,
        onOpenCodeIntegration,
        onOpenExportDialog,
        onExportSessionToObsidian,
        onSaveSessionToNotion,
        onSendSessionToSlack,
        onSendSessionToDiscord,
        onSendSessionByEmail,
        onOpenCalendarSchedule,
        onToggleBottomControls,
        onToggleSuggestions,
        onSendComposerMessage,
    }), [
        onToggleHistory,
        onCloseHistory,
        onOpenCodeIntegration,
        onOpenExportDialog,
        onExportSessionToObsidian,
        onSaveSessionToNotion,
        onSendSessionToSlack,
        onSendSessionToDiscord,
        onSendSessionByEmail,
        onOpenCalendarSchedule,
        onToggleBottomControls,
        onToggleSuggestions,
        onSendComposerMessage,
    ]);
};
