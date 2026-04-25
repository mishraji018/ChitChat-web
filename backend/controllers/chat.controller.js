import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    })
    .populate('participants', 'name avatar mobile isOnline lastSeen')
    .populate('lastMessage')
    .sort({ lastMessageTime: -1 });

    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const skip = (page - 1) * limit;

  try {
    const messages = await Message.find({ 
      conversationId,
      deletedFor: { $ne: req.user.id }
    })
    .populate('senderId', 'name avatar')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Message.countDocuments({ conversationId, deletedFor: { $ne: req.user.id } });

    res.status(200).json({
      success: true,
      data: messages.reverse(),
      pagination: {
        total,
        page,
        hasMore: total > skip + limit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendMessage = async (req, res) => {
    const { receiverId, type, text, mediaUrl, mediaSize, mediaDuration, location, replyTo } = req.body;
  
    try {
      // Find or create conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [req.user.id, receiverId] }
      });
  
      if (!conversation) {
        conversation = await Conversation.create({
          participants: [req.user.id, receiverId]
        });
      }
  
      const message = await Message.create({
        conversationId: conversation._id,
        senderId: req.user.id,
        receiverId,
        type,
        text,
        mediaUrl,
        mediaSize,
        mediaDuration,
        location,
        replyTo
      });
  
      conversation.lastMessage = message._id;
      conversation.lastMessageTime = Date.now();
      
      // Update unread count for receiver
      const currentUnread = conversation.unreadCount.get(receiverId.toString()) || 0;
      conversation.unreadCount.set(receiverId.toString(), currentUnread + 1);
      
      await conversation.save();
  
      // Populate message before returning
      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'name avatar')
        .populate('replyTo');
  
      res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

export const editMessage = async (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.senderId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > fifteenMinutes) {
      return res.status(400).json({ success: false, message: 'Edit window (15 mins) expired' });
    }

    message.text = text;
    message.isEdited = true;
    message.editedAt = Date.now();
    await message.save();

    res.status(200).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const { forEveryone } = req.body;

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (forEveryone) {
      if (message.senderId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for deleting for everyone' });
      }

      const sixtySeconds = 60 * 1000;
      if (Date.now() - message.createdAt.getTime() > sixtySeconds) {
        return res.status(400).json({ success: false, message: 'Delete for everyone window (60 sec) expired' });
      }

      message.isDeleted = true;
      await message.save();
    } else {
      if (!message.deletedFor.includes(req.user.id)) {
        message.deletedFor.push(req.user.id);
        await message.save();
      }
    }

    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reactToMessage = async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    const existingReactionIndex = message.reactions.findIndex(r => r.userId.toString() === req.user.id.toString());

    if (existingReactionIndex > -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ userId: req.user.id, emoji });
    }

    await message.save();
    res.status(200).json({ success: true, data: message.reactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleStarMessage = async (req, res) => {
  const { messageId } = req.params;

  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    const starIndex = message.isStarred.indexOf(req.user.id);
    if (starIndex > -1) {
      message.isStarred.splice(starIndex, 1);
    } else {
      message.isStarred.push(req.user.id);
    }

    await message.save();
    res.status(200).json({ success: true, message: 'Starred toggle success' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  const { conversationId } = req.params;

  try {
    await Message.updateMany(
      { conversationId, receiverId: req.user.id, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    );

    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.unreadCount.set(req.user.id.toString(), 0);
      await conversation.save();
    }

    res.status(200).json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStarredMessages = async (req, res) => {
  try {
    const messages = await Message.find({ isStarred: req.user.id })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
