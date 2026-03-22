import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { encrypt, decrypt } from '../utils/encryption.js';

export const getConversationId = (id1, id2) => {
  return [id1, id2].sort().join('_');
};

export const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, type, content, fileName, fileSize, duration, replyTo } = req.body;
    const conversationId = getConversationId(senderId, receiverId);

    const newMessage = new Message({
      senderId,
      receiverId,
      conversationId,
      type,
      content: encrypt(content),
      fileName,
      fileSize,
      duration,
      replyTo
    });

    await newMessage.save();

    // Update or create conversation
    await Conversation.findOneAndUpdate(
      { conversationId },
      {
        $setOnInsert: { participants: [senderId, receiverId] },
        $set: {
          lastMessage: type === 'text' ? content : type,
          lastMessageTime: newMessage.timestamp,
          lastMessageType: type
        }
      },
      { upsert: true, new: true }
    );

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId, before, limit = 20 } = req.query; // Pagination: before timestamp, limit count

    if (!userId) return res.status(400).json({ error: 'userId query parameter is required' });

    const query = {
      conversationId,
      deletedFor: { $ne: userId }
    };

    // If 'before' is provided, fetch messages older than that
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 }) // Sort by newest first to get the most recent chunk
      .limit(parseInt(limit))
      .lean();

    // Reverse back to chronological order
    const orderedMessages = messages.reverse();

    const decryptedMessages = orderedMessages.map(msg => ({
      ...msg,
      content: decrypt(msg.content)
    }));

    res.status(200).json(decryptedMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const softDeleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { deletedFor: userId } },
      { new: true }
    );

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const hardDeleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const timeDiff = (Date.now() - new Date(message.timestamp).getTime()) / 1000;
    if (timeDiff > 60) {
      return res.status(403).json({ error: 'Can only delete for everyone within 60 seconds' });
    }

    message.content = 'This message was deleted';
    message.type = 'text';
    message.fileName = null;
    message.fileSize = null;
    message.duration = null;
    
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        content: encrypt(content),
        isEdited: true,
        editedAt: Date.now()
      },
      { new: true }
    );

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, emoji } = req.body;

    // Remove existing reaction by user if any, then add new one
    await Message.updateOne(
      { _id: messageId },
      { $pull: { reactions: { userId } } }
    );

    if (emoji) {
      await Message.updateOne(
        { _id: messageId },
        { $push: { reactions: { userId, emoji } } }
      );
    }

    const updatedMessage = await Message.findById(messageId);
    res.status(200).json(updatedMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleStarMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    const message = await Message.findById(messageId);
    const hasStarred = message.isStarred.includes(userId);

    const update = hasStarred 
      ? { $pull: { isStarred: userId } }
      : { $addToSet: { isStarred: userId } };

    const updatedMessage = await Message.findByIdAndUpdate(messageId, update, { new: true });
    res.status(200).json(updatedMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { status },
      { new: true }
    );

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPendingCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const pendingCount = await Message.countDocuments({
      receiverId: userId,
      isQueued: true,
      status: 'sent'
    });

    res.json({ 
      success: true, 
      pendingCount,
      message: pendingCount > 0 
        ? `You have ${pendingCount} undelivered message${pendingCount > 1 ? 's' : ''}` 
        : 'No pending messages'
    });
  } catch (err) {
    console.error('Pending count error:', err);
    res.status(500).json({ error: 'Failed to check pending messages', details: err.message });
  }
};
