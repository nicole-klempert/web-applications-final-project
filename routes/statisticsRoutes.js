import express from 'express';
import {getFriendsByCity,getGroupMembersByCity} from '../controllers/statisticsController.js';
import {isAuthenticated,isGroupAdmin} from '../middleware/authMiddleware.js';
const router=express.Router();
router.use(isAuthenticated);
// statistics endpoints
router.get('/friends-by-city',getFriendsByCity);
router.get('/groups/:groupId/members-by-city',isGroupAdmin,getGroupMembersByCity);
export default router;
