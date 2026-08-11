import express from 'express';
import { getUserProfile, updateUserProfile, toggleFriend } from '../controllers/userController.js';

const router = express.Router();

// GET /users/:username
router.get('/:username', getUserProfile);

// PUT /users/:username
router.put('/:username', updateUserProfile);

// POST /users/:username/friends
router.post('/:username/friends', toggleFriend);

export default router;