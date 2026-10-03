import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations';

const STORAGE_KEY = 'caresync-lang';
// "-u-nu-latn" keeps 0-9 digits in every language so times and IDs stay easy to read
const LOCALES = { en: 'en-IN-u-nu-latn', hi: 'hi-IN-u-nu-latn', mr: 'mr-IN-u-nu-latn' };

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) return saved;
  } catch (e) { /* storage unavailable */ }
  const browser = (navigator.language || 'en').slice(0, 2);
  return translations[browser] ? browser : 'en';
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignore */ }
  }, []);

  const t = useCallback(
    (key, vars) => {
      let text = translations[lang][key] ?? translations.en[key] ?? key;
      if (vars) Object.keys(vars).forEach((k) => { text = text.split(`{${k}}`).join(vars[k]); });
      return text;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t, locale: LOCALES[lang] }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLang = () => useContext(LanguageContext);
