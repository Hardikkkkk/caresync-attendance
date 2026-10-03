import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Select, Modal } from 'antd';
import {
  TeamOutlined, ClockCircleOutlined, EnvironmentOutlined, BarChartOutlined,
  DownloadOutlined, ReloadOutlined, FieldTimeOutlined, LoginOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useAuth0 } from '@auth0/auth0-react';
import { CURRENTLY_CLOCKED_IN, ALL_USERS, STAFF_STATS, TODAY_CLOCK_INS } from '../graphql/managerQueries';
import { GET_USER_BY_EMAIL } from '../graphql/queries';
import ClockedInTable from '../components/ClockedInTable';
import StaffHistoryTable, { parseToDate, isClockInEvent } from '../components/StaffHistoryTable';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import GeoSettings from '../components/GeoSettings';
import './ManagerDashboard.css';

const fmtTime = (d) => (d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-');
const fmtDur = (ms) => {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};

function downloadCsv(filename, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Number that counts up when it first appears
function useCountUp(target) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return undefined; }
    let raf; let start;
    const step = (ts) => {
      if (start === undefined) start = ts;
      const p = Math.min(1, (ts - start) / 700);
      setV(target * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function Stat({ icon, label, value, decimals = 0, unit = '', tone = 'teal', delay = 0 }) {
  const v = useCountUp(value);
  return (
    <div className={`md-stat is-${tone}`} style={{ '--d': `${delay}ms` }}>
      <span className="md-stat-icon" aria-hidden="true">{icon}</span>
      <div className="md-stat-num">{v.toFixed(decimals)}<small>{unit}</small></div>
      <div className="md-stat-label">{label}</div>
    </div>
  );
}

function Section({ icon, title, sub, action, children, delay = 0 }) {
  return (
    <section className="md-section" style={{ '--d': `${delay}ms` }}>
      <header className="md-section-head">
        <span className="md-section-icon" aria-hidden="true">{icon}</span>
        <div className="md-section-title"><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
        {action}
      </header>
      {children}
    </section>
  );
}

function ManagerDashboard() {
  const { user: auth0User, isAuthenticated } = useAuth0();
  const { data: userData, loading: userLoading, error: userError } = useQuery(GET_USER_BY_EMAIL, {
    variables: { email: auth0User?.email },
    skip: !auth0User?.email,
  });
  // Live data refreshes by itself every 30 seconds
  const { data: clockedInData, refetch: refetchIn } = useQuery(CURRENTLY_CLOCKED_IN, { pollInterval: 30000 });
  const { data: usersData } = useQuery(ALL_USERS);
  const { data: statsData } = useQuery(STAFF_STATS);
  const { data: todayData, loading: todayLoading, refetch: refetchToday } = useQuery(TODAY_CLOCK_INS, { pollInterval: 30000 });

  const [selectedUser, setSelectedUser] = useState(null);
  const [modalUser, setModalUser] = useState(null);
  const [updated, setUpdated] = useState(new Date());
  useEffect(() => { setUpdated(new Date()); }, [clockedInData, todayData]);

  // todayClockIns are single events, so pair each clock-in with the next clock-out for that person
  const sessions = useMemo(() => {
    const evs = (todayData?.todayClockIns || [])
      .map((e) => ({ ...e, d: parseToDate(e.timestamp) }))
      .filter((e) => e.d)
      .sort((a, b) => a.d - b.d);
    const open = {};
    const out = [];
    evs.forEach((e) => {
      const uid = String(e.user?.id);
      if (isClockInEvent(e)) {
        const s = { key: e.id ?? `${uid}-${e.d.getTime()}`, uid, name: e.user?.name || 'Unknown', inAt: e.d, outAt: null, lat: e.latitude, lng: e.longitude };
        open[uid] = s; out.push(s);
      } else if (open[uid]) {
        open[uid].outAt = e.d; delete open[uid];
      }
    });
    return out.reverse();
  }, [todayData]);

  const since = useMemo(() => {
    const m = {};
    sessions.forEach((s) => { if (!s.outAt) m[s.uid] = s.inAt; });
    return m;
  }, [sessions]);

  const loggedInUser = userData?.getUserByEmail;

  if (!isAuthenticated) return <div className="md-note">Please log in first</div>;
  if (userLoading) return <div className="md-note">Loading...</div>;
  if (userError) return <div className="md-note">Error: {userError.message}</div>;
  if (!loggedInUser) return <div className="md-note">No user record found</div>;
  if (loggedInUser.role.toLowerCase() !== 'manager') return <div className="md-note">Access denied</div>;

  const stats = statsData?.staffClockStats || [];
  const onNow = clockedInData?.currentlyClockedIn || [];
  const todayPeople = new Set(sessions.map((s) => s.uid)).size;
  const weekHours = stats.reduce((n, s) => n + (s.totalHoursLastWeek || 0), 0);
  const avgDaily = stats.length ? stats.reduce((n, s) => n + (s.avgDailyHours || 0), 0) / stats.length : 0;

  const hour = new Date().getHours();
  const tod = hour < 12 ? 'morning' : hour < 17 ? 'day' : 'evening';
  const greet = { morning: 'Good morning', day: 'Good afternoon', evening: 'Good evening' }[tod];
  const first = String(loggedInUser.name || '').split(/[\s@._-]/)[0].replace(/\d+/g, '');

  const refresh = () => { refetchIn(); refetchToday(); };

  const exportToday = () => downloadCsv('attendance-today.csv', [
    ['Name', 'Clock in', 'Clock out', 'Duration', 'Latitude', 'Longitude'],
    ...[...sessions].reverse().map((s) => [s.name, s.inAt.toLocaleString(), s.outAt ? s.outAt.toLocaleString() : '', s.outAt ? fmtDur(s.outAt - s.inAt) : 'On shift', s.lat, s.lng]),
  ]);
  const exportWeek = () => downloadCsv('attendance-last-7-days.csv', [
    ['Name', 'Total hours (7 days)', 'Average daily hours', 'Days present'],
    ...stats.map((s) => [s.name, s.totalHoursLastWeek, s.avgDailyHours, s.daysPresent]),
  ]);

  return (
    <div className="md">
      <main className="md-main">
        <section className={`md-hero is-${tod}`}>
          <svg className="md-hero-ecg" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 30 H380 L410 30 L430 8 L455 52 L480 2 L505 47 L525 30 H700 L720 30 L735 18 L750 30 H1200" />
            <path className="md-ecg-pulse" pathLength="1" d="M0 30 H380 L410 30 L430 8 L455 52 L480 2 L505 47 L525 30 H700 L720 30 L735 18 L750 30 H1200" />
          </svg>
          <div>
            <h1>{greet}{first ? `, ${first.charAt(0).toUpperCase()}${first.slice(1).toLowerCase()}` : ''}</h1>
            <p>{new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="md-live">
            <span className="md-live-dot" /> Live
            <small>Updated {fmtTime(updated)}</small>
            <button type="button" onClick={refresh} aria-label="Refresh now"><ReloadOutlined /></button>
          </div>
        </section>

        <div className="md-stats">
          <Stat icon={<TeamOutlined />} label="On shift now" value={onNow.length} tone="teal" />
          <Stat icon={<LoginOutlined />} label="Clocked in today" value={todayPeople} tone="amber" delay={80} />
          <Stat icon={<FieldTimeOutlined />} label="Avg daily hours" value={avgDaily} decimals={1} unit="h" tone="ink" delay={160} />
          <Stat icon={<BarChartOutlined />} label="Hours, last 7 days" value={weekHours} decimals={0} unit="h" tone="teal" delay={240} />
        </div>

        <div className="md-cols">
          <Section icon={<TeamOutlined />} title="On shift now" sub="Updates every 30 seconds" delay={100}>
            <ClockedInTable data={onNow} since={since} onViewHistory={(id) => setModalUser(parseInt(id, 10))} />
          </Section>

          <Section
            icon={<ClockCircleOutlined />}
            title="Today's activity"
            sub="Every check-in and check-out today"
            delay={180}
            action={<button type="button" className="md-btn" onClick={exportToday} disabled={!sessions.length}><DownloadOutlined /> CSV</button>}
          >
            {todayLoading ? (
              <div className="md-skels">{[0, 1, 2].map((i) => <div key={i} className="md-skel" />)}</div>
            ) : !sessions.length ? (
              <div className="md-empty">No clock-ins yet today.</div>
            ) : (
              <ol className="md-feed">
                {sessions.map((s, i) => (
                  <li key={s.key} style={{ '--i': i }} className={s.outAt ? '' : 'is-open'}>
                    <span className="md-feed-ic">{s.outAt ? <LogoutOutlined /> : <LoginOutlined />}</span>
                    <div>
                      <strong>{s.name}</strong>
                      <span>{fmtTime(s.inAt)} to {s.outAt ? fmtTime(s.outAt) : 'now'}</span>
                      {s.lat != null && s.lng != null && (
                        <small><EnvironmentOutlined /> {Number(s.lat).toFixed(4)}, {Number(s.lng).toFixed(4)}</small>
                      )}
                    </div>
                    <em>{s.outAt ? fmtDur(s.outAt - s.inAt) : 'On shift'}</em>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>

        <Section
          icon={<BarChartOutlined />}
          title="Staff analytics"
          sub="Hours and attendance over the last 7 days"
          delay={120}
          action={<button type="button" className="md-btn" onClick={exportWeek} disabled={!stats.length}><DownloadOutlined /> CSV</button>}
        >
          <AnalyticsDashboard data={stats} />
        </Section>

        <Section icon={<ClockCircleOutlined />} title="Staff history" sub="Pick a person to see their check-ins and check-outs" delay={120}>
          <Select
            className="md-select"
            showSearch
            optionFilterProp="label"
            placeholder="Select a staff member"
            onChange={(v) => setSelectedUser(parseInt(v, 10))}
            options={usersData?.users?.map((u) => ({ label: u.name, value: u.id })) || []}
          />
          {selectedUser && <div className="md-history"><StaffHistoryTable userId={selectedUser} /></div>}
        </Section>

        <Section icon={<EnvironmentOutlined />} title="Location settings" sub="Where staff can clock in, and how far from it" delay={120}>
          <GeoSettings />
        </Section>
      </main>

      <Modal
        title="Staff clock history"
        open={!!modalUser}
        onCancel={() => setModalUser(null)}
        footer={null}
        width={760}
        destroyOnClose
      >
        {modalUser && <StaffHistoryTable userId={modalUser} />}
      </Modal>
    </div>
  );
}

export default ManagerDashboard;