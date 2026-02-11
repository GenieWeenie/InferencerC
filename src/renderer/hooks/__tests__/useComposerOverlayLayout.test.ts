/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import {
    readPersistedShowBottomControls,
    resolveComposerOverlayHeight,
    useComposerOverlayLayout,
} from '../useComposerOverlayLayout';

describe('useComposerOverlayLayout helpers', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('reads persisted composer controls visibility with default true', () => {
        expect(readPersistedShowBottomControls()).toBe(true);
        localStorage.setItem('chat_show_bottom_controls', '0');
        expect(readPersistedShowBottomControls()).toBe(false);
    });

    it('resolves baseline overlay heights by control visibility', () => {
        expect(resolveComposerOverlayHeight(true)).toBe(300);
        expect(resolveComposerOverlayHeight(false)).toBe(196);
    });
});

describe('useComposerOverlayLayout', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('persists toggle state and triggers hidden callback when controls close', () => {
        const onBottomControlsHidden = jest.fn();
        const ref = { current: null } as React.RefObject<HTMLDivElement | null>;

        const { result } = renderHook(() => useComposerOverlayLayout({
            composerContainerRef: ref,
            isCompactViewport: false,
            onBottomControlsHidden,
        }));

        expect(result.current.showBottomControls).toBe(true);

        act(() => {
            result.current.setShowBottomControls(false);
        });

        expect(localStorage.getItem('chat_show_bottom_controls')).toBe('0');
        expect(onBottomControlsHidden).toHaveBeenCalledTimes(1);
        expect(result.current.composerOverlayHeight).toBe(300);
    });
});
