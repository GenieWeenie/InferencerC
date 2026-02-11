/**
 * @jest-environment jsdom
 */
import {
    applyMessageRating,
    persistProjectContextFeatureEnabled,
    readPersistedDevMonitorsEnabled,
    readPersistedProjectContextFeatureEnabled,
} from '../useChatViewState';

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

describe('useChatViewState persistence helpers', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('treats only "1" as enabled persisted flags', () => {
        expect(readPersistedDevMonitorsEnabled()).toBe(false);
        localStorage.setItem('chat_dev_monitors_enabled_v1', 'true');
        expect(readPersistedDevMonitorsEnabled()).toBe(false);
        localStorage.setItem('chat_dev_monitors_enabled_v1', '1');
        expect(readPersistedDevMonitorsEnabled()).toBe(true);

        expect(readPersistedProjectContextFeatureEnabled()).toBe(false);
        localStorage.setItem('project_context_feature_enabled_v1', 'yes');
        expect(readPersistedProjectContextFeatureEnabled()).toBe(false);
        localStorage.setItem('project_context_feature_enabled_v1', '1');
        expect(readPersistedProjectContextFeatureEnabled()).toBe(true);
    });

    it('persists and clears project context feature flag deterministically', () => {
        persistProjectContextFeatureEnabled(true);
        expect(localStorage.getItem('project_context_feature_enabled_v1')).toBe('1');

        persistProjectContextFeatureEnabled(false);
        expect(localStorage.getItem('project_context_feature_enabled_v1')).toBeNull();
    });
});
