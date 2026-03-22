import { useState, useEffect } from 'react';

export const useInternet = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Show reconnected toast
        console.log('Back online!');
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Active ping check every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await fetch('https://www.google.com/favicon.ico', {
          mode: 'no-cors',
          cache: 'no-store'
        });
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const retry = async () => {
    try {
      await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-store'
      });
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  };

  return { isOnline, retry };
};
