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

    const chan = supabase.channel('realtime:online-users', { config: { presence: { key: uId } } });
    const updLS = () => supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', uId).then(({ error }) => error && console.error('[usePresence] LS error:', error));

    const track = () => chan.track({ online_at: new Date().toISOString() });
    const untrack = () => { chan.untrack(); updLS(); };

    const hVC = () => document.hidden ? untrack() : track();
    const hBU = () => updLS();

    chan.on('presence', { event: 'sync' }, () => {
      const ids = new Set(Object.keys(chan.presenceState()));
      setOnlineUsers(ids);
    })
    .on('presence', { event: 'join' }, ({ key }) => setOnlineUsers(p => new Set(p).add(key)))
    .on('presence', { event: 'leave' }, ({ key }) => setOnlineUsers(p => { const n = new Set(p); n.delete(key); return n; }))
    .subscribe(async (s) => s === 'SUBSCRIBED' && await track());

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
