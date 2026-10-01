/**
 * FILE: usePresence.ts
 * PURPOSE: Tracks online/offline status of users via Supabase Presence
 * HOOKS USED: useState, useEffect
 * SUPABASE TABLES: users (for last_seen update)
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';

export const usePresence = (uId: string | null) => {
  // ─── [1-10] State & Refs ──────────────────
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // ─── [11-80] Supabase Fetch & Realtime ────
  useEffect(() => {
    if (!uId) return;

    // Use unique channel per hook instance to prevent 'cannot add presence callbacks after subscribe()'
    const channelName = `presence-tracker-${uId}`;
    const chan = supabase.channel(channelName);
    const updLS = () => {
      supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', uId)
        .then(({ error }) => error && console.error('[usePresence] LS error:', error));
    };

    const track = async () => {
      await chan.track({ user_id: uId, online_at: new Date().toISOString() });
    };
    const untrack = async () => {
      await chan.untrack();
      updLS();
    };

    const hVC = () => (document.hidden ? untrack() : track());
    const hBU = () => updLS();

    chan
      .on('presence', { event: 'sync' }, () => {
        const state = chan.presenceState();
        const ids = new Set<string>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id) ids.add(p.user_id);
          });
        });
        setOnlineUsers(ids);
      })
      .subscribe(async (s) => {
        if (s === 'SUBSCRIBED') {
          await track();
        }
      });

    document.addEventListener('visibilitychange', hVC);
    window.addEventListener('beforeunload', hBU);

    return () => {
      document.removeEventListener('visibilitychange', hVC);
      window.removeEventListener('beforeunload', hBU);
      supabase.removeChannel(chan);
      updLS();
    };
  }, [uId]);

  // ─── [81-94] Return ───────────────────────
  return { isOnline: (id: string) => onlineUsers.has(id), onlineUsers: Array.from(onlineUsers) };
};
