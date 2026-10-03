import React from 'react';
import { useLang } from '../i18n/LanguageContext';
import { LANGUAGES } from '../i18n/translations';
import './LanguageSwitcher.css';

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLang();
  return (
    <select
      className="lang-switch"
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      aria-label={t('lang.label')}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} lang={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
