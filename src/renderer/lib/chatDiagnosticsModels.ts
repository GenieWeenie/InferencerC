import type { LaunchReadinessStep } from '../components/ChatEmptyState';

interface BuildReadinessStepsParams {
    providerReady: boolean;
    localStatus: 'online' | 'offline' | 'checking' | 'none';
    remoteStatus: 'online' | 'offline' | 'checking' | 'none';
    modelReady: boolean;
    modelLabel: string;
    promptReady: boolean;
}

export const buildReadinessSteps = ({
    providerReady,
    localStatus,
    remoteStatus,
    modelReady,
    modelLabel,
    promptReady,
}: BuildReadinessStepsParams): LaunchReadinessStep[] => {
    return [
        {
            id: 'provider',
            title: 'Provider Reachable',
            description: providerReady
                ? (localStatus === 'online' ? 'Local provider online.' : 'Remote provider online.')
                : (localStatus === 'checking' || remoteStatus === 'checking'
                    ? 'Checking provider status...'
                    : 'No reachable provider yet. Start local backend or configure OpenRouter API key.'),
            complete: providerReady,
        },
        {
            id: 'model',
            title: 'Model Selected',
            description: modelReady
                ? `Selected: ${modelLabel}`
                : 'Pick a model from the top model selector.',
            complete: modelReady,
        },
        {
            id: 'prompt',
            title: 'Prompt Drafted',
            description: promptReady
                ? 'Prompt ready. Press Send to get your first response.'
                : 'Use a starter prompt below or type your own.',
            complete: promptReady,
        },
    ];
};

interface GetDiagnosticsStatusParams {
    providerReady: boolean;
    modelReady: boolean;
    historyLength: number;
    promptReady: boolean;
}

export const getDiagnosticsStatus = ({
    providerReady,
    modelReady,
    historyLength,
    promptReady,
}: GetDiagnosticsStatusParams) => {
    if (!providerReady) {
        return {
            label: 'Provider Issue',
            detail: 'No online provider detected.',
            className: 'text-red-300 border-red-700/70 bg-red-900/20',
        };
    }
    if (!modelReady) {
        return {
            label: 'Model Needed',
            detail: 'Provider is online, but no model is selected.',
            className: 'text-amber-300 border-amber-700/70 bg-amber-900/20',
        };
    }
    if (historyLength === 0 && !promptReady) {
        return {
            label: 'Ready for Prompt',
            detail: 'Setup is healthy. Draft your first prompt.',
            className: 'text-cyan-300 border-cyan-700/70 bg-cyan-900/20',
        };
    }
    return {
        label: 'Healthy',
        detail: 'Provider and model checks look good.',
        className: 'text-emerald-300 border-emerald-700/70 bg-emerald-900/20',
    };
};
