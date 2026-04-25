import express from 'express';
import { 
  signup, verifyOTP, login, logout, resendOTP, 
  forgotPasskey, resetPasskey, refreshToken, deleteAccount 
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

router.post('/signup', authLimiter, signup);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', authLimiter, login);
router.post('/logout', protect, logout);
router.post('/forgot-passkey', authLimiter, forgotPasskey);
router.post('/reset-passkey', resetPasskey);
router.post('/refresh-token', refreshToken);
router.delete('/delete-account', protect, deleteAccount);

export default router;
