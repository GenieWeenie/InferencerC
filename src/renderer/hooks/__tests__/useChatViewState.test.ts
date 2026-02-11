/**
 * @jest-environment jsdom
 */
import { applyMessageRating } from '../useChatViewState';

describe('applyMessageRating', () => {
    it('adds a rating for unrated messages', () => {
        const next = applyMessageRating({}, 3, 'up');
        expect(next).toEqual({ 3: 'up' });
    });

    it('replaces prior rating when user switches vote', () => {
        const next = applyMessageRating({ 3: 'up' }, 3, 'down');
        expect(next).toEqual({ 3: 'down' });
    });

    it('removes rating when same vote is clicked twice', () => {
        const next = applyMessageRating({ 3: 'up' }, 3, 'up');
        expect(next).toEqual({});
    });
});
