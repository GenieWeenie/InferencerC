/**
 * Encryption Web Worker
 *
 * Handles AES-GCM encryption/decryption operations off the main thread.
 * Communicates via postMessage for async operations.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

interface EncryptionRequest {
    type: 'encrypt' | 'decrypt' | 'generateKey';
    id: string;
    data?: string;
    keyBase64?: string;
}

interface EncryptionResponse {
    type: 'encrypt' | 'decrypt' | 'generateKey';
    id: string;
    success: boolean;
    result?: string;
    error?: string;
}

let cachedKey: CryptoKey | null = null;
let cachedKeyBase64: string | null = null;

/**
 * Import encryption key from base64 string
 */
async function importKey(keyBase64: string): Promise<CryptoKey> {
    if (cachedKey && cachedKeyBase64 === keyBase64) {
        return cachedKey;
    }

    const keyData = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: ALGORITHM },
        false,
        ['encrypt', 'decrypt']
    );

    cachedKey = key;
    cachedKeyBase64 = keyBase64;
    return key;
}

/**
 * Generate a new encryption key
 */
async function generateKey(): Promise<string> {
    const key = await crypto.subtle.generateKey(
        {
            name: ALGORITHM,
            length: KEY_LENGTH,
        },
        true,
        ['encrypt', 'decrypt']
    );

    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const keyArray = new Uint8Array(exportedKey);
    return btoa(String.fromCharCode(...keyArray));
}

/**
 * Encrypt plaintext string
 */
async function encrypt(plaintext: string, keyBase64: string): Promise<string> {
    if (!plaintext) return '';

    const key = await importKey(keyBase64);
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
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
}

/**
 * Decrypt ciphertext string
 */
async function decrypt(ciphertext: string, keyBase64: string): Promise<string> {
    if (!ciphertext) return '';

    const key = await importKey(keyBase64);

    // Decode from base64
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
        {
            name: ALGORITHM,
            iv: iv,
        },
        key,
        encrypted
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

// Message handler
self.onmessage = async (event: MessageEvent<EncryptionRequest>) => {
    const { type, id, data, keyBase64 } = event.data;

    const response: EncryptionResponse = {
        type,
        id,
        success: false,
    };

    try {
        switch (type) {
            case 'generateKey':
                response.result = await generateKey();
                response.success = true;
                break;

            case 'encrypt':
                if (!data || !keyBase64) {
                    throw new Error('Missing data or key for encryption');
                }
                response.result = await encrypt(data, keyBase64);
                response.success = true;
                break;

            case 'decrypt':
                if (!data || !keyBase64) {
                    throw new Error('Missing data or key for decryption');
                }
                response.result = await decrypt(data, keyBase64);
                response.success = true;
                break;

            default:
                throw new Error(`Unknown operation type: ${type}`);
        }
    } catch (error) {
        response.error = error instanceof Error ? error.message : 'Unknown error';
    }

    self.postMessage(response);
};

// Indicate worker is ready
self.postMessage({ type: 'ready', id: 'init', success: true });
