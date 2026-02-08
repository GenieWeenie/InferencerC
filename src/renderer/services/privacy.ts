/**
 * Privacy Service
 * Manages privacy settings and controls analytics/telemetry
 */

const PRIVACY_KEY = 'app_privacy_mode';
const ANALYTICS_ENABLED_KEY = 'app_analytics_enabled';

export class PrivacyService {
  private static instance: PrivacyService;

  private constructor() {}

  static getInstance(): PrivacyService {
    if (!PrivacyService.instance) {
      PrivacyService.instance = new PrivacyService();
    }
    return PrivacyService.instance;
  }

  /**
   * Check if privacy mode is enabled
   */
  isPrivacyModeEnabled(): boolean {
    return localStorage.getItem(PRIVACY_KEY) === 'true';
  }

  /**
   * Enable privacy mode (disables all analytics/telemetry)
   */
  enablePrivacyMode(): void {
    localStorage.setItem(PRIVACY_KEY, 'true');
    localStorage.setItem(ANALYTICS_ENABLED_KEY, 'false');
  }

  /**
   * Disable privacy mode
   */
  disablePrivacyMode(): void {
    localStorage.setItem(PRIVACY_KEY, 'false');
    localStorage.setItem(ANALYTICS_ENABLED_KEY, 'true');
  }

  /**
   * Check if analytics are enabled
   */
  isAnalyticsEnabled(): boolean {
    if (this.isPrivacyModeEnabled()) {
      return false; // Privacy mode overrides
    }
    return localStorage.getItem(ANALYTICS_ENABLED_KEY) !== 'false';
  }

  /**
   * Enable analytics
   */
  enableAnalytics(): void {
    if (!this.isPrivacyModeEnabled()) {
      localStorage.setItem(ANALYTICS_ENABLED_KEY, 'true');
    }
  }

  /**
   * Disable analytics
   */
  disableAnalytics(): void {
    localStorage.setItem(ANALYTICS_ENABLED_KEY, 'false');
  }

  /**
   * Get all privacy settings
   */
  getSettings(): {
    privacyMode: boolean;
    analyticsEnabled: boolean;
  } {
    return {
      privacyMode: this.isPrivacyModeEnabled(),
      analyticsEnabled: this.isAnalyticsEnabled(),
    };
  }
}

export const privacyService = PrivacyService.getInstance();
