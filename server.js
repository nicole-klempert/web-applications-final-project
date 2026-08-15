import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/userModel.js';
import session from 'express-session';

// import  routes
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import userRoutes from './routes/userRoutes.js';

// load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
// fallback on local mongoDB if not found in .env file 
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure_users_db';

// get the path where the server files are located on the computer
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// connect to mongo atlas with SSL true, disable for local testing
const useSSL = MONGO_URI.includes('mongodb+srv') || MONGO_URI.includes('mongodb.net');

mongoose.connect(MONGO_URI, {
    ssl: useSSL,
    authSource: 'admin',
    retryWrites: true
})
    .then(() => {
        console.log('Successfully connected to MongoDB!');
        console.log('--> Connected DB Name:', mongoose.connection.name, '| Host:', mongoose.connection.host);
    })
    .catch(err => {
        console.error('Database connection error:', err);
        process.exit(1);
    });

// parses incoming http requests
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));

// configure session middleware (keeps users logged in securely on the server side)
app.use(session({
    secret: process.env.SESSION_SECRET || 'secure_secret_key', // secret key used to sign the session ID cookie
    resave: false,                                             // do not save session if it wasn't modified
    saveUninitialized: false,                                  // do not create a session cookie until we store data
    cookie: {
        secure: false,                                          // set to true only for https so we are setting it to false
        httpOnly: true,                                         // prevents client from accessing cookie (protects against XSS attacks)
        maxAge: 1000 * 60 * 60 * 24                             // session cookie expiration is 24 hours
    }
}));

// for security: prevents access to raw source files & keys
app.use((req, res, next) => {
    const blockedFiles = [
        '.env',
        '.gitignore',
        'package.json',
        'package-lock.json',
        'server.js',
        'models',
        'utils',
        'controllers',
        'routes'
    ];
    const reqPath = req.path.toLowerCase();

    if (blockedFiles.some(file => reqPath.includes(file) || reqPath.endsWith(file))) {
        return res.status(403).send('<h1>403 Access Denied</h1><p>You do not have permission to access this file.</p>');
    }
    next();
});

// serve static front end files (html, css, js) from the root directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// mount authentication routes
app.use('/', authRoutes);

// mount post routes
app.use('/posts', postRoutes);

// mount user profile routes
app.use('/users', userRoutes);

// redirect root url to login page
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// 404 handler: handles any unmatched route requests
app.use((req, res, next) => {
    // if client expects JSON response (AJAX/Fetch requests), send a JSON error
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    // else, send the 404.html page
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// 500 handler: central error middleware to catch all unhandled server errors gracefully
app.use((err, req, res, next) => {
    console.error('[Server Error Exception]:', err.stack || err.message || err);

    if (res.headersSent) {
        return next(err);
    }

    // if client expects JSON, return a clean JSON error response
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(500).json({ success: false, error: 'Internal Server Error. Please try again later.' });
    }

    // else, send the custom styled 500.html page
    res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});

// start server
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  Server is running at: http://localhost:${PORT}`);
    console.log(`==================================================`);
});