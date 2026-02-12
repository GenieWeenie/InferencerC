import { useCallback, useEffect, useRef, useState } from 'react';
import type {
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

type GestureService = typeof import('../services/gestures')['gestureService'];

let gestureServicePromise: Promise<GestureService> | null = null;
let gestureServiceInstance: GestureService | null = null;

const DEFAULT_GESTURE_CONFIG: GestureConfig = {
    enablePinchZoom: true,
    enableSwipeNavigation: true,
    enableLongPress: true,
    pinchSensitivity: 1,
    swipeSensitivity: 1,
    longPressDuration: 500,
};

const loadGestureService = async (): Promise<GestureService> => {
    if (gestureServiceInstance) {
        return gestureServiceInstance;
    }

    if (!gestureServicePromise) {
        gestureServicePromise = import('../services/gestures')
            .then((mod) => {
                gestureServiceInstance = mod.gestureService;
                return mod.gestureService;
            })
            .catch((error) => {
                gestureServicePromise = null;
                throw error;
            });
    }

    return gestureServicePromise;
};

const subscribeToGesture = <T extends GestureType>(
    gestureService: GestureService,
    type: T,
    callback: (event: GestureEventMap[T]) => void
): (() => void) => {
    if (type === 'pinch') {
        return gestureService.on('pinch', callback as (event: PinchGestureEvent) => void);
    }
    if (type === 'swipe') {
        return gestureService.on('swipe', callback as (event: SwipeGestureEvent) => void);
    }
    return gestureService.on('longpress', callback as (event: LongPressGestureEvent) => void);
};

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

        let disposed = false;
        let off: (() => void) | null = null;
        let detach: (() => void) | null = null;

        void loadGestureService()
            .then((gestureService) => {
                if (disposed) {
                    return;
                }

                off = subscribeToGesture(gestureService, type, (event: GestureEventMap[T]) => {
                    callbackRef.current(event);
                });
                detach = gestureService.attach(document);
            })
            .catch((error) => {
                console.warn('Failed to initialize gesture service:', error);
            });

        return () => {
            disposed = true;
            off?.();
            detach?.();
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
    const [config, setConfig] = useState<GestureConfig>(DEFAULT_GESTURE_CONFIG);

    useEffect(() => {
        let disposed = false;
        let unsubscribe: (() => void) | null = null;

        void loadGestureService()
            .then((gestureService) => {
                if (disposed) {
                    return;
                }

                setConfig(gestureService.getConfig());
                unsubscribe = gestureService.subscribe((nextConfig) => {
                    setConfig(nextConfig);
                });
            })
            .catch((error) => {
                console.warn('Failed to load gesture config:', error);
            });

        return () => {
            disposed = true;
            unsubscribe?.();
        };
    }, []);

    const updateConfig = useCallback((updates: Partial<GestureConfig>) => {
        void loadGestureService()
            .then((gestureService) => {
                gestureService.updateConfig(updates);
            })
            .catch((error) => {
                console.warn('Failed to update gesture config:', error);
            });
    }, []);

    const resetConfig = useCallback(() => {
        void loadGestureService()
            .then((gestureService) => {
                gestureService.resetConfig();
            })
            .catch((error) => {
                console.warn('Failed to reset gesture config:', error);
            });
    }, []);

    const isGestureEnabled = useCallback((type: GestureType) => {
        switch (type) {
            case 'pinch':
                return config.enablePinchZoom;
            case 'swipe':
                return config.enableSwipeNavigation;
            case 'longpress':
                return config.enableLongPress;
            default:
                return false;
        }
    }, [config]);

    const getSensitivity = useCallback((type: 'pinch' | 'swipe') => {
        return type === 'pinch' ? config.pinchSensitivity : config.swipeSensitivity;
    }, [config]);

    const getLongPressDuration = useCallback(() => config.longPressDuration, [config]);

    return {
        config,
        updateConfig,
        resetConfig,
        isGestureEnabled,
        getSensitivity,
        getLongPressDuration,
    };
};
