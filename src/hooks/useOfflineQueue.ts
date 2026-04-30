import { supabase } from '@/config/supabase';
import { useFileUpload } from './useFileUpload';
import { useIndexedDB } from './useIndexedDB';
import { useRef, useEffect } from 'react';

interface QueuedMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  attempts: number;
}

export const useOfflineQueue = () => {
  const QUEUE_KEY = 'blink_offline_queue';
  const isProcessing = useRef(false);
  const { uploadFile, getFileCategory } = useFileUpload();
  const { getAllPending, removeFromIndexedDB } = useIndexedDB();

  // Get all queued messages from localStorage
  const getQueue = (): QueuedMessage[] => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  // Add a message to the queue
  const addToQueue = (msg: Omit<QueuedMessage, 'attempts'>) => {
    const queue = getQueue();
    queue.push({ ...msg, attempts: 0 });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  };

  // Remove a message from queue by id
  const removeFromQueue = (id: string) => {
    const queue = getQueue().filter(m => m.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  };

  // Try to send all queued messages
  const processQueue = async () => {
    if (isProcessing.current) return;
    if (!navigator.onLine) return;

    const queue = getQueue();
    if (queue.length === 0) return;

    isProcessing.current = true;

    for (const msg of queue) {
      try {
        const { error } = await supabase.from('messages').insert({
          id: msg.id,
          chat_id: msg.chatId,
          sender_id: msg.senderId,
          text: msg.text, 
          created_at: msg.createdAt,
          seen: false
        });

        if (!error) {
          removeFromQueue(msg.id);
        } else if (msg.attempts >= 3) {
          // Give up after 3 attempts
          removeFromQueue(msg.id);
        } else {
          // Increment attempt count
          const currentQueue = getQueue();
          const updated = currentQueue.map(m =>
            m.id === msg.id ? { ...m, attempts: m.attempts + 1 } : m
          );
          localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
        }
      } catch (err) {
        console.error('Failed to process queued message:', err);
        // Network still failing, leave in queue
      }
    }

    // After processing text queue, process media queue
    const pendingMedia = await getAllPending();
    for (const item of pendingMedia) {
      try {
        const blob = new Blob([item.fileData], { type: item.fileType });
        const file = new File([blob], item.fileName, { type: item.fileType });
        
        const result = await uploadFile(file, item.chatId, item.senderId);
        
        await supabase.from('messages').insert({
          id: item.id,
          chat_id: item.chatId,
          sender_id: item.senderId,
          text: '',
          media_url: result.url,
          media_type: result.type,
          media_name: result.name,
          media_size: result.size,
          upload_status: 'done',
          seen: false,
          created_at: item.createdAt
        });
        
        await removeFromIndexedDB(item.id);
      } catch (err) {
        console.error('Failed to process queued media:', err);
        // Leave in IndexedDB, try again next time
      }
    }

    isProcessing.current = false;
  };

  // Listen for connection restore
  useEffect(() => {
    const handleOnline = () => {
      processQueue();
    };

    window.addEventListener('online', handleOnline);
    
    // Also try on mount (in case messages queued in previous session)
    processQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { addToQueue, getQueue, processQueue };
};
