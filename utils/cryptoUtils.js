import crypto from 'crypto';
import dotenv from 'dotenv';

// load variables from .env
dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // standard vector length for gcm
const KEY_LENGTH = 32; // 256 bits

// validate that the encryption key is set and valid
const hexKey = process.env.ENCRYPTION_KEY;

// if the key is not set or not a valid 64-character hex string, throw an error
if (!hexKey || hexKey.length !== KEY_LENGTH * 2) {
    throw new Error(`ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Current length: ${hexKey ? hexKey.length : 0}`);
}
const ENCRYPTION_KEY = Buffer.from(hexKey, 'hex');

// retrieve the salt for blind indexing
const BLIND_INDEX_SALT = process.env.BLIND_INDEX_SALT;
if (!BLIND_INDEX_SALT) {
    throw new Error('BLIND_INDEX_SALT environment variable is required.');
}

/**
 * encrypts plaintext using aes-256-gcm.
 * @param {string} text - the plaintext to encrypt.
 * @returns {string} the encrypted text formatted as "iv:authTag:ciphertext".
 */
export function encrypt(text) {

    // if its not valid string, throw an error
    if (typeof text !== 'string') {
        throw new TypeError('plaintext must be a string.');
    }

    // generate a secure random initialization vector (iv)
    const iv = crypto.randomBytes(IV_LENGTH);

    // create cipher instance
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    // encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // generate the authentication tag (ensures data integrity)
    const authTag = cipher.getAuthTag();

    // combine iv, auth tag, and ciphertext using colons as separators
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * decrypts the aes-256-gcm encrypted string.
 * @param {string} encryptedText - the encrypted text formatted as "iv:authTag:ciphertext".
 * @returns {string} the decrypted plaintext.
 */
export function decrypt(encryptedText) {
    // if the input is not a string, throw an error
    if (typeof encryptedText !== 'string') {
        throw new TypeError('encrypted text must be a string.');
    }

    const parts = encryptedText.split(':');

    // if the encrypted text does not have exactly three parts, throw an error
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format. Expected "iv:authTag:ciphertext".');
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    // create decipher instance
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    // set the authentication tag
    decipher.setAuthTag(authTag);

    // decrypt the ciphertext
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * computes a hmac-sha256 blind index hash for exact-match searching.
 * to make search case-insensitive, we trim and lowercase the text.
 * @param {string} text - the input (username or email).
 * @returns {string} the index hash in hex format.
 */
export function generateBlindIndex(text) {

    // if the input is not a string, return an empty string
    if (typeof text !== 'string') {
        return '';
    }
    const normalized = text.trim().toLowerCase();
    return crypto
        .createHmac('sha256', BLIND_INDEX_SALT)
        .update(normalized)
        .digest('hex');
}