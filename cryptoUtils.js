import crypto from 'crypto';
import dotenv from 'dotenv';

// Load variables from .env
dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const KEY_LENGTH = 32; // 256 bits

// Validate that the encryption key is set and valid
const hexKey = process.env.ENCRYPTION_KEY;
if (!hexKey || hexKey.length !== KEY_LENGTH * 2) {
  throw new Error(`ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Current length: ${hexKey ? hexKey.length : 0}`);
}
const ENCRYPTION_KEY = Buffer.from(hexKey, 'hex');

// Retrieve the salt for blind indexing
const BLIND_INDEX_SALT = process.env.BLIND_INDEX_SALT;
if (!BLIND_INDEX_SALT) {
  throw new Error('BLIND_INDEX_SALT environment variable is required.');
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * @param {string} text - The plaintext to encrypt.
 * @returns {string} The encrypted representation formatted as "iv:authTag:ciphertext".
 */
export function encrypt(text) {
  if (typeof text !== 'string') {
    throw new TypeError('Plaintext must be a string.');
  }

  // Generate a cryptographically secure random Initialization Vector (IV)
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher instance
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Generate the authentication tag (ensures data integrity)
  const authTag = cipher.getAuthTag();

  // Combine IV, Auth Tag, and Ciphertext using colons as separators
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * @param {string} encryptedText - The encrypted string in format "iv:authTag:ciphertext".
 * @returns {string} The decrypted plaintext.
 */
export function decrypt(encryptedText) {
  if (typeof encryptedText !== 'string') {
    throw new TypeError('Encrypted text must be a string.');
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format. Expected "iv:authTag:ciphertext".');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  // Create decipher instance
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  // Set the authentication tag
  decipher.setAuthTag(authTag);

  // Decrypt the ciphertext
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Computes a deterministic HMAC-SHA256 blind index hash for exact-match searching.
 * To make search case-insensitive, we normalize input by trimming and lowercasing.
 * @param {string} text - The input value (e.g. username or email).
 * @returns {string} The computed blind index hash in hex format.
 */
export function generateBlindIndex(text) {
  if (typeof text !== 'string') {
    return '';
  }
  const normalized = text.trim().toLowerCase();
  return crypto
    .createHmac('sha256', BLIND_INDEX_SALT)
    .update(normalized)
    .digest('hex');
}
