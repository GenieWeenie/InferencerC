/**
 * Keyboard shortcut definition
 */
export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Cmd on Mac, Windows key on Windows
  handler: (event: KeyboardEvent) => void;
  description?: string;
}

interface ThemeState {
  type?: 'light' | 'dark' | string;
}

interface ThemeService {
  getCurrentTheme: () => ThemeState;
  setTheme: (theme: 'light' | 'dark') => void;
}

/**
 * Keyboard shortcut service for managing application shortcuts
 */
export class KeyboardShortcutService {
  private static instance: KeyboardShortcutService;
  private shortcuts: Map<string, Shortcut> = new Map();
  private enabled: boolean = true;

  /**
   * Get singleton instance of KeyboardShortcutService
   */
  static getInstance(): KeyboardShortcutService {
    if (!KeyboardShortcutService.instance) {
      KeyboardShortcutService.instance = new KeyboardShortcutService();
    }
    return KeyboardShortcutService.instance;
  }

  private constructor() {
    this.init();
  }

  /**
   * Initialize the keyboard shortcut service
   */
  private init(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Generate a unique key for a shortcut combination
   */
  private generateKey(key: string, ctrl: boolean = false, shift: boolean = false, alt: boolean = false, meta: boolean = false): string {
    return `${ctrl ? 'Ctrl+' : ''}${shift ? 'Shift+' : ''}${alt ? 'Alt+' : ''}${meta ? 'Meta+' : ''}${key}`;
  }

  /**
   * Register a new keyboard shortcut
   * @param shortcut The shortcut to register
   */
  register(shortcut: Shortcut): void {
    const key = this.generateKey(shortcut.key, shortcut.ctrl, shortcut.shift, shortcut.alt, shortcut.meta);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   * @param key The key combination to unregister
   */
  unregister(key: string, ctrl: boolean = false, shift: boolean = false, alt: boolean = false, meta: boolean = false): void {
    const generatedKey = this.generateKey(key, ctrl, shift, alt, meta);
    this.shortcuts.delete(generatedKey);
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    const key = event.key.toLowerCase();
    const shortcutKey = this.generateKey(
      key,
      event.ctrlKey || event.metaKey, // Treat Cmd/Meta as Ctrl
      event.shiftKey,
      event.altKey,
      event.metaKey
    );

    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      event.preventDefault();
      shortcut.handler(event);
    }
  }

  /**
   * Enable keyboard shortcuts
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable keyboard shortcuts
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Add common application shortcuts
   */
  addCommonShortcuts(): void {
    // Add common shortcuts for the application
    this.register({
      key: 'Enter',
      ctrl: true,
      handler: () => {
        // Submit current form/chat message
        const submitButton = document.querySelector('button[type="submit"], button.submit-btn') as HTMLButtonElement;
        if (submitButton) {
          submitButton.click();
        }
      },
      description: 'Submit current form or message'
    });

    this.register({
      key: 'k',
      ctrl: true,
      handler: () => {
        // Focus on search/input field
        const searchInput = document.querySelector('input[type="text"], textarea, [contenteditable="true"]') as HTMLElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: 'Focus on search or input field'
    });

    this.register({
      key: 't',
      ctrl: true,
      handler: () => {
        // Toggle theme
        const themedWindow = window as Window & { themeService?: ThemeService };
        const themeService = themedWindow.themeService;
        if (themeService) {
          const currentTheme = themeService.getCurrentTheme();
          const newTheme = currentTheme.type === 'dark' ? 'light' : 'dark';
          themeService.setTheme(newTheme);
        }
      },
      description: 'Toggle between light and dark theme'
    });

    this.register({
      key: 'Escape',
      handler: () => {
        // Close modals or clear selection
        const activeModal = document.querySelector('.modal.show, .dialog.active');
        if (activeModal) {
          (activeModal as HTMLElement).classList.remove('show', 'active');
        }
      },
      description: 'Close modal or clear selection'
    });

    this.register({
      key: 'ArrowUp',
      ctrl: true,
      handler: () => {
        // Navigate to previous chat message
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
          chatContainer.scrollTop -= 100; // Scroll up by 100px
        }
      },
      description: 'Scroll chat up'
    });

    this.register({
      key: 'ArrowDown',
      ctrl: true,
      handler: () => {
        // Navigate to next chat message
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
          chatContainer.scrollTop += 100; // Scroll down by 100px
        }
      },
      description: 'Scroll chat down'
    });
  }
}
