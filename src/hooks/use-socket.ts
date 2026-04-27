import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { apiFetch } from '@/utils/tokenManager';
import { supabase } from '@/lib/supabase';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const useSocket = (userId: string | undefined) => {
  const socketRef = useRef<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Connect with optimized settings
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', async () => {
      console.log('Socket connected:', socket?.id);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('blinkchat_token');
      // Register user immediately on connect using backend's 'authenticate' event
      socket?.emit('authenticate', { userId, token });
    });

    // --- Listeners for Real-time Updates ---
    
    socket.on('new_message', (message) => {
      // This will be handled by the component listening to this socket
      console.log('New message received via socket:', message);
    });

    socket.on('user_online', ({ userId: onlineUserId }) => {
      setOnlineUsers(prev => [...new Set([...prev, onlineUserId])]);
      console.log(`User online: ${onlineUserId}`);
    });

    socket.on('user_offline', ({ userId: offlineUserId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== offlineUserId));
      console.log(`User offline: ${offlineUserId}`);
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

  // Send message via API (which then emits via Socket)
  const sendMessage = useCallback(async (messageData: any) => {
    try {
      const response = await apiFetch('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify(messageData)
      });
      return await response?.json();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  }, []);

  // Typing indicators using backend event names
  const startTyping = useCallback((userId: string, conversationId: string) => {
    socketRef.current?.emit('typing_start', { userId, conversationId });
  }, []);

  const stopTyping = useCallback((userId: string, conversationId: string) => {
    socketRef.current?.emit('typing_stop', { userId, conversationId });
  }, []);

  // Mark as read using backend event name
  const markAsRead = useCallback((conversationId: string, userId: string) => {
    socketRef.current?.emit('message_read', { conversationId, userId });
  }, []);

  // Delete message
  const deleteMessage = useCallback((messageId: string, forEveryone: boolean, conversationId: string) => {
    socketRef.current?.emit('message_deleted', { messageId, conversationId, forEveryone });
  }, []);

  // Edit message
  const editMessage = useCallback((message) => {
    socketRef.current?.emit('message_edited', message);
  }, []);

  // React to message
  const reactToMessage = useCallback((messageId: string, conversationId: string, reactions: any) => {
    socketRef.current?.emit('reaction_added', { messageId, conversationId, reactions });
  }, []);

  return {
    socket: socketRef.current,
    onlineUsers,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    deleteMessage,
    editMessage,
    reactToMessage
  };
};
