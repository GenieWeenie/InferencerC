/**
 * Brain-Computer Interface Service
 *
 * Experimental BCI integration for thought-to-text conversion
 */

export interface BCISignal {
    timestamp: number;
    type: 'eeg' | 'fNIRS' | 'ECoG' | 'thought';
    data: number[];
    confidence: number;
}

export interface BCIConfig {
    enabled: boolean;
    deviceType: 'emotiv' | 'neurosky' | 'openbci' | 'simulated';
    samplingRate: number;
    sensitivity: number;
    thoughtThreshold: number;
}

export interface ThoughtPattern {
    id: string;
    pattern: string;
    meaning: string;
    confidence: number;
    timestamp: number;
}

const DEVICE_TYPES = new Set<BCIConfig['deviceType']>(['emotiv', 'neurosky', 'openbci', 'simulated']);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const getDefaultConfig = (): BCIConfig => ({
    enabled: false,
    deviceType: 'simulated',
    samplingRate: 256,
    sensitivity: 0.5,
    thoughtThreshold: 0.7,
});

const sanitizeConfig = (value: unknown): BCIConfig => {
    const defaults = getDefaultConfig();
    if (!isRecord(value)) {
        return defaults;
    }

    return {
        enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
        deviceType: DEVICE_TYPES.has(value.deviceType as BCIConfig['deviceType'])
            ? value.deviceType as BCIConfig['deviceType']
            : defaults.deviceType,
        samplingRate: isFiniteNumber(value.samplingRate)
            ? clamp(value.samplingRate, 1, 2000)
            : defaults.samplingRate,
        sensitivity: isFiniteNumber(value.sensitivity)
            ? clamp(value.sensitivity, 0, 1)
            : defaults.sensitivity,
        thoughtThreshold: isFiniteNumber(value.thoughtThreshold)
            ? clamp(value.thoughtThreshold, 0, 1)
            : defaults.thoughtThreshold,
    };
};

const sanitizeLearnedPattern = (
    value: unknown
): { pattern: string; meaning: string; confidence: number } | null => {
    if (!isRecord(value)
        || typeof value.pattern !== 'string'
        || typeof value.meaning !== 'string'
        || !isFiniteNumber(value.confidence)) {
        return null;
    }

    const pattern = value.pattern.trim();
    const meaning = value.meaning.trim();
    if (!pattern || !meaning) {
        return null;
    }

    return {
        pattern,
        meaning,
        confidence: clamp(value.confidence, 0, 1),
    };
};

const parseStoredPatterns = (raw: string): Array<{ pattern: string; meaning: string; confidence: number }> => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .map((entry) => sanitizeLearnedPattern(entry))
        .filter((entry): entry is { pattern: string; meaning: string; confidence: number } => entry !== null);
};

export class BrainComputerInterfaceService {
    private static instance: BrainComputerInterfaceService;
    private readonly STORAGE_KEY = 'bci_config';
    private readonly PATTERNS_KEY = 'bci_patterns';
    private config: BCIConfig;
    private signalBuffer: BCISignal[] = [];
    private isRecording: boolean = false;
    private listeners: Set<(signal: BCISignal) => void> = new Set();
    private patternListeners: Set<(pattern: ThoughtPattern) => void> = new Set();

    private constructor() {
        this.config = this.loadConfig();
    }

    static getInstance(): BrainComputerInterfaceService {
        if (!BrainComputerInterfaceService.instance) {
            BrainComputerInterfaceService.instance = new BrainComputerInterfaceService();
        }
        return BrainComputerInterfaceService.instance;
    }

    /**
     * Load BCI configuration
     */
    private loadConfig(): BCIConfig {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return sanitizeConfig(parseJson(stored));
            }
        } catch (error) {
            console.error('Failed to load BCI config:', error);
        }

        return getDefaultConfig();
    }

    /**
     * Save BCI configuration
     */
    saveConfig(config: Partial<BCIConfig>): void {
        this.config = sanitizeConfig({ ...this.config, ...config });
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
        } catch (error) {
            console.error('Failed to save BCI config:', error);
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): BCIConfig {
        return { ...this.config };
    }

    /**
     * Start recording brain signals
     */
    async startRecording(): Promise<void> {
        if (this.isRecording) return;

        this.isRecording = true;
        this.signalBuffer = [];

        if (this.config.deviceType === 'simulated') {
            // Simulate brain signals
            this.simulateSignals();
        } else {
            // In a real implementation, this would connect to actual BCI hardware
            // For now, we'll use simulated signals
            this.simulateSignals();
        }
    }

    /**
     * Stop recording
     */
    stopRecording(): void {
        this.isRecording = false;
    }

    /**
     * Simulate brain signals (for development/testing)
     */
    private simulateSignals(): void {
        if (!this.isRecording) return;

        const interval = setInterval(() => {
            if (!this.isRecording) {
                clearInterval(interval);
                return;
            }

            const signal: BCISignal = {
                timestamp: Date.now(),
                type: 'eeg',
                data: Array.from({ length: 8 }, () => Math.random() * 100 - 50),
                confidence: Math.random(),
            };

            this.signalBuffer.push(signal);
            this.listeners.forEach(listener => listener(signal));

            // Detect thought patterns
            if (signal.confidence > this.config.thoughtThreshold) {
                this.detectThoughtPattern(signal);
            }

            // Keep buffer size manageable
            if (this.signalBuffer.length > 1000) {
                this.signalBuffer.shift();
            }
        }, 1000 / this.config.samplingRate);
    }

    /**
     * Detect thought patterns from signals
     */
    private detectThoughtPattern(signal: BCISignal): void {
        // Simple pattern detection (in production, would use ML models)
        const patterns = this.getLearnedPatterns();
        const matchedPattern = patterns.find(p => {
            // Simple matching logic
            return signal.confidence > p.confidence;
        });

        if (matchedPattern) {
            const thought: ThoughtPattern = {
                id: crypto.randomUUID(),
                pattern: matchedPattern.pattern,
                meaning: matchedPattern.meaning,
                confidence: signal.confidence,
                timestamp: Date.now(),
            };

            this.patternListeners.forEach(listener => listener(thought));
        }
    }

    /**
     * Get learned thought patterns
     */
    getLearnedPatterns(): Array<{ pattern: string; meaning: string; confidence: number }> {
        try {
            const stored = localStorage.getItem(this.PATTERNS_KEY);
            if (stored) {
                const parsed = parseStoredPatterns(stored);
                if (parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (error) {
            console.error('Failed to load patterns:', error);
        }

        // Default patterns
        return [
            { pattern: 'question', meaning: 'User is asking a question', confidence: 0.6 },
            { pattern: 'command', meaning: 'User wants to execute a command', confidence: 0.7 },
            { pattern: 'creative', meaning: 'User is in creative thinking mode', confidence: 0.5 },
        ];
    }

    /**
     * Learn a new thought pattern
     */
    learnPattern(pattern: string, meaning: string, confidence: number = 0.5): void {
        const patterns = this.getLearnedPatterns();
        const sanitized = sanitizeLearnedPattern({
            pattern,
            meaning,
            confidence,
        });
        if (!sanitized) {
            return;
        }
        patterns.push(sanitized);
        try {
            localStorage.setItem(this.PATTERNS_KEY, JSON.stringify(patterns));
        } catch (error) {
            console.error('Failed to save BCI pattern:', error);
        }
    }

    /**
     * Convert thought pattern to text
     */
    async convertThoughtToText(pattern: ThoughtPattern): Promise<string> {
        // In a real implementation, this would use advanced ML models
        // For now, return the pattern meaning
        return pattern.meaning;
    }

    /**
     * Subscribe to signal updates
     */
    subscribeToSignals(listener: (signal: BCISignal) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Subscribe to thought pattern detection
     */
    subscribeToThoughts(listener: (pattern: ThoughtPattern) => void): () => void {
        this.patternListeners.add(listener);
        return () => this.patternListeners.delete(listener);
    }

    /**
     * Get recent signals
     */
    getRecentSignals(limit: number = 100): BCISignal[] {
        return this.signalBuffer.slice(-limit);
    }
}

export const bciService = BrainComputerInterfaceService.getInstance();
