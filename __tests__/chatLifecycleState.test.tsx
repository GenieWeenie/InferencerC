/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useChatLifecycleState } from '../src/renderer/hooks/useChatLifecycleState';

jest.mock('react-virtuoso', () => ({
    Virtuoso: () => null,
}));

const readIntegrationAvailabilityMock = jest.fn();
jest.mock('../src/renderer/lib/chatIntegrations', () => ({
    readIntegrationAvailability: (...args: unknown[]) => readIntegrationAvailabilityMock(...args),
}));

describe('useChatLifecycleState', () => {
    beforeEach(() => {
        localStorage.clear();
        readIntegrationAvailabilityMock.mockReset();
        readIntegrationAvailabilityMock.mockReturnValue({
            notion: true,
            slack: false,
            discord: true,
            email: false,
            calendar: true,
        });
    });

    it('hydrates snapshot state and updates integration availability when history exists', async () => {
        localStorage.setItem('mcp_servers', JSON.stringify([{ id: 'server-1' }]));
        localStorage.setItem('secure_marker_github_api_key', '1');
        localStorage.setItem('cloud_sync_config_v1', JSON.stringify({
            token: 't',
            accountId: 'a',
            encryptionSalt: 's',
        }));

        const { result, rerender } = renderHook((props: {
            historyLength: number;
            showSearchResultsList: boolean;
            searchResultsLength: number;
        }) => useChatLifecycleState(props), {
            initialProps: {
                historyLength: 0,
                showSearchResultsList: false,
                searchResultsLength: 0,
            },
        });

        expect(result.current.hasConfiguredMcpServers).toBe(true);
        expect(result.current.githubConfigured).toBe(true);
        expect(result.current.isCloudSyncAuthenticated).toBe(true);
        expect(document.documentElement.getAttribute('data-breakpoint')).toBeTruthy();
        expect(result.current.integrationAvailability.notion).toBe(false);

        rerender({
            historyLength: 1,
            showSearchResultsList: false,
            searchResultsLength: 0,
        });

        await waitFor(() => {
            expect(result.current.integrationAvailability.notion).toBe(true);
            expect(result.current.integrationAvailability.discord).toBe(true);
        });
    });

    it('refreshes cloud auth snapshot on storage events', async () => {
        const { result } = renderHook(() => useChatLifecycleState({
            historyLength: 0,
            showSearchResultsList: false,
            searchResultsLength: 0,
        }));

        expect(result.current.isCloudSyncAuthenticated).toBe(false);

        act(() => {
            localStorage.setItem('cloud_sync_config_v1', JSON.stringify({
                token: 't',
                accountId: 'a',
                encryptionSalt: 's',
            }));
            window.dispatchEvent(new Event('storage'));
        });

        await waitFor(() => {
            expect(result.current.isCloudSyncAuthenticated).toBe(true);
        });
    });
});
