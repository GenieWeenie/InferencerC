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

const PANEL_TYPES = new Set<PanelConfig['type']>(['sidebar', 'inspector', 'history', 'prompts', 'controls']);
const PANEL_POSITIONS = new Set<PanelConfig['position']>(['left', 'right', 'top', 'bottom']);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const clonePanel = (panel: PanelConfig): PanelConfig => ({ ...panel });

const sanitizePanel = (value: unknown): PanelConfig | null => {
    if (!isRecord(value)
        || typeof value.id !== 'string'
        || !PANEL_TYPES.has(value.type as PanelConfig['type'])
        || !PANEL_POSITIONS.has(value.position as PanelConfig['position'])
        || typeof value.size !== 'number'
        || typeof value.visible !== 'boolean'
        || typeof value.order !== 'number') {
        return null;
    }

    return {
        id: value.id,
        type: value.type as PanelConfig['type'],
        position: value.position as PanelConfig['position'],
        size: value.size,
        visible: value.visible,
        order: value.order,
    };
};

const sanitizePreset = (value: unknown): LayoutPreset | null => {
    if (!isRecord(value)
        || typeof value.id !== 'string'
        || typeof value.name !== 'string'
        || typeof value.description !== 'string'
        || typeof value.createdAt !== 'number'
        || !Array.isArray(value.panels)) {
        return null;
    }

    return {
        id: value.id,
        name: value.name,
        description: value.description,
        panels: value.panels
            .map((entry) => sanitizePanel(entry))
            .filter((entry): entry is PanelConfig => entry !== null),
        createdAt: value.createdAt,
    };
};

const sanitizeLayout = (value: unknown, defaults: LayoutConfig): LayoutConfig => {
    if (!isRecord(value)) {
        return {
            panels: defaults.panels.map(clonePanel),
            customPresets: defaults.customPresets.map((preset) => ({
                ...preset,
                panels: preset.panels.map(clonePanel),
            })),
            currentPreset: defaults.currentPreset,
        };
    }

    const panels = Array.isArray(value.panels)
        ? value.panels
            .map((entry) => sanitizePanel(entry))
            .filter((entry): entry is PanelConfig => entry !== null)
        : [];
    const customPresets = Array.isArray(value.customPresets)
        ? value.customPresets
            .map((entry) => sanitizePreset(entry))
            .filter((entry): entry is LayoutPreset => entry !== null)
        : [];

    return {
        panels: panels.length > 0 ? panels : defaults.panels.map(clonePanel),
        customPresets,
        currentPreset: typeof value.currentPreset === 'string' ? value.currentPreset : undefined,
    };
};

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
                return sanitizeLayout(parseJson(stored), this.defaultLayout);
            }
        } catch (error) {
            console.error('Failed to load layout config:', error);
        }
        return sanitizeLayout(null, this.defaultLayout);
    }

    /**
     * Save layout configuration
     */
    saveLayout(layout: LayoutConfig): void {
        try {
            const sanitized = sanitizeLayout(layout, this.defaultLayout);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sanitized));
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
        const reordered = panelIds.map((id, index) => {
            const panel = panelMap.get(id);
            if (panel) {
                panel.order = index;
                return panel;
            }
            return null;
        }).filter((panel): panel is PanelConfig => panel !== null);
        const knownIds = new Set(reordered.map((panel) => panel.id));
        const remaining = layout.panels
            .filter((panel) => !knownIds.has(panel.id))
            .map((panel, index) => ({ ...panel, order: reordered.length + index }));
        layout.panels = [...reordered, ...remaining];
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
            panels: layout.panels.map(clonePanel),
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
            layout.panels = preset.panels.map(clonePanel);
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
                panels: this.defaultLayout.panels.map(clonePanel),
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
