import express from 'express';
import {getFriendsByCity,getGroupMembersByCity} from '../controllers/statisticsController.js';
import { isAuthenticated, isGroupAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// apply authentication middleware to all routes in this router
router.use(isAuthenticated);

// GET /statistics/friends-by-city
router.get('/friends-by-city', getFriendsByCity);

// GET /statistics/groups/:groupId/members-by-city
router.get('/groups/:groupId/members-by-city', isGroupAdmin, getGroupMembersByCity);

export default router;
