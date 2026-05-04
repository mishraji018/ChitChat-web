/**
 * FILE: useMessages.ts
 * PURPOSE: Handles fetching, sending, and real-time syncing of messages
 * HOOKS USED: useState, useEffect, useRef
 * SUPABASE TABLES: messages
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/config/supabase';
import { Message, MessageStatus } from '@/types';

export const useMessages = (chatId: string | null) => {
  // ─── [1-10] State & Refs ──────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<any>(null);

  const mapMsg = useCallback((m: any): Message => ({
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
    status: (m.status || (m.seen ? 'seen' : 'sent')) as MessageStatus,
    is_ai: m.is_ai
  }), []);

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;
    setLoading(true);
    
    // Safety timeout: if loading takes more than 5s, stop spinner
    const timeoutId = setTimeout(() => setLoading(false), 5000);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      
      console.log('[fetch] data:', data, 'error:', error);
      if (error) {
        console.error('[useMessages] Fetch error:', error);
      } else {
        const mapped = data?.map(mapMsg) || [];
        setMessages(mapped);
        // Cache messages for this chat
        sessionStorage.setItem(`messages_${chatId}`, JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('[useMessages] unexpected error:', err);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [chatId, mapMsg]);

  // ─── [11-50] Effect: Initial Fetch ────────
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    // 1. Load from cache first for instant display
    const cached = sessionStorage.getItem(`messages_${chatId}`);
    if (cached) {
      try {
        setMessages(JSON.parse(cached));
      } catch (e) {
        console.error('[useMessages] Cache parse error:', e);
      }
    }

    // 2. Then fetch fresh from server
    fetchMessages();
  }, [chatId, fetchMessages]);

  // ─── [51-100] Effect: Realtime Sub ────────
  useEffect(() => {
    if (!chatId) return;

    // Clear old channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Set up subscription
    channelRef.current = supabase
      .channel(`messages_${chatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `chat_id=eq.${chatId}` 
      }, (p) => {
        console.log('[REALTIME] INSERT received:', p.new);
        if (!p.new) return;
        const newMessage = p.new;
        if (!newMessage.text && !newMessage.media_url) return;
        const mapped = mapMsg(newMessage);
        setMessages(prev => {
          const exists = prev.some(m => m.id === mapped.id);
          const next = exists ? prev : [...prev, mapped];
          sessionStorage.setItem(`messages_${chatId}`, JSON.stringify(next));
          return next;
        });
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages', 
        filter: `chat_id=eq.${chatId}` 
      }, (p) => {
        console.log('[REALTIME UPDATE]', p.new.id, p.new.status);
        const up = p.new;
        setMessages(prev => {
          const next = prev.map(m => m.id === up.id ? { 
            ...m, 
            status: up.status as MessageStatus,
            seen: up.seen 
          } : m);
          sessionStorage.setItem(`messages_${chatId}`, JSON.stringify(next));
          return next;
        });
      })
      .subscribe((status) => {
        console.log(`[REALTIME] Status for ${chatId}:`, status);
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          // Retry after 2 seconds
          setTimeout(() => {
            if (channelRef.current) {
              channelRef.current.subscribe();
            }
          }, 2000);
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chatId, mapMsg]);

  // ─── [101-160] Event Handlers ───────────────
  const sendMessage = async (text: string, sId: string, cId: string, type: string = 'text', mData: any = null, mId?: string, isAI: boolean = false) => {
    if (type === 'text' && (!text || !text.trim())) return;

    const payload: any = {
      id: mId,
      chat_id: cId,
      sender_id: sId,
      text: text.trim(),
      type,
      media_data: mData,
      status: 'sent',
      seen: false,
      is_ai: isAI,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('messages').insert(payload).select().single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[useMessages] Send error:', err);
      throw err;
    }
  };

  const markAsRead = async (cId: string, uId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ status: 'seen', seen: true })
        .eq('chat_id', cId)
        .neq('sender_id', uId)
        .in('status', ['sent', 'delivered'])
        .select();
      
      console.log('[markAsRead] updated:', data, 'error:', error);
      if (error) throw error;
    } catch (err) {
      console.error('[useMessages] Read error:', err);
    }
  };

  return { messages, sendMessage, markAsRead, loading, setMessages };
};
