import express from 'express';
import { 
  getProfile, updateProfile, searchUsers, 
  getContacts, updateFCMToken 
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.put('/update', updateProfile);
router.get('/search', searchUsers);
router.get('/contacts', getContacts);
router.put('/fcm-token', updateFCMToken);

export default router;
