import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'slothub_portal_theme';

const PortalThemeContext = createContext(null);

export const PortalThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' ? 'light' : 'dark';
  });

  const setTheme = useCallback((next) => {
    const t = next === 'light' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === 'dark',
      isLight: theme === 'light',
    }),
    [theme, setTheme, toggleTheme]
  );

  return <PortalThemeContext.Provider value={value}>{children}</PortalThemeContext.Provider>;
};

export const usePortalTheme = () => {
  const ctx = useContext(PortalThemeContext);
  if (!ctx) {
    throw new Error('usePortalTheme must be used within PortalThemeProvider');
  }
  return ctx;
};

export default PortalThemeContext;
