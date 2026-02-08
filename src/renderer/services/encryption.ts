/**
 * Encryption Service
 * Encrypts and decrypts sensitive data using Web Crypto API
 *
 * Supports both direct execution and Web Worker execution for better performance.
 * Use encryptAsync/decryptAsync for non-blocking operations on large data.
 */

import { workerManager } from './workerManager';
import { secureStorageService } from './secureStorage';

class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly KEY_STORAGE = 'app_encryption_key';
  private useWorker = true; // Enable worker by default

  /**
   * Generate or retrieve encryption key
   */
  private async getKey(): Promise<CryptoKey> {
    // Try to get existing key from storage
    const storedKey = await this.getKeyBase64();
    
    if (storedKey) {
      // Import existing key
      const keyData = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0));
      return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: EncryptionService.ALGORITHM },
        false,
        ['encrypt', 'decrypt']
      );
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
      {
        name: EncryptionService.ALGORITHM,
        length: EncryptionService.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );

    // Export and store key
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const keyArray = new Uint8Array(exportedKey);
    const keyBase64 = btoa(String.fromCharCode(...keyArray));
    await secureStorageService.setItem(EncryptionService.KEY_STORAGE, keyBase64);
    localStorage.removeItem(EncryptionService.KEY_STORAGE);

    return key;
  }

  /**
   * Encrypt a string
   */
  async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) return '';

    try {
      const key = await this.getKey();
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(EncryptionService.IV_LENGTH));

      // Encrypt
      const encrypted = await crypto.subtle.encrypt(
        {
          name: EncryptionService.ALGORITHM,
          iv: iv,
        },
        key,
        data
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt a string
   */
  async decrypt(ciphertext: string): Promise<string> {
    if (!ciphertext) return '';

    try {
      const key = await this.getKey();
      
      // Decode from base64
      const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

      // Extract IV and encrypted data
      const iv = combined.slice(0, EncryptionService.IV_LENGTH);
      const encrypted = combined.slice(EncryptionService.IV_LENGTH);

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        {
          name: EncryptionService.ALGORITHM,
          iv: iv,
        },
        key,
        encrypted
      );

      // Convert to string
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Check if encryption is available (Web Crypto API support)
   */
  isAvailable(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.subtle.encrypt === 'function';
  }

  /**
   * Clear encryption key (for secure wipe)
   */
  clearKey(): void {
    void secureStorageService.removeItem(EncryptionService.KEY_STORAGE);
    localStorage.removeItem(EncryptionService.KEY_STORAGE);
  }

  /**
   * Get the current encryption key as base64 (for worker)
   */
  private async getKeyBase64(): Promise<string | null> {
    await secureStorageService.migrateFromLocalStorage(EncryptionService.KEY_STORAGE);
    return secureStorageService.getItem(EncryptionService.KEY_STORAGE);
  }

  /**
   * Set whether to use Web Worker for encryption operations
   */
  setUseWorker(enabled: boolean): void {
    this.useWorker = enabled;
  }

  /**
   * Check if using Web Worker
   */
  isUsingWorker(): boolean {
    return this.useWorker && typeof Worker !== 'undefined';
  }

  /**
   * Encrypt using Web Worker (non-blocking)
   * Falls back to direct encryption if worker unavailable
   */
  async encryptWithWorker(plaintext: string): Promise<string> {
    if (!plaintext) return '';

    // Ensure we have a key
    let keyBase64 = await this.getKeyBase64();
    if (!keyBase64) {
      // Generate key first and persist in secure storage
      await this.getKey();
      keyBase64 = await this.getKeyBase64();
    }

    if (!keyBase64) {
      throw new Error('Failed to get encryption key');
    }

    if (this.isUsingWorker()) {
      try {
        return await workerManager.encrypt(plaintext, keyBase64);
      } catch (error) {
        console.warn('Worker encryption failed, falling back to direct:', error);
        return this.encrypt(plaintext);
      }
    }

    return this.encrypt(plaintext);
  }

  /**
   * Decrypt using Web Worker (non-blocking)
   * Falls back to direct decryption if worker unavailable
   */
  async decryptWithWorker(ciphertext: string): Promise<string> {
    if (!ciphertext) return '';

    const keyBase64 = await this.getKeyBase64();
    if (!keyBase64) {
      throw new Error('No encryption key available');
    }

    if (this.isUsingWorker()) {
      try {
        return await workerManager.decrypt(ciphertext, keyBase64);
      } catch (error) {
        console.warn('Worker decryption failed, falling back to direct:', error);
        return this.decrypt(ciphertext);
      }
    }

    return this.decrypt(ciphertext);
  }

  /**
   * Encrypt multiple items in parallel using worker
   */
  async encryptBatch(items: string[]): Promise<string[]> {
    if (!items.length) return [];

    // Use worker for parallel processing
    if (this.isUsingWorker()) {
      const results = await Promise.all(
        items.map(item => this.encryptWithWorker(item))
      );
      return results;
    }

    // Fallback to sequential
    const results: string[] = [];
    for (const item of items) {
      results.push(await this.encrypt(item));
    }
    return results;
  }

  /**
   * Decrypt multiple items in parallel using worker
   */
  async decryptBatch(items: string[]): Promise<string[]> {
    if (!items.length) return [];

    // Use worker for parallel processing
    if (this.isUsingWorker()) {
      const results = await Promise.all(
        items.map(item => this.decryptWithWorker(item))
      );
      return results;
    }

    // Fallback to sequential
    const results: string[] = [];
    for (const item of items) {
      results.push(await this.decrypt(item));
    }
    return results;
  }
}

export const encryptionService = new EncryptionService();
