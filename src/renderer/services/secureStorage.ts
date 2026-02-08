const MARKER_PREFIX = 'secure_marker_';

class SecureStorageService {
    private markerKey(key: string): string {
        return `${MARKER_PREFIX}${key}`;
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
        return Boolean(localStorage.getItem(this.markerKey(key)) || localStorage.getItem(key));
    }

    async setItem(key: string, value: string): Promise<boolean> {
        const safeValue = value ?? '';

        if (await this.canUseSecureStorage()) {
            try {
                const result = await window.electronAPI?.secureStorageSetItem?.(key, safeValue);
                if (result?.success) {
                    localStorage.removeItem(key);
                    localStorage.setItem(this.markerKey(key), '1');
                    return true;
                }
            } catch {
                // Fall through to localStorage fallback.
            }
        }

        localStorage.setItem(key, safeValue);
        localStorage.setItem(this.markerKey(key), '1');
        return true;
    }

    async getItem(key: string): Promise<string | null> {
        if (await this.canUseSecureStorage()) {
            try {
                const result = await window.electronAPI?.secureStorageGetItem?.(key);
                if (result?.success && typeof result.value === 'string') {
                    localStorage.setItem(this.markerKey(key), '1');
                    return result.value;
                }

                if (result?.success && result.value === null) {
                    localStorage.removeItem(this.markerKey(key));
                    return null;
                }
            } catch {
                // Fall through to localStorage fallback.
            }
        }

        const legacy = localStorage.getItem(key);
        if (legacy) {
            localStorage.setItem(this.markerKey(key), '1');
        }
        return legacy;
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
        const legacy = localStorage.getItem(key);
        if (!legacy) {
            return;
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
