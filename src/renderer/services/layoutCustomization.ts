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
const MIN_PANEL_SIZE = 1;
const MAX_PANEL_SIZE = 1000;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const sanitizeNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};

const clonePanel = (panel: PanelConfig): PanelConfig => ({ ...panel });

const sanitizePanel = (value: unknown): PanelConfig | null => {
    if (!isRecord(value)) {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    if (!id
        || !PANEL_TYPES.has(value.type as PanelConfig['type'])
        || !PANEL_POSITIONS.has(value.position as PanelConfig['position'])
        || typeof value.size !== 'number'
        || !Number.isFinite(value.size)
        || typeof value.visible !== 'boolean'
        || typeof value.order !== 'number'
        || !Number.isFinite(value.order)) {
        return null;
    }
    const size = Math.max(MIN_PANEL_SIZE, Math.min(MAX_PANEL_SIZE, Math.round(value.size)));
    const order = Math.max(0, Math.floor(value.order));

    return {
        id,
        type: value.type as PanelConfig['type'],
        position: value.position as PanelConfig['position'],
        size,
        visible: value.visible,
        order,
    };
};

const sanitizePreset = (value: unknown): LayoutPreset | null => {
    if (!isRecord(value) || !Array.isArray(value.panels)) {
        return null;
    }
    const id = sanitizeNonEmptyString(value.id);
    const name = sanitizeNonEmptyString(value.name);
    const createdAt = typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
        ? Math.max(0, Math.floor(value.createdAt))
        : null;
    if (!id || !name || createdAt === null) {
        return null;
    }
    const panels = value.panels
        .map((entry) => sanitizePanel(entry))
        .filter((entry): entry is PanelConfig => entry !== null);
    if (panels.length === 0) {
        return null;
    }

    return {
        id,
        name,
        description: sanitizeNonEmptyString(value.description) || '',
        panels,
        createdAt,
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

    const seenPanelIds = new Set<string>();
    const panels = Array.isArray(value.panels)
        ? value.panels
            .map((entry) => sanitizePanel(entry))
            .filter((entry): entry is PanelConfig => {
                if (!entry) {
                    return false;
                }
                if (seenPanelIds.has(entry.id)) {
                    return false;
                }
                seenPanelIds.add(entry.id);
                return true;
            })
        : [];
    const seenPresetIds = new Set<string>();
    const customPresets = Array.isArray(value.customPresets)
        ? value.customPresets
            .map((entry) => sanitizePreset(entry))
            .filter((entry): entry is LayoutPreset => {
                if (!entry) {
                    return false;
                }
                if (seenPresetIds.has(entry.id)) {
                    return false;
                }
                seenPresetIds.add(entry.id);
                return true;
            })
        : [];
    const currentPreset = sanitizeNonEmptyString(value.currentPreset);

    return {
        panels: panels.length > 0 ? panels : defaults.panels.map(clonePanel),
        customPresets,
        currentPreset: currentPreset && customPresets.some((preset) => preset.id === currentPreset)
            ? currentPreset
            : undefined,
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
            const updatedPanel = sanitizePanel({
                ...panel,
                ...updates,
                id: panel.id,
            });
            if (!updatedPanel) {
                return;
            }
            Object.assign(panel, updatedPanel);
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
        const preset = sanitizePreset({
            id: crypto.randomUUID(),
            name,
            description,
            panels: layout.panels.map(clonePanel),
            createdAt: Date.now(),
        });
        if (!preset) {
            throw new Error('Invalid layout preset configuration');
        }
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
