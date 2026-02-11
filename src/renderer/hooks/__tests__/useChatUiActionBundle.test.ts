import { createChatUiActionBundle } from '../useChatUiActionBundle';

describe('createChatUiActionBundle', () => {
    it('maps every callback into the expected grouped bundle slots', () => {
        const onToggleHistory = jest.fn();
        const onCloseHistory = jest.fn();
        const onOpenCodeIntegration = jest.fn();
        const onOpenExportDialog = jest.fn();
        const onExportSessionToObsidian = jest.fn();
        const onSaveSessionToNotion = jest.fn();
        const onSendSessionToSlack = jest.fn();
        const onSendSessionToDiscord = jest.fn();
        const onSendSessionByEmail = jest.fn();
        const onOpenCalendarSchedule = jest.fn();
        const onToggleBottomControls = jest.fn();
        const onToggleSuggestions = jest.fn();
        const onSendComposerMessage = jest.fn();

        const bundle = createChatUiActionBundle({
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
        });

        bundle.history.toggle();
        bundle.history.close();
        bundle.integrations.openCodeIntegration();
        bundle.integrations.openExportDialog();
        bundle.integrations.exportSessionToObsidian();
        bundle.integrations.saveSessionToNotion();
        bundle.integrations.sendSessionToSlack();
        bundle.integrations.sendSessionToDiscord();
        bundle.integrations.sendSessionByEmail();
        bundle.integrations.openCalendarSchedule();
        bundle.composer.toggleBottomControls();
        bundle.composer.toggleSuggestions();
        bundle.composer.sendMessage();

        expect(onToggleHistory).toHaveBeenCalledTimes(1);
        expect(onCloseHistory).toHaveBeenCalledTimes(1);
        expect(onOpenCodeIntegration).toHaveBeenCalledTimes(1);
        expect(onOpenExportDialog).toHaveBeenCalledTimes(1);
        expect(onExportSessionToObsidian).toHaveBeenCalledTimes(1);
        expect(onSaveSessionToNotion).toHaveBeenCalledTimes(1);
        expect(onSendSessionToSlack).toHaveBeenCalledTimes(1);
        expect(onSendSessionToDiscord).toHaveBeenCalledTimes(1);
        expect(onSendSessionByEmail).toHaveBeenCalledTimes(1);
        expect(onOpenCalendarSchedule).toHaveBeenCalledTimes(1);
        expect(onToggleBottomControls).toHaveBeenCalledTimes(1);
        expect(onToggleSuggestions).toHaveBeenCalledTimes(1);
        expect(onSendComposerMessage).toHaveBeenCalledTimes(1);
    });
});
