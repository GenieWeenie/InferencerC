/**
 * @jest-environment jsdom
 */
import { clampFloatingMenuPosition, getSwipeSessionNextIndex } from '../src/renderer/lib/chatGestureModels';

describe('chatGestureModels', () => {
    it('clamps floating menu position within viewport bounds', () => {
        expect(clampFloatingMenuPosition(-10, -20, 400, 300)).toEqual({ x: 8, y: 8 });

        const nearEdge = clampFloatingMenuPosition(390, 290, 400, 300);
        expect(nearEdge.x).toBeLessThanOrEqual(400 - 240 - 8);
        expect(nearEdge.y).toBeLessThanOrEqual(300 - 240 - 8);
    });

    it('resolves swipe session next index deterministically', () => {
        expect(getSwipeSessionNextIndex('left', 1, 3)).toBe(2);
        expect(getSwipeSessionNextIndex('right', 1, 3)).toBe(0);
        expect(getSwipeSessionNextIndex('left', 2, 3)).toBe(2);
        expect(getSwipeSessionNextIndex('right', 0, 3)).toBe(0);
    });
});
