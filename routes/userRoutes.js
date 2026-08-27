import express from 'express';
import { getUserProfile, updateUserProfile, toggleFriend } from '../controllers/userController.js';
import { getProfileStats} from '../controllers/profileStatsController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// all user routes require the user to be logged in
router.use(isAuthenticated);

// profile statistics and groups
router.get('/:username/profile-stats', getProfileStats);

// GET /users/:username
router.get('/:username', getUserProfile);

// PUT /users/:username
router.put('/:username', updateUserProfile);

// POST /users/:username/friends
router.post('/:username/friends', toggleFriend);

export default router;