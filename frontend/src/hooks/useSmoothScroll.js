import { useEffect } from 'react';
import Lenis from 'lenis';

// Areas that should always scroll natively (add data-lenis-prevent to any inner scroll box)
const NATIVE = '[data-lenis-prevent]';

// true if the wheel is over an inner scrollable box (table, modal) that scrolls on its own
function inNestedScroller(node) {
  for (let el = node; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    const oy = window.getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
  }
  return false;
}

// Eased scrolling for the whole app.
// Self-healing: if the first wheel turn does not move the page, Lenis switches itself off.
export default function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      console.info('CareSync: smooth scrolling and animations are off because "reduce motion" is turned on in your system settings.');
      return undefined;
    }

    // Native CSS smooth-scroll fights Lenis, so switch it off while Lenis runs
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      prevent: (node) => !!(node.closest && node.closest(NATIVE)),
    });

    let raf;
    let timer;
    let alive = true;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // The page grows after first paint (login check, 3D scene, tour). Re-measure whenever it does,
    // otherwise Lenis keeps an old, shorter page height and scrolling stops part-way down.
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => lenis.resize());
      ro.observe(document.body);
      const rootEl = document.getElementById('root');
      if (rootEl) ro.observe(rootEl);
    }
    const onLoad = () => lenis.resize();
    window.addEventListener('load', onLoad);

    const shutDown = () => {
      if (!alive) return;
      alive = false;
      if (ro) ro.disconnect();
      window.removeEventListener('load', onLoad);
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      lenis.destroy();
      html.style.scrollBehavior = previous;
    };

    // Watchdog: runs once, on the first wheel turn over normal page content
    let checked = false;
    const onWheel = (e) => {
      if (checked || e.ctrlKey || e.deltaY === 0) return;
      const target = e.target instanceof Element ? e.target : null;
      if (!target || target.closest(NATIVE) || inNestedScroller(target)) return;
      const se = document.scrollingElement || html;
      const max = se.scrollHeight - se.clientHeight;
      const before = window.scrollY;
      if (max < 5 || (e.deltaY > 0 && before >= max - 1) || (e.deltaY < 0 && before <= 0)) return;
      checked = true;
      timer = setTimeout(() => {
        if (Math.abs(window.scrollY - before) < 1) {
          console.warn('CareSync: smooth scrolling was not moving the page, so it was switched off.');
          shutDown();
        }
      }, 500);
    };
    window.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      shutDown();
    };
  }, []);
}