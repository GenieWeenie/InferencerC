/**
 * Theme types for the application
 */
export type ThemeType = 'oled-dark' | 'deep-purple' | 'forest-green' | 'solarized-dark' | 'light' | 'auto';

/**
 * Application theme configuration
 */
export interface ThemeConfig {
  id: ThemeType;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondary: string;
  accentColor: string;
  borderColor: string;
  codeBackground: string;
  codeText: string;
}

const THEME_STORAGE_KEY = 'app_theme';
const CUSTOM_THEME_STORAGE_KEY = 'app_custom_theme';
const PRESET_THEME_IDS: ThemeType[] = ['oled-dark', 'deep-purple', 'forest-green', 'solarized-dark', 'light'];

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value && typeof value === 'object' && !Array.isArray(value))
);

const sanitizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseJson = (raw: string): unknown | null => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const isPresetThemeType = (value: string): value is Exclude<ThemeType, 'auto'> => (
  PRESET_THEME_IDS.includes(value as Exclude<ThemeType, 'auto'>)
);

export const readStoredThemeId = (): string | null => {
  try {
    return sanitizeNonEmptyString(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
};

export const parseStoredCustomTheme = (raw: string | null): ThemeConfig | null => {
  if (!raw) {
    return null;
  }

  const parsed = parseJson(raw);
  if (!isRecord(parsed)) {
    return null;
  }

  const id = sanitizeNonEmptyString(parsed.id);
  const name = sanitizeNonEmptyString(parsed.name);
  const primaryColor = sanitizeNonEmptyString(parsed.primaryColor);
  const secondaryColor = sanitizeNonEmptyString(parsed.secondaryColor);
  const backgroundColor = sanitizeNonEmptyString(parsed.backgroundColor);
  const surfaceColor = sanitizeNonEmptyString(parsed.surfaceColor);
  const textColor = sanitizeNonEmptyString(parsed.textColor);
  const textSecondary = sanitizeNonEmptyString(parsed.textSecondary);
  const accentColor = sanitizeNonEmptyString(parsed.accentColor);
  const borderColor = sanitizeNonEmptyString(parsed.borderColor);
  const codeBackground = sanitizeNonEmptyString(parsed.codeBackground);
  const codeText = sanitizeNonEmptyString(parsed.codeText);

  if (!id || !name || !primaryColor || !secondaryColor || !backgroundColor || !surfaceColor || !textColor
    || !textSecondary || !accentColor || !borderColor || !codeBackground || !codeText) {
    return null;
  }

  return {
    id: id as ThemeType,
    name,
    primaryColor,
    secondaryColor,
    backgroundColor,
    surfaceColor,
    textColor,
    textSecondary,
    accentColor,
    borderColor,
    codeBackground,
    codeText,
  };
};

/**
 * Theme service for managing application themes
 */
export class ThemeService {
  private static instance: ThemeService;
  private currentTheme: ThemeConfig;
  private observers: Array<(theme: ThemeConfig) => void> = [];

  /**
   * Get singleton instance of ThemeService
   */
  static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  private constructor() {
    const savedThemeId = readStoredThemeId();
    const customTheme = this.readStoredCustomTheme();
    if (savedThemeId === 'auto') {
      this.currentTheme = this.getDefaultTheme();
    } else if (savedThemeId && isPresetThemeType(savedThemeId)) {
      this.currentTheme = this.getThemeById(savedThemeId) || this.getDefaultTheme();
    } else if (savedThemeId && customTheme && customTheme.id === savedThemeId) {
      this.currentTheme = customTheme;
    } else {
      this.currentTheme = this.getDefaultTheme();
    }
    this.applyThemeToDocument();
  }

  private readStoredCustomTheme(): ThemeConfig | null {
    try {
      return parseStoredCustomTheme(localStorage.getItem(CUSTOM_THEME_STORAGE_KEY));
    } catch {
      return null;
    }
  }

  /**
   * Get all available themes
   */
  getAllThemes(): ThemeConfig[] {
    return [
      {
        id: 'oled-dark',
        name: 'OLED Dark',
        primaryColor: '#3b82f6',
        secondaryColor: '#60a5fa',
        backgroundColor: '#000000',
        surfaceColor: '#0a0a0a',
        textColor: '#f8fafc',
        textSecondary: '#cbd5e1',
        accentColor: '#3b82f6',
        borderColor: '#1e293b',
        codeBackground: '#1e1e1e',
        codeText: '#d4d4d4'
      },
      {
        id: 'deep-purple',
        name: 'Deep Purple',
        primaryColor: '#8b5cf6',
        secondaryColor: '#a78bfa',
        backgroundColor: '#0f0b1e',
        surfaceColor: '#1a0f2e',
        textColor: '#f3e8ff',
        textSecondary: '#c4b5fd',
        accentColor: '#8b5cf6',
        borderColor: '#3b1f5f',
        codeBackground: '#1e1e1e',
        codeText: '#d4d4d4'
      },
      {
        id: 'forest-green',
        name: 'Forest Green',
        primaryColor: '#10b981',
        secondaryColor: '#34d399',
        backgroundColor: '#0a1f0a',
        surfaceColor: '#132e13',
        textColor: '#d1fae5',
        textSecondary: '#a7f3d0',
        accentColor: '#10b981',
        borderColor: '#1f3d1f',
        codeBackground: '#1e1e1e',
        codeText: '#d4d4d4'
      },
      {
        id: 'solarized-dark',
        name: 'Solarized Dark',
        primaryColor: '#268bd2',
        secondaryColor: '#2aa198',
        backgroundColor: '#002b36',
        surfaceColor: '#073642',
        textColor: '#fdf6e3',
        textSecondary: '#93a1a1',
        accentColor: '#268bd2',
        borderColor: '#586e75',
        codeBackground: '#073642',
        codeText: '#fdf6e3'
      },
      {
        id: 'light',
        name: 'Light Mode',
        primaryColor: '#2563eb',
        secondaryColor: '#3b82f6',
        backgroundColor: '#ffffff',
        surfaceColor: '#f8fafc',
        textColor: '#1e293b',
        textSecondary: '#64748b',
        accentColor: '#2563eb',
        borderColor: '#e2e8f0',
        codeBackground: '#f1f5f9',
        codeText: '#1e293b'
      }
    ];
  }

  /**
   * Get theme by ID
   */
  getThemeById(id: string): ThemeConfig | null {
    return this.getAllThemes().find(t => t.id === id) || null;
  }

  /**
   * Get the default theme based on system preference
   */
  private getDefaultTheme(): ThemeConfig {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDarkMode ? this.getThemeById('oled-dark')! : this.getThemeById('light')!;
  }

  /**
   * Get the current theme
   */
  getCurrentTheme(): ThemeConfig {
    return this.currentTheme;
  }

  /**
   * Set a new theme
   * @param themeType The theme type to set
   */
  setTheme(themeType: ThemeType): void {
    let newTheme: ThemeConfig;

    if (themeType === 'auto') {
      newTheme = this.getDefaultTheme();
    } else {
      const theme = this.getThemeById(themeType);
      if (!theme) {
        console.warn(`Theme ${themeType} not found, using default`);
        newTheme = this.getDefaultTheme();
      } else {
        newTheme = theme;
      }
    }

    this.currentTheme = newTheme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeType === 'auto' ? 'auto' : newTheme.id);
    } catch {
      // Ignore storage failures for theme preference persistence.
    }
    this.applyThemeToDocument();
    this.notifyObservers();
  }

  /**
   * Set a custom theme
   * @param theme Custom theme configuration
   */
  setCustomTheme(theme: Partial<ThemeConfig> & { id: string; name: string }): void {
    const normalizedId = sanitizeNonEmptyString(theme.id);
    const normalizedName = sanitizeNonEmptyString(theme.name);
    if (!normalizedId || !normalizedName) {
      throw new Error('Custom theme id and name are required');
    }

    const fullTheme: ThemeConfig = {
      id: normalizedId as ThemeType,
      name: normalizedName,
      primaryColor: theme.primaryColor || this.currentTheme.primaryColor,
      secondaryColor: theme.secondaryColor || this.currentTheme.secondaryColor,
      backgroundColor: theme.backgroundColor || this.currentTheme.backgroundColor,
      surfaceColor: theme.surfaceColor || this.currentTheme.surfaceColor,
      textColor: theme.textColor || this.currentTheme.textColor,
      textSecondary: theme.textSecondary || this.currentTheme.textSecondary,
      accentColor: theme.accentColor || this.currentTheme.accentColor,
      borderColor: theme.borderColor || this.currentTheme.borderColor,
      codeBackground: theme.codeBackground || this.currentTheme.codeBackground,
      codeText: theme.codeText || this.currentTheme.codeText
    };

    this.currentTheme = fullTheme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, fullTheme.id);
      localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(fullTheme));
    } catch {
      // Ignore storage failures for custom theme persistence.
    }
    this.applyThemeToDocument();
    this.notifyObservers();
  }

  /**
   * Apply the current theme to the document
   */
  private applyThemeToDocument(): void {
    const root = document.documentElement;
    
    // Set CSS variables
    root.style.setProperty('--theme-primary', this.currentTheme.primaryColor);
    root.style.setProperty('--theme-secondary', this.currentTheme.secondaryColor);
    root.style.setProperty('--theme-background', this.currentTheme.backgroundColor);
    root.style.setProperty('--theme-surface', this.currentTheme.surfaceColor);
    root.style.setProperty('--theme-text', this.currentTheme.textColor);
    root.style.setProperty('--theme-text-secondary', this.currentTheme.textSecondary);
    root.style.setProperty('--theme-accent', this.currentTheme.accentColor);
    root.style.setProperty('--theme-border', this.currentTheme.borderColor);
    root.style.setProperty('--theme-code-bg', this.currentTheme.codeBackground);
    root.style.setProperty('--theme-code-text', this.currentTheme.codeText);
    
    // Also set legacy variables for backward compatibility
    root.style.setProperty('--primary-color', this.currentTheme.primaryColor);
    root.style.setProperty('--secondary-color', this.currentTheme.secondaryColor);
    root.style.setProperty('--background-color', this.currentTheme.backgroundColor);
    root.style.setProperty('--text-color', this.currentTheme.textColor);
    root.style.setProperty('--accent-color', this.currentTheme.accentColor);
  }

  /**
   * Subscribe to theme changes
   * @param observer Callback function to be called when theme changes
   */
  subscribe(observer: (theme: ThemeConfig) => void): void {
    this.observers.push(observer);
  }

  /**
   * Unsubscribe from theme changes
   * @param observer The observer function to remove
   */
  unsubscribe(observer: (theme: ThemeConfig) => void): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * Notify all observers of theme change
   */
  private notifyObservers(): void {
    this.observers.forEach(observer => observer(this.currentTheme));
  }

  /**
   * Initialize theme system and listen for system theme changes
   */
  init(): void {
    this.applyThemeToDocument();
    
    // Listen for system theme changes if using auto theme
    const savedThemeId = readStoredThemeId();
    if (savedThemeId === 'auto' || !savedThemeId) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        const currentThemeId = readStoredThemeId();
        if (currentThemeId === 'auto' || !currentThemeId) {
          this.setTheme('auto');
        }
      });
    }
  }
}
