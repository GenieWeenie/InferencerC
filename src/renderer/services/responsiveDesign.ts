/**
 * Responsive Design Service
 *
 * Perfect experience on all screen sizes
 */

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

export interface ResponsiveConfig {
    breakpoint: Breakpoint;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isWide: boolean;
    width: number;
    height: number;
}

export interface ResponsiveLayout {
    showSidebar: boolean;
    sidebarCollapsed: boolean;
    showInspector: boolean;
    inspectorCollapsed: boolean;
    panelLayout: 'horizontal' | 'vertical';
    compactMode: boolean;
}

export class ResponsiveDesignService {
    private static instance: ResponsiveDesignService;
    private breakpoints = {
        mobile: 640,
        tablet: 1024,
        desktop: 1280,
        wide: 1920,
    };
    private currentConfig: ResponsiveConfig;
    private listeners: Set<(config: ResponsiveConfig) => void> = new Set();

    private constructor() {
        this.currentConfig = this.calculateConfig();
        this.initialize();
    }

    static getInstance(): ResponsiveDesignService {
        if (!ResponsiveDesignService.instance) {
            ResponsiveDesignService.instance = new ResponsiveDesignService();
        }
        return ResponsiveDesignService.instance;
    }

    /**
     * Initialize responsive design service
     */
    private initialize(): void {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            this.currentConfig = this.calculateConfig();
            this.listeners.forEach(listener => listener(this.currentConfig));
            this.applyResponsiveClasses();
        };

        window.addEventListener('resize', handleResize);
        this.applyResponsiveClasses();
    }

    /**
     * Calculate current responsive configuration
     */
    private calculateConfig(): ResponsiveConfig {
        if (typeof window === 'undefined') {
            return {
                breakpoint: 'desktop',
                isMobile: false,
                isTablet: false,
                isDesktop: true,
                isWide: false,
                width: 1280,
                height: 720,
            };
        }

        const width = window.innerWidth;
        const height = window.innerHeight;

        let breakpoint: Breakpoint = 'desktop';
        if (width < this.breakpoints.mobile) {
            breakpoint = 'mobile';
        } else if (width < this.breakpoints.tablet) {
            breakpoint = 'tablet';
        } else if (width < this.breakpoints.wide) {
            breakpoint = 'desktop';
        } else {
            breakpoint = 'wide';
        }

        return {
            breakpoint,
            isMobile: breakpoint === 'mobile',
            isTablet: breakpoint === 'tablet',
            isDesktop: breakpoint === 'desktop' || breakpoint === 'wide',
            isWide: breakpoint === 'wide',
            width,
            height,
        };
    }

    /**
     * Apply responsive classes to document
     */
    private applyResponsiveClasses(): void {
        if (typeof document === 'undefined') return;

        const { breakpoint, isMobile, isTablet, isDesktop, isWide } = this.currentConfig;

        document.documentElement.setAttribute('data-breakpoint', breakpoint);
        document.documentElement.classList.toggle('is-mobile', isMobile);
        document.documentElement.classList.toggle('is-tablet', isTablet);
        document.documentElement.classList.toggle('is-desktop', isDesktop);
        document.documentElement.classList.toggle('is-wide', isWide);
    }

    /**
     * Get current responsive configuration
     */
    getConfig(): ResponsiveConfig {
        return { ...this.currentConfig };
    }

    /**
     * Subscribe to responsive changes
     */
    subscribe(listener: (config: ResponsiveConfig) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Get responsive layout configuration
     */
    getLayout(): ResponsiveLayout {
        const { isMobile, isTablet } = this.currentConfig;

        if (isMobile) {
            return {
                showSidebar: false,
                sidebarCollapsed: true,
                showInspector: false,
                inspectorCollapsed: true,
                panelLayout: 'vertical',
                compactMode: true,
            };
        }

        if (isTablet) {
            return {
                showSidebar: true,
                sidebarCollapsed: false,
                showInspector: false,
                inspectorCollapsed: true,
                panelLayout: 'vertical',
                compactMode: false,
            };
        }

        return {
            showSidebar: true,
            sidebarCollapsed: false,
            showInspector: true,
            inspectorCollapsed: false,
            panelLayout: 'horizontal',
            compactMode: false,
        };
    }

    /**
     * Check if should show mobile menu
     */
    shouldShowMobileMenu(): boolean {
        return this.currentConfig.isMobile || this.currentConfig.isTablet;
    }

    /**
     * Check if should use compact mode
     */
    shouldUseCompactMode(): boolean {
        return this.currentConfig.isMobile;
    }
}

export const responsiveDesignService = ResponsiveDesignService.getInstance();
