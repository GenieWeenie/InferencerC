/** @jest-environment jsdom */

function getFreshService(width: number, height: number) {
    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: height,
    });
    jest.resetModules();
    const { responsiveDesignService } =
        require('../src/renderer/services/responsiveDesign') as typeof import('../src/renderer/services/responsiveDesign');
    return responsiveDesignService;
}

// ---------------------------------------------------------------------------
// Breakpoints
// ---------------------------------------------------------------------------

describe('ResponsiveDesignService', () => {
    describe('breakpoints', () => {
        it('mobile: breakpoint = mobile, isMobile = true (width < 640)', () => {
            const service = getFreshService(500, 900);
            const config = service.getConfig();
            expect(config.breakpoint).toBe('mobile');
            expect(config.isMobile).toBe(true);
        });

        it('tablet: breakpoint = tablet, isTablet = true (640 <= width < 1024)', () => {
            const service = getFreshService(800, 900);
            const config = service.getConfig();
            expect(config.breakpoint).toBe('tablet');
            expect(config.isTablet).toBe(true);
        });

        it('desktop: breakpoint = desktop, isDesktop = true (1024 <= width < 1920)', () => {
            const service = getFreshService(1400, 900);
            const config = service.getConfig();
            expect(config.breakpoint).toBe('desktop');
            expect(config.isDesktop).toBe(true);
        });

        it('wide: breakpoint = wide, isWide = true (width >= 1920)', () => {
            const service = getFreshService(2000, 900);
            const config = service.getConfig();
            expect(config.breakpoint).toBe('wide');
            expect(config.isWide).toBe(true);
        });
    });

    describe('getLayout', () => {
        it('mobile: showSidebar false, compactMode true, panelLayout vertical', () => {
            const service = getFreshService(500, 900);
            const layout = service.getLayout();
            expect(layout.showSidebar).toBe(false);
            expect(layout.compactMode).toBe(true);
            expect(layout.panelLayout).toBe('vertical');
        });

        it('tablet: showSidebar true, panelLayout vertical', () => {
            const service = getFreshService(800, 900);
            const layout = service.getLayout();
            expect(layout.showSidebar).toBe(true);
            expect(layout.panelLayout).toBe('vertical');
        });

        it('desktop: showSidebar true, showInspector true, panelLayout horizontal', () => {
            const service = getFreshService(1400, 900);
            const layout = service.getLayout();
            expect(layout.showSidebar).toBe(true);
            expect(layout.showInspector).toBe(true);
            expect(layout.panelLayout).toBe('horizontal');
        });
    });

    describe('shouldShowMobileMenu', () => {
        it('returns true for mobile', () => {
            const service = getFreshService(500, 900);
            expect(service.shouldShowMobileMenu()).toBe(true);
        });

        it('returns true for tablet', () => {
            const service = getFreshService(800, 900);
            expect(service.shouldShowMobileMenu()).toBe(true);
        });

        it('returns false for desktop', () => {
            const service = getFreshService(1400, 900);
            expect(service.shouldShowMobileMenu()).toBe(false);
        });
    });

    describe('shouldUseCompactMode', () => {
        it('returns true for mobile only', () => {
            const mobileService = getFreshService(500, 900);
            expect(mobileService.shouldUseCompactMode()).toBe(true);
        });

        it('returns false for tablet', () => {
            const tabletService = getFreshService(800, 900);
            expect(tabletService.shouldUseCompactMode()).toBe(false);
        });

        it('returns false for desktop', () => {
            const desktopService = getFreshService(1400, 900);
            expect(desktopService.shouldUseCompactMode()).toBe(false);
        });
    });

    describe('subscribe', () => {
        it('adds listener and returns unsubscribe function', () => {
            const service = getFreshService(1400, 900);
            const listener = jest.fn();
            const unsubscribe = service.subscribe(listener);
            expect(typeof unsubscribe).toBe('function');
            // Trigger resize to fire listener
            window.dispatchEvent(new Event('resize'));
            expect(listener).toHaveBeenCalled();
            unsubscribe();
            listener.mockClear();
            window.dispatchEvent(new Event('resize'));
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('getConfig', () => {
        it('returns copy, not reference', () => {
            const service = getFreshService(1400, 900);
            const config1 = service.getConfig();
            const config2 = service.getConfig();
            expect(config1).toEqual(config2);
            expect(config1).not.toBe(config2);
        });
    });
});
