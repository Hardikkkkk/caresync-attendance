import React, { useEffect, useState } from 'react';
import { EyeOutlined } from '@ant-design/icons';

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

// "3h 12m" since a start time, refreshed every 30s
function Elapsed({ from }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const m = Math.max(0, Math.floor((now - from.getTime()) / 60000));
  return <span>{Math.floor(m / 60)}h {String(m % 60).padStart(2, '0')}m</span>;
}

// data: [{id, name, email}], since: { [userId]: Date } (optional)
function ClockedInTable({ data = [], since = {}, onViewHistory }) {
  const [q, setQ] = useState('');
  const list = data.filter((p) => `${p.name} ${p.email}`.toLowerCase().includes(q.trim().toLowerCase()));

  if (!data.length) {
    return (
      <div className="md-empty">
        <svg viewBox="0 0 160 40" aria-hidden="true"><path d="M0 20H55l8-12 10 26 10-32 10 22 6-4h61" /></svg>
        Nobody is on shift right now.
      </div>
    );
  }

  return (
    <>
      <input
        className="md-search"
        type="search"
        placeholder="Search staff"
        aria-label="Search staff on shift"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul className="md-people">
        {list.map((p, i) => (
          <li key={p.id} style={{ '--i': i }}>
            <span className="md-avatar">{initials(p.name)}<i /></span>
            <div className="md-person">
              <strong>{p.name}</strong>
              <span>{p.email}</span>
              {since[String(p.id)] && (
                <small>Since {since[String(p.id)].toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · <Elapsed from={since[String(p.id)]} /></small>
              )}
            </div>
            <button type="button" className="md-btn" onClick={() => onViewHistory(p.id)}><EyeOutlined /> History</button>
          </li>
        ))}
        {!list.length && <li className="md-empty">No match for "{q}".</li>}
      </ul>
    </>
  );
}

export default ClockedInTable;