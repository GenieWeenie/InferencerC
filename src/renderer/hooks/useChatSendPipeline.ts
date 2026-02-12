import React from 'react';
import type { ProjectContext } from '../services/projectContext';

interface ModelLike {
    id: string;
    name?: string;
}

interface SessionLike {
    id: string;
    title?: string;
}

interface PromptVariableServiceLike {
    hasVariables: (text: string) => boolean;
    processText: (
        text: string,
        context: {
            modelId: string;
            modelName?: string;
            sessionId: string;
            sessionTitle?: string;
            messageCount: number;
            userName?: string;
        }
    ) => Promise<string>;
    getUserName: () => string | undefined;
}

interface ProjectContextServiceLike {
    getContextSummary: (maxFiles: number) => string;
}

interface SendMessageOptions {
    excludedMessageIndices?: number[];
    contextSummary?: string;
}

interface UseChatSendPipelineParams {
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    projectContext: ProjectContext | null;
    includeContextInMessages: boolean;
    sendMessage: (options?: SendMessageOptions) => void | Promise<void>;
    currentModel: string;
    availableModels: ModelLike[];
    sessionId: string;
    savedSessions: SessionLike[];
    historyLength: number;
    buildContextSendOptions: (pendingInput: string) => SendMessageOptions;
    beginPerfBenchmark: (inputText: string) => void;
    loadPromptVariableService: () => Promise<PromptVariableServiceLike>;
    loadProjectContextService: () => Promise<ProjectContextServiceLike>;
}

const mightContainPromptVariables = (text: string): boolean => /{{[^{}]+}}/.test(text);

export const useChatSendPipeline = ({
    input,
    setInput,
    projectContext,
    includeContextInMessages,
    sendMessage,
    currentModel,
    availableModels,
    sessionId,
    savedSessions,
    historyLength,
    buildContextSendOptions,
    beginPerfBenchmark,
    loadPromptVariableService,
    loadProjectContextService,
}: UseChatSendPipelineParams) => {
    const sendMessageWithContext = React.useCallback(async () => {
        let textToSend = input;
        let hasChanges = false;

        if (mightContainPromptVariables(textToSend)) {
            const promptVariableService = await loadPromptVariableService();
            if (promptVariableService.hasVariables(textToSend)) {
                try {
                    const processed = await promptVariableService.processText(textToSend, {
                        modelId: currentModel,
                        modelName: availableModels.find((model) => model.id === currentModel)?.name,
                        sessionId,
                        sessionTitle: savedSessions.find((session) => session.id === sessionId)?.title,
                        messageCount: historyLength,
                        userName: promptVariableService.getUserName(),
                    });
                    if (processed !== textToSend) {
                        textToSend = processed;
                        hasChanges = true;
                    }
                } catch (error) {
                    console.error('Failed to process variables', error);
                }
            }
        }

        if (projectContext && includeContextInMessages) {
            const projectContextService = await loadProjectContextService();
            const contextSummary = projectContextService.getContextSummary(10);
            if (contextSummary) {
                textToSend += contextSummary;
                hasChanges = true;
            }
        }

        const sendOptions = buildContextSendOptions(textToSend);

        if (hasChanges) {
            setInput(textToSend);
            setTimeout(() => {
                beginPerfBenchmark(textToSend);
                sendMessage(sendOptions);
            }, 100);
            return;
        }

        beginPerfBenchmark(textToSend);
        sendMessage(sendOptions);
    }, [
        input,
        setInput,
        projectContext,
        includeContextInMessages,
        sendMessage,
        currentModel,
        availableModels,
        sessionId,
        savedSessions,
        historyLength,
        buildContextSendOptions,
        beginPerfBenchmark,
        loadPromptVariableService,
        loadProjectContextService,
    ]);

    return {
        sendMessageWithContext,
    };
};
