import crypto from 'crypto';

/**
 * Server-Side AES-256-GCM Encryption Service
 * Used to securely encrypt and decrypt sensitive Payment Gateway Merchant credentials
 * (bKash App Secret, Nagad Private Key, SSLCommerz Password, etc.)
 * 
 * Never exposes plaintext keys to the frontend, network responses, or client bundle.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

// Generate or derive a consistent 32-byte (256-bit) encryption key
function getMasterKey(): Buffer {
  const envSecret = process.env.PAYMENT_CONFIG_ENCRYPTION_KEY || process.env.APP_SECRET || 'house-of-mahi-internal-crypt-vault-2026-master-key';
  // Use SHA-256 to ensure exact 32 bytes key length
  return crypto.createHash('sha256').update(envSecret).digest();
}

export interface EncryptedPayload {
  iv: string;         // Base64 encoded Initialization Vector
  ciphertext: string; // Base64 encoded encrypted data
  tag: string;        // Base64 encoded Authentication Tag
  version: number;    // Key versioning for future rotation
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext || typeof plaintext !== 'string') {
    return '';
  }

  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const tag = cipher.getAuthTag().toString('base64');

  const payload: EncryptedPayload = {
    iv: iv.toString('base64'),
    ciphertext: encrypted,
    tag: tag,
    version: 1
  };

  return JSON.stringify(payload);
}

/**
 * Decrypt an AES-256-GCM encrypted payload back to plaintext
 */
export function decryptSecret(encryptedPayloadString: string): string {
  if (!encryptedPayloadString || typeof encryptedPayloadString !== 'string') {
    return '';
  }

  try {
    const payload: EncryptedPayload = JSON.parse(encryptedPayloadString);
    if (!payload.iv || !payload.ciphertext || !payload.tag) {
      return '';
    }

    const key = getMasterKey();
    const iv = Buffer.from(payload.iv, 'base64');
    const authTag = Buffer.from(payload.tag, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed for secret:', error);
    return '';
  }
}

/**
 * Helper to mask sensitive strings for secure Admin Panel viewing
 * e.g., "123456789" -> "•••• ••••"
 */
export function maskSecretValue(value: string | undefined | null): string {
  if (!value || value.trim().length === 0) {
    return '';
  }
  return '••••••••••••';
}
