import React from 'react';

const CHAT_SHOW_BOTTOM_CONTROLS_KEY = 'chat_show_bottom_controls';

export const readPersistedShowBottomControls = (): boolean => {
    try {
        const stored = localStorage.getItem(CHAT_SHOW_BOTTOM_CONTROLS_KEY);
        return stored !== '0';
    } catch {
        return true;
    }
};

export const resolveComposerOverlayHeight = (showBottomControls: boolean): number => (
    showBottomControls ? 300 : 196
);

interface UseComposerOverlayLayoutParams {
    composerContainerRef: React.RefObject<HTMLDivElement | null>;
    isCompactViewport: boolean;
    onBottomControlsHidden?: () => void;
}

export const useComposerOverlayLayout = ({
    composerContainerRef,
    isCompactViewport,
    onBottomControlsHidden,
}: UseComposerOverlayLayoutParams) => {
    const [showBottomControls, setShowBottomControls] = React.useState<boolean>(readPersistedShowBottomControls);
    const [composerOverlayHeight, setComposerOverlayHeight] = React.useState<number>(
        resolveComposerOverlayHeight(showBottomControls)
    );

    React.useEffect(() => {
        try {
            localStorage.setItem(CHAT_SHOW_BOTTOM_CONTROLS_KEY, showBottomControls ? '1' : '0');
        } catch {
            // Ignore local persistence failures for optional composer UI preferences.
        }

        if (!showBottomControls) {
            onBottomControlsHidden?.();
        }
    }, [onBottomControlsHidden, showBottomControls]);

    React.useEffect(() => {
        const composerElement = composerContainerRef.current;
        if (!composerElement) {
            return;
        }

        const measureComposerHeight = () => {
            const nextHeight = Math.ceil(composerElement.getBoundingClientRect().height);
            if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
                return;
            }
            setComposerOverlayHeight((previousHeight) => (
                previousHeight === nextHeight ? previousHeight : nextHeight
            ));
        };

        measureComposerHeight();

        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        const resizeObserver = new ResizeObserver(() => {
            measureComposerHeight();
        });
        resizeObserver.observe(composerElement);

        return () => {
            resizeObserver.disconnect();
        };
    }, [composerContainerRef, showBottomControls, isCompactViewport]);

    return {
        showBottomControls,
        setShowBottomControls,
        composerOverlayHeight,
    };
};
