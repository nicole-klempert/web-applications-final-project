import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/userModel.js';

// import  routes
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';

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
mongoose.connect(MONGO_URI, {
    ssl: true,
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

// redirect root url to login page
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// start server
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  Server is running at: http://localhost:${PORT}`);
    console.log(`==================================================`);
});