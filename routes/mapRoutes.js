import express from 'express';
import {getMapConfig} from '../controllers/mapController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// apply the authentication guard to all routes defined in this file.
router.use(isAuthenticated);

// GET /map/config
router.get('/config', getMapConfig);

export default router;
