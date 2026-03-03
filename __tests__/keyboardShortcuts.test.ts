/** @jest-environment jsdom */

import type { Shortcut } from '../src/renderer/services/keyboard-shortcuts';

describe('KeyboardShortcutService', () => {
  let KeyboardShortcutService: typeof import('../src/renderer/services/keyboard-shortcuts').KeyboardShortcutService;

  beforeEach(() => {
    jest.resetModules();
    const mod = require('../src/renderer/services/keyboard-shortcuts');
    KeyboardShortcutService = mod.KeyboardShortcutService;
    const service = KeyboardShortcutService.getInstance();
    service.getShortcuts().forEach((s: Shortcut) => {
      service.unregister(s.key, s.ctrl ?? false, s.shift ?? false, s.alt ?? false, s.meta ?? false);
    });
    service.enable();
  });

  describe('register and getShortcuts', () => {
    it('register adds shortcut, getShortcuts returns it', () => {
      const service = KeyboardShortcutService.getInstance();
      const handler = jest.fn();
      service.register({
        key: 'k',
        ctrl: true,
        handler,
        description: 'Test shortcut',
      });
      const shortcuts = service.getShortcuts();
      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0]?.key).toBe('k');
      expect(shortcuts[0]?.ctrl).toBe(true);
      expect(shortcuts[0]?.description).toBe('Test shortcut');
    });

    it('getShortcuts returns multiple registered shortcuts', () => {
      const service = KeyboardShortcutService.getInstance();
      service.register({ key: 'a', ctrl: true, handler: () => {} });
      service.register({ key: 'b', shift: true, handler: () => {} });
      expect(service.getShortcuts()).toHaveLength(2);
    });
  });

  describe('unregister', () => {
    it('unregister removes shortcut', () => {
      const service = KeyboardShortcutService.getInstance();
      service.register({ key: 'k', ctrl: true, handler: () => {} });
      expect(service.getShortcuts()).toHaveLength(1);
      service.unregister('k', true, false, false, false);
      expect(service.getShortcuts()).toHaveLength(0);
    });

    it('unregister with shift removes Ctrl+Shift shortcut', () => {
      const service = KeyboardShortcutService.getInstance();
      service.register({ key: 'k', ctrl: true, shift: true, handler: () => {} });
      service.unregister('k', true, true, false, false);
      expect(service.getShortcuts()).toHaveLength(0);
    });
  });

  describe('handleKeyDown (via keydown dispatch)', () => {
    it('calls handler when matching keydown is dispatched', () => {
      const service = KeyboardShortcutService.getInstance();
      const handler = jest.fn();
      service.register({ key: 'k', ctrl: true, handler });

      const ev = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
      document.dispatchEvent(ev);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(ev);
    });

    it('does not call handler when key does not match', () => {
      const service = KeyboardShortcutService.getInstance();
      const handler = jest.fn();
      service.register({ key: 'k', ctrl: true, handler });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', ctrlKey: true, bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not call handler when modifiers do not match', () => {
      const service = KeyboardShortcutService.getInstance();
      const handler = jest.fn();
      service.register({ key: 'k', ctrl: true, shift: true, handler });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'K', ctrlKey: true, bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('calls handler when Ctrl+Shift+K matches', () => {
      const service = KeyboardShortcutService.getInstance();
      const handler = jest.fn();
      service.register({ key: 'k', ctrl: true, shift: true, handler });

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'K', ctrlKey: true, shiftKey: true, bubbles: true })
      );

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('treats meta (Cmd) as ctrl for matching', () => {
      const service = KeyboardShortcutService.getInstance();
      const handler = jest.fn();
      service.register({ key: 'k', ctrl: true, handler });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('enable / disable / isEnabled', () => {
    it('disable prevents handler from being called', () => {
      const service = KeyboardShortcutService.getInstance();
      const handler = jest.fn();
      service.register({ key: 'k', ctrl: true, handler });
      service.disable();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('enable restores shortcut processing after disable', () => {
      const service = KeyboardShortcutService.getInstance();
      const handler = jest.fn();
      service.register({ key: 'k', ctrl: true, handler });
      service.disable();
      service.enable();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('isEnabled returns true when enabled', () => {
      const service = KeyboardShortcutService.getInstance();
      service.enable();
      expect(service.isEnabled()).toBe(true);
    });

    it('isEnabled returns false when disabled', () => {
      const service = KeyboardShortcutService.getInstance();
      service.disable();
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('formatShortcut', () => {
    it('formats Ctrl+Shift+K correctly', () => {
      const service = KeyboardShortcutService.getInstance();
      const formatted = service.formatShortcut({
        key: 'k',
        ctrl: true,
        shift: true,
        handler: () => {},
      });
      expect(formatted).toBe('Ctrl+Shift+K');
    });

    it('formats Cmd+K with meta as Meta+K', () => {
      const service = KeyboardShortcutService.getInstance();
      const formatted = service.formatShortcut({
        key: 'k',
        meta: true,
        handler: () => {},
      });
      expect(formatted).toBe('Meta+K');
    });

    it('formats plain key without modifiers', () => {
      const service = KeyboardShortcutService.getInstance();
      const formatted = service.formatShortcut({
        key: 'Escape',
        handler: () => {},
      });
      expect(formatted).toBe('Escape');
    });
  });

  describe('addCommonShortcuts', () => {
    it('registers expected shortcuts including Ctrl+K and Ctrl+Enter', () => {
      const service = KeyboardShortcutService.getInstance();
      service.addCommonShortcuts();
      const shortcuts = service.getShortcuts();
      const keys = shortcuts.map((s) => {
        const parts: string[] = [];
        if (s.ctrl) parts.push('Ctrl');
        if (s.shift) parts.push('Shift');
        parts.push(s.key);
        return parts.join('+');
      });
      expect(keys).toContain('Ctrl+k');
      expect(keys).toContain('Ctrl+Enter');
      expect(keys).toContain('Escape');
    });

    it('registers Ctrl+T for theme toggle', () => {
      const service = KeyboardShortcutService.getInstance();
      service.addCommonShortcuts();
      const shortcuts = service.getShortcuts();
      const themeShortcut = shortcuts.find((s) => s.key === 't' && s.ctrl);
      expect(themeShortcut).toBeDefined();
      expect(themeShortcut?.description).toContain('theme');
    });
  });
});
