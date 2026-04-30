import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/config/supabase';
import { Message, MessageStatus } from '@/types';

export const useMessages = (chatId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      console.log(`[useMessages] Fetching messages for chatId: ${chatId}`);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[useMessages] Error fetching messages:', error);
      } else {
        const mapped = data.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          receiverId: m.receiver_id,
          content: m.text,
          type: m.type || 'text',
          mediaData: m.media_data,
          mediaUrl: m.media_url,
          mediaType: m.media_type,
          mediaSize: m.media_size,
          mediaName: m.media_name,
          uploadStatus: m.upload_status || 'done',
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: m.created_at,
          status: (m.status || (m.seen ? 'seen' : 'sent')) as MessageStatus
        }));
        setMessages(mapped);
      }
      setLoading(false);
    };

    fetchMessages();

    // Cleanup existing subscription if any
    if (channelRef.current) {
      console.log(`[useMessages] Removing existing channel for ${chatId}`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Subscribe to real-time changes
    console.log(`[useMessages] Setting up realtime subscription for chatId: ${chatId}`);
    
    channelRef.current = supabase.channel(`chat_messages:${chatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `chat_id=eq.${chatId}` 
      }, (payload) => {
        const newMessage = payload.new;
        if (!newMessage) return;

        const mapped: Message = {
          id: newMessage.id,
          senderId: newMessage.sender_id,
          receiverId: newMessage.receiver_id,
          content: newMessage.text,
          type: newMessage.type || 'text',
          mediaData: newMessage.media_data,
          mediaUrl: newMessage.media_url,
          mediaType: newMessage.media_type,
          mediaSize: newMessage.media_size,
          mediaName: newMessage.media_name,
          uploadStatus: newMessage.upload_status || 'done',
          timestamp: new Date(newMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: newMessage.created_at,
          status: (newMessage.status === 'seen' || newMessage.seen ? 'seen' : 'sent') as MessageStatus
        };

        setMessages(prev => {
          const index = prev.findIndex(m => m.id === mapped.id);
          if (index > -1) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...mapped };
            return updated;
          }
          return [...prev, mapped];
        });
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages', 
        filter: `chat_id=eq.${chatId}` 
      }, (payload) => {
        const updated = payload.new;
        setMessages(prev => prev.map(m => 
          m.id === updated.id ? { ...m, ...updated, status: (updated.status || (updated.seen ? 'seen' : 'sent')) as MessageStatus } : m
        ));
      })
      .subscribe((status) => {
        console.log(`[useMessages] Realtime status for ${chatId}: ${status}`);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chatId]);

  const sendMessage = async (text: string, senderId: string, chatId: string, type: string = 'text', mediaData: any = null, messageId?: string) => {
    try {
      const { data, error } = await supabase.from('messages').insert({
        id: messageId,
        chat_id: chatId,
        sender_id: senderId,
        text: text,
        type: type,
        media_data: mediaData,
        status: 'sent',
        seen: false
      }).select().single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[useMessages] SendMessage error:', err);
      throw err;
    }
  };

  const markAsRead = async (chatId: string, currentUserId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ status: 'seen', seen: true })
        .eq('chat_id', chatId)
        .neq('sender_id', currentUserId)
        .or('status.neq.seen,status.is.null');

      if (error) throw error;
    } catch (err) {
      console.error('[useMessages] markAsRead error:', err);
    }
  };

  return { messages, sendMessage, markAsRead, loading, setMessages };
};
