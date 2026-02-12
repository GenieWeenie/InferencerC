export type GestureType = 'pinch' | 'swipe' | 'longpress';

export interface GestureConfig {
    enablePinchZoom: boolean;
    enableSwipeNavigation: boolean;
    enableLongPress: boolean;
    pinchSensitivity: number;
    swipeSensitivity: number;
    longPressDuration: number;
}

export interface PinchGestureEvent {
    type: 'pinch';
    scale: number;
    delta: number;
    center: { x: number; y: number };
    target: EventTarget | null;
    isTrackpad: boolean;
    originalEvent: TouchEvent | WheelEvent;
}

export interface SwipeGestureEvent {
    type: 'swipe';
    direction: 'left' | 'right' | 'up' | 'down';
    distance: number;
    target: EventTarget | null;
    originalEvent: TouchEvent | WheelEvent;
}

export interface LongPressGestureEvent {
    type: 'longpress';
    x: number;
    y: number;
    target: EventTarget | null;
    originalEvent: TouchEvent;
}

interface GestureEventMap {
    pinch: PinchGestureEvent;
    swipe: SwipeGestureEvent;
    longpress: LongPressGestureEvent;
}

type GestureListener<T extends GestureType> = (event: GestureEventMap[T]) => void;
type ConfigListener = (config: GestureConfig) => void;

interface AttachmentState {
    count: number;
    cleanup: () => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export class GestureService {
    private static instance: GestureService;
    private readonly STORAGE_KEY = 'gesture_config';

    private readonly defaultConfig: GestureConfig = {
        enablePinchZoom: true,
        enableSwipeNavigation: true,
        enableLongPress: true,
        pinchSensitivity: 1,
        swipeSensitivity: 1,
        longPressDuration: 500,
    };

    private listeners: {
        pinch: Set<GestureListener<'pinch'>>;
        swipe: Set<GestureListener<'swipe'>>;
        longpress: Set<GestureListener<'longpress'>>;
    } = {
        pinch: new Set(),
        swipe: new Set(),
        longpress: new Set(),
    };

    private configListeners: Set<ConfigListener> = new Set();
    private attachments = new Map<EventTarget, AttachmentState>();
    private cachedConfig: GestureConfig | null = null;

    private constructor() {
        // no-op
    }

    static getInstance(): GestureService {
        if (!GestureService.instance) {
            GestureService.instance = new GestureService();
        }
        return GestureService.instance;
    }

    private loadConfigFromStorage(): GestureConfig {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const parsed = parseJson(stored);
                if (isRecord(parsed)) {
                    return {
                        enablePinchZoom: typeof parsed.enablePinchZoom === 'boolean'
                            ? parsed.enablePinchZoom
                            : this.defaultConfig.enablePinchZoom,
                        enableSwipeNavigation: typeof parsed.enableSwipeNavigation === 'boolean'
                            ? parsed.enableSwipeNavigation
                            : this.defaultConfig.enableSwipeNavigation,
                        enableLongPress: typeof parsed.enableLongPress === 'boolean'
                            ? parsed.enableLongPress
                            : this.defaultConfig.enableLongPress,
                        pinchSensitivity: typeof parsed.pinchSensitivity === 'number'
                            ? clamp(parsed.pinchSensitivity, 0.1, 5)
                            : this.defaultConfig.pinchSensitivity,
                        swipeSensitivity: typeof parsed.swipeSensitivity === 'number'
                            ? clamp(parsed.swipeSensitivity, 0.1, 5)
                            : this.defaultConfig.swipeSensitivity,
                        longPressDuration: typeof parsed.longPressDuration === 'number'
                            ? clamp(parsed.longPressDuration, 250, 5000)
                            : this.defaultConfig.longPressDuration,
                    };
                }
            }
        } catch (error) {
            console.error('Failed to load gesture config:', error);
        }

        return { ...this.defaultConfig };
    }

    getConfig(): GestureConfig {
        if (!this.cachedConfig) {
            this.cachedConfig = this.loadConfigFromStorage();
        }
        return this.cachedConfig;
    }

    updateConfig(config: Partial<GestureConfig>): void {
        const merged = {
            ...this.getConfig(),
            ...config,
        };
        const updated: GestureConfig = {
            enablePinchZoom: merged.enablePinchZoom,
            enableSwipeNavigation: merged.enableSwipeNavigation,
            enableLongPress: merged.enableLongPress,
            pinchSensitivity: clamp(merged.pinchSensitivity, 0.1, 5),
            swipeSensitivity: clamp(merged.swipeSensitivity, 0.1, 5),
            longPressDuration: clamp(merged.longPressDuration, 250, 5000),
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
        this.cachedConfig = updated;
        this.configListeners.forEach(listener => this.safeListenerCall(listener, updated));
    }

    resetConfig(): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.defaultConfig));
        this.cachedConfig = { ...this.defaultConfig };
        this.configListeners.forEach(listener => this.safeListenerCall(listener, this.defaultConfig));
    }

    subscribe(listener: ConfigListener): () => void {
        this.configListeners.add(listener);
        return () => {
            this.configListeners.delete(listener);
        };
    }

    on(type: 'pinch', listener: GestureListener<'pinch'>): () => void;
    on(type: 'swipe', listener: GestureListener<'swipe'>): () => void;
    on(type: 'longpress', listener: GestureListener<'longpress'>): () => void;
    on<T extends GestureType>(type: T, listener: GestureListener<T>): () => void {
        if (type === 'pinch') {
            const pinchListener = listener as GestureListener<'pinch'>;
            this.listeners.pinch.add(pinchListener);
            return () => {
                this.listeners.pinch.delete(pinchListener);
            };
        }

        if (type === 'swipe') {
            const swipeListener = listener as GestureListener<'swipe'>;
            this.listeners.swipe.add(swipeListener);
            return () => {
                this.listeners.swipe.delete(swipeListener);
            };
        }

        const longPressListener = listener as GestureListener<'longpress'>;
        this.listeners.longpress.add(longPressListener);
        return () => {
            this.listeners.longpress.delete(longPressListener);
        };
    }

    attach(target: Document | HTMLElement = document): () => void {
        if (typeof window === 'undefined') {
            return () => {
                // no-op
            };
        }

        const existing = this.attachments.get(target);
        if (existing) {
            existing.count += 1;
            return () => this.detach(target);
        }

        let pinchDistance: number | null = null;
        let swipeStartCenter: { x: number; y: number } | null = null;
        let swipeCurrentCenter: { x: number; y: number } | null = null;
        let swipeTarget: EventTarget | null = null;
        let swipeStartTime = 0;
        let lastWheelSwipeAt = 0;

        let longPressTimer: number | null = null;
        let longPressStartPoint: { x: number; y: number } | null = null;
        let longPressTarget: EventTarget | null = null;

        const getCenter = (touches: TouchList): { x: number; y: number } => ({
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
        });

        const getDistance = (touches: TouchList): number => {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const clearLongPressTimer = () => {
            if (longPressTimer !== null) {
                window.clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        const startLongPressTimer = (event: TouchEvent) => {
            const config = this.getConfig();
            if (!config.enableLongPress || event.touches.length !== 1) {
                return;
            }

            const touch = event.touches[0];
            longPressStartPoint = { x: touch.clientX, y: touch.clientY };
            longPressTarget = event.target;

            clearLongPressTimer();
            longPressTimer = window.setTimeout(() => {
                this.emit('longpress', {
                    type: 'longpress',
                    x: touch.clientX,
                    y: touch.clientY,
                    target: longPressTarget,
                    originalEvent: event,
                });
                clearLongPressTimer();
            }, Math.max(250, Math.min(config.longPressDuration, 2000)));
        };

        const handleTouchStart = (event: TouchEvent) => {
            const config = this.getConfig();

            if (event.touches.length >= 2) {
                clearLongPressTimer();

                if (config.enablePinchZoom) {
                    pinchDistance = getDistance(event.touches);
                }

                if (config.enableSwipeNavigation) {
                    swipeStartCenter = getCenter(event.touches);
                    swipeCurrentCenter = swipeStartCenter;
                    swipeStartTime = Date.now();
                    swipeTarget = event.target;
                }
            } else {
                pinchDistance = null;
                swipeStartCenter = null;
                swipeCurrentCenter = null;
                startLongPressTimer(event);
            }
        };

        const handleTouchMove = (event: TouchEvent) => {
            const config = this.getConfig();

            if (event.touches.length === 1 && longPressStartPoint) {
                const touch = event.touches[0];
                const movedDistance = Math.hypot(
                    touch.clientX - longPressStartPoint.x,
                    touch.clientY - longPressStartPoint.y
                );

                if (movedDistance > 12) {
                    clearLongPressTimer();
                }
            }

            if (config.enablePinchZoom && event.touches.length >= 2 && pinchDistance) {
                const currentDistance = getDistance(event.touches);
                const rawScale = currentDistance / pinchDistance;
                const scaledDelta = (rawScale - 1) * config.pinchSensitivity;

                if (Math.abs(rawScale - 1) > 0.01) {
                    this.emit('pinch', {
                        type: 'pinch',
                        scale: rawScale,
                        delta: scaledDelta,
                        center: getCenter(event.touches),
                        target: event.target,
                        isTrackpad: false,
                        originalEvent: event,
                    });

                    pinchDistance = currentDistance;
                }
            }

            if (config.enableSwipeNavigation && event.touches.length >= 2 && swipeStartCenter) {
                swipeCurrentCenter = getCenter(event.touches);
            }
        };

        const handleTouchEnd = (event: TouchEvent) => {
            clearLongPressTimer();

            const config = this.getConfig();
            if (!config.enableSwipeNavigation || !swipeStartCenter || !swipeCurrentCenter) {
                swipeStartCenter = null;
                swipeCurrentCenter = null;
                pinchDistance = null;
                return;
            }

            const elapsed = Date.now() - swipeStartTime;
            const deltaX = swipeCurrentCenter.x - swipeStartCenter.x;
            const deltaY = swipeCurrentCenter.y - swipeStartCenter.y;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            const threshold = Math.max(18, 42 / config.swipeSensitivity);

            if (elapsed < 1200) {
                if (absY > absX * 1.2 && absY >= threshold) {
                    this.emit('swipe', {
                        type: 'swipe',
                        direction: deltaY > 0 ? 'down' : 'up',
                        distance: absY,
                        target: swipeTarget,
                        originalEvent: event,
                    });
                } else if (absX > absY * 1.2 && absX >= threshold) {
                    this.emit('swipe', {
                        type: 'swipe',
                        direction: deltaX > 0 ? 'right' : 'left',
                        distance: absX,
                        target: swipeTarget,
                        originalEvent: event,
                    });
                }
            }

            swipeStartCenter = null;
            swipeCurrentCenter = null;
            swipeTarget = null;
            pinchDistance = null;
        };

        const handleTouchCancel = () => {
            clearLongPressTimer();
            pinchDistance = null;
            swipeStartCenter = null;
            swipeCurrentCenter = null;
            swipeTarget = null;
        };

        const handleWheel = (event: WheelEvent) => {
            const config = this.getConfig();
            if (event.ctrlKey && config.enablePinchZoom) {
                event.preventDefault();

                const delta = (-event.deltaY * 0.002) * config.pinchSensitivity;
                const scale = 1 + delta;

                if (Math.abs(delta) < 0.001) {
                    return;
                }

                this.emit('pinch', {
                    type: 'pinch',
                    scale,
                    delta,
                    center: { x: event.clientX, y: event.clientY },
                    target: event.target,
                    isTrackpad: true,
                    originalEvent: event,
                });
                return;
            }

            if (!config.enableSwipeNavigation) {
                return;
            }

            const absX = Math.abs(event.deltaX);
            const absY = Math.abs(event.deltaY);
            const threshold = Math.max(18, 42 / config.swipeSensitivity);
            const now = Date.now();

            // Trackpad two-finger horizontal swipes emit wheel deltas.
            if (absX >= threshold && absX > absY * 1.2 && now - lastWheelSwipeAt > 280) {
                lastWheelSwipeAt = now;
                this.emit('swipe', {
                    type: 'swipe',
                    direction: event.deltaX > 0 ? 'left' : 'right',
                    distance: absX,
                    target: event.target,
                    originalEvent: event,
                });
            }
        };

        target.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
        target.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true });
        target.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });
        target.addEventListener('touchcancel', handleTouchCancel as EventListener, { passive: true });
        target.addEventListener('wheel', handleWheel as EventListener, { passive: false });

        const cleanup = () => {
            target.removeEventListener('touchstart', handleTouchStart as EventListener);
            target.removeEventListener('touchmove', handleTouchMove as EventListener);
            target.removeEventListener('touchend', handleTouchEnd as EventListener);
            target.removeEventListener('touchcancel', handleTouchCancel as EventListener);
            target.removeEventListener('wheel', handleWheel as EventListener);
            clearLongPressTimer();
        };

        this.attachments.set(target, {
            count: 1,
            cleanup,
        });

        return () => this.detach(target);
    }

    isGestureEnabled(type: GestureType): boolean {
        const config = this.getConfig();
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
    }

    getSensitivity(type: 'pinch' | 'swipe'): number {
        const config = this.getConfig();
        return type === 'pinch' ? config.pinchSensitivity : config.swipeSensitivity;
    }

    getLongPressDuration(): number {
        return this.getConfig().longPressDuration;
    }

    private detach(target: EventTarget): void {
        const current = this.attachments.get(target);
        if (!current) {
            return;
        }

        current.count -= 1;
        if (current.count <= 0) {
            current.cleanup();
            this.attachments.delete(target);
        }
    }

    private emit<T extends GestureType>(type: T, event: GestureEventMap[T]): void {
        const listeners = this.listeners[type] as Set<(payload: GestureEventMap[T]) => void>;
        listeners.forEach(listener => {
            this.safeListenerCall(listener, event);
        });
    }

    private safeListenerCall<T>(listener: (payload: T) => void, payload: T): void {
        try {
            listener(payload);
        } catch (error) {
            console.error('Gesture listener error:', error);
        }
    }
}

export const gestureService = GestureService.getInstance();

export type { GestureEventMap };
