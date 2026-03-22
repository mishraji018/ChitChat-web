import express from 'express';
import {
  sendMessage,
  getMessages,
  softDeleteMessage,
  hardDeleteMessage,
  editMessage,
  reactToMessage,
  toggleStarMessage,
  updateMessageStatus,
  getPendingCount
} from '../controllers/messageController.js';

const router = express.Router();

router.get('/pending/:userId', getPendingCount);
router.post('/send', sendMessage);
router.get('/:conversationId', getMessages);
router.put('/:messageId/delete', softDeleteMessage);
router.put('/:messageId/delete-everyone', hardDeleteMessage);
router.put('/:messageId/edit', editMessage);
router.put('/:messageId/react', reactToMessage);
router.put('/:messageId/star', toggleStarMessage);
router.put('/:messageId/status', updateMessageStatus);

export default router;
