export interface FloatingMenuPosition {
    x: number;
    y: number;
}

export const clampFloatingMenuPosition = (
    x: number,
    y: number,
    viewportWidth: number,
    viewportHeight: number,
    options?: {
        margin?: number;
        menuWidth?: number;
        menuHeight?: number;
    }
): FloatingMenuPosition => {
    const margin = options?.margin ?? 8;
    const menuWidth = options?.menuWidth ?? 240;
    const menuHeight = options?.menuHeight ?? 240;

    return {
        x: Math.max(margin, Math.min(x, viewportWidth - menuWidth - margin)),
        y: Math.max(margin, Math.min(y, viewportHeight - menuHeight - margin)),
    };
};

export const getSwipeSessionNextIndex = (
    direction: 'left' | 'right',
    currentIndex: number,
    totalSessions: number
): number => {
    if (totalSessions <= 1 || currentIndex < 0 || currentIndex >= totalSessions) {
        return currentIndex;
    }

    if (direction === 'left') {
        return Math.min(currentIndex + 1, totalSessions - 1);
    }

    return Math.max(currentIndex - 1, 0);
};
