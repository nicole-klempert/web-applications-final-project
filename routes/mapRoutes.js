import express from 'express';
import {getMapConfig} from '../controllers/mapController.js';
import {isAuthenticated} from '../middleware/authMiddleware.js';
const router=express.Router();
router.use(isAuthenticated);
router.get('/config',getMapConfig);
export default router;
