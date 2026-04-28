import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';
import { Message } from '@/types/chat';

export const useMessages = (chatId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        const mapped = data.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          text: m.text,
          content: m.text,
          type: m.type || 'text',
          mediaData: m.media_data,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: m.seen ? 'read' : 'sent'
        }));
        setMessages(mapped);
      }
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to real-time changes
    const channel = supabase.channel(`messages:${chatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `chat_id=eq.${chatId}` 
      }, (payload) => {
        const newMsg = payload.new;
        const mapped: Message = {
          id: newMsg.id,
          senderId: newMsg.sender_id,
          text: newMsg.text,
          content: newMsg.text,
          type: newMsg.type || 'text',
          mediaData: newMsg.media_data,
          timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent'
        };
        setMessages(prev => {
          // Prevent duplicates if already added optimistically
          if (prev.find(m => m.id === mapped.id)) return prev;
          return [...prev, mapped];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const sendMessage = async (text: string, senderId: string, chatId: string, type: string = 'text', mediaData: any = null) => {
    try {
      const { data, error } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: senderId,
        text: text,
        type: type,
        media_data: mediaData,
        seen: false
      }).select().single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('SendMessage error:', err);
      throw err;
    }
  };

  return { messages, sendMessage, loading, setMessages };
};
