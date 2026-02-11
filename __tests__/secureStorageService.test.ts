/**
 * @jest-environment jsdom
 */
import { secureStorageService } from '../src/renderer/services/secureStorage';

describe('secureStorageService', () => {
    beforeEach(() => {
        localStorage.clear();
        delete (window as any).electronAPI;
    });

    it('treats only marker value "1" as a valid secure marker', () => {
        localStorage.setItem('secure_marker_api_key', 'true');
        expect(secureStorageService.hasItemSync('api_key')).toBe(false);

        localStorage.setItem('secure_marker_api_key', '1');
        expect(secureStorageService.hasItemSync('api_key')).toBe(true);
    });

    it('does not treat whitespace-only legacy values as present', () => {
        localStorage.setItem('legacy_key', '   ');
        expect(secureStorageService.hasItemSync('legacy_key')).toBe(false);
    });

    it('normalizes legacy fallback values and marks the secure marker', async () => {
        localStorage.setItem('legacy_key', '  token-value  ');

        await expect(secureStorageService.getItem('legacy_key')).resolves.toBe('token-value');
        expect(localStorage.getItem('legacy_key')).toBe('token-value');
        expect(localStorage.getItem('secure_marker_legacy_key')).toBe('1');
    });

    it('clears whitespace-only legacy fallback values during reads', async () => {
        localStorage.setItem('legacy_key', '   ');
        localStorage.setItem('secure_marker_legacy_key', '1');

        await expect(secureStorageService.getItem('legacy_key')).resolves.toBeNull();
        expect(localStorage.getItem('legacy_key')).toBeNull();
        expect(localStorage.getItem('secure_marker_legacy_key')).toBeNull();
    });

    it('treats whitespace writes as clear operations', async () => {
        localStorage.setItem('legacy_key', 'old-value');
        localStorage.setItem('secure_marker_legacy_key', '1');

        await expect(secureStorageService.setItem('legacy_key', '   ')).resolves.toBe(true);
        expect(localStorage.getItem('legacy_key')).toBeNull();
        expect(localStorage.getItem('secure_marker_legacy_key')).toBeNull();
    });

    it('normalizes secure storage reads and clears marker for empty values', async () => {
        (window as any).electronAPI = {
            secureStorageIsAvailable: jest.fn(async () => true),
            secureStorageGetItem: jest.fn(async () => ({ success: true, value: '   ' })),
        };
        localStorage.setItem('secure_marker_remote_key', '1');

        await expect(secureStorageService.getItem('remote_key')).resolves.toBeNull();
        expect(localStorage.getItem('secure_marker_remote_key')).toBeNull();
    });
});
