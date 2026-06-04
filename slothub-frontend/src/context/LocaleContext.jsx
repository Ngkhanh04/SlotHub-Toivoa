import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import vi from '../i18n/student/vi';
import en from '../i18n/student/en';

const STORAGE_KEY = 'slothub_locale';

const messages = { vi, en };

const LocaleContext = createContext(null);

const getNested = (obj, path) => {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
};

const interpolate = (str, params) => {
  if (!params || typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : ''));
};

export const LocaleProvider = ({ children }) => {
  const [locale, setLocaleState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const loc = saved === 'en' ? 'en' : 'vi';
    if (typeof document !== 'undefined') document.documentElement.lang = loc;
    return loc;
  });

  const setLocale = useCallback((next) => {
    const loc = next === 'en' ? 'en' : 'vi';
    localStorage.setItem(STORAGE_KEY, loc);
    setLocaleState(loc);
    document.documentElement.lang = loc;
  }, []);

  const t = useCallback(
    (key, params) => {
      const pack = messages[locale] || messages.vi;
      let value = getNested(pack, key);
      if (value === undefined) value = getNested(messages.vi, key);
      if (value === undefined) return key;
      if (typeof value === 'object') return value;
      return interpolate(value, params);
    },
    [locale]
  );

  const translateCategory = useCallback(
    (name) => {
      if (!name) return name;
      if (locale === 'vi') return name;
      return getNested(messages.en.categories, name) || name;
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, translateCategory, isEn: locale === 'en' }),
    [locale, setLocale, t, translateCategory]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
};

export default LocaleContext;
