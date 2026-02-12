/**
 * @jest-environment jsdom
 */
import { parseBooleanPreference, privacyService } from '../src/renderer/services/privacy';

describe('privacyService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('parses boolean preference strings deterministically', () => {
        expect(parseBooleanPreference(null)).toBeNull();
        expect(parseBooleanPreference(' true ')).toBe(true);
        expect(parseBooleanPreference(' false ')).toBe(false);
        expect(parseBooleanPreference('yes')).toBeNull();
    });

    it('enforces privacy-mode override for analytics state', () => {
        privacyService.disablePrivacyMode();
        expect(privacyService.isPrivacyModeEnabled()).toBe(false);
        expect(privacyService.isAnalyticsEnabled()).toBe(true);

        privacyService.disableAnalytics();
        expect(privacyService.isAnalyticsEnabled()).toBe(false);

        privacyService.enablePrivacyMode();
        expect(privacyService.isPrivacyModeEnabled()).toBe(true);
        expect(privacyService.isAnalyticsEnabled()).toBe(false);
    });

    it('treats malformed storage values as defaults', () => {
        localStorage.setItem('app_privacy_mode', 'enabled');
        localStorage.setItem('app_analytics_enabled', 'disabled');

        expect(privacyService.isPrivacyModeEnabled()).toBe(false);
        expect(privacyService.isAnalyticsEnabled()).toBe(true);
    });
});
