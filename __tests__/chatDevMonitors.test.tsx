/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useChatDevMonitors } from '../src/renderer/hooks/useChatDevMonitors';

describe('useChatDevMonitors', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        Object.defineProperty(performance, 'memory', {
            configurable: true,
            value: {
                usedJSHeapSize: 200 * 1024 * 1024,
                totalJSHeapSize: 300 * 1024 * 1024,
                jsHeapSizeLimit: 1024 * 1024 * 1024,
            },
        });
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('attaches scroll listener and logs memory usage on interval', () => {
        const scrollerElement = document.createElement('div');
        const addEventListenerSpy = jest.spyOn(scrollerElement, 'addEventListener');
        const virtuosoRef = {
            current: {
                getScrollerElement: () => scrollerElement,
            },
        } as any;

        renderHook(() => useChatDevMonitors({
            enabled: true,
            historyLength: 42,
            virtuosoRef,
            virtuosoReadyKey: 'ready',
        }));

        expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Memory Monitor]'));

        jest.advanceTimersByTime(30000);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Memory Monitor]'));
    });
});
