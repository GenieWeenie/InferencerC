import React from 'react';
import { toast } from 'sonner';
import { HistoryService } from '../services/history';

interface UseChatSessionIntegrationsParams {
    sessionId: string;
    history: Array<{ role: string; content?: string }>;
    setSelectedCode: React.Dispatch<React.SetStateAction<{ code: string; language?: string } | null>>;
    setShowCodeIntegration: React.Dispatch<React.SetStateAction<boolean>>;
    setShowExportDialog: React.Dispatch<React.SetStateAction<boolean>>;
    setShowCalendarSchedule: React.Dispatch<React.SetStateAction<boolean>>;
}

const mapSessionMessagesForExternalShare = (sessionMessages: Array<{ role: string; content?: string }>) => {
    return sessionMessages.map((message) => ({
        role: message.role,
        content: message.content || '',
    }));
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
};

export const useChatSessionIntegrations = ({
    sessionId,
    history,
    setSelectedCode,
    setShowCodeIntegration,
    setShowExportDialog,
    setShowCalendarSchedule,
}: UseChatSessionIntegrationsParams) => {
    const getCurrentSessionForIntegration = React.useCallback(() => {
        const session = HistoryService.getSession(sessionId);
        if (!session) {
            toast.error('Session not found');
            return null;
        }
        return session;
    }, [sessionId]);

    const handleOpenCodeIntegration = React.useCallback(() => {
        const lastMessage = history[history.length - 1];
        if (!lastMessage?.content) {
            return;
        }

        const codeBlockMatch = lastMessage.content.match(/```(\w+)?\n([\s\S]*?)```/);
        if (codeBlockMatch) {
            setSelectedCode({
                code: codeBlockMatch[2],
                language: codeBlockMatch[1] || 'javascript',
            });
        } else {
            setSelectedCode({
                code: lastMessage.content,
                language: 'javascript',
            });
        }
        setShowCodeIntegration(true);
    }, [history, setSelectedCode, setShowCodeIntegration]);

    const handleOpenExportDialog = React.useCallback(() => {
        setShowExportDialog(true);
    }, [setShowExportDialog]);

    const handleExportSessionToObsidian = React.useCallback(() => {
        try {
            HistoryService.exportSessionToObsidian(sessionId);
            toast.success('Chat exported as Obsidian markdown');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to export'));
        }
    }, [sessionId]);

    const handleSaveSessionToNotion = React.useCallback(async () => {
        const session = getCurrentSessionForIntegration();
        if (!session) return;

        try {
            const { notionService } = await import('../services/notion');
            const result = await notionService.saveConversation(
                session.title,
                session.messages,
                {
                    model: session.modelId,
                    date: new Date(session.lastModified).toLocaleString(),
                }
            );

            if (result.success && result.page) {
                toast.success('Saved to Notion!', {
                    action: {
                        label: 'Open',
                        onClick: () => window.open(result.page!.url, '_blank'),
                    },
                });
                return;
            }

            toast.error(result.error || 'Failed to save to Notion');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to save to Notion'));
        }
    }, [getCurrentSessionForIntegration]);

    const handleSendSessionToSlack = React.useCallback(async () => {
        const session = getCurrentSessionForIntegration();
        if (!session) return;

        try {
            const { slackService } = await import('../services/slack');
            const result = await slackService.sendConversation(
                session.title,
                mapSessionMessagesForExternalShare(session.messages)
            );

            if (result.success) {
                toast.success('Sent to Slack!');
            } else {
                toast.error(result.error || 'Failed to send to Slack');
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to send to Slack'));
        }
    }, [getCurrentSessionForIntegration]);

    const handleSendSessionToDiscord = React.useCallback(async () => {
        const session = getCurrentSessionForIntegration();
        if (!session) return;

        try {
            const { discordService } = await import('../services/discord');
            const result = await discordService.sendConversation(
                session.title,
                mapSessionMessagesForExternalShare(session.messages)
            );

            if (result.success) {
                toast.success('Sent to Discord!');
            } else {
                toast.error(result.error || 'Failed to send to Discord');
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to send to Discord'));
        }
    }, [getCurrentSessionForIntegration]);

    const handleSendSessionByEmail = React.useCallback(async () => {
        const session = getCurrentSessionForIntegration();
        if (!session) return;

        try {
            const { emailService } = await import('../services/email');
            const result = await emailService.sendConversation(
                session.title,
                mapSessionMessagesForExternalShare(session.messages)
            );

            if (result.success) {
                toast.success('Email client opened!');
            } else {
                toast.error(result.error || 'Failed to open email');
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to send email'));
        }
    }, [getCurrentSessionForIntegration]);

    const handleOpenCalendarSchedule = React.useCallback(() => {
        setShowCalendarSchedule(true);
    }, [setShowCalendarSchedule]);

    return {
        handleOpenCodeIntegration,
        handleOpenExportDialog,
        handleExportSessionToObsidian,
        handleSaveSessionToNotion,
        handleSendSessionToSlack,
        handleSendSessionToDiscord,
        handleSendSessionByEmail,
        handleOpenCalendarSchedule,
    };
};
