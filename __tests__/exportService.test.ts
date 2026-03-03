/** @jest-environment jsdom */

import { ExportService } from '../src/renderer/lib/exportService';
import type { ChatMessage } from '../src/shared/types';
import { pluginSystemService } from '../src/renderer/services/pluginSystem';

jest.mock('../src/renderer/services/workerManager', () => ({
  workerManager: { export: jest.fn() },
}));
jest.mock('../src/renderer/services/pluginSystem', () => ({
  pluginSystemService: {
    isRegisteredExportFormat: jest.fn().mockReturnValue(false),
    getRegisteredExportFormats: jest.fn().mockReturnValue([]),
    exportWithRegisteredFormat: jest.fn(),
  },
}));
jest.mock('../src/renderer/lib/conversationTree');

async function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

const mockMessages: ChatMessage[] = [
  { role: 'user', content: 'Hello', generationTime: 100 },
  { role: 'assistant', content: 'Hi there!', generationTime: 250 },
];

describe('ExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pluginSystemService.isRegisteredExportFormat as jest.Mock).mockReturnValue(false);
    (pluginSystemService.getRegisteredExportFormats as jest.Mock).mockReturnValue([]);
    URL.createObjectURL = jest.fn().mockReturnValue('blob:test');
    URL.revokeObjectURL = jest.fn();
    const origCreateElement = document.createElement.bind(document);
    document.createElement = ((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        el.click = jest.fn();
      }
      return el;
    }) as typeof document.createElement;
  });

  describe('canUseWorker', () => {
    it('returns true for html format', () => {
      expect(ExportService.canUseWorker('html')).toBe(true);
    });
    it('returns true for markdown format', () => {
      expect(ExportService.canUseWorker('markdown')).toBe(true);
    });
    it('returns true for json format', () => {
      expect(ExportService.canUseWorker('json')).toBe(true);
    });
    it('returns false for pdf format', () => {
      expect(ExportService.canUseWorker('pdf')).toBe(false);
    });
    it('returns false for docx format', () => {
      expect(ExportService.canUseWorker('docx')).toBe(false);
    });
  });

  describe('estimateFileSize', () => {
    it('returns positive number for html format', () => {
      const size = ExportService.estimateFileSize(mockMessages, 'html');
      expect(size).toBeGreaterThan(0);
    });
    it('returns positive number for markdown format', () => {
      const size = ExportService.estimateFileSize(mockMessages, 'markdown');
      expect(size).toBeGreaterThan(0);
    });
    it('returns positive number for json format', () => {
      const size = ExportService.estimateFileSize(mockMessages, 'json');
      expect(size).toBeGreaterThan(0);
    });
    it('returns positive number for pdf format', () => {
      const size = ExportService.estimateFileSize(mockMessages, 'pdf');
      expect(size).toBeGreaterThan(0);
    });
    it('returns positive number for docx format', () => {
      const size = ExportService.estimateFileSize(mockMessages, 'docx');
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('exportConversation', () => {
    describe('markdown format', () => {
      it('succeeds with correct filename pattern and blob', async () => {
        const result = await ExportService.exportConversation(mockMessages, {
          format: 'markdown',
          useWorker: false,
        });
        expect(result.success).toBe(true);
        expect(result.fileName).toMatch(/^Conversation_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.markdown$/);
        expect(result.blob).toBeDefined();
        expect(result.blob?.type).toContain('markdown');
        const text = await readBlobAsText(result.blob!);
        expect(text).toContain('# Conversation');
        expect(text).toContain('Hello');
        expect(text).toContain('Hi there!');
      });
    });

    describe('json format', () => {
      it('includes metadata when requested', async () => {
        const result = await ExportService.exportConversation(mockMessages, {
          format: 'json',
          title: 'My Chat',
          includeMetadata: true,
          useWorker: false,
        });
        expect(result.success).toBe(true);
        const text = await readBlobAsText(result.blob!);
        const data = JSON.parse(text);
        expect(data.metadata).toBeDefined();
        expect(data.metadata.title).toBe('My Chat');
        expect(data.metadata.messageCount).toBe(2);
        expect(data.metadata.exportedAt).toBeDefined();
        expect(data.messages).toHaveLength(2);
      });
    });

    describe('html format', () => {
      it('includes messages in output', async () => {
        const result = await ExportService.exportConversation(mockMessages, {
          format: 'html',
          useWorker: false,
        });
        expect(result.success).toBe(true);
        const text = await readBlobAsText(result.blob!);
        expect(text).toContain('Hello');
        expect(text).toContain('Hi there!');
        expect(text).toContain('<!DOCTYPE html>');
      });
    });

    describe('includeTimestamps', () => {
      it('includes timestamps in markdown when requested', async () => {
        const result = await ExportService.exportConversation(mockMessages, {
          format: 'markdown',
          includeTimestamps: true,
          useWorker: false,
        });
        expect(result.success).toBe(true);
        const text = await readBlobAsText(result.blob!);
        expect(text).toContain('100ms');
        expect(text).toContain('250ms');
      });
    });

    describe('error handling', () => {
      it('catches exceptions and returns error result', async () => {
        (pluginSystemService.isRegisteredExportFormat as jest.Mock).mockReturnValue(true);
        (pluginSystemService.exportWithRegisteredFormat as jest.Mock).mockRejectedValue(
          new Error('Plugin export failed')
        );
        const result = await ExportService.exportConversation(mockMessages, {
          format: 'plugin:test',
          useWorker: false,
        });
        expect(result.success).toBe(false);
        expect(result.error).toBe('Plugin export failed');
      });

      it('handles unsupported format gracefully', async () => {
        const result = await ExportService.exportConversation(mockMessages, {
          format: 'unsupported' as 'json',
          useWorker: false,
        });
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });
});
