import express from 'express';
import {
  getUserConversations,
  togglePinConversation,
  toggleMuteConversation,
  toggleArchiveConversation,
  clearChat
} from '../controllers/conversationController.js';

const router = express.Router();

router.get('/:userId', getUserConversations);
router.put('/:conversationId/pin', togglePinConversation);
router.put('/:conversationId/mute', toggleMuteConversation);
router.put('/:conversationId/archive', toggleArchiveConversation);
router.delete('/:conversationId/clear', clearChat);

export default router;
