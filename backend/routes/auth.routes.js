import express from 'express';
import { 
  googleAuth, 
  completeGoogleSignup,
  logout, 
  refreshToken 
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/google', googleAuth);
router.post('/complete-google-signup', completeGoogleSignup);
router.post('/logout', protect, logout);
router.post('/refresh-token', refreshToken);

export default router;
