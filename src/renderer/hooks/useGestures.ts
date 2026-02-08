import { useEffect, useRef, useState } from 'react';
import {
    gestureService,
    GestureConfig,
    GestureType,
    GestureEventMap,
    PinchGestureEvent,
    SwipeGestureEvent,
    LongPressGestureEvent,
} from '../services/gestures';

interface UseGestureOptions {
    enabled?: boolean;
}

export const useGesture = <T extends GestureType>(
    type: T,
    callback: (event: GestureEventMap[T]) => void,
    options: UseGestureOptions = {}
): void => {
    const { enabled = true } = options;
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const off = gestureService.on(type, (event: GestureEventMap[T]) => {
            callbackRef.current(event);
        });
        const detach = gestureService.attach(document);

        return () => {
            off();
            detach();
        };
    }, [type, enabled]);
};

export const usePinchZoom = (
    callback: (event: PinchGestureEvent) => void,
    enabled = true
): void => {
    useGesture('pinch', callback, { enabled });
};

export const useSwipeNavigation = (
    callback: (event: SwipeGestureEvent) => void,
    enabled = true
): void => {
    useGesture('swipe', callback, { enabled });
};

export const useLongPress = (
    callback: (event: LongPressGestureEvent) => void,
    enabled = true
): void => {
    useGesture('longpress', callback, { enabled });
};

export const useGestureConfig = () => {
    const [config, setConfig] = useState<GestureConfig>(gestureService.getConfig());

    useEffect(() => {
        setConfig(gestureService.getConfig());

        const unsubscribe = gestureService.subscribe((nextConfig) => {
            setConfig(nextConfig);
        });

        return unsubscribe;
    }, []);

    const updateConfig = (updates: Partial<GestureConfig>) => {
        gestureService.updateConfig(updates);
    };

    const resetConfig = () => {
        gestureService.resetConfig();
    };

    return {
        config,
        updateConfig,
        resetConfig,
        isGestureEnabled: (type: GestureType) => gestureService.isGestureEnabled(type),
        getSensitivity: (type: 'pinch' | 'swipe') => gestureService.getSensitivity(type),
        getLongPressDuration: () => gestureService.getLongPressDuration(),
    };
};
