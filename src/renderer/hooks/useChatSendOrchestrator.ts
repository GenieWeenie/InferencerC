import { Dispatch, MutableRefObject, SetStateAction, useCallback } from 'react';
import { toast } from 'sonner';
import { ChatMessage, Model } from '../../shared/types';
import { crashRecoveryService } from '../services/crashRecovery';
import { detectIntent, findBestModelForIntent } from '../lib/chatUtils';
import type {
    ChatRequestContentPart,
    ChatRequestMessage,
    ChatRequestMessageContent,
} from '../lib/chatRequestMessageTypes';
import {
    buildContextMessagesPatch,
    buildOutgoingMessagePatch,
} from '../lib/chatStateGuards';

export interface TextAttachment {
    id: string;
    name: string;
    content: string;
}

export interface ImageAttachment {
    id: string;
    name: string;
    mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
    base64: string;
    thumbnailUrl: string;
}

interface UseChatSendOrchestratorParams {
    input: string;
    setInput: Dispatch<SetStateAction<string>>;
    prefill: string | null;
    setPrefill: Dispatch<SetStateAction<string | null>>;
    attachments: TextAttachment[];
    setAttachments: Dispatch<SetStateAction<TextAttachment[]>>;
    imageAttachments: ImageAttachment[];
    setImageAttachments: Dispatch<SetStateAction<ImageAttachment[]>>;
    sessionId: string;
    currentModel: string;
    setCurrentModel: Dispatch<SetStateAction<string>>;
    availableModels: Model[];
    systemPrompt: string;
    thinkingEnabled: boolean;
    autoRouting: boolean;
    battleMode: boolean;
    secondaryModel: string;
    setAbortControllers: Dispatch<SetStateAction<AbortController[]>>;
    historyRef: MutableRefObject<ChatMessage[]>;
    fullMessageCacheRef: MutableRefObject<Map<number, ChatMessage>>;
    loadedMessageIndicesRef: MutableRefObject<Set<number>>;
    applyOutgoingPatch: (patch: ReturnType<typeof buildOutgoingMessagePatch>) => void;
    streamResponse: (
        modelId: string,
        messages: ChatRequestMessage[],
        targetIndex: number,
        signal: AbortSignal,
        labelPrefix?: string,
        webhookHistorySnapshot?: ChatMessage[] | null
    ) => Promise<void>;
    logComplianceEvent: (event: Record<string, unknown>) => void;
    responseFormat: 'text' | 'json_object';
}

const resetComposer = ({
    sessionId,
    setInput,
    setAttachments,
    setImageAttachments,
    setPrefill,
}: {
    sessionId: string;
    setInput: Dispatch<SetStateAction<string>>;
    setAttachments: Dispatch<SetStateAction<TextAttachment[]>>;
    setImageAttachments: Dispatch<SetStateAction<ImageAttachment[]>>;
    setPrefill: Dispatch<SetStateAction<string | null>>;
}) => {
    setInput('');
    setAttachments([]);
    setImageAttachments([]);
    setPrefill(null);
    crashRecoveryService.saveDraft(sessionId, '');
};

export const useChatSendOrchestrator = ({
    input,
    setInput,
    prefill,
    setPrefill,
    attachments,
    setAttachments,
    imageAttachments,
    setImageAttachments,
    sessionId,
    currentModel,
    setCurrentModel,
    availableModels,
    systemPrompt,
    thinkingEnabled,
    autoRouting,
    battleMode,
    secondaryModel,
    setAbortControllers,
    historyRef,
    fullMessageCacheRef,
    loadedMessageIndicesRef,
    applyOutgoingPatch,
    streamResponse,
    logComplianceEvent,
    responseFormat,
}: UseChatSendOrchestratorParams) => {
    const sendMessage = useCallback(async (contextOptions?: {
        excludedMessageIndices?: number[];
        contextSummary?: string;
    }) => {
        if (!input.trim() && attachments.length === 0 && imageAttachments.length === 0) {
            return;
        }

        let finalInput = input;
        let modelToUse = currentModel;

        if (autoRouting && availableModels.length > 0 && !battleMode) {
            const intent = detectIntent(finalInput);
            const bestModel = findBestModelForIntent(intent, availableModels);
            if (bestModel && bestModel !== currentModel) {
                modelToUse = bestModel;
                setCurrentModel(bestModel);
                toast.info(`Auto-routed to ${bestModel} (${intent})`);
                logComplianceEvent({
                    category: 'chat.routing',
                    action: 'auto_route.selected',
                    result: 'info',
                    resourceType: 'session',
                    resourceId: sessionId,
                    details: {
                        fromModel: currentModel,
                        toModel: bestModel,
                        intent,
                    },
                });
            }
        }

        logComplianceEvent({
            category: 'chat.message',
            action: 'send.requested',
            result: 'info',
            resourceType: 'session',
            resourceId: sessionId,
            details: {
                modelId: modelToUse,
                battleMode,
                attachmentCount: attachments.length,
                imageCount: imageAttachments.length,
                excludedContextCount: contextOptions?.excludedMessageIndices?.length || 0,
                responseFormat,
            },
        });

        if (attachments.length > 0) {
            const attachmentText = attachments
                .map((attachment) => `\n\n--- FILE: ${attachment.name} ---\n${attachment.content}\n--- END FILE ---`)
                .join('');
            finalInput += attachmentText;
        }

        let finalSystemPrompt = systemPrompt;
        if (thinkingEnabled) {
            finalSystemPrompt += '\n\nIMPORTANT: You must engage in a deep thought process before answering. Enclose your thought process inside <thinking>...</thinking> XML tags. In the thinking block, break down the problem step-by-step, consider multiple angles, and critique your own reasoning. Then provide your final answer outside the tags.';
        }

        let userMessageContent: ChatRequestMessageContent = finalInput;
        if (imageAttachments.length > 0) {
            const contentParts: ChatRequestContentPart[] = [];
            if (finalInput.trim()) {
                contentParts.push({ type: 'text', text: finalInput });
            }
            for (const image of imageAttachments) {
                contentParts.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:${image.mimeType};base64,${image.base64}`,
                        detail: 'auto',
                    },
                });
            }
            userMessageContent = contentParts;
        }

        const currentHistory = historyRef.current;
        const currentFullMessageCache = fullMessageCacheRef.current;
        const currentLoadedMessageIndices = loadedMessageIndicesRef.current;
        const excludedIndices = new Set(contextOptions?.excludedMessageIndices || []);
        const baseMessages = buildContextMessagesPatch({
            history: currentHistory,
            excludedIndices,
            finalSystemPrompt,
            contextSummary: contextOptions?.contextSummary,
            userMessageContent,
        });

        const imageCountText = imageAttachments.length > 0 ? `[${imageAttachments.length} image(s)]` : '';
        const fileCountText = attachments.length > 0 ? `[${attachments.length} file(s)]` : '';
        const uiContent = input || `${imageCountText} ${fileCountText}`.trim() || '[Empty message]';

        const userMessage: ChatMessage = {
            role: 'user',
            content: uiContent,
            images: imageAttachments.map((image) => ({
                id: image.id,
                name: image.name,
                mimeType: image.mimeType,
                base64: image.base64,
                thumbnailUrl: image.thumbnailUrl,
            })),
        };

        if (battleMode && secondaryModel) {
            const primaryAssistantMessage: ChatMessage = { role: 'assistant', content: '', isLoading: true };
            const secondaryAssistantMessage: ChatMessage = { role: 'assistant', content: '', isLoading: true };
            const outgoingPatch = buildOutgoingMessagePatch({
                history: currentHistory,
                fullMessageCache: currentFullMessageCache,
                loadedMessageIndices: currentLoadedMessageIndices,
                userMessage,
                assistantMessages: [primaryAssistantMessage, secondaryAssistantMessage],
            });
            const primaryIndex = outgoingPatch.assistantStartIndex;
            const secondaryIndex = outgoingPatch.assistantStartIndex + 1;

            applyOutgoingPatch(outgoingPatch);
            resetComposer({ sessionId, setInput, setAttachments, setImageAttachments, setPrefill });

            const primaryController = new AbortController();
            const secondaryController = new AbortController();
            setAbortControllers([primaryController, secondaryController]);

            const primaryLabel = availableModels.find((model) => model.id === modelToUse)?.name || modelToUse;
            const secondaryLabel = availableModels.find((model) => model.id === secondaryModel)?.name || secondaryModel;

            void streamResponse(modelToUse, baseMessages, primaryIndex, primaryController.signal, `Model A: ${primaryLabel}`, outgoingPatch.nextHistory);
            void streamResponse(secondaryModel, baseMessages, secondaryIndex, secondaryController.signal, `Model B: ${secondaryLabel}`, outgoingPatch.nextHistory);
            return;
        }

        const loadingItem: ChatMessage = { role: 'assistant', content: prefill || '', isLoading: true };
        const outgoingPatch = buildOutgoingMessagePatch({
            history: currentHistory,
            fullMessageCache: currentFullMessageCache,
            loadedMessageIndices: currentLoadedMessageIndices,
            userMessage,
            assistantMessages: [loadingItem],
        });
        const targetIndex = outgoingPatch.assistantStartIndex;

        applyOutgoingPatch(outgoingPatch);
        resetComposer({ sessionId, setInput, setAttachments, setImageAttachments, setPrefill });

        const controller = new AbortController();
        setAbortControllers([controller]);

        const messagesToSend = [...baseMessages];
        if (prefill) {
            messagesToSend.push({ role: 'assistant', content: prefill });
        }

        void streamResponse(modelToUse, messagesToSend, targetIndex, controller.signal, '', outgoingPatch.nextHistory);
    }, [
        applyOutgoingPatch,
        attachments,
        autoRouting,
        availableModels,
        battleMode,
        currentModel,
        fullMessageCacheRef,
        historyRef,
        imageAttachments,
        input,
        loadedMessageIndicesRef,
        logComplianceEvent,
        prefill,
        responseFormat,
        secondaryModel,
        sessionId,
        setAbortControllers,
        setAttachments,
        setCurrentModel,
        setImageAttachments,
        setInput,
        setPrefill,
        streamResponse,
        systemPrompt,
        thinkingEnabled,
    ]);

    return {
        sendMessage,
    };
};
