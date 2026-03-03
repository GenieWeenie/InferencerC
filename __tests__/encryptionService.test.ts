/** @jest-environment jsdom */

/**
 * Polyfill Web Crypto for jsdom (jsdom does not provide crypto.subtle).
 * Node 18+ has globalThis.crypto.subtle when using node env, but we use jsdom.
 */
import { webcrypto } from 'crypto';

const cryptoImpl = webcrypto as unknown as Crypto;
(globalThis as unknown as { crypto: Crypto }).crypto = cryptoImpl;
if (typeof (globalThis as unknown as { window?: Window }).window !== 'undefined') {
  (globalThis as unknown as { window: { crypto: Crypto } }).window.crypto = cryptoImpl;
}

const mockWorkerManagerEncrypt = jest.fn();
const mockWorkerManagerDecrypt = jest.fn();

jest.mock('../src/renderer/services/workerManager', () => ({
  workerManager: {
    encrypt: (...args: unknown[]) => mockWorkerManagerEncrypt(...args),
    decrypt: (...args: unknown[]) => mockWorkerManagerDecrypt(...args),
  },
}));

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockMigrateFromLocalStorage = jest.fn();

jest.mock('../src/renderer/services/secureStorage', () => ({
  secureStorageService: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
    removeItem: (...args: unknown[]) => mockRemoveItem(...args),
    migrateFromLocalStorage: (...args: unknown[]) => mockMigrateFromLocalStorage(...args),
  },
}));

const KEY_STORAGE = 'app_encryption_key';

describe('EncryptionService', () => {
  let encryptionService: {
    encrypt: (plaintext: string) => Promise<string>;
    decrypt: (ciphertext: string) => Promise<string>;
    isAvailable: () => boolean;
    clearKey: () => void;
    setUseWorker: (enabled: boolean) => void;
    isUsingWorker: () => boolean;
    encryptWithWorker: (plaintext: string) => Promise<string>;
    decryptWithWorker: (ciphertext: string) => Promise<string>;
    encryptBatch: (items: string[]) => Promise<string[]>;
    decryptBatch: (items: string[]) => Promise<string[]>;
  };

  beforeEach(async () => {
    jest.resetModules();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(true);
    mockRemoveItem.mockResolvedValue(undefined);
    mockMigrateFromLocalStorage.mockResolvedValue(undefined);
    mockWorkerManagerEncrypt.mockReset();
    mockWorkerManagerDecrypt.mockReset();

    const { encryptionService: service } = await import(
      '../src/renderer/services/encryption'
    );
    encryptionService = service;
  });

  describe('encrypt', () => {
    it('returns empty string for empty input', async () => {
      expect(await encryptionService.encrypt('')).toBe('');
    });
  });

  describe('decrypt', () => {
    it('returns empty string for empty input', async () => {
      expect(await encryptionService.decrypt('')).toBe('');
    });
  });

  describe('isAvailable', () => {
    it('returns boolean based on crypto.subtle presence', () => {
      const result = encryptionService.isAvailable();
      expect(typeof result).toBe('boolean');
      expect(result).toBe(!!(typeof crypto !== 'undefined' && crypto.subtle));
    });
  });

  describe('clearKey', () => {
    it('calls secureStorageService.removeItem and localStorage.removeItem', () => {
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

      encryptionService.clearKey();

      expect(mockRemoveItem).toHaveBeenCalledWith(KEY_STORAGE);
      expect(removeItemSpy).toHaveBeenCalledWith(KEY_STORAGE);

      removeItemSpy.mockRestore();
    });
  });

  describe('setUseWorker / isUsingWorker', () => {
    it('setUseWorker(false) / isUsingWorker() returns false', () => {
      encryptionService.setUseWorker(false);
      expect(encryptionService.isUsingWorker()).toBe(false);
    });

    it('setUseWorker(true) / isUsingWorker() returns true when Worker is defined', () => {
      encryptionService.setUseWorker(true);
      expect(encryptionService.isUsingWorker()).toBe(typeof Worker !== 'undefined');
    });
  });

  describe('encryptBatch', () => {
    it('returns empty array for empty input', async () => {
      expect(await encryptionService.encryptBatch([])).toEqual([]);
    });
  });

  describe('decryptBatch', () => {
    it('returns empty array for empty input', async () => {
      expect(await encryptionService.decryptBatch([])).toEqual([]);
    });
  });

  describe('encrypt/decrypt round-trip', () => {
    it('encrypt then decrypt gives back original when Web Crypto is available', async () => {
      if (!encryptionService.isAvailable()) {
        return;
      }
      const plaintext = 'hello world';
      const ciphertext = await encryptionService.encrypt(plaintext);
      expect(ciphertext).toBeTruthy();
      expect(ciphertext).not.toBe(plaintext);

      const decrypted = await encryptionService.decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });
  });
});
