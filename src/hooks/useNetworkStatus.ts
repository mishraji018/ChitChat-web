/**
 * FILE: useNetworkStatus.ts
 * PURPOSE: Monitors the device's internet connection status
 * HOOKS USED: useState, useEffect
 */

import { useState, useEffect } from 'react';

export const useNetworkStatus = () => {
  // ─── [1-10] State & Refs ──────────────────
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  // ─── [11-26] Event Listeners ───────────────
  useEffect(() => {
    const hO = () => { setIsOnline(true); setWasOffline(true); setTimeout(() => setWasOffline(false), 3000); };
    const hOff = () => setIsOnline(false);

    window.addEventListener('online', hO);
    window.addEventListener('offline', hOff);
    return () => { window.removeEventListener('online', hO); window.removeEventListener('offline', hOff); };
  }, []);

  return { isOnline, wasOffline };
};
