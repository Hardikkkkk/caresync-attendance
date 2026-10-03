import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useLang } from '../i18n/LanguageContext';
import { buildScene, TEAL, RED, ZONE_R } from './GeofenceScene';

const STEPS = ['s1', 's2', 's3', 's4'];
// Camera stops along the scroll (p = scroll progress 0..1)
const KF = [
  { p: 0, cam: [-20, 13, 24], look: [-9, 1, 7] },
  { p: 0.3, cam: [-12, 9, 17], look: [-4, 1, 5] },
  { p: 0.65, cam: [7, 5, 13], look: [0, 1.5, 2] },
  { p: 1, cam: [0, 19, 23], look: [0, 1, 0] },
];
const FROM = [-15, 11]; // car park
const TO = [0, 4.4]; // entrance

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, k) => a + (b - a) * k;

function frameAt(p, cam, look) {
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1].p) i += 1;
  const a = KF[i];
  const b = KF[i + 1];
  const k = smooth(clamp01((p - a.p) / (b.p - a.p)));
  for (let n = 0; n < 3; n += 1) {
    cam[n] = lerp(a.cam[n], b.cam[n], k);
    look[n] = lerp(a.look[n], b.look[n], k);
  }
}

export default function ShiftTour() {
  const { t } = useLang();
  const wrapRef = useRef(null);
  const mountRef = useRef(null);
  const [step, setStep] = useState(0);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const wrap = wrapRef.current;
    const mount = mountRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      setSupported(false);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xeaf3f0, 40, 85);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfe3de, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(10, 18, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26 });
    scene.add(sun);
    buildScene(scene);

    const workerMat = new THREE.MeshStandardMaterial({ color: RED });
    const worker = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1, 16), workerMat);
    body.position.y = 0.5;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), workerMat);
    head.position.y = 1.3;
    body.castShadow = true;
    head.castShadow = true;
    const pulseMat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.6, depthWrite: false });
    const pulse = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 32), pulseMat);
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.y = 0.03;
    worker.add(body, head, pulse);
    scene.add(worker);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const wide = w / h > 1.1;
      camera.zoom = wide ? 1 : 0.75;
      camera.setViewOffset(w, h, wide ? -w * 0.1 : 0, wide ? 0 : h * 0.1, w, h);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    let target = 0;
    let cur = 0;
    let lastStep = -1;
    let onScreen = true;
    const readProgress = () => {
      const r = wrap.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      target = span > 0 ? clamp01(-r.top / span) : 0;
    };
    readProgress();
    cur = target;
    window.addEventListener('scroll', readProgress, { passive: true, capture: true });
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; });
    io.observe(wrap);

    const cam = [0, 0, 0];
    const look = [0, 0, 0];
    let frame;
    const loop = (ms) => {
      frame = requestAnimationFrame(loop);
      if (!onScreen) return;
      cur += (target - cur) * 0.09; // smooth follow
      const s = cur < 0.25 ? 0 : cur < 0.5 ? 1 : cur < 0.75 ? 2 : 3;
      if (s !== lastStep) { lastStep = s; setStep(s); }

      frameAt(cur, cam, look);
      camera.position.set(cam[0], cam[1], cam[2]);
      camera.lookAt(look[0], look[1], look[2]);

      // The worker walks in from the car park; colour follows the real distance rule
      const wp = smooth(clamp01((cur - 0.05) / 0.55));
      worker.position.set(lerp(FROM[0], TO[0], wp), 0, lerp(FROM[1], TO[1], wp));
      const color = Math.hypot(worker.position.x, worker.position.z) <= ZONE_R ? TEAL : RED;
      workerMat.color.setHex(color);
      pulseMat.color.setHex(color);
      const phase = ((ms / 1000) * 0.8) % 1;
      pulse.scale.setScalar(1 + phase * (s === 2 ? 3.5 : 1.4)); // bigger ripple at check-in
      pulseMat.opacity = 0.6 * (1 - phase);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('scroll', readProgress, { capture: true });
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  if (!supported) {
    return (
      <section className="home-section">
        <h2>{t('tour.title')}</h2>
        <ol className="tour-list">
          {STEPS.map((id) => (
            <li key={id}>
              <h3>{t(`tour.${id}.title`)}</h3>
              <p>{t(`tour.${id}.text`)}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section className="tour" ref={wrapRef} aria-label={t('tour.title')}>
      <div className="tour-stick">
        <div ref={mountRef} className="tour-canvas" aria-hidden="true" />
        <h2 className="tour-title">{t('tour.title')}</h2>
        <ol className="tour-rail" aria-label={t('tour.aria')}>
          {STEPS.map((id, i) => (
            <li key={id} className={i === step ? 'is-on' : i < step ? 'is-done' : ''}>{i + 1}</li>
          ))}
        </ol>
        <div className="tour-card" key={step}>
          <h3>{t(`tour.${STEPS[step]}.title`)}</h3>
          <p>{t(`tour.${STEPS[step]}.text`)}</p>
        </div>
      </div>
    </section>
  );
}
