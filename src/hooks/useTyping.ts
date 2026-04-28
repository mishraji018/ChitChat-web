import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/config/supabase';

export const useTyping = (chatId: string | null, userId: string | null) => {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase.channel(`typing:${chatId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== userId) {
          setIsTyping(payload.isTyping);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, userId]);

  const sendTyping = (isTypingStatus: boolean) => {
    if (!chatId || !userId) return;

    supabase.channel(`typing:${chatId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, isTyping: isTypingStatus }
    });
  };

  const handleTyping = () => {
    sendTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 1500);
  };

  return { isTyping, handleTyping };
};
