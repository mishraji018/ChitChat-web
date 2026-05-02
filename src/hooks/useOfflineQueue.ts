/**
 * FILE: useOfflineQueue.ts
 * PURPOSE: Manages queuing and sending of messages when the device is offline
 * HOOKS USED: useRef, useEffect
 * SUPABASE TABLES: messages
 */

import { supabase } from '@/config/supabase';
import { useFileUpload } from './useFileUpload';
import { useIndexedDB } from './useIndexedDB';
import { useRef, useEffect } from 'react';

interface QueuedMessage { id: string; chatId: string; senderId: string; text: string; createdAt: string; attempts: number; }

export const useOfflineQueue = () => {
  // ─── [1-15] State & Refs ──────────────────
  const Q_KEY = 'blink_offline_queue';
  const isProc = useRef(false);
  const { uploadFile } = useFileUpload();
  const { getAllPending, removeFromIndexedDB } = useIndexedDB();

  // ─── [16-40] Helpers ──────────────────────
  const getQueue = (): QueuedMessage[] => { try { return JSON.parse(localStorage.getItem(Q_KEY) || '[]'); } catch { return []; } };
  const setQueue = (q: QueuedMessage[]) => localStorage.setItem(Q_KEY, JSON.stringify(q));

  const addToQueue = (msg: Omit<QueuedMessage, 'attempts'>) => setQueue([...getQueue(), { ...msg, attempts: 0 }]);
  const rmFromQ = (id: string) => setQueue(getQueue().filter(m => m.id !== id));

  // ─── [41-115] Processing ───────────────────
  const processQueue = async () => {
    if (isProc.current || !navigator.onLine) return;
    const q = getQueue(), pMedia = await getAllPending();
    if (q.length === 0 && pMedia.length === 0) return;

    isProc.current = true;

    for (const m of q) {
      try {
        const { error } = await supabase.from('messages').insert({ id: m.id, chat_id: m.chatId, sender_id: m.senderId, text: m.text, created_at: m.createdAt, seen: false });
        if (!error || m.attempts >= 3) rmFromQ(m.id);
        else setQueue(getQueue().map(msg => msg.id === m.id ? { ...msg, attempts: msg.attempts + 1 } : msg));
      } catch (e) { console.error('Queue error:', e); }
    }

    for (const item of pMedia) {
      try {
        const f = new File([new Blob([item.fileData], { type: item.fileType })], item.fileName, { type: item.fileType });
        const res = await uploadFile(f, item.chatId, item.senderId);
        await supabase.from('messages').insert({ id: item.id, chat_id: item.chatId, sender_id: item.senderId, text: '', media_url: res.url, media_type: res.type, media_name: res.name, media_size: res.size, upload_status: 'done', seen: false, created_at: item.createdAt });
        await removeFromIndexedDB(item.id);
      } catch (e) { console.error('Media queue error:', e); }
    }
    isProc.current = false;
  };

  useEffect(() => {
    const hO = () => processQueue();
    window.addEventListener('online', hO);
    processQueue();
    return () => window.removeEventListener('online', hO);
  }, []);

  return { addToQueue, getQueue, processQueue };
};
