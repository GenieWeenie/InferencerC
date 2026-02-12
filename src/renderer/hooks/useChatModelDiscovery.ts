import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect, useRef } from 'react';
import { Model } from '../../shared/types';
import { backendHealthService } from '../services/backendHealth';
import {
    filterModelsByWorkspacePolicy,
    hasLikelyActiveTeamWorkspace,
} from '../lib/useChatLazyServices';
import {
    persistLastModelId,
    readPersistedLastModelId,
} from '../lib/modelSelectionStorage';
import {
    parseOpenRouterModelsResponse,
    resolveInitialModelSelection,
} from '../lib/chatModelDiscovery';

interface ConnectionStatus {
    local: 'online' | 'offline' | 'checking';
    remote: 'online' | 'offline' | 'checking' | 'none';
}

interface UseChatModelDiscoveryParams {
    openRouterApiKey: string | null;
    setAvailableModels: Dispatch<SetStateAction<Model[]>>;
    setCurrentModel: Dispatch<SetStateAction<string>>;
    setConnectionStatus: Dispatch<SetStateAction<ConnectionStatus>>;
    didApplyInitialModelSelectionRef: MutableRefObject<boolean>;
}

export const useChatModelDiscovery = ({
    openRouterApiKey,
    setAvailableModels,
    setCurrentModel,
    setConnectionStatus,
    didApplyInitialModelSelectionRef,
}: UseChatModelDiscoveryParams) => {
    const fetchModelsRef = useRef<(() => Promise<void>) | null>(null);

    useEffect(() => {
        const fetchModels = async () => {
            let models: Model[] = [];
            let localStatus: 'online' | 'offline' = backendHealthService.isOnline() ? 'online' : 'offline';
            let remoteStatus: 'online' | 'offline' | 'none' = openRouterApiKey ? 'offline' : 'none';

            if (backendHealthService.isOnline()) {
                try {
                    const res = await fetch('http://localhost:3000/v1/models', { signal: AbortSignal.timeout(3000) });
                    const data = await res.json();
                    if (data && Array.isArray(data.data)) {
                        models = [...models, ...data.data];
                        localStatus = 'online';
                        backendHealthService.reportRequestResult(true);
                    }
                } catch {
                    localStatus = 'offline';
                    backendHealthService.reportRequestResult(false);
                }
            } else {
                // Shared health service handles backend recovery probing with backoff.
                void backendHealthService.checkNow();
            }

            if (openRouterApiKey) {
                try {
                    const res = await fetch('https://openrouter.ai/api/v1/models', {
                        headers: { Authorization: `Bearer ${openRouterApiKey}` },
                        signal: AbortSignal.timeout(5000),
                    });
                    const data = await res.json() as unknown;
                    const openRouterModels = parseOpenRouterModelsResponse(data);
                    if (openRouterModels.length > 0) {
                        const orModels: Model[] = openRouterModels.map((model) => ({
                            id: `openrouter/${model.id}`,
                            name: `[OR] ${model.name || model.id}`,
                            pathOrUrl: 'https://openrouter.ai',
                            type: 'remote-endpoint',
                            status: 'loaded' as const,
                            adapter: 'mock',
                            contextLength: model.context_length || model.contextLength || undefined,
                        }));
                        models = [...models, ...orModels];
                        remoteStatus = 'online';
                    }
                } catch {
                    remoteStatus = 'offline';
                }
            }

            const filteredModels = hasLikelyActiveTeamWorkspace()
                ? filterModelsByWorkspacePolicy(models)
                : models;
            setAvailableModels(filteredModels);
            setConnectionStatus({ local: localStatus, remote: remoteStatus });

            if (!didApplyInitialModelSelectionRef.current && filteredModels.length > 0) {
                didApplyInitialModelSelectionRef.current = true;
                setCurrentModel((prevModel) => {
                    const nextModel = resolveInitialModelSelection(
                        prevModel,
                        filteredModels,
                        readPersistedLastModelId()
                    );
                    if (nextModel && nextModel !== prevModel) {
                        persistLastModelId(nextModel);
                    }
                    return nextModel;
                });
            }
        };

        fetchModelsRef.current = fetchModels;
        void fetchModels();

        const interval = setInterval(() => {
            void fetchModels();
        }, 30000);

        const handleWorkspaceChange = () => {
            void fetchModels();
        };
        const handleConnectionRefresh = () => {
            void fetchModels();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('team-workspace-changed', handleWorkspaceChange);
            window.addEventListener('chat-refresh-connections', handleConnectionRefresh as EventListener);
        }

        return () => {
            clearInterval(interval);
            if (typeof window !== 'undefined') {
                window.removeEventListener('team-workspace-changed', handleWorkspaceChange);
                window.removeEventListener('chat-refresh-connections', handleConnectionRefresh as EventListener);
            }
        };
    }, [didApplyInitialModelSelectionRef, openRouterApiKey, setAvailableModels, setConnectionStatus, setCurrentModel]);

    return {
        refreshModels: () => fetchModelsRef.current ? fetchModelsRef.current() : Promise.resolve(),
    };
};
