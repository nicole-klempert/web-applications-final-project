import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './userModel.js';

// Load environmental variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure_users_db';

async function main() {
  console.log('==================================================');
  console.log('          MongoDB Secure User Demo                ');
  console.log('==================================================\n');

  try {
    // 1. Connect to MongoDB
    console.log(`Connecting to MongoDB at: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('Successfully connected to MongoDB!\n');

    // Clean up any existing demo users to ensure a clean run
    await User.deleteMany({ usernameHash: { $exists: true } });

    // 2. CREATE: Add a New User
    console.log('--------------------------------------------------');
    console.log('[CREATE] Adding a new user: "nicole_k"');
    console.log('--------------------------------------------------');

    const newUser = new User();
    // Using the virtual fields (triggers encryption and blind indexing behind the scenes)
    newUser.username = 'nicole_k';
    newUser.email = 'nicole@example.com';
    newUser.password = 'superSecretPassword123'; // will be hashed by pre-save middleware

    await newUser.save();
    console.log('User created and saved to MongoDB!\n');

    // 3. READ RAW: Inspect what is stored in the database
    console.log('--------------------------------------------------');
    console.log('[READ RAW] Fetching user directly from DB without decrypting');
    console.log('--------------------------------------------------');
    
    // We use .lean() to bypass Mongoose virtual getters so we see the raw stored document
    const rawUser = await User.findOne({ usernameHash: newUser.usernameHash }).lean();
    
    console.log('Raw Document Stored in MongoDB:');
    console.log(JSON.stringify(rawUser, null, 2));
    console.log('\nNotice that:');
    console.log('  - "usernameEncrypted" and "emailEncrypted" are AES-256-GCM ciphertexts (iv:tag:data).');
    console.log('  - "usernameHash" and "emailHash" are SHA-256 blind indexes (for indexing and querying).');
    console.log('  - "password" is a bcrypt hash (non-reversible).\n');

    // 4. READ & DECRYPT: Fetch using Mongoose Model (automatic decryption)
    console.log('--------------------------------------------------');
    console.log('[READ/DECRYPT] Fetching user using Mongoose instance');
    console.log('--------------------------------------------------');
    
    // Find the user using our custom static method findByUsername
    const fetchedUser = await User.findByUsername('nicole_k');
    
    if (fetchedUser) {
      console.log('Document loaded through Mongoose model:');
      console.log(`- ID: ${fetchedUser._id}`);
      // Accessing virtual fields automatically decrypts the data
      console.log(`- Plaintext Username (Decrypted): "${fetchedUser.username}"`);
      console.log(`- Plaintext Email (Decrypted): "${fetchedUser.email}"`);
      console.log(`- Stored Hashed Password: "${fetchedUser.password}"\n`);
    } else {
      console.log('User not found!\n');
    }

    // 5. AUTHENTICATE (LOGIN): Check password match
    console.log('--------------------------------------------------');
    console.log('[LOGIN] Verifying password credentials');
    console.log('--------------------------------------------------');
    
    const loginUsername = 'nicole_k';
    const correctPassword = 'superSecretPassword123';
    const wrongPassword = 'wrongPassword';

    // Find the user by plaintext username
    const userToAuth = await User.findByUsername(loginUsername);
    if (userToAuth) {
      // Test incorrect password
      const isWrongMatch = await userToAuth.comparePassword(wrongPassword);
      console.log(`Attempt login for "${loginUsername}" with password "${wrongPassword}": ${isWrongMatch ? 'SUCCESS' : 'FAILED (Expected)'}`);

      // Test correct password
      const isCorrectMatch = await userToAuth.comparePassword(correctPassword);
      console.log(`Attempt login for "${loginUsername}" with password "${correctPassword}": ${isCorrectMatch ? 'SUCCESS' : 'FAILED'}\n`);
    }

    // 6. UPDATE: Change User details (e.g. Email and Password)
    console.log('--------------------------------------------------');
    console.log('[UPDATE] Modifying user details (email and password)');
    console.log('--------------------------------------------------');
    
    const userToUpdate = await User.findByUsername('nicole_k');
    if (userToUpdate) {
      // Modifying virtual field triggers re-encryption and new blind index
      userToUpdate.email = 'nicole.klempert@college.edu';
      // Modifying password triggers re-hashing
      userToUpdate.password = 'newEvenStrongerPassword987';
      
      await userToUpdate.save();
      console.log('User details updated successfully!');

      // Retrieve from database again to check the updated values
      const updatedUser = await User.findByUsername('nicole_k');
      console.log(`- Updated Plaintext Email (Decrypted): "${updatedUser.email}"`);
      console.log(`- Updated Hashed Password: "${updatedUser.password}"\n`);
    }

    // 7. PAUSE FOR INSPECTION: Wait for user input before deleting
    console.log('--------------------------------------------------');
    console.log('[PAUSE] View the data in MongoDB Compass now!');
    console.log('--------------------------------------------------');
    console.log('1. Open MongoDB Compass.');
    console.log(`2. Connect using: ${MONGO_URI}`);
    console.log('3. Open the "test" database and click the "users" collection.');
    console.log('4. You will see the encrypted data and blind hashes stored there.');
    console.log('\nPress [ENTER] in this terminal when you are ready to resume and delete the user...');
    
    await new Promise((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });

    // 8. DELETE: Remove the user from the database
    console.log('\n--------------------------------------------------');
    console.log('[DELETE] Removing the user from the database');
    console.log('--------------------------------------------------');
    
    const deleteResult = await User.deleteOne({ usernameHash: newUser.usernameHash });
    console.log(`Deleted count: ${deleteResult.deletedCount}`);
    
    const checkUserExist = await User.findByUsername('nicole_k');
    console.log(`Does user "nicole_k" still exist in database? ${checkUserExist ? 'Yes' : 'No'}\n`);

  } catch (error) {
    console.error('Error during demo execution:', error);
  } finally {
    // Close the MongoDB connection
    console.log('Closing database connection...');
    await mongoose.connection.close();
    console.log('Database connection closed.');
    console.log('==================================================');
  }
}

main();
