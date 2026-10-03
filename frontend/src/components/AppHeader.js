import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import LanguageSwitcher from './LanguageSwitcher';
import useScrolled from '../hooks/useScrolled';
import { useLang } from '../i18n/LanguageContext';
import './AppHeader.css';

export default function AppHeader({ user }) {
  const { logout } = useAuth0();
  const { t } = useLang();
  const scrolled = useScrolled(8);
  const bar = useRef(null);

  // Thin progress line along the bottom edge of the navbar
  useEffect(() => {
    const update = () => {
      const h = document.documentElement;
      const span = h.scrollHeight - h.clientHeight;
      if (bar.current) {
        bar.current.style.transform = `scaleX(${span > 0 ? Math.min(1, window.scrollY / span) : 0})`;
      }
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <header className={`app-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="app-header-inner">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true" />
          CareSync
        </div>

        <nav className="app-nav" aria-label="Main">
          <NavLink to="/" end>{t('header.shifts')}</NavLink>
          {user?.role === 'manager' && <NavLink to="/manager">{t('header.manager')}</NavLink>}
        </nav>

        <LanguageSwitcher />
        <button
          type="button"
          className="app-logout"
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          {t('header.logout')}
        </button>
      </div>
      <div className="app-progress" ref={bar} aria-hidden="true" />
    </header>
  );
}