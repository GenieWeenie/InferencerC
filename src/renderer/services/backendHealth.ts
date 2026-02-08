export type BackendHealthSource = 'init' | 'probe' | 'request';

export interface BackendHealthState {
    online: boolean;
    lastCheckedAt: number;
    lastChangedAt: number;
    consecutiveFailures: number;
    source: BackendHealthSource;
}

type BackendHealthListener = (state: BackendHealthState) => void;

class BackendHealthService {
    private readonly probeUrl = 'http://localhost:3000/v1/models';
    private readonly probeTimeoutMs = 2500;
    private readonly onlineProbeIntervalMs = 5000;
    private readonly maxOfflineProbeIntervalMs = 60000;
    private readonly allowBrowserProbe =
        typeof import.meta !== 'undefined' &&
        import.meta.env?.VITE_ALLOW_BROWSER_BACKEND_PROBE === 'true';

    private listeners: Set<BackendHealthListener> = new Set();
    private probeTimer: ReturnType<typeof setTimeout> | null = null;
    private probeInFlight = false;
    private nextProbeDelayMs = this.onlineProbeIntervalMs;

    private state: BackendHealthState = {
        online: false,
        lastCheckedAt: 0,
        lastChangedAt: Date.now(),
        consecutiveFailures: 0,
        source: 'init',
    };

    constructor() {
        if (typeof window !== 'undefined') {
            this.scheduleNextProbe(0);
        }
    }

    subscribe(listener: BackendHealthListener): () => void {
        this.listeners.add(listener);
        listener(this.getState());
        return () => this.listeners.delete(listener);
    }

    getState(): BackendHealthState {
        return { ...this.state };
    }

    isOnline(): boolean {
        return this.state.online;
    }

    reportRequestResult(online: boolean): void {
        this.updateState(online, 'request');
    }

    async checkNow(): Promise<void> {
        await this.runProbe();
    }

    private notify(): void {
        const snapshot = this.getState();
        this.listeners.forEach(listener => listener(snapshot));
    }

    private scheduleNextProbe(delayMs: number = this.nextProbeDelayMs): void {
        if (typeof window === 'undefined') return;
        if (this.probeTimer) {
            clearTimeout(this.probeTimer);
        }
        this.probeTimer = setTimeout(() => {
            void this.runProbe();
        }, delayMs);
    }

    private async runProbe(): Promise<void> {
        if (this.probeInFlight) return;
        this.probeInFlight = true;
        try {
            if (typeof window !== 'undefined' && window.electronAPI?.checkBackendHealth) {
                const result = await window.electronAPI.checkBackendHealth();
                this.updateState(Boolean(result?.online), 'probe');
                return;
            }

            if (!this.allowBrowserProbe) {
                this.updateState(false, 'probe');
                return;
            }

            const response = await fetch(this.probeUrl, {
                method: 'GET',
                signal: AbortSignal.timeout(this.probeTimeoutMs),
            });
            this.updateState(response.ok, 'probe');
        } catch (_error) {
            this.updateState(false, 'probe');
        } finally {
            this.probeInFlight = false;
            this.scheduleNextProbe();
        }
    }

    private updateState(online: boolean, source: BackendHealthSource): void {
        const now = Date.now();
        const changed = this.state.online !== online;

        const consecutiveFailures = online
            ? 0
            : (this.state.online ? 1 : this.state.consecutiveFailures + 1);

        const backoffMultiplier = Math.max(consecutiveFailures, 1);
        const offlineDelay = Math.min(
            this.onlineProbeIntervalMs * Math.pow(2, backoffMultiplier - 1),
            this.maxOfflineProbeIntervalMs
        );

        this.nextProbeDelayMs = online ? this.onlineProbeIntervalMs : offlineDelay;

        this.state = {
            online,
            lastCheckedAt: now,
            lastChangedAt: changed ? now : this.state.lastChangedAt,
            consecutiveFailures,
            source,
        };

        if (changed) {
            this.notify();
        }
    }
}

export const backendHealthService = new BackendHealthService();
