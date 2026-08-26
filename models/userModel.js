import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt, generateBlindIndex } from '../utils/cryptoUtils.js';

const userSchema = new mongoose.Schema({
    // the encrypted username (iv:tag:ciphertext)
    usernameEncrypted: {
        type: String,
        required: true
    },
    // the hash of the username, used for querying and uniqueness
    usernameHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // the encrypted email (iv:tag:ciphertext)
    emailEncrypted: {
        type: String,
        required: true
    },
    // the hash of the email, used for querying and indexing
    emailHash: {
        type: String,
        required: true,
        index: true
    },
    // the hashed password (one-way, cannot be decrypted)
    password: {
        type: String,
        required: true
    },
    // the encrypted birthday (iv:tag:ciphertext)
    birthdayEncrypted: {
        type: String,
        required: true
    },
    // the encrypted recovery question
    recoveryQuestionEncrypted: {
        type: String,
        required: true
    },
    // the encrypted recovery answer
    recoveryAnswerEncrypted: {
        type: String,
        required: true
    },
    // optional profile bio
    bio: {
        type: String,
        default: ''
    },

    // optional city of residence
    city: {
        type: String,
        default: ''
    },

    // optional profile picture URL or path
    profilePicture: {
        type: String,
        default: ''
    },

    // list of friends (usernames)
    friends: [{
        type: String
    }],

    // list of pending friend requests (usernames)
    friendRequests: [{
        type: String
    }],

    // list of groups the user manages (references to Group model)
    managedGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }],

    // list of groups the user has joined (references to Group model)
    joinedGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }]
}, {
  // automatically include virtuals when converting documents to JSON or Objects
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true // adds createdAt and updatedAt fields
});

// --- Virtual properties (Getter/Setter) ---

// username virtual field
userSchema.virtual('username')
  .get(function () {
    if (!this.usernameEncrypted) return '';
    try {
      return decrypt(this.usernameEncrypted);
    } catch (err) {
      console.error('Error decrypting username:', err.message);
      return '[Decryption Error]';
    }
  })
  .set(function (plaintextUsername) {
    if (plaintextUsername) {
      const normalized = plaintextUsername.toLowerCase().trim();
      this.usernameEncrypted = encrypt(normalized);
      this.usernameHash = generateBlindIndex(normalized);
    }
  });

// email virtual field
userSchema.virtual('email')
  .get(function () {
    if (!this.emailEncrypted) return '';
    try {
      return decrypt(this.emailEncrypted);
    } catch (err) {
      console.error('Error decrypting email:', err.message);
      return '[Decryption Error]';
    }
  })
  .set(function (plaintextEmail) {
    if (plaintextEmail) {
      const normalized = plaintextEmail.toLowerCase().trim();
      this.emailEncrypted = encrypt(normalized);
      this.emailHash = generateBlindIndex(normalized);
    }
  });

// birthday virtual field
userSchema.virtual('birthday')
  .get(function () {
    if (!this.birthdayEncrypted) return '';
    try {
      return decrypt(this.birthdayEncrypted);
    } catch (err) {
      console.error('Error decrypting birthday:', err.message);
      return '[Decryption Error]';
    }
  })
  .set(function (plaintextBirthday) {
    if (plaintextBirthday) {
      // if it's a date object, convert to string yyyy-mm-dd
      const dateStr = typeof plaintextBirthday === 'string'
        ? plaintextBirthday
        : new Date(plaintextBirthday).toISOString().split('T')[0];
      this.birthdayEncrypted = encrypt(dateStr);
    }
  });

// recovery answer virtual field
userSchema.virtual('recoveryAnswer')
  .get(function () {
    if (!this.recoveryAnswerEncrypted) return '';
    try {
      return decrypt(this.recoveryAnswerEncrypted);
    } catch (err) {
      console.error('Error decrypting recovery answer:', err.message);
      return '[Decryption Error]';
    }
  })
  .set(function (plaintextAnswer) {
    if (plaintextAnswer) {
      // trim and lowercase to make checks case/space-insensitive
      const normalized = plaintextAnswer.trim().toLowerCase();
      this.recoveryAnswerEncrypted = encrypt(normalized);
    }
  });

// recovery question virtual field
userSchema.virtual('recoveryQuestion')
  .get(function () {
    if (!this.recoveryQuestionEncrypted) return '';
    try {
      return decrypt(this.recoveryQuestionEncrypted);
    } catch (err) {
      console.error('Error decrypting recovery question:', err.message);
      return '[Decryption Error]';
    }
  })
  .set(function (plaintextQuestion) {
    if (plaintextQuestion) {
      this.recoveryQuestionEncrypted = encrypt(plaintextQuestion);
    }
  });

// --- pre save hook ---
// hashing the password before saving
userSchema.pre('save', async function (next) {
  // only hash the password if it has been modified (or is new)
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

// --- static methods ---

/**
 * finds a single user by their plaintext username.
 * @param {string} username - plaintext username.
 * @returns {Promise<Document|null>} the mongoose document or null.
 */
userSchema.statics.findByUsername = function (username) {
  if (!username) return null;
  const hash = generateBlindIndex(username.toLowerCase().trim());
  return this.findOne({ usernameHash: hash });
};

/**
 * finds a single user by their plaintext email.
 * @param {string} email - plaintext email address.
 * @returns {Promise<Document|null>} the mongoose document or null.
 */
userSchema.statics.findByEmail = function (email) {
  if (!email) return null;
  const hash = generateBlindIndex(email.toLowerCase().trim());
  return this.findOne({ emailHash: hash });
};

// --- instance methods ---

/**
 * verifies if a plaintext password matches the hashed password.
 * @param {string} candidatePassword - plaintext password to test.
 * @returns {Promise<boolean>} true if it matches, false otherwise.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
