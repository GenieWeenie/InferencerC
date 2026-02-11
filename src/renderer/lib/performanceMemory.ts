export interface BrowserPerformanceMemory {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
    memory?: BrowserPerformanceMemory;
}

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

export const getBrowserPerformanceMemory = (): BrowserPerformanceMemory | null => {
    const memory = (performance as PerformanceWithMemory).memory;
    if (!memory) {
        return null;
    }

    if (
        !isFiniteNumber(memory.usedJSHeapSize) ||
        !isFiniteNumber(memory.totalJSHeapSize) ||
        !isFiniteNumber(memory.jsHeapSizeLimit)
    ) {
        return null;
    }

    return memory;
};
