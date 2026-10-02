/**
 * FILE: useMessages.ts
 * PURPOSE: Handles fetching, sending, and real-time syncing of messages
 * HOOKS USED: useState, useEffect, useRef
 * SUPABASE TABLES: messages
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/config/supabase';
import { Message, MessageStatus } from '@/types';

export const sortMessagesByTime = <T extends { createdAt?: string; created_at?: string }>(msgs: T[]): T[] => {
  return [...msgs].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
    const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
    return timeA - timeB;
  });
};

export const useMessages = (chatId: string | null, initialMessages: Message[] = []) => {
  const [messages, setMessages] = useState<Message[]>(() => sortMessagesByTime(initialMessages));
  const [loading, setLoading] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR'>('CONNECTING');
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

    const timeoutId = !isBackground ? setTimeout(() => setLoading(false), 5000) : null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        if (import.meta.env.DEV) console.error('[useMessages] Fetch error:', error);
      } else {
        const mapped = data?.map(mapMsg) || [];
        setMessages(prev => {
          if (mapped.length > 0) {
            const pendingOptimistic = prev.filter(m => m.status === 'sending');
            const serverIds = new Set(mapped.map(m => m.id));
            const stillPending = pendingOptimistic.filter(m => !serverIds.has(m.id));
            const merged = sortMessagesByTime([...mapped, ...stillPending]);
            localStorage.setItem(`messages_${chatId}`, JSON.stringify(merged));
            return merged;
          }
          if (prev.length > 0) {
            return sortMessagesByTime(prev);
          }
          return [];
        });
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[useMessages] unexpected error:', err);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (!isBackground) setLoading(false);
    }
  }, [chatId, mapMsg]);

  // Initial fetch and cache load
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    if (initialMessages && initialMessages.length > 0) {
      setMessages(sortMessagesByTime(initialMessages));
    }

    const cached = localStorage.getItem(`messages_${chatId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(sortMessagesByTime(parsed));
        }
      } catch (e) {
        if (import.meta.env.DEV) console.error('[useMessages] Cache parse error:', e);
      }
    }

    fetchMessages();
  }, [chatId, fetchMessages]);

  // Dynamic Polling: 15s safety net when SUBSCRIBED, 2s fallback when CONNECTING/CLOSED/ERROR
  useEffect(() => {
    if (!chatId) return;

    const intervalTime = realtimeStatus === 'SUBSCRIBED' ? 15000 : 2000;
    const pollInterval = setInterval(() => {
      fetchMessages(true);
    }, intervalTime);

    return () => clearInterval(pollInterval);
  }, [chatId, realtimeStatus, fetchMessages]);

  useEffect(() => {
    if (!chatId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setRealtimeStatus('CONNECTING');

    channelRef.current = supabase
      .channel(`messages_${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (p) => {
        if (!p.new) return;
        const newMessage = p.new;
        if (!newMessage.text && !newMessage.media_url) return;
        const mapped = mapMsg(newMessage);
        setMessages(prev => {
          const alreadyExists = prev.some(m => m.id === mapped.id);
          if (alreadyExists) return prev;

          const pendingIndex = prev.findIndex(m => m.status === 'sending' && m.senderId === mapped.senderId && m.content === mapped.content);
          let next: Message[];
          if (pendingIndex !== -1) {
            next = [...prev];
            next[pendingIndex] = { ...next[pendingIndex], ...mapped, status: (mapped.status || 'sent') as MessageStatus };
          } else {
            next = [...prev, mapped];
          }
          const sorted = sortMessagesByTime(next);
          localStorage.setItem(`messages_${chatId}`, JSON.stringify(sorted));
          return sorted;
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (p) => {
        const up = p.new;
        setMessages(prev => {
          const next = prev.map(m => m.id === up.id ? {
            ...m,
            status: up.status as MessageStatus,
            seen: up.seen,
            reactions: up.reactions ?? m.reactions
          } : m);
          const sorted = sortMessagesByTime(next);
          localStorage.setItem(`messages_${chatId}`, JSON.stringify(sorted));
          return sorted;
        });
      })
      .subscribe((status) => {
        setRealtimeStatus(status as any);
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
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

  // FIX: id ab client-generated hi DB me insert hota hai — optimistic <-> realtime race khatam
  const sendMessage = async (
    text: string,
    sId: string,
    cId: string,
    type: string = 'text',
    mData: any = null,
    mId?: string,
    isAI: boolean = false,
    replyTo?: { id: string; senderName?: string; text: string } | null,
    isRecipientOnline: boolean = false
  ) => {
    if (type === 'text' && (!text || !text.trim())) return;
    const clientGeneratedId = mId || crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const targetStatus: MessageStatus = isRecipientOnline ? 'delivered' : 'sent';

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
      const next = exists ? prev : sortMessagesByTime([...prev, optimisticMsg]);
      localStorage.setItem(`messages_${cId}`, JSON.stringify(next));
      return next;
    });

    try {
      const payload: any = {
        id: clientGeneratedId, // <-- FIX: DB row ka id bhi yahi rahe
        chat_id: cId,
        sender_id: sId,
        text: text.trim(),
        type,
        status: targetStatus,
        seen: false,
        created_at: nowIso
      };

      if (replyTo?.id) payload.reply_to = replyTo.id;
      if (replyTo) payload.reply_to_message = replyTo;

      let result = await supabase.from('messages').insert(payload).select().single();

      if (result.error) {
        if (import.meta.env.DEV) console.warn('[useMessages] insert with reply error, trying base payload:', result.error.message);
        const basePayload: any = {
          id: clientGeneratedId,
          chat_id: cId,
          sender_id: sId,
          text: text.trim(),
          type,
          status: targetStatus,
          seen: false,
          created_at: nowIso
        };
        result = await supabase.from('messages').insert(basePayload).select().single();
      }

      if (result.error) throw result.error;

      const confirmedMsg = mapMsg(result.data);
      setMessages(prev => {
        const next = prev.map(m => m.id === clientGeneratedId ? {
          ...optimisticMsg,
          ...confirmedMsg,
          status: (confirmedMsg.status || targetStatus) as MessageStatus
        } : m);
        const sorted = sortMessagesByTime(next);
        localStorage.setItem(`messages_${cId}`, JSON.stringify(sorted));
        return sorted;
      });

      return result.data;
    } catch (err) {
      if (import.meta.env.DEV) console.error('[useMessages] Send error:', err);
      setMessages(prev => prev.map(m => m.id === clientGeneratedId ? { ...m, status: 'error' as MessageStatus } : m));
    }
  };

  const markAsRead = async (cId: string, uId: string) => {
    // 1. Instant optimistic update so local UI reflects seen immediately without waiting for DB
    setMessages(prev => {
      let changed = false;
      const next = prev.map(m => {
        if (m.senderId !== uId && m.status !== 'seen') {
          changed = true;
          return { ...m, status: 'seen' as MessageStatus, seen: true };
        }
        return m;
      });
      if (changed) {
        localStorage.setItem(`messages_${cId}`, JSON.stringify(next));
        return next;
      }
      return prev;
    });

    try {
      const { error } = await supabase
        .from('messages')
        .update({ status: 'seen', seen: true })
        .eq('chat_id', cId)
        .neq('sender_id', uId)
        .in('status', ['sent', 'delivered'])
        .select();
      if (error) throw error;
    } catch (err) {
      if (import.meta.env.DEV) console.error('[useMessages] Read error:', err);
    }
  };

  const markAsDelivered = async (cId: string, uId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ status: 'delivered' })
        .eq('chat_id', cId)
        .neq('sender_id', uId)
        .eq('status', 'sent')
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        setMessages(prev => prev.map(m => {
          if (m.senderId !== uId && m.status === 'sent') {
            return { ...m, status: 'delivered' as MessageStatus };
          }
          return m;
        }));
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[useMessages] Delivered error:', err);
    }
  };

  // FIX: ab stale `messages` closure pe depend nahi karta
  const addReaction = async (mId: string, emoji: string, uId: string) => {
    let updatedReactions: { emoji: string; userId: string }[] = [];

    setMessages(prev => {
      const next = prev.map(m => {
        if (m.id === mId) {
          const currentReactions = m.reactions || [];
          const existing = currentReactions.find(r => r.userId === uId);
          updatedReactions = existing
            ? currentReactions.map(r => r.userId === uId ? { ...r, emoji } : r)
            : [...currentReactions, { emoji, userId: uId }];
          return { ...m, reactions: updatedReactions };
        }
        return m;
      });
      if (chatId) localStorage.setItem(`messages_${chatId}`, JSON.stringify(next));
      return next;
    });

    try {
      await supabase.from('messages').update({ reactions: updatedReactions }).eq('id', mId);
    } catch (err) {
      console.error('[useMessages] Reaction error:', err);
    }
  };

  return { messages, sendMessage, markAsRead, markAsDelivered, addReaction, loading, setMessages };
};
