import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt, generateBlindIndex } from '../utils/cryptoUtils.js';

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
    },
    // The encrypted birthday (IV + tag + ciphertext)
    birthdayEncrypted: {
        type: String,
        required: true
    },
    // The encrypted recovery question
    recoveryQuestionEncrypted: {
        type: String,
        required: true
    },
    // Encrypted recovery answer
    recoveryAnswerEncrypted: {
        type: String,
        required: true
    },
    // Profile picture URL or base64 string (optional)
    profilePicture: {
        type: String,
        default: ""
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

// Email virtual field
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

// Birthday virtual field
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
            // If it's a Date object, convert to YYYY-MM-DD string
            const dateStr = typeof plaintextBirthday === 'string'
                ? plaintextBirthday
                : new Date(plaintextBirthday).toISOString().split('T')[0];
            this.birthdayEncrypted = encrypt(dateStr);
        }
    });

// Recovery Answer virtual field
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
            // Trim and lowercase to make checks case/space-insensitive
            const normalized = plaintextAnswer.trim().toLowerCase();
            this.recoveryAnswerEncrypted = encrypt(normalized);
        }
    });

// Recovery Question virtual field
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

// --- Pre-Save Hook ---
// Hashing the password using bcrypt before saving
userSchema.pre('save', async function (next) {
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
userSchema.statics.findByUsername = function (username) {
    if (!username) return null;
    const hash = generateBlindIndex(username.toLowerCase().trim());
    return this.findOne({ usernameHash: hash });
};

/**
 * Finds a single user by their plaintext email.
 * @param {string} email - Plaintext email address.
 * @returns {Promise<Document|null>} The Mongoose document or null.
 */
userSchema.statics.findByEmail = function (email) {
    if (!email) return null;
    const hash = generateBlindIndex(email.toLowerCase().trim());
    return this.findOne({ emailHash: hash });
};

// --- Instance Methods ---

/**
 * Verifies if a plaintext password matches the hashed password.
 * @param {string} candidatePassword - Plaintext password to test.
 * @returns {Promise<boolean>} True if it matches, false otherwise.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;