import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

import messageRoutes from './routes/messageRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { 
  globalLimiter, 
  signupLimiter, 
  otpLimiter 
} from './middleware/rateLimiter.js';
import { Message } from './models/Message.js';
import { User } from './models/User.js';
import { encrypt, decrypt } from './utils/encryption.js';
import { sendPushNotification } from './utils/notification.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 10000,
  pingInterval: 5000
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(globalLimiter); // Apply global rate limit to all routes

// Routes
app.use('/api/auth/signup', signupLimiter);
app.use('/api/auth/send-signup-otp', otpLimiter);
app.use('/api/auth/forgot-passkey', otpLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/media', mediaRoutes);

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blinkchat';
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Track online users: { userId -> socketId }
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User comes online
  socket.on('user:online', async (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    
    // Tell everyone this user is online
    io.emit('user:status', { userId, isOnline: true });
    
    // ✅ Deliver all queued messages
    try {
      const queuedMessages = await Message.find({
        receiverId: userId,
        isQueued: true,
        status: 'sent'
      }).sort({ timestamp: 1 }); // oldest first

      if (queuedMessages.length > 0) {
        console.log(`Delivering ${queuedMessages.length} queued messages to ${userId}`);

        for (const msg of queuedMessages) {
          // Send to user
          socket.emit('message:receive', {
            _id: msg._id,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            conversationId: msg.conversationId,
            type: msg.type,
            content: decrypt(msg.content),
            mediaData: msg.mediaData,
            replyTo: msg.replyTo,
            status: 'delivered',
            timestamp: msg.timestamp,
            isEdited: msg.isEdited,
            reactions: msg.reactions,
            isQueued: false
          });

          // Update message status
          await Message.findByIdAndUpdate(msg._id, {
            status: 'delivered',
            isQueued: false,
            deliveredAt: new Date()
          });

          // Notify sender their message was delivered
          const senderSocketId = onlineUsers.get(msg.senderId);
          if (senderSocketId) {
            io.to(senderSocketId).emit('message:delivered', {
              messageId: msg._id,
              conversationId: msg.conversationId
            });
          }
        }

        // Tell user how many queued messages they received
        socket.emit('queue:delivered', { 
          count: queuedMessages.length,
          message: `${queuedMessages.length} message${queuedMessages.length > 1 ? 's' : ''} delivered while you were offline`
        });
      }
    } catch (err) {
      console.error('Queue delivery error:', err);
    }
    
    // Send this user the list of who is online
    socket.emit('users:online-list', Array.from(onlineUsers.keys()));
    
    console.log(`${userId} is online. Total online: ${onlineUsers.size}`);
  });

  // Send message — ONLY to specific recipient
  socket.on('message:send', async (data) => {
    const { 
      tempId, 
      senderId, 
      receiverId, 
      type, 
      content, 
      mediaData, 
      replyTo 
    } = data;

    try {
      const recipientSocketId = onlineUsers.get(receiverId);
      const isRecipientOnline = !!recipientSocketId;

      // Save message — queue if recipient offline
      const savedMessage = await Message.create({
        senderId,
        receiverId,
        conversationId: [senderId, receiverId].sort().join('_'),
        type,
        content: encrypt(content),  // encrypt before save
        mediaData,
        replyTo,
        status: isRecipientOnline ? 'delivered' : 'sent',
        isQueued: !isRecipientOnline,  // queue if offline
        queuedAt: !isRecipientOnline ? new Date() : null,
        deliveredAt: isRecipientOnline ? new Date() : null,
        timestamp: new Date()
      });

      const messagePayload = {
        _id: savedMessage._id,
        tempId,
        senderId,
        receiverId,
        conversationId: savedMessage.conversationId,
        type,
        content, // plain content for real-time delivery
        mediaData,
        replyTo,
        status: savedMessage.status,
        timestamp: savedMessage.timestamp,
        isEdited: false,
        reactions: [],
        isQueued: savedMessage.isQueued
      };

      if (!isRecipientOnline) {
        // Find recipient and sender for push notification
        const recipient = await User.findById(receiverId);
        if (recipient && recipient.fcmToken) {
          const sender = await User.findById(senderId);
          sendPushNotification(recipient.fcmToken, {
            title: `BlinkChat ⚡ | ${sender?.displayName || sender?.username || 'New Message'}`,
            body: type === 'text' ? content : `Sent a ${type}`,
            icon: sender?.avatarUrl || '',
            data: { 
              conversationId: savedMessage.conversationId,
              senderId: senderId
            }
          });
        }
      }

      if (isRecipientOnline) {
        // ✅ Deliver immediately
        io.to(recipientSocketId).emit('message:receive', messagePayload);
      } else {
        // 📦 Queued — will deliver when recipient comes online
        console.log(`Message queued for offline user: ${receiverId}`);
      }

      // Confirm to sender
      socket.emit('message:sent', {
        tempId,
        messageId: savedMessage._id,
        status: savedMessage.status,
        timestamp: savedMessage.timestamp,
        isQueued: savedMessage.isQueued
      });

    } catch (err) {
      console.error('Message send error:', err);
      socket.emit('message:error', { tempId, error: 'Failed to send message' });
    }
  });

  // Message read
  socket.on('message:read', async ({ messageId, senderId, conversationId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { status: 'read' });
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('message:read-receipt', {
          messageId,
          conversationId
        });
      }
    } catch (err) {
      console.error('Read receipt error:', err);
    }
  });

  // Typing indicators
  socket.on('typing:start', ({ senderId, receiverId }) => {
    const recipientSocketId = onlineUsers.get(receiverId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing:show', { senderId });
    }
  });

  socket.on('typing:stop', ({ senderId, receiverId }) => {
    const recipientSocketId = onlineUsers.get(receiverId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing:hide', { senderId });
    }
  });

  // Delete message
  socket.on('message:delete', async ({ messageId, deletedBy, deleteForEveryone, receiverId }) => {
    try {
      if (deleteForEveryone) {
        const msg = await Message.findById(messageId);
        if (!msg) return;

        const timeDiff = (Date.now() - new Date(msg.timestamp).getTime()) / 1000;
        if (timeDiff > 60) {
          socket.emit('message:error', { error: 'Can only delete for everyone within 60 seconds' });
          return;
        }
        
        await Message.findByIdAndUpdate(messageId, {
          content: 'This message was deleted',
          isDeletedForEveryone: true
        });

        const recipientSocketId = onlineUsers.get(receiverId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('message:deleted-for-everyone', { messageId });
        }
        socket.emit('message:deleted-for-everyone', { messageId });

      } else {
        await Message.findByIdAndUpdate(messageId, {
          $push: { deletedFor: deletedBy }
        });
        socket.emit('message:deleted-for-me', { messageId });
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  });

  // Edit message
  socket.on('message:edit', async ({ messageId, newContent, receiverId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;

      const timeDiff = (Date.now() - new Date(msg.timestamp).getTime()) / 1000 / 60;
      if (timeDiff > 15) {
        socket.emit('message:error', { error: 'Can only edit within 15 minutes' });
        return;
      }

      await Message.findByIdAndUpdate(messageId, {
        content: newContent,
        isEdited: true,
        editedAt: new Date()
      });

      const recipientSocketId = onlineUsers.get(receiverId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('message:edited', { messageId, newContent });
      }
      socket.emit('message:edited', { messageId, newContent });
    } catch (err) {
      console.error('Edit error:', err);
    }
  });

  // React to message
  socket.on('message:react', async ({ messageId, emoji, userId, receiverId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      
      const existingReaction = msg.reactions.find(r => r.userId === userId);
      if (existingReaction) {
        if (existingReaction.emoji === emoji) {
          await Message.findByIdAndUpdate(messageId, {
            $pull: { reactions: { userId } }
          });
        } else {
          await Message.findByIdAndUpdate(messageId, {
            $set: { 'reactions.$[elem].emoji': emoji }
          }, { arrayFilters: [{ 'elem.userId': userId }] });
        }
      } else {
        await Message.findByIdAndUpdate(messageId, {
          $push: { reactions: { userId, emoji } }
        });
      }

      const updated = await Message.findById(messageId);
      const recipientSocketId = onlineUsers.get(receiverId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('message:reacted', { messageId, reactions: updated.reactions });
      }
      socket.emit('message:reacted', { messageId, reactions: updated.reactions });
    } catch (err) {
      console.error('React error:', err);
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('user:status', { userId: socket.userId, isOnline: false, lastSeen: new Date() });
      console.log(`${socket.userId} went offline`);
    }
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`BlinkChat backend server running on port ${PORT}`);
});
