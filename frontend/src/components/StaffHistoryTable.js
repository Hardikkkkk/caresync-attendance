// src/components/StaffHistoryTable.js
// Timeline version of the history. Styles live in pages/Careworker.css (.sh-*).
import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { LoginOutlined, LogoutOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { USER_EVENTS } from '../graphql/managerQueries';
import { useLang } from '../i18n/LanguageContext';

/**
 * Parse various timestamp formats into a JS Date or null:
 * ISO string, numeric string (ms or s), number (ms or s), Date.
 */
export function parseToDate(ts) {
  if (ts === null || ts === undefined) return null;
  if (ts instanceof Date) return isNaN(ts.getTime()) ? null : ts;
  if (typeof ts === 'number') return ts < 1e11 ? new Date(ts * 1000) : new Date(ts);

  if (typeof ts === 'string') {
    const trimmed = ts.trim();
    if (/^\d+$/.test(trimmed)) {
      if (trimmed.length === 10) return new Date(Number(trimmed) * 1000);
      if (trimmed.length === 13) return new Date(Number(trimmed));
      const asNum = Number(trimmed);
      if (!Number.isNaN(asNum)) return asNum < 1e11 ? new Date(asNum * 1000) : new Date(asNum);
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

// Event types may come back as CLOCK_IN, clock_in, "Clock In", IN ... Treat anything
// containing OUT as a clock-out, anything else containing IN as a clock-in.
export function isClockInEvent(ev) {
  const type = String(ev?.type ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  if (type.includes('OUT')) return false;
  return type.includes('IN');
}

const IST = { timeZone: 'Asia/Kolkata' };
const fmtTime = (d) => d.toLocaleTimeString('en-IN', { ...IST, hour: '2-digit', minute: '2-digit', hour12: true });
const fmtDate = (d) => d.toLocaleDateString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

const PAGE = 5;

function StaffHistoryTable({ userId }) {
  const { t } = useLang();
  const [shown, setShown] = useState(PAGE);
  const parsedUserId = userId ? Number(userId) : null;

  const { data, loading, error } = useQuery(USER_EVENTS, {
    variables: { userId: parsedUserId },
    skip: !parsedUserId,
  });

  if (error) console.error('Error fetching user events:', error);

  const tr = (key, fallback) => {
    const v = t(key);
    return v && v !== key ? v : fallback;
  };

  // Careworker.js reads `userEvents`; the old table read `clockEvents`. Support both.
  const rawEvents = data?.userEvents || data?.clockEvents || [];

  const events = rawEvents
    .map((ev) => ({ ...ev, __d: parseToDate(ev.timestamp) }))
    .sort((a, b) => (b.__d ? b.__d.getTime() : 0) - (a.__d ? a.__d.getTime() : 0));

  if (loading) {
    return (
      <div className="sh-list" aria-busy="true">
        {[0, 1, 2].map((i) => <div key={i} className="sh-skel" />)}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="sh-empty">
        <svg viewBox="0 0 160 40" aria-hidden="true"><path d="M0 20H55l8-12 10 26 10-32 10 22 6-4h61" /></svg>
        <span>{tr('history.empty', 'No shifts yet. Your first check-in will show up here.')}</span>
      </div>
    );
  }

  return (
    <>
      <ol className="sh-list">
        {events.slice(0, shown).map((ev, i) => {
          const isIn = isClockInEvent(ev);
          return (
            <li key={ev.id ?? i} className={`sh-item ${isIn ? 'is-in' : 'is-out'}`} style={{ '--i': i % PAGE }}>
              <span className="sh-icon" aria-hidden="true">{isIn ? <LoginOutlined /> : <LogoutOutlined />}</span>
              <div className="sh-main">
                <strong>{isIn ? tr('history.in', 'Clocked in') : tr('history.out', 'Clocked out')}</strong>
                {ev.note && <div className="sh-note">{ev.note}</div>}
                {ev.latitude != null && ev.longitude != null && (
                  <span className="sh-loc"><EnvironmentOutlined /> {tr('history.loc', 'Location saved')}</span>
                )}
              </div>
              <div className="sh-when">
                {ev.__d ? (
                  <>
                    <strong>{fmtTime(ev.__d)}</strong>
                    <span>{fmtDate(ev.__d)}</span>
                  </>
                ) : (
                  <span>-</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {shown < events.length && (
        <button type="button" className="sh-more" onClick={() => setShown((n) => n + PAGE)}>
          {tr('history.more', 'Show more')}
        </button>
      )}
    </>
  );
}

export default StaffHistoryTable;