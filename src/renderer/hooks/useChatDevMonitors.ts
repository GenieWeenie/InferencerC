import React from 'react';
import type { ChatVirtuosoHandle } from '../lib/chatVirtuosoTypes';
import { getBrowserPerformanceMemory } from '../lib/performanceMemory';

interface UseChatDevMonitorsParams {
    enabled: boolean;
    historyLength: number;
    virtuosoRef: React.RefObject<ChatVirtuosoHandle | null>;
    virtuosoReadyKey: unknown;
}

export const useChatDevMonitors = ({
    enabled,
    historyLength,
    virtuosoRef,
    virtuosoReadyKey,
}: UseChatDevMonitorsParams) => {
    const fpsFrameCount = React.useRef(0);
    const fpsLastTime = React.useRef(performance.now());
    const fpsAnimationFrameId = React.useRef<number | null>(null);
    const memoryMonitorInterval = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const lastMemoryWarning = React.useRef<number>(0);

    React.useEffect(() => {
        if (!enabled) return;

        let isScrolling = false;
        let scrollTimeout: ReturnType<typeof setTimeout>;

        const measureFPS = () => {
            fpsFrameCount.current += 1;
            const now = performance.now();
            const delta = now - fpsLastTime.current;

            if (delta >= 1000 && isScrolling) {
                const fps = Math.round((fpsFrameCount.current * 1000) / delta);
                console.log(`[FPS Monitor] Virtuoso Scroll: ${fps} FPS`);

                fpsFrameCount.current = 0;
                fpsLastTime.current = now;
            }

            if (isScrolling) {
                fpsAnimationFrameId.current = requestAnimationFrame(measureFPS);
            }
        };

        const handleScroll = () => {
            if (!isScrolling) {
                isScrolling = true;
                fpsFrameCount.current = 0;
                fpsLastTime.current = performance.now();
                fpsAnimationFrameId.current = requestAnimationFrame(measureFPS);
            }

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                if (fpsAnimationFrameId.current !== null) {
                    cancelAnimationFrame(fpsAnimationFrameId.current);
                    fpsAnimationFrameId.current = null;
                }
            }, 150);
        };

        const virtuosoElement = virtuosoRef.current?.getScrollerElement?.();
        if (virtuosoElement) {
            virtuosoElement.addEventListener('scroll', handleScroll, { passive: true });
        }

        return () => {
            if (virtuosoElement) {
                virtuosoElement.removeEventListener('scroll', handleScroll);
            }
            clearTimeout(scrollTimeout);
            if (fpsAnimationFrameId.current !== null) {
                cancelAnimationFrame(fpsAnimationFrameId.current);
            }
        };
    }, [enabled, historyLength, virtuosoRef, virtuosoReadyKey]);

    React.useEffect(() => {
        if (!enabled) return;

        const monitorMemory = () => {
            const memory = getBrowserPerformanceMemory();
            if (memory) {
                const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
                const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
                const usagePercent = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);

                console.log(`[Memory Monitor] Used: ${usedMB}MB / ${limitMB}MB (${usagePercent}%) | Total Allocated: ${totalMB}MB | Messages: ${historyLength}`);

                if (usagePercent > 75) {
                    const now = Date.now();
                    if (now - lastMemoryWarning.current > 60000) {
                        console.warn(`[Memory Monitor] HIGH MEMORY USAGE: ${usedMB}MB / ${limitMB}MB (${usagePercent}%) - Consider closing some conversations`);
                        lastMemoryWarning.current = now;
                    }
                }

                if (usedMB > 1800) {
                    console.error(`[Memory Monitor] CRITICAL: Memory usage exceeds 1.8GB (${usedMB}MB) - Performance may degrade`);
                }
            }
        };

        memoryMonitorInterval.current = setInterval(monitorMemory, 30000);
        monitorMemory();

        return () => {
            if (memoryMonitorInterval.current) {
                clearInterval(memoryMonitorInterval.current);
            }
        };
    }, [enabled, historyLength]);
};
