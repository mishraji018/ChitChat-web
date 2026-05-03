import { useState, useEffect } from 'react';

export const WALLPAPERS = [
  { id: 'default', name: 'Default', bg: '#0f0f0f', pattern: 'none' },
  { id: 'purple', name: 'Purple', bg: 'linear-gradient(135deg, #1a0b2e, #0f0f0f)' },
  { id: 'blue', name: 'Ocean', bg: 'linear-gradient(135deg, #0a1628, #0f0f0f)' },
  { id: 'green', name: 'Forest', bg: 'linear-gradient(135deg, #0a1f0a, #0f0f0f)' },
  { id: 'sunset', name: 'Sunset', bg: 'linear-gradient(135deg, #2d0a0a, #1a0b0b)' },
  { id: 'gold', name: 'Gold', bg: 'linear-gradient(135deg, #1f1600, #0f0f0f)' },
];

export const useWallpaper = (chatId?: string) => {
  const [globalWallpaper, setGlobalWallpaper] = useState(() => {
    return localStorage.getItem('global_theme') || 'default';
  });

  const [chatWallpaper, setChatWallpaper] = useState(() => {
    if (!chatId) return null;
    return localStorage.getItem(`wallpaper_${chatId}`);
  });

  useEffect(() => {
    if (chatId) {
      setChatWallpaper(localStorage.getItem(`wallpaper_${chatId}`));
    }
  }, [chatId]);

  const setWallpaper = (wallpaperId: string, isGlobal: boolean = false) => {
    if (isGlobal) {
      localStorage.setItem('global_theme', wallpaperId);
      setGlobalWallpaper(wallpaperId);
    } else if (chatId) {
      localStorage.setItem(`wallpaper_${chatId}`, wallpaperId);
      setChatWallpaper(wallpaperId);
    }
  };

  const currentWallpaperId = chatWallpaper || globalWallpaper;
  const currentWallpaper = WALLPAPERS.find(w => w.id === currentWallpaperId) || WALLPAPERS[0];

  return {
    currentWallpaper,
    globalWallpaper,
    chatWallpaper,
    setWallpaper,
    WALLPAPERS
  };
};
