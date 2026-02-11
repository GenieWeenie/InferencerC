import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect, useRef } from 'react';
import { ChatMessage, ChatSession, Model } from '../../shared/types';
import { HistoryService } from '../services/history';

interface UseChatBootstrapParams {
    didBootstrapSessionsRef: MutableRefObject<boolean>;
    setSavedSessions: Dispatch<SetStateAction<ChatSession[]>>;
    loadSession: (id: string) => void;
    createNewSession: () => void;
    availableModels: Model[];
    history: ChatMessage[];
    currentModel: string;
    setCurrentModel: Dispatch<SetStateAction<string>>;
    maxTokens: number;
    setMaxTokens: Dispatch<SetStateAction<number>>;
}

export const useChatBootstrap = ({
    didBootstrapSessionsRef,
    setSavedSessions,
    loadSession,
    createNewSession,
    availableModels,
    history,
    currentModel,
    setCurrentModel,
    maxTokens,
    setMaxTokens,
}: UseChatBootstrapParams) => {
    const loadSessionRef = useRef(loadSession);
    const createNewSessionRef = useRef(createNewSession);

    useEffect(() => {
        loadSessionRef.current = loadSession;
    }, [loadSession]);

    useEffect(() => {
        createNewSessionRef.current = createNewSession;
    }, [createNewSession]);

    useEffect(() => {
        if (didBootstrapSessionsRef.current) return;
        didBootstrapSessionsRef.current = true;

        setSavedSessions(HistoryService.getAllSessions());
        const lastId = HistoryService.getLastActiveSessionId();
        if (lastId) {
            loadSessionRef.current(lastId);
        } else {
            createNewSessionRef.current();
        }
    }, [didBootstrapSessionsRef, setSavedSessions]);

    useEffect(() => {
        const hasActiveGeneration = history.some((message) => message.isLoading);
        if (hasActiveGeneration) return;

        const currentModelExists = availableModels.some((model) => model.id === currentModel);

        if (!currentModel && availableModels.length > 0) {
            const lastModel = localStorage.getItem('app_last_model');
            const preferredModel = lastModel && availableModels.some((model) => model.id === lastModel)
                ? lastModel
                : (availableModels.find((model: Model) => model.id === 'local-lmstudio')?.id || availableModels[0].id);
            setCurrentModel(preferredModel);
            localStorage.setItem('app_last_model', preferredModel);
        } else if (currentModel && !currentModelExists && availableModels.length > 0) {
            const lastModel = localStorage.getItem('app_last_model');
            const preferredModel = lastModel && availableModels.some((model) => model.id === lastModel)
                ? lastModel
                : (availableModels.find((model: Model) => model.id === 'local-lmstudio')?.id || availableModels[0].id);
            setCurrentModel(preferredModel);
            localStorage.setItem('app_last_model', preferredModel);
        } else if (currentModel && currentModelExists) {
            localStorage.setItem('app_last_model', currentModel);
        }
    }, [availableModels, history, currentModel, setCurrentModel]);

    useEffect(() => {
        if (!currentModel || availableModels.length === 0) return;

        const model = availableModels.find((entry) => entry.id === currentModel);
        if (model?.contextLength && maxTokens > model.contextLength) {
            const maxAllowed = Math.floor(model.contextLength * 0.95);
            setMaxTokens((previous) => Math.min(previous, maxAllowed));
        }
    }, [currentModel, availableModels, maxTokens, setMaxTokens]);
};
