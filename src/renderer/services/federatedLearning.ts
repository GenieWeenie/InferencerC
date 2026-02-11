/**
 * Federated Learning Service
 *
 * Privacy-preserving model training
 */

export interface FederatedLearningConfig {
    enabled: boolean;
    participationMode: 'active' | 'passive' | 'disabled';
    aggregationServer?: string;
    modelName?: string;
    trainingRounds: number;
    localEpochs: number;
    batchSize: number;
    learningRate: number;
}

export interface TrainingRound {
    round: number;
    participants: number;
    modelVersion: string;
    startTime: number;
    endTime?: number;
    status: 'pending' | 'training' | 'aggregating' | 'completed' | 'failed';
    metrics?: {
        loss: number;
        accuracy: number;
        samples: number;
    };
}

export interface LocalModelUpdate {
    round: number;
    modelWeights: string; // Base64 encoded weights
    sampleCount: number;
    metrics: {
        loss: number;
        accuracy: number;
    };
    timestamp: number;
}

const PARTICIPATION_MODES = new Set<FederatedLearningConfig['participationMode']>(['active', 'passive', 'disabled']);
const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const getDefaultConfig = (): FederatedLearningConfig => ({
    enabled: false,
    participationMode: 'disabled',
    trainingRounds: 10,
    localEpochs: 3,
    batchSize: 32,
    learningRate: 0.001,
});

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const sanitizeFiniteNonNegativeInteger = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return null;
    }
    return Math.floor(value);
};

const sanitizePositiveInteger = (value: unknown): number | null => {
    const normalized = sanitizeFiniteNonNegativeInteger(value);
    if (normalized === null || normalized <= 0) {
        return null;
    }
    return normalized;
};

const sanitizePositiveFiniteNumber = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return null;
    }
    return value;
};

const sanitizeConfig = (value: unknown): FederatedLearningConfig => {
    const defaults = getDefaultConfig();
    if (!isRecord(value)) {
        return defaults;
    }

    return {
        enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
        participationMode: PARTICIPATION_MODES.has(value.participationMode as FederatedLearningConfig['participationMode'])
            ? value.participationMode as FederatedLearningConfig['participationMode']
            : defaults.participationMode,
        aggregationServer: sanitizeNonEmptyString(value.aggregationServer) || undefined,
        modelName: sanitizeNonEmptyString(value.modelName) || undefined,
        trainingRounds: sanitizePositiveInteger(value.trainingRounds) ?? defaults.trainingRounds,
        localEpochs: sanitizePositiveInteger(value.localEpochs) ?? defaults.localEpochs,
        batchSize: sanitizePositiveInteger(value.batchSize) ?? defaults.batchSize,
        learningRate: sanitizePositiveFiniteNumber(value.learningRate) ?? defaults.learningRate,
    };
};

const sanitizeLocalUpdate = (value: unknown): LocalModelUpdate | null => {
    if (!isRecord(value) || !isRecord(value.metrics)) {
        return null;
    }
    const round = sanitizeFiniteNonNegativeInteger(value.round);
    const modelWeights = sanitizeNonEmptyString(value.modelWeights);
    const sampleCount = sanitizeFiniteNonNegativeInteger(value.sampleCount);
    const timestamp = sanitizeFiniteNonNegativeInteger(value.timestamp);
    const loss = typeof value.metrics.loss === 'number' && Number.isFinite(value.metrics.loss)
        ? value.metrics.loss
        : null;
    const accuracy = typeof value.metrics.accuracy === 'number' && Number.isFinite(value.metrics.accuracy)
        ? value.metrics.accuracy
        : null;
    if (round === null
        || !modelWeights
        || sampleCount === null
        || loss === null
        || accuracy === null
        || timestamp === null) {
        return null;
    }

    return {
        round,
        modelWeights,
        sampleCount,
        metrics: {
            loss,
            accuracy,
        },
        timestamp,
    };
};

const parseStoredUpdates = (raw: string): LocalModelUpdate[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    const updates = parsed
        .map((entry) => sanitizeLocalUpdate(entry))
        .filter((entry): entry is LocalModelUpdate => entry !== null);
    const seenKeys = new Set<string>();
    return updates.filter((entry) => {
        const key = `${entry.round}:${entry.timestamp}:${entry.modelWeights}`;
        if (seenKeys.has(key)) {
            return false;
        }
        seenKeys.add(key);
        return true;
    });
};

export class FederatedLearningService {
    private static instance: FederatedLearningService;
    private readonly STORAGE_KEY = 'federated_learning_config';
    private readonly UPDATES_KEY = 'federated_updates';
    private config: FederatedLearningConfig;
    private trainingRounds: TrainingRound[] = [];

    private constructor() {
        this.config = this.loadConfig();
    }

    static getInstance(): FederatedLearningService {
        if (!FederatedLearningService.instance) {
            FederatedLearningService.instance = new FederatedLearningService();
        }
        return FederatedLearningService.instance;
    }

    /**
     * Load configuration
     */
    private loadConfig(): FederatedLearningConfig {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return sanitizeConfig(parseJson(stored));
            }
        } catch (error) {
            console.error('Failed to load federated learning config:', error);
        }

        return getDefaultConfig();
    }

    /**
     * Save configuration
     */
    saveConfig(config: Partial<FederatedLearningConfig>): void {
        this.config = sanitizeConfig({ ...this.config, ...config });
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    }

    /**
     * Get configuration
     */
    getConfig(): FederatedLearningConfig {
        return { ...this.config };
    }

    /**
     * Start federated learning round
     */
    async startTrainingRound(
        round: number,
        globalModelWeights?: string
    ): Promise<TrainingRound> {
        if (!this.config.enabled || this.config.participationMode === 'disabled') {
            throw new Error('Federated learning is not enabled');
        }

        const trainingRound: TrainingRound = {
            round,
            participants: 1, // Local participant
            modelVersion: `v${round}`,
            startTime: Date.now(),
            status: 'training',
        };

        this.trainingRounds.push(trainingRound);

        // Train local model
        if (this.config.participationMode === 'active') {
            await this.trainLocalModel(round, globalModelWeights);
        }

        return trainingRound;
    }

    /**
     * Train local model
     */
    private async trainLocalModel(round: number, globalWeights?: string): Promise<void> {
        // In a real implementation, this would:
        // 1. Load local training data
        // 2. Initialize model with global weights (if provided)
        // 3. Train for localEpochs
        // 4. Generate model update

        // For now, simulate training
        const localData = this.getLocalTrainingData();
        const update: LocalModelUpdate = {
            round,
            modelWeights: globalWeights || this.generateMockWeights(),
            sampleCount: localData.length,
            metrics: {
                loss: Math.random() * 0.5,
                accuracy: 0.7 + Math.random() * 0.2,
            },
            timestamp: Date.now(),
        };

        this.saveLocalUpdate(update);
    }

    /**
     * Get local training data (mock)
     */
    private getLocalTrainingData(): Array<{ input: unknown; output: unknown }> {
        // In a real implementation, this would load actual conversation data
        // For privacy, data never leaves the device
        return Array.from({ length: 100 }, () => ({
            input: 'sample input',
            output: 'sample output',
        }));
    }

    /**
     * Generate mock model weights
     */
    private generateMockWeights(): string {
        // In a real implementation, this would be actual model weights
        return btoa(JSON.stringify({ weights: Array.from({ length: 1000 }, () => Math.random()) }));
    }

    /**
     * Save local model update
     */
    private saveLocalUpdate(update: LocalModelUpdate): void {
        try {
            const sanitizedUpdate = sanitizeLocalUpdate(update);
            if (!sanitizedUpdate) {
                return;
            }
            const stored = localStorage.getItem(this.UPDATES_KEY);
            const updates = stored ? parseStoredUpdates(stored) : [];
            updates.push(sanitizedUpdate);
            const deduped: LocalModelUpdate[] = [];
            const seenKeys = new Set<string>();
            for (let index = updates.length - 1; index >= 0; index--) {
                const entry = updates[index];
                const key = `${entry.round}:${entry.timestamp}:${entry.modelWeights}`;
                if (seenKeys.has(key)) {
                    continue;
                }
                seenKeys.add(key);
                deduped.push(entry);
            }
            deduped.reverse();
            // Keep only last 50 updates
            if (deduped.length > 50) {
                deduped.splice(0, deduped.length - 50);
            }
            localStorage.setItem(this.UPDATES_KEY, JSON.stringify(deduped));
        } catch (error) {
            console.error('Failed to save update:', error);
        }
    }

    /**
     * Submit local update to aggregation server
     */
    async submitUpdate(round: number): Promise<{ success: boolean; error?: string }> {
        const updates = this.getLocalUpdates();
        const update = updates.find(u => u.round === round);
        if (!update) {
            return { success: false, error: 'Update not found' };
        }

        // In a real implementation, this would send to aggregation server
        // For now, simulate submission
        if (this.config.aggregationServer) {
            // Would make HTTP request to aggregation server
            return { success: true };
        }

        return { success: false, error: 'No aggregation server configured' };
    }

    /**
     * Get local updates
     */
    getLocalUpdates(): LocalModelUpdate[] {
        try {
            const stored = localStorage.getItem(this.UPDATES_KEY);
            if (stored) {
                return parseStoredUpdates(stored);
            }
        } catch (error) {
            console.error('Failed to load updates:', error);
        }
        return [];
    }

    /**
     * Get training rounds
     */
    getTrainingRounds(): TrainingRound[] {
        return [...this.trainingRounds];
    }

    /**
     * Get participation statistics
     */
    getParticipationStats(): {
        totalRounds: number;
        completedRounds: number;
        totalSamples: number;
        averageAccuracy: number;
    } {
        const rounds = this.trainingRounds.filter(r => r.status === 'completed');
        const updates = this.getLocalUpdates();
        const totalSamples = updates.reduce((sum, u) => sum + u.sampleCount, 0);
        const avgAccuracy = updates.length > 0
            ? updates.reduce((sum, u) => sum + u.metrics.accuracy, 0) / updates.length
            : 0;

        return {
            totalRounds: this.trainingRounds.length,
            completedRounds: rounds.length,
            totalSamples,
            averageAccuracy: avgAccuracy,
        };
    }
}

export const federatedLearningService = FederatedLearningService.getInstance();
