import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = window.localStorage.getItem('mme-theme');
    return stored === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    window.localStorage.setItem('mme-theme', theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return {
    theme,
    toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
  };
}
