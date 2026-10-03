import React, { useEffect, useRef } from 'react';
import { useLang } from '../i18n/LanguageContext';
import './ProblemsSection.css';

const PROBLEMS = ['p1', 'p2', 'p3', 'p4'];

/* OPTIONAL real photos / video.
   Put files in frontend/public/problems/ and fill these in, e.g. '/problems/p1.jpg'.
   Leave '' to use only the built-in animated illustrations. Keep videos under ~2 MB. */
const PHOTOS = { p1: '', p2: '', p3: '', p4: '' };
const SECTION_VIDEO = ''; // e.g. '/problems/corridor.mp4'

/* One animated illustration per problem (pure SVG + CSS, no downloads) */
const SCENES = {
  // Paper registers get lost -> a clean digital timestamp
  p1: (
    <svg viewBox="0 0 200 160" aria-hidden="true">
      <g className="pb-paper pb-paper-a"><rect x="40" y="30" width="86" height="104" rx="6" /><path d="M54 56h58M54 72h58M54 88h40" /></g>
      <g className="pb-paper pb-paper-b"><rect x="62" y="22" width="86" height="104" rx="6" /><path d="M76 48h58M76 64h58M76 80h30" /></g>
      <g className="pb-chip">
        <rect x="70" y="58" width="110" height="46" rx="12" />
        <circle cx="92" cy="81" r="10" /><path d="M92 75v6l4 3" />
        <text x="110" y="86">08:01</text>
      </g>
    </svg>
  ),
  // Disputes about who was where -> pulsing geofence
  p2: (
    <svg viewBox="0 0 200 160" aria-hidden="true">
      <circle className="pb-zone" cx="110" cy="82" r="56" />
      <circle className="pb-ping" cx="110" cy="82" r="14" />
      <circle className="pb-ping pb-ping-2" cx="110" cy="82" r="14" />
      <path className="pb-pin" d="M110 52c-11 0-19 8-19 19 0 14 19 33 19 33s19-19 19-33c0-11-8-19-19-19z" />
      <circle className="pb-pin-hole" cx="110" cy="71" r="6" />
    </svg>
  ),
  // Colleagues clocking in for each other -> one verified person
  p3: (
    <svg viewBox="0 0 200 160" aria-hidden="true">
      <g className="pb-ghost"><rect x="26" y="40" width="96" height="80" rx="12" /><circle cx="52" cy="72" r="12" /><path d="M72 66h36M72 80h24" /></g>
      <g className="pb-card">
        <rect x="64" y="34" width="110" height="88" rx="14" />
        <circle cx="94" cy="68" r="14" /><path d="M120 62h40M120 76h26M80 100h78" />
      </g>
      <circle className="pb-seal" cx="168" cy="40" r="17" />
      <path className="pb-tick" d="M160 40l6 6 11-12" />
    </svg>
  ),
  // Audits and payroll questions -> charts that draw themselves
  p4: (
    <svg viewBox="0 0 200 160" aria-hidden="true">
      <path className="pb-axis" d="M30 130H178M30 30v100" />
      {[44, 70, 56, 92, 78].map((h, i) => (
        <rect key={i} className="pb-bar" style={{ '--d': `${i * 90}ms` }} x={40 + i * 28} y={130 - h} width="16" height={h} rx="3" />
      ))}
      <path className="pb-trend" d="M48 98L76 70L104 82L132 44L160 54" />
    </svg>
  ),
};

export default function ProblemsSection() {
  const { t } = useLang();
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = root.querySelectorAll('.pb-card-item');

    if (reduce || !('IntersectionObserver' in window)) {
      cards.forEach((c) => c.classList.add('is-in'));
      return undefined;
    }

    // Staggered entrance + line draw when the section scrolls into view
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.2 });
    cards.forEach((c) => io.observe(c));

    // Gentle parallax on the background orbs
    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = root.getBoundingClientRect();
        root.style.setProperty('--py', `${(r.top * -0.08).toFixed(1)}px`);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Cursor spotlight + soft tilt, per card
  const onMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty('--mx', `${x}px`);
    el.style.setProperty('--my', `${y}px`);
    el.style.setProperty('--rx', `${((y / r.height) - 0.5) * -5}deg`);
    el.style.setProperty('--ry', `${((x / r.width) - 0.5) * 6}deg`);
  };
  const onLeave = (e) => {
    e.currentTarget.style.setProperty('--rx', '0deg');
    e.currentTarget.style.setProperty('--ry', '0deg');
  };

  const showVideo = SECTION_VIDEO && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <section id="problems" className="home-section home-band pb" ref={rootRef}>
      <div className="pb-bg" aria-hidden="true">
        {showVideo && <video className="pb-video" src={SECTION_VIDEO} autoPlay muted loop playsInline />}
        <span className="pb-orb pb-orb-1" />
        <span className="pb-orb pb-orb-2" />
        <span className="pb-orb pb-orb-3" />
        <span className="pb-grid" />
      </div>

      <h2>{t('problems.title')}</h2>

      <div className="pb-cards">
        {PROBLEMS.map((id, i) => (
          <article
            key={id}
            className="pb-card-item"
            style={{ '--i': i }}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
          >
            {PHOTOS[id] && <div className="pb-photo" style={{ backgroundImage: `url(${PHOTOS[id]})` }} />}
            <div className="pb-scene">{SCENES[id]}</div>
            <div className="pb-spot" />
            <div className="pb-body">
              <span className="pb-line" />
              <h3>{t(`${id}.title`)}</h3>
              <p>{t(`${id}.text`)}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
