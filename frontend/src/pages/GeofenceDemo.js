import React, { useRef, useState } from 'react';
import { useLang } from '../i18n/LanguageContext';

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS_PX = 80;
const RADIUS_M = Number(process.env.REACT_APP_ALLOWED_RADIUS_M) || 300; // same as the real check-in rule
const M_PER_PX = RADIUS_M / RADIUS_PX;
const clamp = (v) => Math.max(14, Math.min(SIZE - 14, v));

const KEYS = {
  ArrowLeft: [-10, 0],
  ArrowRight: [10, 0],
  ArrowUp: [0, -10],
  ArrowDown: [0, 10],
};

export default function GeofenceDemo() {
  const { t } = useLang();
  const [pos, setPos] = useState({ x: CENTER + 30, y: CENTER + 20 });
  const svgRef = useRef(null);
  const dragging = useRef(false);

  const distance = Math.round(Math.hypot(pos.x - CENTER, pos.y - CENTER) * M_PER_PX);
  const inside = distance <= RADIUS_M;

  const moveTo = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const scale = SIZE / rect.width;
    setPos({ x: clamp((e.clientX - rect.left) * scale), y: clamp((e.clientY - rect.top) * scale) });
  };

  const onKeyDown = (e) => {
    const step = KEYS[e.key];
    if (!step) return;
    e.preventDefault();
    setPos((p) => ({ x: clamp(p.x + step[0]), y: clamp(p.y + step[1]) }));
  };

  return (
    <div className="geo">
      <svg
        ref={svgRef}
        className="geo-map"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          moveTo(e);
        }}
        onPointerMove={(e) => dragging.current && moveTo(e)}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        <rect width={SIZE} height={SIZE} className="geo-ground" />
        <rect x="0" y="262" width={SIZE} height="26" className="geo-road" />
        <rect x="256" y="0" width="26" height={SIZE} className="geo-road" />
        <circle cx={CENTER} cy={CENTER} r={RADIUS_PX} className="geo-zone" />
        <rect x={CENTER - 22} y={CENTER - 22} width="44" height="44" rx="6" className="geo-building" />
        <path d={`M${CENTER - 9} ${CENTER}h18M${CENTER} ${CENTER - 9}v18`} className="geo-plus" />
        <circle
          cx={pos.x}
          cy={pos.y}
          r="11"
          className={`geo-dot ${inside ? 'is-in' : 'is-out'}`}
          tabIndex={0}
          role="img"
          aria-label={t('zone.ariaDot')}
          onKeyDown={onKeyDown}
        />
      </svg>

      <div className="geo-readout" aria-live="polite">
        <span className={`geo-pill ${inside ? 'is-in' : 'is-out'}`}>
          {inside ? t('zone.inside') : t('zone.outside')}
        </span>
        <span className="geo-distance">{t('zone.distance', { m: distance })}</span>
      </div>

      <div className="geo-presets">
        <button type="button" onClick={() => setPos({ x: CENTER + 24, y: CENTER - 30 })}>
          {t('zone.ward')}
        </button>
        <button type="button" onClick={() => setPos({ x: 36, y: 40 })}>
          {t('zone.carpark')}
        </button>
      </div>
      <p className="geo-hint">{t('zone.hint2d')}</p>
    </div>
  );
}