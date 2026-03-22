import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const useSocket = (userId: string | undefined) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Connect with optimized settings
    socket = io(SOCKET_URL, {
      transports: ['websocket'], // websocket only — fastest
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
      // Register user immediately on connect
      socket?.emit('user:online', userId);
    });

    socket.on('queue:delivered', ({ count, message }: { count: number, message: string }) => {
      toast.info(`📦 ${message}`, { duration: 4000 });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [userId]);

  // Send message
  const sendMessage = useCallback((messageData: any) => {
    if (!socketRef.current?.connected) {
      console.error('Socket not connected');
      return;
    }
    socketRef.current.emit('message:send', messageData);
  }, []);

  // Typing indicators
  const startTyping = useCallback((senderId: string, receiverId: string) => {
    socketRef.current?.emit('typing:start', { senderId, receiverId });
  }, []);

  const stopTyping = useCallback((senderId: string, receiverId: string) => {
    socketRef.current?.emit('typing:stop', { senderId, receiverId });
  }, []);

  // Mark as read
  const markAsRead = useCallback((messageId: string, senderId: string, conversationId: string) => {
    socketRef.current?.emit('message:read', { messageId, senderId, conversationId });
  }, []);

  // Delete message
  const deleteMessage = useCallback((messageId: string, deletedBy: string, deleteForEveryone: boolean, receiverId: string) => {
    socketRef.current?.emit('message:delete', { messageId, deletedBy, deleteForEveryone, receiverId });
  }, []);

  // Edit message
  const editMessage = useCallback((messageId: string, newContent: string, receiverId: string) => {
    socketRef.current?.emit('message:edit', { messageId, newContent, receiverId });
  }, []);

  // React to message
  const reactToMessage = useCallback((messageId: string, emoji: string, userId: string, receiverId: string) => {
    socketRef.current?.emit('message:react', { messageId, emoji, userId, receiverId });
  }, []);

  return {
    socket: socketRef.current,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    deleteMessage,
    editMessage,
    reactToMessage
  };
};
