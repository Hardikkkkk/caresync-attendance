import React, { useEffect, useState } from 'react';
import { useLang } from '../i18n/LanguageContext';
import './Intro.css';

const KEY = 'cs-intro-seen';
const WORD = 'CareSync';
const PLAY_MS = 3000; // how long the intro plays before it lifts away
const LIFT_MS = 900; // how long the lift takes

// Plays once per browser tab. Add ?intro to the address to replay it while testing.
// Skipped for reduced-motion users.
function shouldPlay() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.location.search.includes('intro')) return true;
  try {
    return !sessionStorage.getItem(KEY);
  } catch (e) {
    return true;
  }
}

export default function Intro() {
  const { t } = useLang();
  const [phase, setPhase] = useState(() => (shouldPlay() ? 'play' : 'done')); // play -> lift -> done

  // Use the translated text if the key exists in translations.js, otherwise the English fallback
  const tr = (key, fallback) => {
    const v = t(key);
    return v && v !== key ? v : fallback;
  };

  // While it plays: hold the hero animation, lock scrolling
  useEffect(() => {
    if (phase !== 'play') return undefined;
    const root = document.documentElement;
    root.classList.add('intro-active');
    window.scrollTo(0, 0);
    const block = (e) => { e.preventDefault(); e.stopPropagation(); };
    document.addEventListener('wheel', block, { capture: true, passive: false });
    document.addEventListener('touchmove', block, { capture: true, passive: false });
    const timer = setTimeout(() => setPhase('lift'), PLAY_MS);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('wheel', block, { capture: true });
      document.removeEventListener('touchmove', block, { capture: true });
    };
  }, [phase]);

  // Lift: release the hero animation and remember that the intro has played
  useEffect(() => {
    if (phase !== 'lift') return undefined;
    document.documentElement.classList.remove('intro-active');
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* storage unavailable */ }
    const timer = setTimeout(() => setPhase('done'), LIFT_MS + 100);
    return () => clearTimeout(timer);
  }, [phase]);

  // Never leave the hero held back if this unmounts early
  useEffect(() => () => document.documentElement.classList.remove('intro-active'), []);

  if (phase === 'done') return null;

  return (
    <div className={`intro${phase === 'lift' ? ' is-lifting' : ''}`} role="presentation">
      <div className="intro-inner">
        <svg className="intro-mark" viewBox="0 0 64 64" aria-hidden="true">
          <circle className="intro-ring" cx="32" cy="32" r="24" pathLength="1" />
          <path className="intro-arc" d="M49 15 A24 24 0 0 1 49 49" pathLength="1" />
        </svg>

        <div className="intro-word" aria-label={WORD}>
          {WORD.split('').map((ch, i) => (
            <span key={i} style={{ '--i': i }} aria-hidden="true">{ch}</span>
          ))}
        </div>

        <svg className="intro-ecg" viewBox="0 0 400 40" aria-hidden="true">
          <path
            pathLength="1"
            d="M0 20 H140 L152 20 L160 6 L170 34 L182 2 L192 30 L200 20 H260 L268 20 L274 12 L280 20 H400"
          />
        </svg>

        <p className="intro-line">{tr('intro.tagline', 'Care starts on time.')}</p>
      </div>

      <button type="button" className="intro-skip" onClick={() => setPhase('lift')}>
        {tr('intro.skip', 'Skip')}
      </button>
    </div>
  );
}
