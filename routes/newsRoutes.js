import express from 'express';
import { getNews } from '../controllers/newsController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// get /api/news - fetch today's tv schedule, protected by authentication guard
router.get('/', isAuthenticated, getNews);

export default router;
