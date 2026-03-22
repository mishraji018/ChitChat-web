import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';

export const getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const conversations = await Conversation.find({
      participants: userId,
      archivedBy: { $ne: userId } // optionally hide archived, adjust as needed based on UI logic
    }).sort({ lastMessageTime: -1 });

    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const togglePinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    const conversation = await Conversation.findOne({ conversationId });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const isPinned = conversation.pinnedBy.includes(userId);
    const update = isPinned 
      ? { $pull: { pinnedBy: userId } }
      : { $addToSet: { pinnedBy: userId } };

    const updated = await Conversation.findOneAndUpdate({ conversationId }, update, { new: true });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleMuteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    const conversation = await Conversation.findOne({ conversationId });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const isMuted = conversation.mutedBy.includes(userId);
    const update = isMuted 
      ? { $pull: { mutedBy: userId } }
      : { $addToSet: { mutedBy: userId } };

    const updated = await Conversation.findOneAndUpdate({ conversationId }, update, { new: true });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleArchiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    const conversation = await Conversation.findOne({ conversationId });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const isArchived = conversation.archivedBy.includes(userId);
    const update = isArchived 
      ? { $pull: { archivedBy: userId } }
      : { $addToSet: { archivedBy: userId } };

    const updated = await Conversation.findOneAndUpdate({ conversationId }, update, { new: true });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const clearChat = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    // Add userId to deletedFor for all messages in this conversation
    await Message.updateMany(
      { conversationId },
      { $addToSet: { deletedFor: userId } }
    );

    res.status(200).json({ message: 'Chat cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
