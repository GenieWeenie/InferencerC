export type PerformanceMetricType = 'latency' | 'tps' | 'scrollFPS' | 'memoryUsage' | 'loadTime' | 'searchTime'; // tps = tokens per second

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
    private lastScrollFPS: number = 0;
    private lastMemoryUsage: number = 0;
    private lastLoadTime: number = 0;
    private lastSearchTime: number = 0;

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

    // Report Scroll FPS (Frames Per Second)
    reportScrollFPS(fps: number) {
        this.lastScrollFPS = fps;
        this.notify({ type: 'scrollFPS', value: fps, timestamp: Date.now() });
    }

    // Report Memory Usage (in MB)
    reportMemoryUsage(mb: number) {
        this.lastMemoryUsage = mb;
        this.notify({ type: 'memoryUsage', value: mb, timestamp: Date.now() });
    }

    // Report Load Time (in milliseconds)
    reportLoadTime(ms: number) {
        this.lastLoadTime = ms;
        this.notify({ type: 'loadTime', value: ms, timestamp: Date.now() });
    }

    // Report Search Time (in milliseconds)
    reportSearchTime(ms: number) {
        this.lastSearchTime = ms;
        this.notify({ type: 'searchTime', value: ms, timestamp: Date.now() });
    }

    private notify(metric: PerformanceMetric) {
        this.listeners.forEach(l => l(metric));
    }

    getMetrics() {
        return {
            latency: this.lastLatency,
            tps: this.lastTPS,
            scrollFPS: this.lastScrollFPS,
            memoryUsage: this.lastMemoryUsage,
            loadTime: this.lastLoadTime,
            searchTime: this.lastSearchTime
        };
    }
}

export const performanceService = new PerformanceService();
