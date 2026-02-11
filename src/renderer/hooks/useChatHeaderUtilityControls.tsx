import React from 'react';

interface AvailableModelLike {
    id: string;
    name?: string;
}

interface ModelOptionItem {
    id: string;
    label: string;
}

interface UseChatHeaderUtilityControlsParams {
    availableModels: AvailableModelLike[];
    currentModel: string;
    setCurrentModel: (modelId: string) => void;
    setSecondaryModel: React.Dispatch<React.SetStateAction<string>>;
    setShowRequestLog: React.Dispatch<React.SetStateAction<boolean>>;
    setShowSearch: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useChatHeaderUtilityControls = ({
    availableModels,
    currentModel,
    setCurrentModel,
    setSecondaryModel,
    setShowRequestLog,
    setShowSearch,
}: UseChatHeaderUtilityControlsParams) => {
    const modelOptionItems = React.useMemo<ModelOptionItem[]>(
        () => availableModels.map((model) => ({
            id: model.id,
            label: model.name || model.id,
        })),
        [availableModels]
    );

    const allModelOptionElements = React.useMemo(
        () => modelOptionItems.map((model) => (
            <option key={model.id} value={model.id}>{model.label}</option>
        )),
        [modelOptionItems]
    );

    const nonCurrentModelOptionElements = React.useMemo(
        () => modelOptionItems
            .filter((model) => model.id !== currentModel)
            .map((model) => (
                <option key={model.id} value={model.id}>{model.label}</option>
            )),
        [modelOptionItems, currentModel]
    );

    const modelNameById = React.useMemo(() => {
        const next = new Map<string, string>();
        for (let i = 0; i < modelOptionItems.length; i += 1) {
            const model = modelOptionItems[i];
            next.set(model.id, model.label);
        }
        return next;
    }, [modelOptionItems]);

    const handleCurrentModelChange = React.useCallback((nextModelId: string) => {
        setCurrentModel(nextModelId);
    }, [setCurrentModel]);

    const handleSecondaryModelChange = React.useCallback((nextModelId: string) => {
        setSecondaryModel(nextModelId);
    }, [setSecondaryModel]);

    const handleToggleRequestLog = React.useCallback(() => {
        setShowRequestLog((prev) => !prev);
    }, [setShowRequestLog]);

    const handleToggleSearch = React.useCallback(() => {
        setShowSearch((prev) => !prev);
    }, [setShowSearch]);

    return {
        modelOptionItems,
        allModelOptionElements,
        nonCurrentModelOptionElements,
        modelNameById,
        handleCurrentModelChange,
        handleSecondaryModelChange,
        handleToggleRequestLog,
        handleToggleSearch,
    };
};
