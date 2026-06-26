import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt, generateBlindIndex } from './cryptoUtils.js';

const userSchema = new mongoose.Schema({
  // The encrypted username (IV + tag + ciphertext)
  usernameEncrypted: {
    type: String,
    required: true
  },
  // The deterministic hash of the username, used for querying and ensuring uniqueness
  usernameHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // The encrypted email (IV + tag + ciphertext)
  emailEncrypted: {
    type: String,
    required: true
  },
  // The deterministic hash of the email, used for querying and indexing
  emailHash: {
    type: String,
    required: true,
    index: true
  },
  // The bcrypt hashed password (one-way, cannot be decrypted)
  password: {
    type: String,
    required: true
  }
}, {
  // Automatically include virtuals when converting documents to JSON or Objects
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true // adds createdAt and updatedAt fields
});

// --- Virtual Properties (Getter/Setter) ---

// Username virtual field
userSchema.virtual('username')
  .get(function() {
    if (!this.usernameEncrypted) return '';
    try {
      return decrypt(this.usernameEncrypted);
    } catch (err) {
      console.error('Error decrypting username:', err.message);
      return '[Decryption Error]';
    }
  })
  .set(function(plaintextUsername) {
    if (plaintextUsername) {
      this.usernameEncrypted = encrypt(plaintextUsername);
      this.usernameHash = generateBlindIndex(plaintextUsername);
    }
  });

// Email virtual field
userSchema.virtual('email')
  .get(function() {
    if (!this.emailEncrypted) return '';
    try {
      return decrypt(this.emailEncrypted);
    } catch (err) {
      console.error('Error decrypting email:', err.message);
      return '[Decryption Error]';
    }
  })
  .set(function(plaintextEmail) {
    if (plaintextEmail) {
      this.emailEncrypted = encrypt(plaintextEmail);
      this.emailHash = generateBlindIndex(plaintextEmail);
    }
  });

// --- Pre-Save Hook ---
// Hashing the password using bcrypt before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// --- Static Methods ---

/**
 * Finds a single user by their plaintext username.
 * @param {string} username - Plaintext username.
 * @returns {Promise<Document|null>} The Mongoose document or null.
 */
userSchema.statics.findByUsername = function(username) {
  const hash = generateBlindIndex(username);
  return this.findOne({ usernameHash: hash });
};

/**
 * Finds a single user by their plaintext email.
 * @param {string} email - Plaintext email address.
 * @returns {Promise<Document|null>} The Mongoose document or null.
 */
userSchema.statics.findByEmail = function(email) {
  const hash = generateBlindIndex(email);
  return this.findOne({ emailHash: hash });
};

// --- Instance Methods ---

/**
 * Verifies if a plaintext password matches the hashed password.
 * @param {string} candidatePassword - Plaintext password to test.
 * @returns {Promise<boolean>} True if it matches, false otherwise.
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
