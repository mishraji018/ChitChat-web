import { useState } from 'react';
import { translations } from '@/i18n/translations';

export type Language = 'English' | 'Hindi' | 'Spanish' | 'French';

export const useLanguage = () => {
  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem('blinkchat_language') as Language) || 'English'
  );

  const t = translations[language];

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('blinkchat_language', lang);
  };

  return { language, changeLanguage, t };
};
