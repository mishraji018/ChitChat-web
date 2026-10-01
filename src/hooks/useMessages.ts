/**
 * FILE: useMessages.ts
 * PURPOSE: Handles fetching, sending, and real-time syncing of messages
 * HOOKS USED: useState, useEffect, useRef
 * SUPABASE TABLES: messages
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/config/supabase';
import { Message, MessageStatus } from '@/types';

export const useMessages = (chatId: string | null, initialMessages: Message[] = []) => {
  // ─── [1-10] State & Refs ──────────────────
  const [messages, setMessages] = useState<Message[]>(initialMessages);
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
    replyTo: m.reply_to,
    replyToMessage: m.reply_to_message,
    reactions: m.reactions || [],
    is_ai: m.is_ai
  }), []);

  const fetchMessages = useCallback(async (isBackground = false) => {
    if (!chatId) return;
    if (!isBackground) setLoading(true);

    // Safety timeout: if loading takes more than 5s, stop spinner
    const timeoutId = !isBackground ? setTimeout(() => setLoading(false), 5000) : null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[useMessages] Fetch error:', error);
      } else {
        const mapped = data?.map(mapMsg) || [];
        setMessages(prev => {
          // If server returned messages, merge them preserving any pending optimistic messages
          if (mapped.length > 0) {
            const pendingOptimistic = prev.filter(m => m.status === 'sending');
            const serverIds = new Set(mapped.map(m => m.id));
            const stillPending = pendingOptimistic.filter(m => !serverIds.has(m.id));
            const merged = [...mapped, ...stillPending];
            localStorage.setItem(`messages_${chatId}`, JSON.stringify(merged));
            return merged;
          }
          // If server returned 0 messages but we already have preloaded/optimistic messages, don't wipe them!
          if (prev.length > 0) {
            return prev;
          }
          return [];
        });
      }
    } catch (err) {
      console.error('[useMessages] unexpected error:', err);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (!isBackground) setLoading(false);
    }
  }, [chatId, mapMsg]);

  // ─── [11-50] Effect: Initial Fetch & Polling Fallback ────────
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    // 0. Use pre-loaded messages from conversation if provided
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }

    // 1. Load from cache first for instant display
    const cached = localStorage.getItem(`messages_${chatId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (e) {
        console.error('[useMessages] Cache parse error:', e);
      }
    }

    // 2. Fetch fresh messages immediately
    fetchMessages();

    // 3. Fallback Polling every 2s in background (critical when Supabase Realtime channel is CLOSED)
    const pollInterval = setInterval(() => {
      fetchMessages(true);
    }, 2000);

    return () => clearInterval(pollInterval);
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
          localStorage.setItem(`messages_${chatId}`, JSON.stringify(next));
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
          localStorage.setItem(`messages_${chatId}`, JSON.stringify(next));
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
  const sendMessage = async (
    text: string,
    sId: string,
    cId: string,
    type: string = 'text',
    mData: any = null,
    mId?: string,
    isAI: boolean = false,
    replyTo?: { id: string; senderName?: string; text: string } | null
  ) => {
    if (type === 'text' && (!text || !text.trim())) return;
    const clientGeneratedId = mId || crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // 1. Optimistic message for instant UI render
    const optimisticMsg: Message = {
      id: clientGeneratedId,
      senderId: sId,
      receiverId: '',
      content: text.trim(),
      type: type as any,
      mediaData: mData,
      status: 'sending' as MessageStatus,
      createdAt: nowIso,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_ai: isAI,
      replyTo: replyTo?.id,
      replyToMessage: replyTo || undefined
    };

    setMessages(prev => {
      const exists = prev.some(m => m.id === clientGeneratedId);
      const next = exists ? prev : [...prev, optimisticMsg];
      localStorage.setItem(`messages_${cId}`, JSON.stringify(next));
      return next;
    });

    const fullPayload: any = {
      id: clientGeneratedId,
      chat_id: cId,
      sender_id: sId,
      text: text.trim(),
      type,
      media_data: mData,
      status: 'sent',
      seen: false,
      is_ai: isAI,
      reply_to: replyTo?.id || null,
      reply_to_message: replyTo || null,
      created_at: nowIso
    };

    try {
      // First try full payload
      let result = await supabase.from('messages').insert(fullPayload).select().single();

      // If failed due to extra column (reply_to or reply_to_message not in DB), fallback to base schema
      if (result.error) {
        console.warn('[useMessages] Full insert error, trying standard payload:', result.error.message);
        const basePayload: any = {
          id: clientGeneratedId,
          chat_id: cId,
          sender_id: sId,
          text: text.trim(),
          type,
          media_data: mData,
          status: 'sent',
          seen: false,
          is_ai: isAI,
          created_at: nowIso
        };
        result = await supabase.from('messages').insert(basePayload).select().single();
      }

      // If still error, try minimal schema (id, chat_id, sender_id, text, created_at, seen)
      if (result.error) {
        console.warn('[useMessages] Base insert error, trying minimal payload:', result.error.message);
        const minimalPayload: any = {
          id: clientGeneratedId,
          chat_id: cId,
          sender_id: sId,
          text: text.trim(),
          seen: false,
          created_at: nowIso
        };
        result = await supabase.from('messages').insert(minimalPayload).select().single();
      }

      if (result.error) throw result.error;

      // Update optimistic message status to 'sent'
      setMessages(prev => {
        const next = prev.map(m => m.id === clientGeneratedId ? { ...m, status: 'sent' as MessageStatus } : m);
        localStorage.setItem(`messages_${cId}`, JSON.stringify(next));
        return next;
      });

      return result.data;
    } catch (err) {
      console.error('[useMessages] Send error:', err);
      // Mark optimistic message as failed
      setMessages(prev => prev.map(m => m.id === clientGeneratedId ? { ...m, status: 'error' as MessageStatus } : m));
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

  const markAsDelivered = async (cId: string, uId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ status: 'delivered' })
        .eq('chat_id', cId)
        .neq('sender_id', uId)
        .eq('status', 'sent');
    } catch (err) {
      console.error('[useMessages] Delivered error:', err);
    }
  };

  const addReaction = async (mId: string, emoji: string, uId: string) => {
    setMessages(prev => {
      const next = prev.map(m => {
        if (m.id === mId) {
          const currentReactions = m.reactions || [];
          const existing = currentReactions.find(r => r.userId === uId);
          let updated;
          if (existing) {
            updated = currentReactions.map(r => r.userId === uId ? { ...r, emoji } : r);
          } else {
            updated = [...currentReactions, { emoji, userId: uId }];
          }
          return { ...m, reactions: updated };
        }
        return m;
      });
      if (chatId) localStorage.setItem(`messages_${chatId}`, JSON.stringify(next));
      return next;
    });

    try {
      const target = messages.find(m => m.id === mId);
      const current = target?.reactions || [];
      const updated = current.some(r => r.userId === uId)
        ? current.map(r => r.userId === uId ? { ...r, emoji } : r)
        : [...current, { emoji, userId: uId }];

      await supabase
        .from('messages')
        .update({ reactions: updated })
        .eq('id', mId);
    } catch (err) {
      console.error('[useMessages] Reaction error:', err);
    }
  };

  return { messages, sendMessage, markAsRead, markAsDelivered, addReaction, loading, setMessages };
};
