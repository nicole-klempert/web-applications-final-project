import express from 'express';
import {
    searchPosts,
    searchGroupsUsers,
    getPostStatsByAuthor,
    getPostStatsByType
} from '../controllers/searchController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// all search routes require authentication
router.use(isAuthenticated);

// search for posts with filters (text, author, group, type, dates)
router.get('/posts', searchPosts);

// search for groups and users (name, category, city, member count, dates)
router.get('/groups-users', searchGroupsUsers);

// get statistics - posts grouped by author (GroupBy query #1)
router.get('/stats/by-author', getPostStatsByAuthor);

// get statistics - posts grouped by type (GroupBy query #2)
router.get('/stats/by-type', getPostStatsByType);

export default router;
