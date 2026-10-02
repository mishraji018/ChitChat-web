/**
 * FILE: src/lib/realtimeManager.ts
 * PURPOSE: Singleton channel registry — ensures each named Supabase Realtime
 * channel is subscribed ONCE, preventing "tried to join multiple times" crash
 * from React StrictMode double-invoke and Vite HMR re-runs.
 */

import { supabase } from '@/config/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Persisted across HMR via globalThis (same as supabase singleton)
declare global {
  // eslint-disable-next-line no-var
  var __realtimeChannels: Map<string, RealtimeChannel> | undefined;
}

const registry: Map<string, RealtimeChannel> =
  globalThis.__realtimeChannels ?? new Map();

if (import.meta.env.DEV) {
  globalThis.__realtimeChannels = registry;
}

/**
 * Subscribe to a named channel exactly once.
 * If a channel with this name already exists in the registry, return it as-is.
 */
export function subscribeOnce(
  channelName: string,
  setup: (channel: RealtimeChannel) => RealtimeChannel
): RealtimeChannel {
  if (registry.has(channelName)) {
    return registry.get(channelName)!;
  }
  const channel = setup(supabase.channel(channelName));
  registry.set(channelName, channel);
  return channel;
}

/**
 * Cleanly remove a named channel from Supabase AND the registry.
 */
export function unsubscribe(channelName: string): void {
  const channel = registry.get(channelName);
  if (channel) {
    supabase.removeChannel(channel).catch(() => {});
    registry.delete(channelName);
  }
}

/**
 * Tear down ALL active channels (useful on logout / full reset).
 */
export function unsubscribeAll(): void {
  registry.forEach((channel) => {
    supabase.removeChannel(channel).catch(() => {});
  });
  registry.clear();
}
