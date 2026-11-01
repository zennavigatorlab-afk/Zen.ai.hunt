import { EncryptedVaultPayload, FullDatabaseDump } from '../types';

/**
 * Real Web Crypto AES-256-GCM implementation with PBKDF2 key derivation.
 * Conforms to zero-knowledge client-side encryption requirements.
 */

// Convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Compute SHA-256 checksum of string or buffer
export async function computeSha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuf = encoder.encode(data);
  const hashBuf = await window.crypto.subtle.digest('SHA-256', dataBuf);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Derive AES-256 key from passphrase and salt
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt full database dump with AES-256-GCM using user passphrase
 */
export async function encryptVault(
  dump: FullDatabaseDump,
  passphrase: string
): Promise<EncryptedVaultPayload> {
  if (!passphrase || passphrase.length < 6) {
    throw new Error('Passphrase must be at least 6 characters');
  }

  const plainJson = JSON.stringify(dump);
  const checksum = await computeSha256(plainJson);

  // Generate 16 bytes salt and 12 bytes IV
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(passphrase, salt);
  const encoder = new TextEncoder();
  const encodedPlain = encoder.encode(plainJson);

  const ciphertextBuf = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    encodedPlain
  );

  return {
    version: 1,
    cipher: 'AES-256-GCM',
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertextBuf),
    checksum,
    createdAt: Date.now(),
    app: 'ZEN AI – DeveloperHut',
  };
}

/**
 * Decrypt vault payload with user passphrase and verify checksum
 */
export async function decryptVault(
  payload: EncryptedVaultPayload,
  passphrase: string
): Promise<FullDatabaseDump> {
  if (payload.cipher !== 'AES-256-GCM') {
    throw new Error(`Unsupported cipher algorithm: ${payload.cipher}`);
  }

  const salt = base64ToBuffer(payload.salt);
  const iv = base64ToBuffer(payload.iv);
  const ciphertext = base64ToBuffer(payload.ciphertext);

  const key = await deriveKey(passphrase, salt);

  let decryptedBuf: ArrayBuffer;
  try {
    decryptedBuf = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
      },
      key,
      ciphertext as unknown as BufferSource
    );
  } catch {
    throw new Error('Decryption failed: Incorrect passphrase or corrupted vault file');
  }

  const decoder = new TextDecoder();
  const plainJson = decoder.decode(decryptedBuf);

  // Integrity Check
  const calculatedChecksum = await computeSha256(plainJson);
  if (calculatedChecksum !== payload.checksum) {
    throw new Error('Vault integrity violation: SHA-256 checksum mismatch');
  }

  const dump: FullDatabaseDump = JSON.parse(plainJson);
  return dump;
}
