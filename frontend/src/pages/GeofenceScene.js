import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import GeofenceDemo from './GeofenceDemo';
import { useLang } from '../i18n/LanguageContext';

// Same radius as the real check-in rule (see ClockForm.js)
export const ALLOWED_M = Number(process.env.REACT_APP_ALLOWED_RADIUS_M) || 300;
export const ZONE_R = 9; // scene units
const M_PER_UNIT = ALLOWED_M / ZONE_R;
const LIMIT = 22; // how far the worker can be moved
export const TEAL = 0x1c7c7d;
export const RED = 0xb3261e;
const START = { x: 4, z: 5 };

// Clickable info points, placed in the 3D world and projected onto the screen
const HOTSPOTS = [
  { id: 'building', pos: [0, 4.2, 0] },
  { id: 'zone', pos: [6.4, 0.3, -6.4] },
  { id: 'out', pos: [-15, 1.4, 11] },
];

const KEYS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

function box(w, h, d, color, x, y, z, extra = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function tree(x, z, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.7, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a6a4f })
  );
  trunk.position.y = 0.35;
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x6fae94, roughness: 0.9 })
  );
  crown.position.y = 1.25;
  crown.castShadow = true;
  g.add(trunk, crown);
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  return g;
}

export function buildScene(scene) {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(45, 64),
    new THREE.MeshStandardMaterial({ color: 0xe9f1ee, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Geofence: translucent disc and outline
  const zone = new THREE.Mesh(
    new THREE.CircleGeometry(ZONE_R, 96),
    new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.14, depthWrite: false })
  );
  zone.rotation.x = -Math.PI / 2;
  zone.position.y = 0.01;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(ZONE_R - 0.09, ZONE_R, 128),
    new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.9, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(zone, ring);

  // Hospital
  const hospital = new THREE.Group();
  hospital.add(
    box(8, 3.2, 4.5, 0xffffff, 0, 1.6, 0),
    box(3.4, 2.2, 3.4, 0xf1f6f4, -5.4, 1.1, 0.4),
    box(8.05, 0.9, 4.55, 0x8fd1cc, 0, 2.1, 0, { transparent: true, opacity: 0.8, metalness: 0.2 }),
    box(3.45, 0.7, 3.45, 0x8fd1cc, -5.4, 1.3, 0.4, { transparent: true, opacity: 0.8 }),
    box(8.4, 0.25, 4.9, 0x12303a, 0, 3.32, 0),
    box(1.7, 0.4, 0.5, TEAL, 0, 3.7, 0),
    box(0.5, 0.4, 1.7, TEAL, 0, 3.7, 0),
    box(2.2, 0.15, 1.6, 0x12303a, 0, 1.5, 2.9),
    box(0.12, 1.5, 0.12, 0x12303a, -1, 0.75, 3.55),
    box(0.12, 1.5, 0.12, 0x12303a, 1, 0.75, 3.55),
    box(1.2, 1.3, 0.05, 0x8fd1cc, 0, 0.65, 2.27)
  );
  scene.add(hospital);

  [[6, 6.5, 1], [-7.5, 5.5, 1.1], [8, -4, 0.9], [-8, -5, 1], [3, -7, 1.2], [-13, -2, 1], [14, 4, 1.1], [12, -12, 1]]
    .forEach(([x, z, s]) => scene.add(tree(x, z, s)));

  // Car park, outside the zone
  scene.add(box(9, 0.04, 5.5, 0xcdd9d5, -15, 0.02, 11));
  for (let i = 0; i < 6; i += 1) {
    scene.add(box(0.08, 0.05, 2.6, 0xffffff, -18.6 + i * 1.45, 0.05, 11));
  }
  scene.add(box(1.5, 0.6, 0.9, 0x12303a, -17.9, 0.3, 11), box(1.5, 0.6, 0.9, 0xe8a33d, -14.9, 0.3, 11.2));
}

export default function GeofenceScene({ children }) {
  const { t } = useLang();
  const mountRef = useRef(null);
  const hotLayerRef = useRef(null);
  const hotRefs = useRef([]);
  const api = useRef(null);
  const [supported, setSupported] = useState(true);
  const [dist, setDist] = useState(Math.round(Math.hypot(START.x, START.z) * M_PER_UNIT));
  const [openHot, setOpenHot] = useState(null);
  const inside = dist <= ALLOWED_M;

  useEffect(() => {
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

    // Worker marker
    const workerMat = new THREE.MeshStandardMaterial({ color: TEAL });
    const worker = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1, 16), workerMat);
    body.position.y = 0.5;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), workerMat);
    head.position.y = 1.3;
    body.castShadow = true;
    head.castShadow = true;
    const pulseMat = new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.6, depthWrite: false });
    const pulse = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 32), pulseMat);
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.y = 0.03;
    worker.add(body, head, pulse);
    scene.add(worker);

    const apply = (x, z) => {
      const r = Math.hypot(x, z);
      if (r > LIMIT) {
        x *= LIMIT / r;
        z *= LIMIT / r;
      }
      worker.position.set(x, 0, z);
      const d = Math.hypot(x, z) * M_PER_UNIT;
      const color = d <= ALLOWED_M ? TEAL : RED;
      workerMat.color.setHex(color);
      pulseMat.color.setHex(color);
      setDist(Math.round(d));
    };
    apply(START.x, START.z);
    api.current = {
      place: apply,
      nudge: (dx, dz) => apply(worker.position.x + dx, worker.position.z + dz),
    };

    // Camera
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    let radius = 26;
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const wide = w / h > 1.1;
      camera.setViewOffset(w, h, wide ? -w * 0.16 : 0, wide ? 0 : -h * 0.12, w, h);
      camera.updateProjectionMatrix();
      radius = wide ? 26 : 40;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // Pointer: drag (mouse) or tap/horizontal drag (touch) moves the worker on the ground
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    const ndc = new THREE.Vector2();
    let dragging = false;
    const toGround = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) apply(hit.x, hit.z);
    };
    const el = renderer.domElement;
    const down = (e) => { dragging = true; el.setPointerCapture(e.pointerId); toGround(e); };
    const move = (e) => { if (dragging) toGround(e); };
    const up = () => { dragging = false; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const v = new THREE.Vector3();
    let frame;
    const loop = (ms) => {
      const time = ms / 1000;
      const a = 0.55 + (still ? 0 : Math.sin(time * 0.15) * 0.18);
      camera.position.set(Math.sin(a) * radius * 0.78, radius * 0.55, Math.cos(a) * radius * 0.78);
      camera.lookAt(0, 1.5, 0);
      const k = (time * 0.8) % 1;
      pulse.scale.setScalar(1 + k * 1.4);
      pulseMat.opacity = 0.6 * (1 - k);
      renderer.render(scene, camera);

      // Keep the info buttons attached to their spots in the 3D world
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      HOTSPOTS.forEach((hs, i) => {
        const node = hotRefs.current[i];
        if (!node) return;
        v.set(hs.pos[0], hs.pos[1], hs.pos[2]).project(camera);
        node.style.visibility = v.z < 1 ? 'visible' : 'hidden';
        node.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px)`;
      });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      renderer.dispose();
      if (el.parentNode === mount) mount.removeChild(el);
      api.current = null;
    };
  }, []);

  useEffect(() => {
    if (openHot === null) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpenHot(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openHot]);

  if (!supported) {
    return (
      <section className="home-hero">
        <div className="home-hero-text">{children}</div>
        <GeofenceDemo />
      </section>
    );
  }

  const onKeyDown = (e) => {
    const step = KEYS[e.key];
    if (!step || !api.current) return;
    e.preventDefault();
    api.current.nudge(step[0], step[1]);
  };

  return (
    <section className="scene">
      <div
        ref={mountRef}
        className="scene-canvas"
        tabIndex={0}
        role="group"
        aria-label={t('zone.aria')}
        onKeyDown={onKeyDown}
      />
      <div className="scene-copy">{children}</div>

      <div className="hot-layer" ref={hotLayerRef}>
        {HOTSPOTS.map((h, i) => (
          <div key={h.id} className="hot" ref={(node) => { hotRefs.current[i] = node; }}>
            <button
              type="button"
              className="hot-dot"
              aria-expanded={openHot === i}
              aria-label={t(`hs.${h.id}.title`)}
              onClick={() => setOpenHot(openHot === i ? null : i)}
            />
            {openHot === i && (
              <div className="hot-pop" role="dialog" aria-label={t(`hs.${h.id}.title`)}>
                <button type="button" className="hot-close" aria-label={t('hs.close')} onClick={() => setOpenHot(null)}>
                  &times;
                </button>
                <strong>{t(`hs.${h.id}.title`)}</strong>
                <p>{t(`hs.${h.id}.text`)}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="scene-panel" aria-live="polite">
        <span className={`geo-pill ${inside ? 'is-in' : 'is-out'}`}>
          {inside ? t('zone.inside') : t('zone.outside')}
        </span>
        <span className="geo-distance">{t('zone.distance', { m: dist })}</span>
        <div className="geo-presets">
          <button type="button" onClick={() => api.current && api.current.place(0, 4.4)}>
            {t('zone.entrance')}
          </button>
          <button type="button" onClick={() => api.current && api.current.place(-15, 11)}>
            {t('zone.carpark')}
          </button>
        </div>
        <p className="geo-hint">{t('zone.hint')}</p>
      </div>
    </section>
  );
}