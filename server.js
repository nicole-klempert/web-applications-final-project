import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/userModel.js';

// load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
// fallback on local mongoDB if not found in .env file 
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure_users_db';

// get the path where the server files are located on the computer
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// connect to mongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB!'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// parses incoming http requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// for security: prevents access to raw source files & keys
app.use((req, res, next) => {
  const blockedFiles = [
    '.env',
    '.gitignore',
    'package.json',
    'package-lock.json',
    'server.js',
    'models',
    'utils'
  ];
  const reqPath = req.path.toLowerCase();

  if (blockedFiles.some(file => reqPath.includes(file) || reqPath.endsWith(file))) {
    return res.status(403).send('<h1>403 Access Denied</h1><p>You do not have permission to access this file.</p>');
  }
  next();
});

// serve static front end files (html, css, js) from the root directory
app.use(express.static(__dirname));

// redirect root url to login page
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// for ajax requests, or redirect for fallback form posts (so that the page doesnt reload when there is an input mistake)
const sendResponse = (req, res, status, errorMsg, redirectUrl) => {
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    if (status >= 400) {
      return res.status(status).json({ error: errorMsg });
    }
    return res.json({ success: true, redirect: redirectUrl });
  } else {
    if (status >= 400) {
      const separator = redirectUrl.includes('?') ? '&' : '?';
      return res.redirect(`${redirectUrl}${separator}error=${encodeURIComponent(errorMsg)}`);
    }
    return res.redirect(redirectUrl);
  }
};


// POST /signup endpoint
app.post('/signup', async (req, res) => {
  try {
    const {
      'new-username': username,
      email,
      birthday,
      'new-password': password,
      'confirm-password': confirmPassword,
      'recovery-question': recoveryQuestion,
      'recovery-answer': recoveryAnswer
    } = req.body;

    // check if passwords match
    if (password !== confirmPassword) {
      return sendResponse(req, res, 400, 'Passwords do not match', '/signup.html');
    }

    // validate password strength: minimum 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return sendResponse(req, res, 400, 'Password must be at least 8 characters, and contain 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol.', '/signup.html');
    }

    // check if user already exists (by username blind index)
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return sendResponse(req, res, 400, 'Username is already taken', '/signup.html');
    }

    // check if email already exists
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return sendResponse(req, res, 400, 'Email is already registered', '/signup.html');
    }

    // create and save new user (virtual fields trigger encryption automatically)
    const newUser = new User({
      username,
      email,
      password,
      birthday,
      recoveryQuestion,
      recoveryAnswer
    });

    await newUser.save();
    console.log(`[Signup Success] Created secure user: "${username}"`);

    return sendResponse(req, res, 200, null, '/login.html?success=Account created successfully! Please log in.');
  } catch (error) {
    console.error('Error during registration:', error);
    return sendResponse(req, res, 500, 'Registration failed. Please try again.', '/signup.html');
  }
});

// POST /login endpoint
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // query database using blind index static helper
    const user = await User.findByUsername(username);

    if (!user) {
      console.log(`[Login Failed] Username not found: "${username}"`);
      return sendResponse(req, res, 400, 'Invalid username or password', '/login.html');
    }

    // validate password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`[Login Failed] Incorrect password for user: "${username}"`);
      return sendResponse(req, res, 400, 'Invalid username or password', '/login.html');
    }

    console.log(`[Login Success] Secure user logged in: "${username}"`);
    // redirect to feed page
    return sendResponse(req, res, 200, null, '/tamplate.html?success=Welcome back, ' + encodeURIComponent(username) + '!');
  } catch (error) {
    console.error('Error during login:', error);
    return sendResponse(req, res, 500, 'Login failed. Please try again.', '/login.html');
  }
});

// POST /forgot-password endpoint
app.post('/forgot-password', async (req, res) => {
  try {
    const {
      username,
      'recovery-question': recoveryQuestion,
      'recovery-answer': recoveryAnswer,
      'new-password': newPassword,
      'confirm-new-password': confirmNewPassword
    } = req.body;

    if (newPassword !== confirmNewPassword) {
      return sendResponse(req, res, 400, 'Passwords do not match', '/forgot-password.html');
    }

    // validate new password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return sendResponse(req, res, 400, 'Password must be at least 8 characters, and contain 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol.', '/forgot-password.html');
    }

    // find user by username blind index
    const user = await User.findByUsername(username);
    if (!user) {
      console.log(`[Password Reset Failed] User not found: "${username}"`);
      return sendResponse(req, res, 400, 'Invalid username or recovery details', '/forgot-password.html');
    }

    // verify recovery question and decrypted recovery answer
    const isQuestionMatch = user.recoveryQuestion === recoveryQuestion;
    const isAnswerMatch = user.recoveryAnswer.toLowerCase().trim() === recoveryAnswer.toLowerCase().trim();

    if (!isQuestionMatch || !isAnswerMatch) {
      console.log(`[Password Reset Failed] Recovery answers mismatch for user: "${username}"`);
      return sendResponse(req, res, 400, 'Invalid username or recovery details', '/forgot-password.html');
    }

    // verify new password is not identical to current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      console.log(`[Password Reset Failed] New password is identical to current password for user: "${username}"`);
      return sendResponse(req, res, 400, 'New password cannot be the same as your current password.', '/forgot-password.html');
    }

    // update password
    user.password = newPassword;
    await user.save();
    console.log(`[Password Reset Success] Password successfully reset for user: "${username}"`);

    return sendResponse(req, res, 200, null, '/login.html?success=Password reset successfully! Please log in with your new password.');
  } catch (error) {
    console.error('Error during password reset:', error);
    return sendResponse(req, res, 500, 'Password reset failed. Please try again.', '/forgot-password.html');
  }
});

// GET /logout endpoint
app.get('/logout', (req, res) => {
  console.log('[Logout] User logged out.');
  res.redirect('/login.html?success=Logged out successfully.');
});

// start server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  Server is running at: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
