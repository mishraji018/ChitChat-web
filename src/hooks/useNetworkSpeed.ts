import { useState, useEffect } from 'react';

export type NetworkSpeed = 'fast' | 'medium' | 'slow' | 'offline';

interface NetworkStatus {
  speed: NetworkSpeed;
  ping: number;
  effectiveType: string;
}

export const useNetworkSpeed = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    speed: 'fast',
    ping: 0,
    effectiveType: '4g',
  });

  const measurePing = async () => {
    if (!navigator.onLine) {
      setStatus(prev => ({ ...prev, speed: 'offline' }));
      return;
    }

    try {
      const start = Date.now();
      // Using a small resource to measure ping
      await fetch('/favicon.ico?t=' + Date.now(), { cache: 'no-store' });
      const ping = Date.now() - start;

      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType || '4g';

      let speed: NetworkSpeed = 'fast';
      if (ping > 300) speed = 'slow';
      else if (ping > 100) speed = 'medium';

      setStatus({
        speed,
        ping,
        effectiveType,
      });
    } catch (error) {
      console.error('Failed to measure ping:', error);
      if (!navigator.onLine) {
        setStatus(prev => ({ ...prev, speed: 'offline' }));
      }
    }
  };

  useEffect(() => {
    measurePing();
    const interval = setInterval(measurePing, 10000);

    const handleOnline = () => measurePing();
    const handleOffline = () => setStatus(prev => ({ ...prev, speed: 'offline' }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
};
