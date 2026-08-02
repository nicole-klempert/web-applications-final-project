import express from 'express';
import { signup, login, forgotPassword, logout } from '../controllers/authController.js';

const router = express.Router();

// POST /signup endpoint
router.post('/signup', signup);

// POST /login endpoint
router.post('/login', login);

// POST /forgot-password endpoint
router.post('/forgot-password', forgotPassword);

// GET /logout endpoint
router.get('/logout', logout);

export default router;