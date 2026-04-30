import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';

export const usePresence = (currentUserId: string | null) => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel('realtime:online-users', {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = new Set(Object.keys(state));
        console.log('[usePresence] Online users synced:', Array.from(onlineIds));
        setOnlineUsers(onlineIds);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('[usePresence] User joined:', key);
        setOnlineUsers(prev => new Set(prev).add(key));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('[usePresence] User left:', key);
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[usePresence] Subscribed, tracking user:', currentUserId);
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const isOnline = (userId: string) => onlineUsers.has(userId);

  return { isOnline, onlineUsers: Array.from(onlineUsers) };
};
