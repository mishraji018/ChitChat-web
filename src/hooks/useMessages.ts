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
    status: (m.status || (m.seen ? 'seen' : 'sent')) as MessageStatus
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
      
      if (error) {
        console.log('[useMessages] fetch error:', error);
        console.error('[useMessages] Fetch error:', error);
      } else {
        setMessages(data?.map(mapMsg) || []);
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
          return exists ? prev : [...prev, mapped];
        });
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages', 
        filter: `chat_id=eq.${chatId}` 
      }, (p) => {
        const up = p.new;
        setMessages(prev => prev.map(m => m.id === up.id ? { 
          ...m, 
          ...up, 
          status: (up.status || (up.seen ? 'seen' : 'sent')) as MessageStatus 
        } : m));
      })
      .subscribe((status) => {
        console.log(`[REALTIME] Status for ${chatId}:`, status);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chatId, mapMsg]);

  // ─── [101-160] Event Handlers ───────────────
  const sendMessage = async (text: string, sId: string, cId: string, type: string = 'text', mData: any = null, mId?: string) => {
    if (type === 'text' && (!text || !text.trim())) return;

    const payload = {
      id: mId,
      chat_id: cId,
      sender_id: sId,
      text: text.trim(),
      type,
      media_data: mData,
      status: 'sent',
      seen: false,
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
      const { error } = await supabase.from('messages').update({ status: 'seen', seen: true }).eq('chat_id', cId).neq('sender_id', uId).or('status.neq.seen,status.is.null');
      if (error) throw error;
    } catch (err) {
      console.error('[useMessages] Read error:', err);
    }
  };

  return { messages, sendMessage, markAsRead, loading, setMessages };
};
