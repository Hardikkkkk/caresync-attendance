import React, { useState } from 'react';
import { Input, message } from 'antd';
import { useLang } from '../i18n/LanguageContext';
import './ClockForm.css';

// Facility location and allowed radius. Set these in frontend/.env, e.g.
//   REACT_APP_FACILITY_LAT=18.5204
//   REACT_APP_FACILITY_LNG=73.8567
//   REACT_APP_ALLOWED_RADIUS_M=300
const FACILITY_LAT = parseFloat(process.env.REACT_APP_FACILITY_LAT) || 18.5204;
const FACILITY_LNG = parseFloat(process.env.REACT_APP_FACILITY_LNG) || 73.8567;
const ALLOWED_RADIUS_M = Number(process.env.REACT_APP_ALLOWED_RADIUS_M) || 300;
// Reject readings less precise than this (override in .env while testing on a desktop)
const MAX_ACCURACY_M = Number(process.env.REACT_APP_MAX_ACCURACY_M) || 150;

// Testing only: set REACT_APP_SKIP_GEOFENCE=true in .env to skip the distance check.
// Ignored in production builds, so it can't be left on by accident.
const SKIP_GEOFENCE =
  process.env.NODE_ENV !== 'production' && process.env.REACT_APP_SKIP_GEOFENCE === 'true';

// Haversine distance in METRES
function distanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ClockForm({ onClock, isClockingIn, clockedIn, disabled = false, loading = false }) {
  const { t } = useLang();
  const [note, setNote] = useState('');
  const [locating, setLocating] = useState(false);

  const unavailable = disabled || (isClockingIn ? clockedIn : !clockedIn);
  const busy = locating || loading;

  const handleClock = () => {
    if (!navigator.geolocation) {
      message.error(t('cf.noGeo'));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        if (accuracy > MAX_ACCURACY_M) {
          message.error(t('cf.accuracy', { m: Math.round(accuracy) }));
          setLocating(false);
          return;
        }

        const dist = distanceMeters(latitude, longitude, FACILITY_LAT, FACILITY_LNG);
        if (!SKIP_GEOFENCE && dist > ALLOWED_RADIUS_M) {
          message.error(t('cf.far', { m: Math.round(dist), r: ALLOWED_RADIUS_M }));
          setLocating(false);
          return;
        }

        try {
          // onClock reports its own success or error messages and returns true on success
          const ok = await onClock({ latitude, longitude, note });
          if (ok) setNote('');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        message.error([1, 2, 3].includes(err.code) ? t(`cf.err${err.code}`) : t('cf.errDefault'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  let label = isClockingIn ? t('cf.start') : t('cf.end');
  if (locating) label = t('cf.locating');
  else if (loading) label = t('cf.saving');

  return (
    <div className="cf">
      <label className="cf-label" htmlFor={`cf-note-${isClockingIn ? 'in' : 'out'}`}>
        {t('cf.note')}
      </label>
      <Input.TextArea
        id={`cf-note-${isClockingIn ? 'in' : 'out'}`}
        rows={3}
        placeholder={isClockingIn ? t('cf.phStart') : t('cf.phEnd')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={250}
        showCount
        disabled={unavailable || busy}
      />
      <button
        type="button"
        className={`cf-btn ${isClockingIn ? 'is-start' : 'is-end'}${busy ? ' is-busy' : ''}`}
        onClick={handleClock}
        disabled={unavailable || busy}
        aria-busy={busy}
      >
        {busy && <span className="cf-spin" aria-hidden="true" />}
        {label}
      </button>
    </div>
  );
}

export default ClockForm;