import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const socketHandler = (io) => {
  const onlineUsers = new Map(); // userId -> socketId

  io.on('connection', (socket) => {
    console.log('New socket connection:', socket.id);

    // Authenticate and join user to their own room
    socket.on('authenticate', async (userId) => {
      socket.join(userId);
      onlineUsers.set(userId, socket.id);
      
      // Update online status in DB
      await User.findByIdAndUpdate(userId, { isOnline: true });
      
      // Broadcast to others
      socket.broadcast.emit('user_online', { userId });
      console.log(`User ${userId} authenticated and joined room`);
    });

    // Join conversation room
    socket.on('join_room', (conversationId) => {
      socket.join(conversationId);
      console.log(`Socket ${socket.id} joined room ${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave_room', (conversationId) => {
      socket.leave(conversationId);
      console.log(`Socket ${socket.id} left room ${conversationId}`);
    });

    // Typing start
    socket.on('typing_start', ({ conversationId, userId }) => {
      socket.to(conversationId).emit('typing_start', { userId, conversationId });
    });

    // Typing stop
    socket.on('typing_stop', ({ conversationId, userId }) => {
      socket.to(conversationId).emit('typing_stop', { userId, conversationId });
    });

    // Message delivered
    socket.on('message_delivered', async ({ messageId, senderId }) => {
      await Message.findByIdAndUpdate(messageId, { status: 'delivered' });
      io.to(senderId).emit('message_status', { messageId, status: 'delivered' });
    });

    // Message read
    socket.on('message_read', async ({ conversationId, userId }) => {
      await Message.updateMany(
        { conversationId, receiverId: userId, status: { $ne: 'read' } },
        { status: 'read' }
      );
      // Notify sender
      socket.to(conversationId).emit('message_read', { conversationId });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      let disconnectedUserId;
      for (let [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }

      if (disconnectedUserId) {
        onlineUsers.delete(disconnectedUserId);
        const lastSeen = new Date();
        await User.findByIdAndUpdate(disconnectedUserId, { isOnline: false, lastSeen });
        io.emit('user_offline', { userId: disconnectedUserId, lastSeen });
        console.log(`User ${disconnectedUserId} disconnected`);
      }
    });

    // --- Extended events for full integration ---
    
    // Broadcast message edit
    socket.on('message_edited', (message) => {
      socket.to(message.conversationId).emit('message_edited', message);
    });

    // Broadcast message delete
    socket.on('message_deleted', ({ messageId, conversationId, forEveryone }) => {
      socket.to(conversationId).emit('message_deleted', { messageId, forEveryone });
    });

    // Broadcast reaction
    socket.on('reaction_added', ({ messageId, conversationId, reactions }) => {
      socket.to(conversationId).emit('reaction_added', { messageId, reactions });
    });
  });
};

export default socketHandler;
