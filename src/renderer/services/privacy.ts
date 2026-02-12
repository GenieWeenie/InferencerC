/**
 * Privacy Service
 * Manages privacy settings and controls analytics/telemetry
 */

const PRIVACY_KEY = 'app_privacy_mode';
const ANALYTICS_ENABLED_KEY = 'app_analytics_enabled';

const readStorageValue = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorageValue = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures for non-critical privacy preference values.
  }
};

export const parseBooleanPreference = (value: string | null): boolean | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return null;
};

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
    return parseBooleanPreference(readStorageValue(PRIVACY_KEY)) === true;
  }

  /**
   * Enable privacy mode (disables all analytics/telemetry)
   */
  enablePrivacyMode(): void {
    writeStorageValue(PRIVACY_KEY, 'true');
    writeStorageValue(ANALYTICS_ENABLED_KEY, 'false');
  }

  /**
   * Disable privacy mode
   */
  disablePrivacyMode(): void {
    writeStorageValue(PRIVACY_KEY, 'false');
    writeStorageValue(ANALYTICS_ENABLED_KEY, 'true');
  }

  /**
   * Check if analytics are enabled
   */
  isAnalyticsEnabled(): boolean {
    if (this.isPrivacyModeEnabled()) {
      return false; // Privacy mode overrides
    }
    return parseBooleanPreference(readStorageValue(ANALYTICS_ENABLED_KEY)) !== false;
  }

  /**
   * Enable analytics
   */
  enableAnalytics(): void {
    if (!this.isPrivacyModeEnabled()) {
      writeStorageValue(ANALYTICS_ENABLED_KEY, 'true');
    }
  }

  /**
   * Disable analytics
   */
  disableAnalytics(): void {
    writeStorageValue(ANALYTICS_ENABLED_KEY, 'false');
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
