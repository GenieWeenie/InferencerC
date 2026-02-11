import { getBrowserPerformanceMemory } from '../performanceMemory';

describe('getBrowserPerformanceMemory', () => {
    it('returns null when performance.memory is unavailable', () => {
        Object.defineProperty(performance, 'memory', {
            value: undefined,
            configurable: true,
        });

        expect(getBrowserPerformanceMemory()).toBeNull();
    });

    it('returns a typed memory snapshot when values are valid numbers', () => {
        const memory = {
            usedJSHeapSize: 128 * 1024 * 1024,
            totalJSHeapSize: 256 * 1024 * 1024,
            jsHeapSizeLimit: 2048 * 1024 * 1024,
        };
        Object.defineProperty(performance, 'memory', {
            value: memory,
            configurable: true,
        });

        expect(getBrowserPerformanceMemory()).toEqual(memory);
    });

    it('returns null when memory fields are not finite numbers', () => {
        Object.defineProperty(performance, 'memory', {
            value: {
                usedJSHeapSize: Number.NaN,
                totalJSHeapSize: 256 * 1024 * 1024,
                jsHeapSizeLimit: 2048 * 1024 * 1024,
            },
            configurable: true,
        });

        expect(getBrowserPerformanceMemory()).toBeNull();
    });
});
