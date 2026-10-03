import React, { useEffect, useRef } from 'react';
import './CustomCursor.css';

const INTERACTIVE = 'a, button, summary, label, [role="button"], .hot-dot';
const DRAG = '.scene-canvas, .geo-map';
const TEXT = 'input, textarea, select';
const MAGNETIC = '.home-btn, .app-logout';

// A small teal dot that beats like a pulse, with a soft ring that trails it.
// Only runs on devices with a real mouse; touch devices keep their normal behaviour.
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const root = document.documentElement;
    root.classList.add('has-custom-cursor');

    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;
    let raf;
    let magnet = null;

    const set = (cls, on) => {
      dot.classList.toggle(cls, on);
      ring.classList.toggle(cls, on);
    };
    const releaseMagnet = () => {
      if (!magnet) return;
      magnet.style.removeProperty('--mx');
      magnet.style.removeProperty('--my');
      magnet = null;
    };

    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      set('is-away', false);

      const el = e.target instanceof Element ? e.target : null;
      const interactive = !!el?.closest(INTERACTIVE);
      set('is-text', !!el?.closest(TEXT));
      set('is-hover', interactive);
      set('is-drag', !interactive && !!el?.closest(DRAG));

      // Buttons lean slightly toward the cursor
      const btn = el?.closest(MAGNETIC);
      if (btn !== magnet) releaseMagnet();
      if (btn && !btn.disabled && !reduce) {
        const b = btn.getBoundingClientRect();
        btn.style.setProperty('--mx', `${(x - (b.left + b.width / 2)) * 0.22}px`);
        btn.style.setProperty('--my', `${(y - (b.top + b.height / 2)) * 0.3}px`);
        magnet = btn;
      }
    };

    const tick = () => {
      rx += (x - rx) * (reduce ? 1 : 0.18);
      ry += (y - ry) * (reduce ? 1 : 0.18);
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onDown = () => set('is-down', true);
    const onUp = () => set('is-down', false);
    const onLeave = () => { set('is-away', true); releaseMagnet(); };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    document.documentElement.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      releaseMagnet();
      root.classList.remove('has-custom-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <>
      <div className="cc-ring is-away" ref={ringRef} aria-hidden="true"><span /></div>
      <div className="cc-dot is-away" ref={dotRef} aria-hidden="true"><span /></div>
    </>
  );
}
