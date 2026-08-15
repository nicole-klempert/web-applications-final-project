import mongoose from 'mongoose';

/**
 * connects to MongoDB database using connection URI from environment variables.
 * automatically configures SSL/TLS for MongoDB Atlas cloud databases.
 */
const connectDB = async () => {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure_users_db';

    // connect to mongo atlas with SSL true, disable for local testing
    const useSSL = MONGO_URI.includes('mongodb+srv') || MONGO_URI.includes('mongodb.net');

    try {
        await mongoose.connect(MONGO_URI, {
            ssl: useSSL,
            authSource: 'admin',
            retryWrites: true
        });
        console.log('Successfully connected to MongoDB!');
        console.log('--> Connected DB Name:', mongoose.connection.name, '| Host:', mongoose.connection.host);
    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
};

export default connectDB;
