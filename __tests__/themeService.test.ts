/**
 * @jest-environment jsdom
 */

const installMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: jest.fn().mockImplementation(() => ({
            matches,
            media: '(prefers-color-scheme: dark)',
            onchange: null,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
};

describe('theme service persistence guards', () => {
    beforeEach(() => {
        jest.resetModules();
        localStorage.clear();
        installMatchMedia(true);
    });

    it('sanitizes stored theme id reads', () => {
        jest.isolateModules(() => {
            const { readStoredThemeId } = require('../src/renderer/services/theme') as typeof import('../src/renderer/services/theme');
            expect(readStoredThemeId()).toBeNull();

            localStorage.setItem('app_theme', '  light  ');
            expect(readStoredThemeId()).toBe('light');

            localStorage.setItem('app_theme', '   ');
            expect(readStoredThemeId()).toBeNull();
        });
    });

    it('parses valid custom theme payloads and rejects malformed ones', () => {
        jest.isolateModules(() => {
            const { parseStoredCustomTheme } = require('../src/renderer/services/theme') as typeof import('../src/renderer/services/theme');
            expect(parseStoredCustomTheme('{bad-json')).toBeNull();

            const valid = parseStoredCustomTheme(JSON.stringify({
                id: 'custom-midnight',
                name: 'Custom Midnight',
                primaryColor: '#111111',
                secondaryColor: '#222222',
                backgroundColor: '#000000',
                surfaceColor: '#050505',
                textColor: '#ffffff',
                textSecondary: '#cccccc',
                accentColor: '#3333ff',
                borderColor: '#444444',
                codeBackground: '#111111',
                codeText: '#eeeeee',
            }));

            expect(valid?.id).toBe('custom-midnight');
            expect(valid?.name).toBe('Custom Midnight');
            expect(parseStoredCustomTheme(JSON.stringify({ id: 'x', name: 'bad' }))).toBeNull();
        });
    });

    it('falls back to default theme when persisted theme id is invalid', () => {
        localStorage.setItem('app_theme', 'invalid-theme-id');

        jest.isolateModules(() => {
            const { ThemeService } = require('../src/renderer/services/theme') as typeof import('../src/renderer/services/theme');
            const service = ThemeService.getInstance();
            expect(service.getCurrentTheme().id).toBe('oled-dark');
        });
    });

    it('hydrates custom theme only when id and custom payload match', () => {
        const customTheme = {
            id: 'custom-midnight',
            name: 'Custom Midnight',
            primaryColor: '#111111',
            secondaryColor: '#222222',
            backgroundColor: '#000000',
            surfaceColor: '#050505',
            textColor: '#ffffff',
            textSecondary: '#cccccc',
            accentColor: '#3333ff',
            borderColor: '#444444',
            codeBackground: '#111111',
            codeText: '#eeeeee',
        };
        localStorage.setItem('app_theme', customTheme.id);
        localStorage.setItem('app_custom_theme', JSON.stringify(customTheme));

        jest.isolateModules(() => {
            const { ThemeService } = require('../src/renderer/services/theme') as typeof import('../src/renderer/services/theme');
            const service = ThemeService.getInstance();
            expect(service.getCurrentTheme().id).toBe('custom-midnight');
            expect(service.getCurrentTheme().name).toBe('Custom Midnight');
        });
    });

    it('persists auto selection as "auto" preference', () => {
        jest.isolateModules(() => {
            const { ThemeService } = require('../src/renderer/services/theme') as typeof import('../src/renderer/services/theme');
            const service = ThemeService.getInstance();
            service.setTheme('auto');
            expect(localStorage.getItem('app_theme')).toBe('auto');
        });
    });
});
