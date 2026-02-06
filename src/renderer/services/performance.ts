export type PerformanceMetricType = 'latency' | 'tps'; // tps = tokens per second

export interface PerformanceMetric {
    type: PerformanceMetricType;
    value: number;
    timestamp: number;
}

type Listener = (metric: PerformanceMetric) => void;

class PerformanceService {
    private listeners: Set<Listener> = new Set();
    private lastLatency: number = 0;
    private lastTPS: number = 0;

    subscribe(listener: Listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // Report API Latency (Time to First Byte or Total Response Time)
    reportLatency(ms: number) {
        this.lastLatency = ms;
        this.notify({ type: 'latency', value: ms, timestamp: Date.now() });
    }

    // Report Tokens Per Second
    reportTPS(tps: number) {
        this.lastTPS = tps;
        this.notify({ type: 'tps', value: tps, timestamp: Date.now() });
    }

    private notify(metric: PerformanceMetric) {
        this.listeners.forEach(l => l(metric));
    }

    getMetrics() {
        return {
            latency: this.lastLatency,
            tps: this.lastTPS
        };
    }
}

export const performanceService = new PerformanceService();
