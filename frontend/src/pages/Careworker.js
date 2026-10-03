import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useAuth0 } from '@auth0/auth0-react';
import { message } from 'antd';
import { UserOutlined, EnvironmentOutlined, CheckOutlined } from '@ant-design/icons';
import { CLOCK_IN, CLOCK_OUT, GET_USER_BY_EMAIL } from '../graphql/queries';
import { USER_EVENTS } from '../graphql/managerQueries';
import ClockForm from '../components/ClockForm';
import StaffHistoryTable, { parseToDate, isClockInEvent } from '../components/StaffHistoryTable';
import { useLang } from '../i18n/LanguageContext';
import './Careworker.css';

// Own component so the ticking clock does not re-render the whole page.
function LiveClock() {
  const { locale } = useLang();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="cw-clock">
      <svg className="cw-tick" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" />
        <g className="cw-hand"><line x1="24" y1="24" x2="24" y2="8" /></g>
        <circle cx="24" cy="24" r="2.5" className="cw-hub" />
      </svg>
      <div>
        <div className="cw-clock-time">
          {now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="cw-clock-date">
          {now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>
    </div>
  );
}

// "On shift for 3h 12m"
function ShiftTimer({ since }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const mins = Math.max(0, Math.floor((now - since.getTime()) / 60000));
  return <span className="cw-timer">{Math.floor(mins / 60)}h {String(mins % 60).padStart(2, '0')}m</span>;
}

const sameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function firstNameOf(name) {
  const raw = String(name || '').split('@')[0].split(/[._\s-]/)[0].replace(/\d+/g, '');
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : '';
}

function Careworker({ user: appUser }) {
  const { t, locale } = useLang();
  const { user: auth0User, isAuthenticated } = useAuth0();
  const [clockedIn, setClockedIn] = useState(false);
  const [loadingClock, setLoadingClock] = useState(false);
  const [shiftStart, setShiftStart] = useState(null);
  const [flash, setFlash] = useState(null); // 'in' | 'out' success animation

  // App.js already loads the user and passes it in. Only query as a fallback.
  const { data, loading, error } = useQuery(GET_USER_BY_EMAIL, {
    variables: { email: auth0User?.email },
    skip: !!appUser || !auth0User?.email,
    errorPolicy: 'all',
  });

  const [clockIn] = useMutation(CLOCK_IN);
  const [clockOut] = useMutation(CLOCK_OUT);

  const user = appUser || data?.getUserByEmail;
  const userId = user?.id ? parseInt(user.id, 10) : null;

  // Work out the current shift state from the newest event the server returned
  const applyEvents = (result) => {
    const list = result?.userEvents || result?.clockEvents || [];
    const time = (e) => parseToDate(e.timestamp)?.getTime() || 0;
    const latest = list.slice().sort((a, b) => time(b) - time(a))[0];
    if (process.env.NODE_ENV !== 'production') console.debug('Latest clock event:', latest);
    const active = Boolean(latest && isClockInEvent(latest) && !latest.clockOutTime);
    setClockedIn(active);
    setShiftStart(active ? parseToDate(latest.timestamp) : null);
  };

  // Server is the source of truth for whether a shift is active
  const { data: evData, loading: eventsLoading, refetch: refetchEvents } = useQuery(USER_EVENTS, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
    onCompleted: applyEvents,
    onError: (err) => console.error('Error fetching events:', err),
  });

  // Success animation lasts a couple of seconds
  useEffect(() => {
    if (!flash) return undefined;
    const id = setTimeout(() => setFlash(null), 2300);
    return () => clearTimeout(id);
  }, [flash]);

  // Mon-Sun strip: which days this week had a clock-in
  const week = useMemo(() => {
    const events = evData?.userEvents || [];
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return {
        day,
        isToday: sameDay(day, today),
        worked: events.some((e) => e.type === 'CLOCK_IN' && sameDay(parseToDate(e.timestamp), day)),
      };
    });
  }, [evData]);

  const handleClockIn = async ({ latitude, longitude, note }) => {
    if (!userId) {
      message.error(t('msg.userNotLoaded'));
      return false;
    }
    if (clockedIn) {
      message.warning(t('msg.alreadyIn'));
      return false;
    }

    setLoadingClock(true);
    try {
      await clockIn({
        variables: {
          userId,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          note: note ?? '',
        },
      });
      setClockedIn(true);
      setShiftStart(new Date());
      setFlash('in');
      applyEvents((await refetchEvents())?.data);
      return true;
    } catch (e) {
      const errorMessage = e.graphQLErrors?.[0]?.message || e.message || 'Unknown error occurred';
      message.error(t('msg.clockInFailed', { e: errorMessage }));
      return false;
    } finally {
      setLoadingClock(false);
    }
  };

  const handleClockOut = async ({ latitude, longitude, note }) => {
    if (!userId) {
      message.error(t('msg.userNotLoaded'));
      return false;
    }
    if (!clockedIn) {
      message.warning(t('msg.notIn'));
      return false;
    }

    setLoadingClock(true);
    try {
      await clockOut({
        variables: {
          userId,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          note: note ?? '',
        },
      });
      setClockedIn(false);
      setShiftStart(null);
      setFlash('out');
      applyEvents((await refetchEvents())?.data);
      return true;
    } catch (e) {
      const errorMessage = e.graphQLErrors?.[0]?.message || e.message || 'Unknown error occurred';
      message.error(t('msg.clockOutFailed', { e: errorMessage }));
      return false;
    } finally {
      setLoadingClock(false);
    }
  };

  if (!isAuthenticated) return <div>Please log in</div>;
  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20 }}>Error loading user data: {error.message}</div>;

  // New text falls back to English until the keys are added to translations.js
  const tr = (key, fallback) => {
    const v = t(key);
    return v && v !== key ? v : fallback;
  };

  const busy = loadingClock || eventsLoading;
  const statusClass = eventsLoading ? 'is-checking' : clockedIn ? 'is-in' : 'is-out';
  const statusLabel = eventsLoading ? t('cw.checking') : clockedIn ? t('cw.in') : t('cw.out');
  const displayName = user?.name || auth0User?.name || auth0User?.email;

  const hour = new Date().getHours();
  const tod = hour < 12 ? 'morning' : hour < 17 ? 'day' : 'evening';
  const greeting = tr(`cw.greet.${tod}`, { morning: 'Good morning', day: 'Good afternoon', evening: 'Good evening' }[tod]);
  const first = firstNameOf(displayName);
  const daysWorked = week.filter((d) => d.worked).length;

  return (
    <div className="cw">
      <main className="cw-main">
        <section className={`cw-hero is-${tod}`}>
          <svg className="cw-hero-ecg" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 30 H380 L410 30 L430 8 L455 52 L480 2 L505 47 L525 30 H700 L720 30 L735 18 L750 30 H1200" />
            <path className="cw-ecg-pulse" pathLength="1" d="M0 30 H380 L410 30 L430 8 L455 52 L480 2 L505 47 L525 30 H700 L720 30 L735 18 L750 30 H1200" />
          </svg>
          <span className="cw-plus cw-plus-1" aria-hidden="true" />
          <span className="cw-plus cw-plus-2" aria-hidden="true" />

          <div className="cw-who">
            <div className={`cw-avatar ${statusClass}`} aria-hidden="true">
              <UserOutlined />
            </div>
            <div className="cw-id">
              <h1>{greeting}{first ? `, ${first}` : ''}</h1>
              <p>
                {user?.role === 'manager' ? t('cw.manager') : t('cw.careworker')} {t('cw.id')}:{' '}
                {userId ? String(userId).padStart(6, '0') : '-'}
              </p>
              <span className={`cw-status ${statusClass}`}>
                <span className="cw-dot" />
                {statusLabel}
                {clockedIn && shiftStart && <ShiftTimer since={shiftStart} />}
              </span>
            </div>
          </div>
          <LiveClock />
        </section>

        <section className="cw-shift" aria-label="Shift actions">
          <div className={`cw-panel ${clockedIn ? 'is-end' : 'is-start'}`} key={clockedIn ? 'end' : 'start'}>
            {clockedIn ? (
              <>
                <h2>{t('shift.endTitle')}</h2>
                <p>{t('shift.endText')}</p>
                <ClockForm
                  onClock={handleClockOut}
                  isClockingIn={false}
                  clockedIn={clockedIn}
                  disabled={!clockedIn || busy}
                  loading={loadingClock}
                />
              </>
            ) : (
              <>
                <h2>{t('shift.startTitle')}</h2>
                <p>{t('shift.startText')}</p>
                <ClockForm
                  onClock={handleClockIn}
                  isClockingIn={true}
                  clockedIn={clockedIn}
                  disabled={clockedIn || busy}
                  loading={loadingClock}
                />
              </>
            )}
          </div>

          <aside className="cw-side">
            <div className="cw-geo">
              <div className="cw-radar" aria-hidden="true"><span className="cw-sweep" /><EnvironmentOutlined /></div>
              <p>{t('cw.notice')}</p>
            </div>

            <div className="cw-week">
              <div className="cw-week-top">
                <strong>{tr('cw.week', 'This week')}</strong>
                <span>{daysWorked} / 7</span>
              </div>
              <ol>
                {week.map((d, i) => (
                  <li key={i} className={`${d.worked ? 'is-worked' : ''}${d.isToday ? ' is-today' : ''}`} style={{ '--i': i }}>
                    <span className="cw-day-dot">{d.worked && <CheckOutlined />}</span>
                    <span className="cw-day-name">{d.day.toLocaleDateString(locale, { weekday: 'narrow' })}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </section>

        <section className="cw-history">
          <h2>{t('history.title')}</h2>
          <p>{t('history.text')}</p>
          <StaffHistoryTable userId={userId} />
        </section>
      </main>

      {flash && (
        <div className={`cw-burst is-${flash}`} key={flash} role="status">
          <div className="cw-burst-card">
            <svg viewBox="0 0 80 80" aria-hidden="true">
              <circle className="cw-burst-ring" cx="40" cy="40" r="34" />
              <path d="M24 41l11 11 22-24" />
            </svg>
            <strong>{flash === 'in' ? t('msg.clockedIn') : t('msg.shiftDone')}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

export default Careworker;