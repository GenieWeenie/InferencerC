/**
 * @jest-environment jsdom
 */

jest.mock('../src/renderer/services/credentials', () => ({
    credentialService: {
        setNotionApiKey: jest.fn(async () => undefined),
        clearNotionApiKey: jest.fn(async () => undefined),
        getNotionApiKey: jest.fn(async () => null),
        hasNotionApiKey: jest.fn(() => false),
    },
}));

describe('notion config persistence guards', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        localStorage.clear();
    });

    it('sanitizes persisted database id reads', () => {
        const { readPersistedNotionDatabaseId } = require('../src/renderer/services/notion') as typeof import('../src/renderer/services/notion');
        expect(readPersistedNotionDatabaseId()).toBeNull();

        localStorage.setItem('notion_database_id', '  db_123  ');
        expect(readPersistedNotionDatabaseId()).toBe('db_123');

        localStorage.setItem('notion_database_id', '   ');
        expect(readPersistedNotionDatabaseId()).toBeNull();
    });

    it('persists trimmed config values and clears blank database ids', async () => {
        const notionModule = require('../src/renderer/services/notion') as typeof import('../src/renderer/services/notion');
        const credentialsModule = require('../src/renderer/services/credentials') as typeof import('../src/renderer/services/credentials');
        const { notionService } = notionModule;
        const { credentialService } = credentialsModule;

        await notionService.setConfig('  sk-test  ', '  db_123  ');
        expect(credentialService.setNotionApiKey).toHaveBeenCalledWith('sk-test');
        expect(notionService.getDatabaseId()).toBe('db_123');
        expect(localStorage.getItem('notion_database_id')).toBe('db_123');

        await notionService.setConfig('   ', '   ');
        expect(credentialService.clearNotionApiKey).toHaveBeenCalled();
        expect(notionService.getDatabaseId()).toBeNull();
        expect(localStorage.getItem('notion_database_id')).toBeNull();
    });

    it('cleans malformed persisted database ids when reading config', async () => {
        const notionModule = require('../src/renderer/services/notion') as typeof import('../src/renderer/services/notion');
        const { notionService } = notionModule;

        localStorage.setItem('notion_database_id', '   ');
        expect(notionService.getDatabaseId()).toBeNull();
        expect(localStorage.getItem('notion_database_id')).toBeNull();
    });
});
