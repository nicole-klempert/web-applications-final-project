import express from 'express';
import { getUserProfile, updateUserProfile, toggleFriend, searchUsers } from '../controllers/userController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// all user routes require the user to be logged in
router.use(isAuthenticated);

// GET /users/search
router.get('/search', searchUsers);

// GET /users/:username
router.get('/:username', getUserProfile);

// PUT /users/:username
router.put('/:username', updateUserProfile);

// POST /users/:username/friends
router.post('/:username/friends', toggleFriend);

export default router;