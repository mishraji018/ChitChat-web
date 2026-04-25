import express from 'express';
import { 
  getConversations, getMessages, sendMessage, 
  editMessage, deleteMessage, reactToMessage, 
  toggleStarMessage, markAsRead, getStarredMessages 
} from '../controllers/chat.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/conversations', getConversations);
router.get('/messages/:conversationId', getMessages);
router.post('/send', sendMessage);
router.put('/edit/:messageId', editMessage);
router.delete('/delete/:messageId', deleteMessage);
router.put('/react/:messageId', reactToMessage);
router.put('/star/:messageId', toggleStarMessage);
router.put('/read/:conversationId', markAsRead);
router.get('/starred', getStarredMessages);

export default router;
