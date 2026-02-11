const MARKER_PREFIX = 'secure_marker_';

const normalizeStoredValue = (value: string | null): string | null => {
    if (value === null) {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

class SecureStorageService {
    private markerKey(key: string): string {
        return `${MARKER_PREFIX}${key}`;
    }

    private hasSecureMarker(key: string): boolean {
        return localStorage.getItem(this.markerKey(key)) === '1';
    }

    private async canUseSecureStorage(): Promise<boolean> {
        try {
            if (!window.electronAPI?.secureStorageIsAvailable) {
                return false;
            }
            return await window.electronAPI.secureStorageIsAvailable();
        } catch {
            return false;
        }
    }

    hasItemSync(key: string): boolean {
        if (this.hasSecureMarker(key)) {
            return true;
        }

        return normalizeStoredValue(localStorage.getItem(key)) !== null;
    }

    async setItem(key: string, value: string): Promise<boolean> {
        const safeValue = value ?? '';
        const normalizedValue = normalizeStoredValue(safeValue);

        if (normalizedValue === null) {
            await this.removeItem(key);
            return true;
        }

        if (await this.canUseSecureStorage()) {
            try {
                const result = await window.electronAPI?.secureStorageSetItem?.(key, normalizedValue);
                if (result?.success) {
                    localStorage.removeItem(key);
                    localStorage.setItem(this.markerKey(key), '1');
                    return true;
                }
            } catch {
                // Fall through to localStorage fallback.
            }
        }

        localStorage.setItem(key, normalizedValue);
        localStorage.setItem(this.markerKey(key), '1');
        return true;
    }

    async getItem(key: string): Promise<string | null> {
        if (await this.canUseSecureStorage()) {
            try {
                const result = await window.electronAPI?.secureStorageGetItem?.(key);
                if (result?.success && typeof result.value === 'string') {
                    const normalized = normalizeStoredValue(result.value);
                    if (normalized) {
                        localStorage.setItem(this.markerKey(key), '1');
                        return normalized;
                    }
                    localStorage.removeItem(this.markerKey(key));
                    return null;
                }

                if (result?.success && result.value === null) {
                    localStorage.removeItem(this.markerKey(key));
                    return null;
                }
            } catch {
                // Fall through to localStorage fallback.
            }
        }

        const legacyRaw = localStorage.getItem(key);
        const legacy = normalizeStoredValue(legacyRaw);
        if (legacy) {
            if (legacyRaw !== legacy) {
                localStorage.setItem(key, legacy);
            }
            localStorage.setItem(this.markerKey(key), '1');
            return legacy;
        }
        if (legacyRaw !== null) {
            localStorage.removeItem(key);
            localStorage.removeItem(this.markerKey(key));
        }
        return null;
    }

    async removeItem(key: string): Promise<void> {
        try {
            if (await this.canUseSecureStorage()) {
                await window.electronAPI?.secureStorageRemoveItem?.(key);
            }
        } finally {
            localStorage.removeItem(key);
            localStorage.removeItem(this.markerKey(key));
        }
    }

    async migrateFromLocalStorage(key: string): Promise<void> {
        const legacyRaw = localStorage.getItem(key);
        const legacy = normalizeStoredValue(legacyRaw);
        if (!legacy) {
            if (legacyRaw !== null) {
                localStorage.removeItem(key);
            }
            localStorage.removeItem(this.markerKey(key));
            return;
        }

        if (legacyRaw !== legacy) {
            localStorage.setItem(key, legacy);
        }

        if (!(await this.canUseSecureStorage())) {
            localStorage.setItem(this.markerKey(key), '1');
            return;
        }

        const stored = await this.setItem(key, legacy);
        if (stored) {
            localStorage.removeItem(key);
        }
    }
}

export const secureStorageService = new SecureStorageService();
