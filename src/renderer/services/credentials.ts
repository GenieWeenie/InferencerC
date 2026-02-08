import { secureStorageService } from './secureStorage';

type CredentialKey = 'openRouterApiKey' | 'github_api_key' | 'notion_api_key';

class CredentialService {
    private cache = new Map<CredentialKey, string | null>();

    private notifyChange(key: CredentialKey): void {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('credentials-updated', { detail: { key } }));
        }
    }

    private async getCredential(key: CredentialKey): Promise<string | null> {
        if (this.cache.has(key)) {
            return this.cache.get(key) ?? null;
        }

        await secureStorageService.migrateFromLocalStorage(key);
        const value = await secureStorageService.getItem(key);
        this.cache.set(key, value);
        return value;
    }

    private async setCredential(key: CredentialKey, value: string): Promise<void> {
        const safeValue = value.trim();
        if (!safeValue) {
            await this.clearCredential(key);
            return;
        }

        await secureStorageService.setItem(key, safeValue);
        this.cache.set(key, safeValue);
        this.notifyChange(key);
    }

    private async clearCredential(key: CredentialKey): Promise<void> {
        await secureStorageService.removeItem(key);
        this.cache.set(key, null);
        this.notifyChange(key);
    }

    hasCredential(key: CredentialKey): boolean {
        const cached = this.cache.get(key);
        if (typeof cached === 'string') {
            return cached.length > 0;
        }

        return secureStorageService.hasItemSync(key);
    }

    async getOpenRouterApiKey(): Promise<string | null> {
        return this.getCredential('openRouterApiKey');
    }

    async setOpenRouterApiKey(value: string): Promise<void> {
        return this.setCredential('openRouterApiKey', value);
    }

    async clearOpenRouterApiKey(): Promise<void> {
        return this.clearCredential('openRouterApiKey');
    }

    hasOpenRouterApiKey(): boolean {
        return this.hasCredential('openRouterApiKey');
    }

    async getGithubApiKey(): Promise<string | null> {
        return this.getCredential('github_api_key');
    }

    async setGithubApiKey(value: string): Promise<void> {
        return this.setCredential('github_api_key', value);
    }

    async clearGithubApiKey(): Promise<void> {
        return this.clearCredential('github_api_key');
    }

    hasGithubApiKey(): boolean {
        return this.hasCredential('github_api_key');
    }

    async getNotionApiKey(): Promise<string | null> {
        return this.getCredential('notion_api_key');
    }

    async setNotionApiKey(value: string): Promise<void> {
        return this.setCredential('notion_api_key', value);
    }

    async clearNotionApiKey(): Promise<void> {
        return this.clearCredential('notion_api_key');
    }

    hasNotionApiKey(): boolean {
        return this.hasCredential('notion_api_key');
    }
}

export const credentialService = new CredentialService();
