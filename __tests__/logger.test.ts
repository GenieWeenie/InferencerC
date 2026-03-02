/**
 * Unit tests for server Logger service (src/server/services/logger.ts).
 * Uses Node environment; fs is mocked to avoid disk I/O.
 */
import fs from 'fs';
import { Logger, LogLevel } from '../src/server/services/logger';

jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

const mockFs = jest.mocked(fs);

describe('Logger', () => {
  let logger: Logger;
  const logFilePath = '/tmp/test-logs/app.log';

  beforeEach(() => {
    jest.clearAllMocks();
    (mockFs.existsSync as jest.Mock).mockReturnValue(false);
    (mockFs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
    (mockFs.appendFileSync as jest.Mock).mockImplementation(() => undefined);
    logger = new Logger(LogLevel.INFO, true, logFilePath, true);
  });

  describe('constructor', () => {
    it('creates log directory when logToFile is true and dir does not exist', () => {
      expect(mockFs.existsSync).toHaveBeenCalledWith('/tmp/test-logs');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/tmp/test-logs', { recursive: true });
    });

    it('does not create directory when logToFile is false', () => {
      mockFs.existsSync.mockClear();
      mockFs.mkdirSync.mockClear();
      new Logger(LogLevel.INFO, false, logFilePath, true);
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('level filtering', () => {
    it('logs info when level is INFO', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('hello');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('"message":"hello"'));
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(logFilePath, expect.stringContaining('hello'));
      spy.mockRestore();
    });

    it('does not log debug when level is INFO', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.debug('hidden');
      expect(spy).not.toHaveBeenCalled();
      expect(mockFs.appendFileSync).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('logs warn and error when level is INFO', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      logger.warn('w');
      logger.error('e');
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(2);
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('setLogLevel', () => {
    it('allows debug after setting DEBUG', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.debug('now visible');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('now visible'));
      spy.mockRestore();
    });
  });

  describe('setEnabled', () => {
    it('stops logging when disabled', () => {
      logger.setEnabled(false);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('should not appear');
      expect(spy).not.toHaveBeenCalled();
      expect(mockFs.appendFileSync).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
