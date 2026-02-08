/**
 * Layout Customization Service
 *
 * Drag-and-drop layout customization
 */

export interface PanelConfig {
    id: string;
    type: 'sidebar' | 'inspector' | 'history' | 'prompts' | 'controls';
    position: 'left' | 'right' | 'top' | 'bottom';
    size: number; // Percentage or pixels
    visible: boolean;
    order: number;
}

export interface LayoutPreset {
    id: string;
    name: string;
    description: string;
    panels: PanelConfig[];
    createdAt: number;
}

export interface LayoutConfig {
    panels: PanelConfig[];
    currentPreset?: string;
    customPresets: LayoutPreset[];
}

export class LayoutCustomizationService {
    private static instance: LayoutCustomizationService;
    private readonly STORAGE_KEY = 'layout_config';
    private defaultLayout: LayoutConfig;

    private constructor() {
        this.defaultLayout = {
            panels: [
                { id: 'history', type: 'history', position: 'left', size: 20, visible: true, order: 0 },
                { id: 'main', type: 'sidebar', position: 'left', size: 80, visible: true, order: 1 },
                { id: 'inspector', type: 'inspector', position: 'right', size: 30, visible: true, order: 2 },
                { id: 'controls', type: 'controls', position: 'right', size: 30, visible: true, order: 3 },
            ],
            customPresets: [],
        };
    }

    static getInstance(): LayoutCustomizationService {
        if (!LayoutCustomizationService.instance) {
            LayoutCustomizationService.instance = new LayoutCustomizationService();
        }
        return LayoutCustomizationService.instance;
    }

    /**
     * Get current layout configuration
     */
    getLayout(): LayoutConfig {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load layout config:', error);
        }
        return this.defaultLayout;
    }

    /**
     * Save layout configuration
     */
    saveLayout(layout: LayoutConfig): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(layout));
        } catch (error) {
            console.error('Failed to save layout config:', error);
        }
    }

    /**
     * Update panel configuration
     */
    updatePanel(panelId: string, updates: Partial<PanelConfig>): void {
        const layout = this.getLayout();
        const panel = layout.panels.find(p => p.id === panelId);
        if (panel) {
            Object.assign(panel, updates);
            this.saveLayout(layout);
        }
    }

    /**
     * Reorder panels
     */
    reorderPanels(panelIds: string[]): void {
        const layout = this.getLayout();
        const panelMap = new Map(layout.panels.map(p => [p.id, p]));
        layout.panels = panelIds.map((id, index) => {
            const panel = panelMap.get(id);
            if (panel) {
                panel.order = index;
                return panel;
            }
            return null;
        }).filter(Boolean) as PanelConfig[];
        this.saveLayout(layout);
    }

    /**
     * Create layout preset
     */
    createPreset(name: string, description: string): LayoutPreset {
        const layout = this.getLayout();
        const preset: LayoutPreset = {
            id: crypto.randomUUID(),
            name,
            description,
            panels: JSON.parse(JSON.stringify(layout.panels)), // Deep clone
            createdAt: Date.now(),
        };
        layout.customPresets.push(preset);
        this.saveLayout(layout);
        return preset;
    }

    /**
     * Apply layout preset
     */
    applyPreset(presetId: string): void {
        const layout = this.getLayout();
        const preset = layout.customPresets.find(p => p.id === presetId);
        if (preset) {
            layout.panels = JSON.parse(JSON.stringify(preset.panels));
            layout.currentPreset = presetId;
            this.saveLayout(layout);
        }
    }

    /**
     * Delete layout preset
     */
    deletePreset(presetId: string): void {
        const layout = this.getLayout();
        layout.customPresets = layout.customPresets.filter(p => p.id !== presetId);
        if (layout.currentPreset === presetId) {
            layout.currentPreset = undefined;
        }
        this.saveLayout(layout);
    }

    /**
     * Reset to default layout
     */
    resetToDefault(): void {
        this.saveLayout(this.defaultLayout);
    }

    /**
     * Get built-in presets
     */
    getBuiltInPresets(): LayoutPreset[] {
        return [
            {
                id: 'default',
                name: 'Default',
                description: 'Standard layout with all panels visible',
                panels: this.defaultLayout.panels,
                createdAt: 0,
            },
            {
                id: 'minimal',
                name: 'Minimal',
                description: 'Minimal layout with only essential panels',
                panels: [
                    { id: 'main', type: 'sidebar', position: 'left', size: 100, visible: true, order: 0 },
                ],
                createdAt: 0,
            },
            {
                id: 'developer',
                name: 'Developer',
                description: 'Layout optimized for development with inspector and controls',
                panels: [
                    { id: 'history', type: 'history', position: 'left', size: 15, visible: true, order: 0 },
                    { id: 'main', type: 'sidebar', position: 'left', size: 50, visible: true, order: 1 },
                    { id: 'inspector', type: 'inspector', position: 'right', size: 35, visible: true, order: 2 },
                ],
                createdAt: 0,
            },
        ];
    }
}

export const layoutCustomizationService = LayoutCustomizationService.getInstance();
