// Keliling Dunia ELCY: game 3D (Three.js) keliling 5 kota, ngobrol dengan NPC.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Sky } from "three/addons/objects/Sky.js";

const D = window.DUNIA, $ = (s) => document.querySelector(s), esc = TUJ.esc;
const LK = ["en", "ja", "zh", "fr", "ar"];
const LANG_EN = { en: "English", ja: "Japanese", zh: "Mandarin Chinese", fr: "French", ar: "Arabic" };
const ROLE_EN = { imigrasi: "an immigration officer at the airport", kafe: "a barista at a café", hotel: "a hotel receptionist",
  pasar: "a vendor at a street market", kantor: "an office manager in a formal meeting", warga: "a friendly local resident who gives directions" };
const SIGN = {
  en: { kafe: "Café", hotel: "Hotel", pasar: "Market", kantor: "Office", bandara: "Airport" },
  ja: { kafe: "カフェ", hotel: "ホテル", pasar: "市場", kantor: "オフィス", bandara: "空港" },
  zh: { kafe: "咖啡馆", hotel: "酒店", pasar: "市场", kantor: "办公楼", bandara: "机场" },
  fr: { kafe: "Café", hotel: "Hôtel", pasar: "Marché", kantor: "Bureau", bandara: "Aéroport" },
  ar: { kafe: "مقهى", hotel: "فندق", pasar: "سوق", kantor: "مكتب", bandara: "مطار" },
};
const touch = matchMedia("(pointer: coarse)").matches;
const say = (t) => TUJ.speak(t, LANGS[LANG].speech);
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- simpanan progres ----------
const KEY = "tujlc-dunia";
let SAVE = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch {} };
const best = (k, id) => SAVE[k]?.best?.[id] || 0;
const turnsOf = (k, n) => n.sim !== undefined ? AK.SIM[k][n.sim].turns : D.DLG[k][n.dlg];
const passOf = (n) => Math.ceil(n * 4 / 3); // minimal 2/3 dari nilai maksimal (2 per giliran)
const isDone = (k, n) => best(k, n.id) >= passOf(turnsOf(k, n).length);
const doneCount = (k) => D.NPCS.filter((n) => isDone(k, n)).length;

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.5 : 2));
renderer.shadowMap.enabled = !touch;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
$("#world").append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.3, 4000);
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 1 ? 72 : 55; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

const hemi = new THREE.HemisphereLight(0xffffff, 0x556655, 1.4);
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(40, 70, 25); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 600 }); sun.shadow.bias = -0.0006;
scene.add(hemi, sun, sun.target);
let city = new THREE.Group(); scene.add(city);

// ---------- material & bentuk dasar (gaya kartun, cocok dengan ilustrasi ELCY) ----------
const grad = (() => { const t = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const MATS = new Map();
const M = (c) => { if (!MATS.has(c)) MATS.set(c, new THREE.MeshToonMaterial({ color: c, gradientMap: grad })); return MATS.get(c); };
const OUT = new THREE.MeshBasicMaterial({ color: 0x1b2c30, side: THREE.BackSide });
const winTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#34505e"; g.fillRect(14, 12, 36, 32); g.fillStyle = "#8fb5c9"; g.fillRect(17, 15, 30, 12);
  g.fillStyle = "#cfc9bc"; g.fillRect(0, 58, 64, 6);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const WMATS = new Map();
const WM = (c) => { if (!WMATS.has(c)) WMATS.set(c, new THREE.MeshToonMaterial({ color: c, map: winTex, gradientMap: grad })); return WMATS.get(c); };

function add(mesh, x, y, z, parent = city, shadow = true) { mesh.position.set(x, y, z); if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; } parent.add(mesh); return mesh; }
const box = (w, h, d, c, x, y, z, p) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === "number" ? M(c) : c), x, y, z, p);
const cyl = (rt, rb, h, c, x, y, z, p, seg = 14) => add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c)), x, y, z, p);
const sph = (r, c, x, y, z, p, seg = 16) => add(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.75)), M(c)), x, y, z, p);
function pyramid(half, h, c, x, y, z, p) { // limas segi empat, alas persegi 2*half
  const m = new THREE.Mesh(new THREE.ConeGeometry(half * Math.SQRT2, h, 4), M(c)); m.rotation.y = Math.PI / 4; return add(m, x, y + h / 2, z, p);
}
function outline(mesh, s = 1.08) { const o = new THREE.Mesh(mesh.geometry, OUT); o.scale.setScalar(s); mesh.add(o); return mesh; }
function beam(a, b, r, c, p, mat) { // batang dari titik a ke b
  const v = new THREE.Vector3().subVectors(b, a), L = v.length();
  const m = new THREE.Mesh(new THREE.BoxGeometry(r, L, r), mat || M(c));
  m.position.copy(a).addScaledVector(v, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  m.castShadow = true; (p || city).add(m); return m;
}
function building(x, z, w, d, h, c) { // gedung bertekstur jendela; UV diskalakan supaya jendela tidak melar
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i, top = f === 2 || f === 3;
    uv.setXY(k, top ? 0 : uv.getX(k) * Math.max(1, Math.round((f < 2 ? d : w) / 3.2)), top ? 0.02 : uv.getY(k) * Math.max(1, Math.round(h / 3.2)));
  }
  const m = add(new THREE.Mesh(g, WM(c)), x, h / 2, z);
  solid(x, z, w / 2, d / 2); return m;
}
function textCanvas(text, { w = 512, h = 128, bg = "#274045", fg = "#FFD315", font = 72, round = 28 } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, round); g.fill(); g.lineWidth = 8; g.strokeStyle = fg; g.stroke(); }
  g.fillStyle = fg; g.font = `700 ${font}px Fredoka, "Noto Sans JP", "Noto Sans SC", "Noto Naskh Arabic", sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 4, w - 40);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function sign(text, x, y, z, rotY = 0, w = 6) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: textCanvas(text), side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = rotY; city.add(m); return m;
}
function label(text, scale = 1, opts, xray = false) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textCanvas(text, opts), depthTest: !xray }));
  s.scale.set(3.2 * scale, 0.8 * scale, 1); s.renderOrder = 10; return s;
}

// ---------- tabrakan (grid spasial: gedung asli, air, pohon, kendaraan, landmark) ----------
const CELL = 16;
let GRID = new Map(), BOUND = 60, BRIDGES = [];
const gkey = (i, j) => i * 100003 + j;
function gridAdd(item, x0, z0, x1, z1) {
  for (let i = Math.floor((x0 - 2) / CELL); i <= Math.floor((x1 + 2) / CELL); i++)
    for (let j = Math.floor((z0 - 2) / CELL); j <= Math.floor((z1 + 2) / CELL); j++) { const k = gkey(i, j); if (!GRID.has(k)) GRID.set(k, []); GRID.get(k).push(item); }
}
const solid = (x, z, hw, hd, rot = 0) => { const m = Math.hypot(hw, hd); gridAdd({ x, z, hw, hd, c: Math.cos(rot), s: Math.sin(rot) }, x - m, z - m, x + m, z + m); };
const round = (x, z, r) => gridAdd({ x, z, r }, x - r, z - r, x + r, z + r);
function ringBox(ring) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (let i = 0; i < ring.length; i += 2) { x0 = Math.min(x0, ring[i]); x1 = Math.max(x1, ring[i]); z0 = Math.min(z0, ring[i + 1]); z1 = Math.max(z1, ring[i + 1]); } return [x0, z0, x1, z1]; }
function polySolid(ring, water = false, h = 0) { const [x0, z0, x1, z1] = ringBox(ring); gridAdd({ ring, x0, z0, x1, z1, water, h }, x0, z0, x1, z1); }
function roofAt(x, z) { const cell = GRID.get(gkey(Math.floor(x / CELL), Math.floor(z / CELL))); let h = 0; if (cell) for (const s of cell) if (s.h && x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1 && inRing(s.ring, x, z)) h = Math.max(h, s.h); return h; }
function inRing(r, x, z) {
  let c = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) { const xi = r[i], zi = r[i + 1], xj = r[j], zj = r[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; }
  return c;
}
function segDist(x, z, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)); return Math.hypot(x - ax - dx * t, z - az - dz * t); }
const onBridge = (x, z) => BRIDGES.some(([w, p]) => { for (let i = 2; i < p.length; i += 2) if (segDist(x, z, p[i - 2], p[i - 1], p[i], p[i + 1]) < w / 2 + 1.5) return true; return false; });
const OFF = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
function hits(x, z, r = 0.8) {
  if (Math.abs(x) > BOUND || Math.abs(z) > BOUND) return true;
  const cell = GRID.get(gkey(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!cell) return false;
  for (const s of cell) {
    if (s.r !== undefined) { if ((x - s.x) ** 2 + (z - s.z) ** 2 < (s.r + r) ** 2) return true; }
    else if (s.ring) {
      if (x < s.x0 - r || x > s.x1 + r || z < s.z0 - r || z > s.z1 + r) continue;
      if (s.water) { if (inRing(s.ring, x, z) && !onBridge(x, z)) return true; continue; }
      for (const [a, b] of OFF) if (inRing(s.ring, x + a * r, z + b * r)) return true;
    } else { const dx = x - s.x, dz = z - s.z, lx = dx * s.c - dz * s.s, lz = dx * s.s + dz * s.c; if (Math.abs(lx) < s.hw + r && Math.abs(lz) < s.hd + r) return true; }
  }
  return false;
}

// ---------- tokoh ----------
function person(shirt, hat, skin = 0xf1c27d) {
  const g = new THREE.Group();
  const legs = [-0.18, 0.18].map((x) => box(0.3, 0.9, 0.3, 0x2d3540, x, 0.45, 0, g));
  outline(box(0.82, 1.0, 0.5, shirt, 0, 1.4, 0, g), 1.06);
  const arms = [-0.52, 0.52].map((x) => { const pv = new THREE.Group(); pv.position.set(x, 1.85, 0); g.add(pv); box(0.22, 0.85, 0.24, shirt, 0, -0.43, 0, pv); sph(0.13, skin, 0, -0.9, 0, pv, 8); return pv; });
  outline(sph(0.42, skin, 0, 2.2, 0, g), 1.07);
  [-0.15, 0.15].forEach((x) => sph(0.06, 0x1b2c30, x, 2.25, 0.38, g, 8));
  box(0.2, 0.04, 0.02, 0x8a3b2b, 0, 2.05, 0.41, g);
  if (hat) { cyl(0.45, 0.45, 0.22, hat, 0, 2.55, 0, g); box(0.5, 0.06, 0.35, hat, 0, 2.46, 0.38, g); }
  else sph(0.44, 0x3b2a20, 0, 2.32, -0.06, g).scale.set(1, 0.75, 1);
  g.userData = { legs, arms }; return g;
}
function globeTexture() { // kepala ELCY: bola dunia + wajah
  const W = 512, H = 256, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  g.fillStyle = "#2f74d0"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#3fb86a";
  [[60, 70, 50, 34], [110, 150, 40, 50], [300, 60, 70, 40], [360, 150, 50, 36], [450, 90, 40, 60], [200, 210, 60, 20], [20, 180, 30, 30]]
    .forEach(([x, y, rx, ry]) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0.4, 0, 7); g.fill(); });
  const fx = W * 0.25, fy = H * 0.5; // wajah menghadap +z (u = 0.25)
  g.fillStyle = "#14233a";
  g.beginPath(); g.ellipse(fx - 30, fy - 4, 9, 15, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(fx + 30, fy - 4, 9, 15, 0, 0, 7); g.fill();
  g.lineWidth = 7; g.strokeStyle = "#14233a"; g.lineCap = "round";
  g.beginPath(); g.moveTo(fx - 46, fy - 30); g.lineTo(fx - 16, fy - 22); g.stroke();
  g.beginPath(); g.moveTo(fx + 46, fy - 30); g.lineTo(fx + 16, fy - 22); g.stroke();
  g.fillStyle = "#c73b3b"; g.beginPath(); g.arc(fx, fy + 24, 13, 0, Math.PI); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function elcyScooter(withRider = true) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const MINT = 0x74cfaa, MINT2 = 0x5ab892, BLUE = 0x2d6fd6;
  // skuter
  box(0.85, 0.16, 1.5, MINT2, 0, 0.5, 0.05, body);
  const rear = outline(sph(0.62, MINT, 0, 0.85, -0.62, body), 1.05); rear.scale.set(1.15, 0.85, 1.45);
  outline(box(0.62, 0.16, 0.95, 0x8b5a3c, 0, 1.33, -0.48, body), 1.06);
  const shield = outline(box(0.9, 1.25, 0.22, MINT, 0, 1.05, 0.75, body), 1.05); shield.rotation.x = -0.22;
  const fender = sph(0.42, MINT, 0, 0.62, 0.95, body); fender.scale.set(0.8, 0.7, 1.1);
  cyl(0.07, 0.07, 1.0, 0x9aa5a8, 0, 1.75, 0.86, body, 8);
  outline(box(1.25, 0.12, 0.14, MINT, 0, 2.22, 0.82, body), 1.1);
  sph(0.16, 0xfff6c8, 0, 1.95, 1.0, body, 10);
  const wheels = [0.98, -0.95].map((z) => { const w = cyl(0.36, 0.36, 0.26, 0x2b2f33, 0, 0.36, z, body, 16); w.rotation.z = Math.PI / 2; cyl(0.18, 0.18, 0.28, 0xc9d2d4, 0, 0, 0, w, 10); return w; });
  if (!withRider) { root.userData = { body, wheels }; return root; }
  // ELCY: badan biru, sepatu merah
  outline(box(0.62, 0.8, 0.45, BLUE, 0, 1.85, -0.38, body), 1.07).rotation.x = 0.15;
  [-0.2, 0.2].forEach((x) => {
    beam(new THREE.Vector3(x, 1.45, -0.4), new THREE.Vector3(x, 1.5, 0.2), 0.2, BLUE, body);
    beam(new THREE.Vector3(x, 1.5, 0.2), new THREE.Vector3(x * 1.2, 0.72, 0.38), 0.18, BLUE, body);
    outline(box(0.24, 0.18, 0.4, 0xe2382f, x * 1.2, 0.66, 0.48, body), 1.12);
  });
  [-1, 1].forEach((s) => beam(new THREE.Vector3(s * 0.33, 2.15, -0.3), new THREE.Vector3(s * 0.58, 2.2, 0.8), 0.15, BLUE, body));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 20), new THREE.MeshToonMaterial({ map: globeTexture(), gradientMap: grad }));
  head.position.set(0, 2.85, -0.25); head.castShadow = true; outline(head, 1.06); body.add(head);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.8, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), M(0x4fb87a));
  helm.position.copy(head.position); helm.rotation.x = -0.55; helm.castShadow = true; outline(helm, 1.05); body.add(helm);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 6, 30, Math.PI), M(0xffffff));
  stripe.position.copy(head.position); stripe.rotation.set(-0.55, Math.PI / 2, 0); body.add(stripe);
  root.userData = { body, wheels }; return root;
}
function cloud(x, y, z) {
  const g = new THREE.Group();
  [[0, 0, 0, 4], [3.5, -0.5, 0.5, 3], [-3.5, -0.6, -0.4, 3.2], [1, 1.6, 0, 2.8]].forEach(([a, b, c, r]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), M(0xffffff)); m.position.set(a, b, c); g.add(m);
  });
  g.position.set(x, y, z); city.add(g); return g;
}

// ---------- pembangun kota asli (data OpenStreetMap, skala meter sebenarnya) ----------
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let NPCS = [], CLOUDS = [], player, LANG = null, MINI = null, LMS = [], ROOFBOX = [];
const STY = {
  en: { ground: 0xa19d95, walls: [0x9a5a44, 0x8a4c3a, 0xd9cfb8, 0xc8bea8, 0x7d5545, 0xb07055], hist: 0xd8c99f, roof: 0x5a5e63, fac: "london", bay: 4, lv: 3.4, road: 0x3c3f44, walk: 0xbdb7ab, grass: 0x5d8c48, water: 0x3f5a63, sand: 0xcdbb94, tree: 0x47703a, sun: [24, 205], turb: 5, ray: 1.6, fog: 0xc6ced4, exp: 0.55 },
  ja: { ground: 0xaaa9a4, walls: [0xe9e6df, 0xd3d5d6, 0xa9b0b6, 0xc7bfae, 0x8f989f, 0xdcd6cb], hist: 0xc4362b, roof: 0xa3a6a8, fac: "tokyo", bay: 5, lv: 3.3, road: 0x45484c, walk: 0xc4c1ba, grass: 0x618f45, water: 0x3f6576, sand: 0xd0c09a, tree: 0x4f8540, sun: [34, 220], turb: 6, ray: 1.6, fog: 0xd3d8de, exp: 0.52 },
  zh: { ground: 0xa8a49a, walls: [0x9a9890, 0xb8b2a4, 0x8e8a80, 0xcfc6b2, 0xa8463a, 0xb5aa96], hist: 0xb3392c, roof: 0x6e726c, fac: "beijing", bay: 4, lv: 3.3, road: 0x43464a, walk: 0xc2bcae, grass: 0x6c8c4a, water: 0x48666f, sand: 0xd2c29c, tree: 0x587a3c, sun: [40, 195], turb: 7, ray: 1.8, fog: 0xd7d4c9, exp: 0.52 },
  fr: { ground: 0xb0aa9c, walls: [0xe6dbc4, 0xddd0b5, 0xeee5d2, 0xd5c7aa, 0xe2d6bd], hist: 0xe0d2b0, roof: 0x6f7982, fac: "paris", bay: 4, lv: 3.2, road: 0x46494d, walk: 0xc9c2b2, grass: 0x6a9a4e, water: 0x45626b, sand: 0xd8c8a2, tree: 0x4f7d3c, sun: [30, 240], turb: 5, ray: 1.4, fog: 0xd5dce2, exp: 0.55 },
  ar: { ground: 0xd6bd8e, walls: [0xc9a77a, 0xb89068, 0xd9c19a, 0xa88a68, 0xe0cfae, 0xbfa07c], hist: 0xd9b77c, roof: 0xcbb187, fac: "cairo", bay: 4, lv: 3.0, road: 0x5a564f, walk: 0xd8c6a0, grass: 0x7d9a50, water: 0x417580, sand: 0xdcc394, tree: 0x5f8a3e, sun: [55, 160], turb: 4, ray: 1.0, fog: 0xe6dac0, exp: 0.5 },
};
const VEH = {
  en: [[0xc8102e, 2.55, 4.4, 10.5, 1], [0x15171a, 1.8, 1.7, 4.6], [0x15171a, 1.8, 1.7, 4.6], [0x9aa1a8, 1.8, 1.5, 4.4], [0x2f4e7a, 1.8, 1.5, 4.3]],
  ja: [[0xf2f2f2, 1.7, 1.5, 4.5], [0x161616, 1.7, 1.55, 4.6], [0xf6f6f6, 1.7, 1.9, 4.2], [0x2e5fa8, 2.5, 3.1, 10.5, 1], [0x7e8890, 1.7, 1.5, 4.4]],
  zh: [[0xf2c230, 1.8, 1.5, 4.6], [0x1d1d1d, 1.85, 1.5, 4.9], [0xe8e8e8, 1.8, 1.55, 4.6], [0x3a8f4a, 2.5, 3.1, 11.5, 1], [0x9c2a26, 1.8, 1.5, 4.5]],
  fr: [[0xe8e8e8, 1.75, 1.5, 4.1], [0x2c3a52, 1.75, 1.5, 4.2], [0xb3262b, 1.7, 1.45, 3.9], [0x5d6b4f, 2.5, 3.1, 12, 1], [0x262626, 1.8, 1.5, 4.5]],
  ar: [[0xf4f4f4, 1.75, 1.5, 4.3], [0x1c1c1c, 1.75, 1.5, 4.3], [0xe0e0e0, 2.0, 2.4, 5.2], [0x2f6f9a, 2.4, 3.0, 10, 1], [0xc9b28a, 1.75, 1.5, 4.2]],
};
const RM = new Map();
const R = (c, ro = 0.85, me = 0, extra = {}) => { const k = `${c}|${ro}|${me}|${JSON.stringify(extra)}`; if (!RM.has(k)) RM.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: ro, metalness: me, ...extra })); return RM.get(k); };
function mesh(geo, mat, x, y, z, parent, shadow = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (shadow) { m.castShadow = m.receiveShadow = true; } parent.add(m); return m; }

// tekstur fasad khas tiap kota (1 petak = 1 jendela x 1 lantai)
const FAC = {};
function facade(kind) {
  if (FAC[kind]) return FAC[kind];
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const win = (x, y, w, h, frame, glass = "#2b3943") => {
    g.fillStyle = frame; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, "#6f8798"); gr.addColorStop(0.45, glass); gr.addColorStop(1, "#161d22");
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  };
  g.fillStyle = "#fff"; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  if (kind === "london") {
    for (let y = 0; y < 128; y += 8) { g.fillStyle = "rgba(0,0,0,.13)"; g.fillRect(0, y, 128, 1); for (let x = (y / 8) % 2 ? 0 : 8; x < 128; x += 16) g.fillRect(x, y, 1, 8); }
    g.fillStyle = "#ece6da"; g.fillRect(34, 16, 60, 6); win(40, 26, 48, 68, "#f4f1ea");
    g.fillStyle = "#f4f1ea"; g.fillRect(40, 58, 48, 3); g.fillRect(63, 26, 2, 68); g.fillRect(51, 26, 1.5, 68); g.fillRect(76, 26, 1.5, 68);
    g.fillStyle = "#d9d2c4"; g.fillRect(34, 96, 60, 6);
  } else if (kind === "paris") {
    for (let y = 0; y < 128; y += 16) { g.fillStyle = "rgba(0,0,0,.08)"; g.fillRect(0, y, 128, 1); }
    g.fillStyle = "#f2ece0"; g.fillRect(30, 8, 68, 5);
    win(38, 16, 52, 86, "#efe9dc", "#33424c"); g.fillStyle = "#efe9dc"; g.fillRect(63, 16, 2, 86); g.fillRect(38, 46, 52, 2);
    g.fillStyle = "#1c1f22"; g.fillRect(32, 82, 64, 3); for (let x = 34; x < 96; x += 4) g.fillRect(x, 82, 1.4, 20); g.fillRect(32, 100, 64, 2);
    g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(0, 120, 128, 3);
  } else if (kind === "tokyo") {
    g.fillStyle = "rgba(0,0,0,.07)"; for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 1, 128);
    win(4, 26, 120, 58, "#cfd3d6", "#26323b"); g.fillStyle = "#cfd3d6"; for (let x = 4; x < 124; x += 30) g.fillRect(x, 26, 2, 58);
    g.fillStyle = "#b9bdc0"; g.fillRect(0, 96, 128, 10);
    g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, 106, 128, 2);
  } else if (kind === "beijing") {
    for (let y = 0; y < 128; y += 6) { g.fillStyle = "rgba(0,0,0,.06)"; g.fillRect(0, y, 128, 1); }
    win(28, 26, 72, 58, "#d9d6cf", "#33404a"); g.fillStyle = "#d9d6cf"; g.fillRect(63, 26, 2, 58); g.fillRect(28, 48, 72, 2);
    g.fillStyle = "#c4bfb4"; g.fillRect(24, 86, 80, 5);
  } else {
    win(46, 28, 36, 54, "#d8c7a6", "#2b3134");
    g.fillStyle = "#7b5b3c"; g.fillRect(30, 28, 14, 54); g.fillRect(84, 28, 14, 54);
    g.fillStyle = "rgba(0,0,0,.18)"; for (let y = 32; y < 80; y += 6) { g.fillRect(31, y, 12, 1); g.fillRect(85, y, 12, 1); }
    g.fillStyle = "#ebebeb"; g.fillRect(96, 92, 24, 15); g.fillStyle = "#999"; g.fillRect(99, 95, 18, 9);
    g.fillStyle = "#cfbd99"; g.fillRect(28, 84, 72, 4);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return FAC[kind] = t;
}
function shopTex(kind) { // lantai dasar: etalase toko
  const key = "shop-" + kind; if (FAC[key]) return FAC[key];
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const fascia = { london: "#1f3b2d", paris: "#6b1d24", tokyo: "#d8d8d8", beijing: "#8e1f18", cairo: "#6d4b2b" }[kind];
  g.fillStyle = "#e9e5dc"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = fascia; g.fillRect(0, 8, 128, 22);
  g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(20, 15, 60, 8);
  const gr = g.createLinearGradient(0, 36, 0, 120); gr.addColorStop(0, "#58707e"); gr.addColorStop(1, "#1d262c");
  g.fillStyle = gr; g.fillRect(8, 36, 76, 84); g.fillStyle = "#2a2018"; g.fillRect(92, 44, 28, 76);
  g.fillStyle = "rgba(255,240,200,.35)"; for (let i = 0; i < 5; i++) g.fillRect(14 + i * 14, 70 + (i % 2) * 10, 9, 30);
  g.fillStyle = fascia; g.fillRect(6, 34, 80, 3); g.fillRect(90, 42, 32, 3);
  if (kind === "paris" || kind === "london") { g.fillStyle = kind === "paris" ? "#8b1e24" : "#2f5a3b"; for (let x = 0; x < 128; x += 16) g.fillRect(x, 30, 8, 6); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return FAC[key] = t;
}
function stoneTex(stripes = 64, base = "#fff", line = "rgba(0,0,0,.18)") {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * 128, Math.random() * 128, 3, 2); }
  g.fillStyle = line; for (let y = 0; y < 128; y += 128 / stripes * 8) g.fillRect(0, y, 128, 2);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

function shapeOf(ring, holes) {
  const sh = new THREE.Shape();
  for (let i = 0; i < ring.length; i += 2) i ? sh.lineTo(ring[i], -ring[i + 1]) : sh.moveTo(ring[i], -ring[i + 1]);
  (holes || []).forEach((h) => { const p = new THREE.Path(); for (let i = 0; i < h.length; i += 2) i ? p.lineTo(h[i], -h[i + 1]) : p.moveTo(h[i], -h[i + 1]); sh.holes.push(p); });
  return sh;
}
function flatGeo(list, y) {
  const gs = [];
  for (const [ring, holes] of list) { try { const g = new THREE.ShapeGeometry(shapeOf(ring, holes)); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); gs.push(g); } catch {} }
  return gs.length ? mergeGeometries(gs) : null;
}
function ribbonGeo(list, y, wOf = (r) => r[0]) {
  const pos = [];
  const quad = (ax, az, bx, bz, w) => { const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = -dz / L * w / 2, nz = dx / L * w / 2; pos.push(ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz, ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz); };
  const disc = (x, z, w) => { const n = 8, q = w / 2; for (let i = 0; i < n; i++) { const a = i / n * 6.2832, b = (i + 1) / n * 6.2832; pos.push(x, y, z, x + Math.cos(b) * q, y, z + Math.sin(b) * q, x + Math.cos(a) * q, y, z + Math.sin(a) * q); } };
  for (const r of list) { const p = r[3], w = wOf(r); for (let i = 2; i < p.length; i += 2) quad(p[i - 2], p[i - 1], p[i], p[i + 1], w); for (let i = 0; i < p.length; i += 2) disc(p[i], p[i + 1], w); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
function dashGeo(list, y) {
  const pos = [];
  for (const [w, walk, , p] of list) {
    if (walk || w < 8.5) continue; let ph = 0;
    for (let i = 2; i < p.length; i += 2) {
      const ax = p[i - 2], az = p[i - 1], dx = p[i] - ax, dz = p[i + 1] - az, L = Math.hypot(dx, dz); if (!L) continue;
      const ux = dx / L, uz = dz / L, nx = -uz * 0.09, nz = ux * 0.09; let t = ph;
      for (; t < L; t += 9) { const t2 = Math.min(L, t + 3.5), x1 = ax + ux * t, z1 = az + uz * t, x2 = ax + ux * t2, z2 = az + uz * t2; pos.push(x1 + nx, y, z1 + nz, x2 + nx, y, z2 + nz, x2 - nx, y, z2 - nz, x1 + nx, y, z1 + nz, x2 - nx, y, z2 - nz, x1 - nx, y, z1 - nz); }
      ph = t - L;
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
function nearestRoad(x, z, roads) {
  let best = null;
  for (const r of roads) { const p = r[3]; for (let i = 2; i < p.length; i += 2) {
    const ax = p[i - 2], az = p[i - 1], dx = p[i] - ax, dz = p[i + 1] - az, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) best = { d, x: px, z: pz, w: r[0], yaw: Math.atan2(dx, dz) };
  } }
  return best;
}

// ---------- landmark buatan sendiri, ukuran asli ----------
function landmarks(k, lm) {
  const G = new THREE.Group(); city.add(G);
  if (k === "en") {
    const [x, z] = lm[0], g = new THREE.Group(); g.position.set(x, 0, z); G.add(g);
    const stone = R(0xcdb88c, 0.9, 0, { map: stoneTex(32) }), dark = R(0x3b4a45, 0.7), gold = R(0xc9a24a, 0.4, 0.6);
    mesh(new THREE.BoxGeometry(12, 55, 12), stone, 0, 27.5, 0, g);
    for (let i = -1; i <= 1; i++) for (const [a, b, ry] of [[0, 6.05, 0], [0, -6.05, 0], [6.05, 0, 1], [-6.05, 0, 1]]) mesh(new THREE.BoxGeometry(ry ? 0.4 : 1.2, 50, ry ? 1.2 : 0.4), R(0x8f7f5f), a + (ry ? 0 : i * 3.6), 27, b + (ry ? i * 3.6 : 0), g);
    mesh(new THREE.BoxGeometry(13.6, 16, 13.6), stone, 0, 63, 0, g);
    for (const [a, b, ry] of [[0, 6.85, 0], [0, -6.85, Math.PI], [6.85, 0, Math.PI / 2], [-6.85, 0, -Math.PI / 2]]) {
      const f = new THREE.Group(); f.position.set(a, 63, b); f.rotation.y = ry; g.add(f);
      mesh(new THREE.BoxGeometry(9, 9, 0.3), gold, 0, 0, 0, f);
      mesh(new THREE.CircleGeometry(3.5, 40), R(0xf3eedd, 0.6), 0, 0, 0.2, f);
      const h1 = mesh(new THREE.BoxGeometry(0.35, 2.2, 0.1), R(0x111111), 0, 0, 0.3, f); h1.geometry.translate(0, 1, 0); h1.rotation.z = -0.9;
      const h2 = mesh(new THREE.BoxGeometry(0.25, 3, 0.1), R(0x111111), 0, 0, 0.32, f); h2.geometry.translate(0, 1.4, 0); h2.rotation.z = 0.3;
    }
    mesh(new THREE.BoxGeometry(11, 9, 11), stone, 0, 75.5, 0, g);
    for (const [a, b, ry] of [[0, 5.55, 0], [0, -5.55, 0], [5.55, 0, 1], [-5.55, 0, 1]]) for (let i = -1; i <= 1; i++) mesh(new THREE.BoxGeometry(ry ? 0.3 : 2, 6, ry ? 2 : 0.3), R(0x22282a), a + (ry ? 0 : i * 3.2), 75.5, b + (ry ? i * 3.2 : 0), g);
    const sp = mesh(new THREE.ConeGeometry(7.9, 15, 4), dark, 0, 87.5, 0, g); sp.rotation.y = Math.PI / 4;
    mesh(new THREE.ConeGeometry(0.6, 4, 8), gold, 0, 97, 0, g);
    for (const [a, b] of [[6, 6], [-6, 6], [6, -6], [-6, -6]]) { const p = mesh(new THREE.ConeGeometry(0.9, 6, 4), dark, a, 74, b, g); p.rotation.y = Math.PI / 4; }
    solid(x, z, 6.9, 6.9);
  }
  if (k === "ja") {
    const [x, z] = lm[0], g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.PI / 4; G.add(g);
    const OR = 0xe5501f, WH = 0xf0eeea;
    const secs = [[0, 60, 46, 26, OR], [60, 120, 26, 16, WH], [120, 145, 16, 13, OR], [160, 210, 11, 6, WH], [210, 245, 6, 4, OR]];
    secs.forEach(([y0, y1, rb, rt, c]) => {
      const h = y1 - y0, seg = Math.max(2, Math.round(h / 8));
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 4, seg, true), new THREE.MeshBasicMaterial({ color: c, wireframe: true, fog: true }));
      wire.position.y = y0 + h / 2; g.add(wire);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; beam(new THREE.Vector3(Math.cos(a) * rb, y0, Math.sin(a) * rb), new THREE.Vector3(Math.cos(a) * rt, y1, Math.sin(a) * rt), Math.max(1, rb / 9), c, g, R(c, 0.6)); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rt, 0.6, 4, 4), R(c, 0.6)); ring.rotation.x = Math.PI / 2; ring.rotation.z = Math.PI / 4; ring.position.y = y1; g.add(ring);
    });
    mesh(new THREE.BoxGeometry(19, 15, 19), R(WH, 0.5, 0.1, { map: facade("tokyo") }), 0, 152.5, 0, g).rotation.y = Math.PI / 4;
    mesh(new THREE.BoxGeometry(7, 7, 7), R(OR, 0.5), 0, 248.5, 0, g).rotation.y = Math.PI / 4;
    for (let i = 0; i < 8; i++) mesh(new THREE.CylinderGeometry(1.4 - i * 0.14, 1.5 - i * 0.14, 10.5, 8), R(i % 2 ? WH : OR, 0.6), 0, 257 + i * 10.5, 0, g);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; round(x + Math.cos(a) * 44, z + Math.sin(a) * 44, 4); }
  }
  if (k === "zh") {
    const [x, z] = lm[0], g = new THREE.Group(); g.position.set(x, 0, z); G.add(g);
    const red = R(0xa8322a, 0.9), yel = R(0xd9a12c, 0.55, 0.1), marble = R(0xe9e4d8, 0.8);
    mesh(new THREE.BoxGeometry(66, 13, 37), red, 0, 6.5, 0, g);
    mesh(new THREE.BoxGeometry(68, 1.2, 39), marble, 0, 0.6, 0, g);
    [-24, -12, 0, 12, 24].forEach((ax, i) => mesh(new THREE.BoxGeometry(i === 2 ? 6 : 4.5, i === 2 ? 9 : 7.5, 0.6), R(0x2a1712), ax, (i === 2 ? 9 : 7.5) / 2, 18.6, g));
    mesh(new THREE.BoxGeometry(64, 1.2, 35), marble, 0, 13.6, 0, g);
    mesh(new THREE.BoxGeometry(56, 8, 22), red, 0, 18.2, 0, g);
    for (let i = -9; i <= 9; i++) mesh(new THREE.CylinderGeometry(0.55, 0.55, 8, 10), R(0x8e241d), i * 3.1, 18.2, 12.2, g);
    mesh(new THREE.BoxGeometry(60, 1.4, 26), R(0x2f6b6a, 0.7), 0, 22.6, 0, g);
    hip(66, 32, 3.2, 0, 0, 23.3, 0, g, yel); hip(54, 20, 7.5, 0, 0, 26.2, 0, g, yel);
    mesh(new THREE.BoxGeometry(40, 1, 1), yel, 0, 33.8, 0, g);
    [-20, -10, 10, 20].forEach((ax) => { mesh(new THREE.SphereGeometry(1.3, 14, 10), R(0xd8241c, 0.6), ax, 21, 15.2, g); });
    mesh(new THREE.BoxGeometry(6, 8, 0.4), R(0x2c2a28), 0, 9.5, 18.75, g);
    solid(x, z, 34, 19.5);
  }
  if (k === "fr") {
    const [x, z] = lm[0], g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.PI / 4; G.add(g);
    const BR = 0x6b5843, br = R(BR, 0.75, 0.2), wireM = new THREE.MeshBasicMaterial({ color: 0x4a3c2e, wireframe: true });
    const frust = (rb, rt, y0, y1, px, pz, seg) => { // tiang segi empat berlubang (rangka)
      const h = y1 - y0, geo = new THREE.CylinderGeometry(rt, rb, h, 4, seg, true);
      const m = new THREE.Mesh(geo, wireM); m.position.set(px, y0 + h / 2, pz); m.rotation.y = Math.PI / 4; g.add(m);
    };
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const a = new THREE.Vector3(sx * 50, 0, sz * 50), b = new THREE.Vector3(sx * 26, 57, sz * 26), c2 = new THREE.Vector3(sx * 13, 115, sz * 13);
      for (const [dx, dz] of [[6, 6], [-6, 6], [6, -6], [-6, -6]]) beam(a.clone().add(new THREE.Vector3(dx, 0, dz)), b.clone().add(new THREE.Vector3(dx * 0.5, 0, dz * 0.5)), 1.6, BR, g, br);
      for (const [dx, dz] of [[3, 3], [-3, 3], [3, -3], [-3, -3]]) beam(b.clone().add(new THREE.Vector3(dx, 0, dz)), c2.clone().add(new THREE.Vector3(dx * 0.5, 0, dz * 0.5)), 1.1, BR, g, br);
      for (let t = 0.12; t < 1; t += 0.14) { const p = a.clone().lerp(b, t), wd = 12 - t * 6; mesh(new THREE.BoxGeometry(wd, 0.5, wd), br, p.x, p.y, p.z, g, false); }
      round(x + Math.cos(Math.atan2(sz, sx) - Math.PI / 4) * 70.7, z - Math.sin(Math.atan2(sz, sx) - Math.PI / 4) * 70.7, 10);
    }
    for (let i = 0; i < 4; i++) { const arch = new THREE.Mesh(new THREE.TorusGeometry(37, 1.3, 6, 28, Math.PI), br); arch.rotation.y = i * Math.PI / 2; arch.position.set(Math.sin(i * Math.PI / 2) * 46, 0, Math.cos(i * Math.PI / 2) * 46); arch.castShadow = true; g.add(arch); }
    mesh(new THREE.BoxGeometry(72, 6, 72), br, 0, 57, 0, g); mesh(new THREE.BoxGeometry(42, 4.5, 42), br, 0, 115, 0, g);
    frust(16, 2.6, 117, 276, 0, 0, 22);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) beam(new THREE.Vector3(sx * 11, 117, sz * 11), new THREE.Vector3(sx * 1.6, 276, sz * 1.6), 1.0, BR, g, br);
    mesh(new THREE.BoxGeometry(9, 8, 9), br, 0, 278, 0, g); mesh(new THREE.CylinderGeometry(0.5, 1.2, 48, 8), br, 0, 306, 0, g);
  }
  if (k === "ar") {
    const lim = R(0xcaa46a, 1, 0, { map: (() => { const t = stoneTex(64, "#fff", "rgba(60,40,10,.35)"); t.repeat.set(10, 30); return t; })() });
    [[115, 139], [107, 136], [52, 65]].forEach(([half, h], i) => {
      const [x, z] = lm[i]; if (x === undefined) return;
      const p = mesh(new THREE.ConeGeometry(half * Math.SQRT2, h, 4, 1), lim, x, h / 2, z, G); p.rotation.y = Math.PI / 4;
      if (i === 1) { const cap = mesh(new THREE.ConeGeometry(half * Math.SQRT2 * 0.18, h * 0.18, 4), R(0xe3cfa5, 0.9), x, h - h * 0.09, z, G); cap.rotation.y = Math.PI / 4; }
      solid(x, z, half * 0.92, half * 0.92);
    });
    if (lm[3]) { // Sphinx sederhana, menghadap timur
      const [x, z] = lm[3], g = new THREE.Group(); g.position.set(x, 0, z); G.add(g); const s = R(0xc79e62, 1);
      mesh(new THREE.BoxGeometry(50, 10, 12), s, -4, 5, 0, g); mesh(new THREE.BoxGeometry(20, 3, 4), s, 26, 1.5, -3.5, g); mesh(new THREE.BoxGeometry(20, 3, 4), s, 26, 1.5, 3.5, g);
      mesh(new THREE.BoxGeometry(10, 9, 10), s, 18, 14, 0, g); mesh(new THREE.BoxGeometry(6, 8, 7), R(0xb88f58, 1), 22, 15, 0, g);
      solid(x, z, 30, 7);
    }
  }
}

function hip(w, d, h, c, x, y, z, p, mat) {
  const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT2, 1, 4), mat || M(c)); m.rotation.y = Math.PI / 4; m.position.y = 0.5; m.castShadow = true; g.add(m);
  g.scale.set(w / 2, h, d / 2); g.position.set(x, y, z); (p || city).add(g); return g;
}

// ---------- langit asli ----------
const sky = new Sky(); sky.scale.setScalar(10000); scene.add(sky);
const envScene = new THREE.Scene(), envSky = new Sky(); envSky.material = sky.material; envSky.scale.setScalar(10000); envScene.add(envSky);
const pmrem = new THREE.PMREMGenerator(renderer); let envRT = null;
const SUNDIR = new THREE.Vector3(0.5, 0.6, 0.3).normalize();
function setSky(S) {
  const u = sky.material.uniforms;
  u.turbidity.value = S.turb; u.rayleigh.value = S.ray; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8;
  SUNDIR.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - S.sun[0]), THREE.MathUtils.degToRad(S.sun[1]));
  u.sunPosition.value.copy(SUNDIR);
  renderer.toneMappingExposure = S.exp;
  if (envRT) envRT.dispose(); envRT = pmrem.fromScene(envScene); scene.environment = envRT.texture;
  scene.fog = new THREE.Fog(S.fog, 260, 1500);
}

async function buildCity(k) {
  const data = await fetch(`dunia/${k}.json?v=2`).then((r) => { if (!r.ok) throw new Error("data peta tidak ditemukan"); return r.json(); });
  scene.remove(city); city.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  city = new THREE.Group(); scene.add(city);
  GRID = new Map(); BRIDGES = []; NPCS = []; CLOUDS = []; ROOFBOX = []; BOUND = data.H - 4; clearWay(); parked = null;
  const S = STY[k], rnd = rng(k.charCodeAt(0) * 97 + k.charCodeAt(1)), H = data.H;
  setSky(S); sun.intensity = 3.2; hemi.intensity = 0.5; hemi.color.setHex(0xdfe8f0); hemi.groundColor.setHex(S.ground);

  const ground = mesh(new THREE.PlaneGeometry(H * 2 + 3000, H * 2 + 3000), R(S.ground, 1), 0, 0, 0, city); ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
  const flat = (list, y, mat) => { const g = flatGeo(list, y); if (g) { const m = new THREE.Mesh(g, mat); m.receiveShadow = true; city.add(m); } };
  flat(data.s, 0.02, R(S.sand, 1));
  flat(data.g, 0.03, R(S.grass, 1));
  flat(data.w, 0.06, R(S.water, 0.08, 0.2, { envMapIntensity: 1.2 }));
  data.w.forEach(([ring]) => polySolid(ring, true));
  const car = data.r.filter((r) => !r[1]), walk = data.r.filter((r) => r[1]);
  BRIDGES = car.filter((r) => r[2]).map((r) => [r[0], r[3]]).concat(walk.filter((r) => r[2]).map((r) => [r[0] + 1, r[3]]));
  const rib = (list, y, mat, wOf) => { const m = new THREE.Mesh(ribbonGeo(list, y, wOf), mat); m.receiveShadow = true; city.add(m); };
  rib(walk, 0.07, R(S.walk, 0.95));
  rib(car, 0.09, R(S.road, 0.9));
  rib(car.filter((r) => r[2]), 0.11, R(0x8a8478, 0.9), (r) => r[0] + 3); // tepi jembatan
  rib(car.filter((r) => r[2]), 0.12, R(S.road, 0.9));
  const dm = new THREE.Mesh(dashGeo(car, 0.14), R(0xf2f2ee, 0.7)); city.add(dm);
  indexRoads(car); city.add(new THREE.Mesh(zebraGeo(car), R(0xf4f4f0, 0.7)));
  if (data.rail.length) rib(data.rail.map((p) => [3.2, 0, 0, p]), 0.08, R(0x6d6457, 1));

  // gedung: ekstrusi tapak asli, tinggi dari OSM (atau perkiraan per kota)
  const walls = [], roofs = [], shops = [], tops = [], col = new THREE.Color();
  const split = (geo, y0, wallsTo, roofsTo, uvWall) => { // pecah grup ekstrusi jadi dinding & atap
    geo.rotateX(-Math.PI / 2); if (y0) geo.translate(0, y0, 0);
    const pa = geo.attributes.position.array, na = geo.attributes.normal.array, ua = geo.attributes.uv.array;
    for (const gr of geo.groups) {
      const to = gr.materialIndex === 1 ? wallsTo : roofsTo; if (!to) continue;
      const s = gr.start, n = gr.count, U = ua.slice(s * 2, (s + n) * 2), C = new Float32Array(n * 3);
      if (gr.materialIndex === 1 && uvWall) for (let j = 0; j < U.length; j += 2) { U[j] /= uvWall[0]; U[j + 1] = (1 - U[j + 1]) / uvWall[1]; }
      for (let j = 0; j < n; j++) { C[j * 3] = col.r; C[j * 3 + 1] = col.g; C[j * 3 + 2] = col.b; }
      const ng = new THREE.BufferGeometry();
      ng.setAttribute("position", new THREE.BufferAttribute(pa.slice(s * 3, (s + n) * 3), 3));
      ng.setAttribute("normal", new THREE.BufferAttribute(na.slice(s * 3, (s + n) * 3), 3));
      ng.setAttribute("uv", new THREE.BufferAttribute(U, 2)); ng.setAttribute("color", new THREE.BufferAttribute(C, 3));
      to.push(ng);
    }
    geo.dispose();
  };
  const ROOFH = { fr: 3.4, en: 2.6, zh: 2.4 }[k];
  for (const b of data.b) {
    const [h0, mh, typ, ring, holes] = b;
    const h = h0 || (k === "ja" ? data.dh * (0.45 + rnd() * 1.4) : data.dh * (0.75 + rnd() * 0.5));
    const sh = shapeOf(ring, holes);
    col.setHex(typ ? S.hist : S.walls[Math.floor(rnd() * S.walls.length)]).multiplyScalar(0.9 + rnd() * 0.15);
    let A = 0, Pm = 0; for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) { A += ring[j] * ring[i + 1] - ring[i] * ring[j + 1]; Pm += Math.hypot(ring[i] - ring[j], ring[i + 1] - ring[j + 1]); }
    A = Math.abs(A) / 2; const wid = 2 * A / (Pm || 1);
    const shop = !typ && !mh && h > 8 && wid > 4 && k !== "ar" ? 4.4 : 0;
    try {
      if (shop) split(new THREE.ExtrudeGeometry(sh, { depth: shop, bevelEnabled: false, curveSegments: 1 }), 0, shops, null, [S.bay, shop]);
      split(new THREE.ExtrudeGeometry(sh, { depth: Math.max(3, h - mh - shop), bevelEnabled: false, curveSegments: 1 }), mh + shop, walls, roofs, [S.bay, S.lv]);
      const rh = ROOFH && !typ && h > 9 && wid > 6 && (k !== "en" || rnd() < 0.5) && (k !== "zh" || h < 14) ? ROOFH : 0;
      if (rh) { const off = Math.min(2.6, wid * 0.32); col.setHex(S.roof).multiplyScalar(0.9 + rnd() * 0.15); split(new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: rh, bevelSize: off, bevelOffset: -off, bevelSegments: 1, curveSegments: 1 }), h, tops, tops); }
      else if ((k === "ja" || k === "ar" || k === "zh") && A > 120 && !typ) { // peralatan di atap
        let cx = 0, cz = 0; for (let i = 0; i < ring.length; i += 2) { cx += ring[i]; cz += ring[i + 1]; } cx /= ring.length / 2; cz /= ring.length / 2;
        if (inRing(ring, cx, cz)) ROOFBOX.push([cx + (rnd() - 0.5) * 3, cz + (rnd() - 0.5) * 3, h, k === "ar" ? 1 : 0]);
      }
    } catch { continue; }
    polySolid(ring, false, Math.max(3, h));
  }
  const chunk = (arr, mat) => { for (let i = 0; i < arr.length; i += 1500) { const m = new THREE.Mesh(mergeGeometries(arr.slice(i, i + 1500)), mat); m.castShadow = m.receiveShadow = true; city.add(m); } };
  if (walls.length) chunk(walls, R(0xffffff, 0.88, 0, { map: facade(S.fac), vertexColors: true }));
  if (roofs.length) chunk(roofs, R(S.roof, 0.9));
  if (shops.length) chunk(shops, R(0xffffff, 0.6, 0.05, { map: shopTex(S.fac) }));
  if (tops.length) chunk(tops, R(0xffffff, 0.7, 0.15, { vertexColors: true }));
  if (ROOFBOX.length) { const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
    const bx = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 1.6, 2).translate(0, 0.8, 0), R(0xb9bcbf, 0.6, 0.3), ROOFBOX.length);
    ROOFBOX.forEach(([x, z, h, tank], i) => { sc.set(tank ? 0.7 : 1, tank ? 1.3 : 1, tank ? 0.7 : 1); bx.setMatrixAt(i, m4.compose(v.set(x, h, z), q, sc)); }); bx.castShadow = true; city.add(bx); }

  landmarks(k, data.lm);

  // pohon: titik pohon asli + isi taman
  const trees = data.t.slice();
  if (data.t.length < 300) for (const [ring] of data.g) {
    const [x0, z0, x1, z1] = ringBox(ring), A = (x1 - x0) * (z1 - z0); if (A < 1200) continue;
    let n = Math.min(160, A / 420);
    for (let tries = 0; n > 0 && tries < n * 6; tries++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (inRing(ring, x, z) && !hits(x, z, 2)) { trees.push([x, z]); n--; } }
    if (trees.length > 3500) break;
  }
  const tg = trees.filter(([x, z]) => Math.abs(x) < H && Math.abs(z) < H && !hits(x, z, 0.5)).slice(0, 3500);
  if (tg.length) {
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.32, 4, 6).translate(0, 2, 0), R(0x5b4632, 1), tg.length);
    const palmLeaves = () => mergeGeometries([...Array(8)].map((_, i) => new THREE.BoxGeometry(0.5, 0.08, 3.4).translate(0, 0, 1.7).rotateX(0.45).rotateY(i * 0.785).translate(0, 8.2, 0)));
    const crown = new THREE.InstancedMesh(k === "ar" ? palmLeaves() : new THREE.IcosahedronGeometry(2.8, 1).translate(0, 6.2, 0), R(0xffffff, 0.95, 0, { flatShading: true }), tg.length);
    if (k === "ar") trunk.geometry = new THREE.CylinderGeometry(0.22, 0.32, 8.2, 7).translate(0, 4.1, 0);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
    tg.forEach(([x, z], i) => {
      const s = 0.8 + rnd() * 0.6; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28); sc.set(s, s * (0.9 + rnd() * 0.3), s);
      m4.compose(v.set(x, 0, z), q, sc); trunk.setMatrixAt(i, m4); crown.setMatrixAt(i, m4);
      crown.setColorAt(i, c.setHex(S.tree).offsetHSL((rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.12)); round(x, z, 0.45);
    });
    trunk.castShadow = crown.castShadow = true; crown.receiveShadow = true; city.add(trunk, crown);
  }
  // lampu jalan
  const lamps = [];
  for (const [w, , br, p] of car) { if (w < 7) continue; let acc = 14;
    for (let i = 2; i < p.length; i += 2) { const ax = p[i - 2], az = p[i - 1], dx = p[i] - ax, dz = p[i + 1] - az, L = Math.hypot(dx, dz); if (!L) continue;
      for (; acc < L; acc += 32) { const t = acc / L, nx = -dz / L, nz = dx / L, side = (lamps.length % 2 ? 1 : -1) * (w / 2 + 0.9); lamps.push([ax + dx * t + nx * side, az + dz * t + nz * side, Math.atan2(nx * -side, nz * -side)]); }
      acc -= L; }
    if (lamps.length > 1400) break; }
  const okL = lamps.filter(([x, z]) => Math.abs(x) < H && Math.abs(z) < H && !hits(x, z, 0.3) && !onRoad(x, z, 0.4));
  if (okL.length) {
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.13, 6.5, 6).translate(0, 3.25, 0), R(k === "en" || k === "fr" ? 0x1f2a24 : 0x6f7479, 0.5, 0.6), okL.length);
    const head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.25, 1.4).translate(0, 6.5, 0.6), R(0x2a2f33, 0.5, 0.5), okL.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    okL.forEach(([x, z, a], i) => { m4.compose(v.set(x, 0, z), q.setFromAxisAngle(up, a), one); pole.setMatrixAt(i, m4); head.setMatrixAt(i, m4); });
    pole.castShadow = true; city.add(pole, head);
  }

  // titik mulai: jalan raya ±250 m dari landmark utama, menghadap landmark
  const [lx, lz] = data.lm[0];
  let spawn = null, sd = 1e9;
  for (const r of car) { if (r[0] < 7 || r[2]) continue; const p = r[3];
    for (let i = 0; i < p.length; i += 2) { const x = p[i], z = p[i + 1], d = Math.abs(Math.hypot(x - lx, z - lz) - 240); if (Math.abs(x) < H - 60 && Math.abs(z) < H - 60 && d < sd && !hits(x, z, 1.5)) { sd = d; spawn = [x, z]; } } }
  spawn ??= [0, H * 0.5];
  // kendaraan parkir/berhenti di jalan
  const vs = VEH[k], segs = car.filter((r) => r[0] >= 11 && !r[2]);
  for (let n = 0, tries = 0; n < 24 && tries < 400 && segs.length; tries++) {
    const r = segs[Math.floor(rnd() * segs.length)], p = r[3], i = 2 + 2 * Math.floor(rnd() * (p.length / 2 - 1));
    const ax = p[i - 2], az = p[i - 1], dx = p[i] - ax, dz = p[i + 1] - az, L = Math.hypot(dx, dz); if (L < 14) continue;
    const t = 0.2 + rnd() * 0.6, nx = -dz / L, nz = dx / L, side = (k === "en" || k === "ja" ? 1 : -1) * (r[0] / 2 - 1.2);
    const x = ax + dx * t + nx * side, z = az + dz * t + nz * side;
    if (Math.abs(x) > H - 8 || Math.abs(z) > H - 8 || Math.hypot(x - spawn[0], z - spawn[1]) < 25 || hits(x, z, 2.5)) continue;
    const [c, w, h, l, bus] = vs[Math.floor(rnd() * vs.length)], yaw = Math.atan2(dx, dz) + (k === "en" || k === "ja" ? Math.PI : 0);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; city.add(g);
    const paint = R(c, 0.35, 0.3), glass = R(0x1c252c, 0.15, 0.4);
    if (bus) { mesh(new THREE.BoxGeometry(w, h - 0.5, l), paint, 0, h / 2 + 0.25, 0, g); [0.32, 0.72].forEach((f) => { if (h > 3.6 || f < 0.5) mesh(new THREE.BoxGeometry(w + 0.04, 0.9, l * 0.86), glass, 0, h * f + 0.3, 0.2, g, false); }); }
    else { mesh(new THREE.BoxGeometry(w, h * 0.5, l), paint, 0, h * 0.25 + 0.3, 0, g); mesh(new THREE.BoxGeometry(w * 0.86, h * 0.42, l * 0.5), glass, 0, h * 0.7 + 0.3, -l * 0.05, g); }
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const wh = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12), R(0x151515, 0.8), a * w / 2, 0.36, b * l * 0.33, g, false); wh.rotation.z = Math.PI / 2; });
    solid(x, z, w / 2, l / 2, yaw); n++;
  }

  // NPC di tempat asli (kafe, hotel, pasar, kantor dari OSM), berdiri di tepi jalan
  const S2 = SIGN[k], used = [], pick = (lists, near) => {
    for (const L of lists) { const c = (data.poi[L] || []).filter(([x, z]) => Math.abs(x) < H - 20 && Math.abs(z) < H - 20 && used.every(([a, b]) => Math.hypot(a - x, b - z) > 35) && Math.hypot(x - spawn[0], z - spawn[1]) < 380 && Math.hypot(x - spawn[0], z - spawn[1]) > 30);
      if (c.length) return c.sort((a, b) => Math.hypot(a[0] - near[0], a[1] - near[1]) - Math.hypot(b[0] - near[0], b[1] - near[1]))[0]; }
    for (let t = 0; t < 200; t++) { const a = rnd() * 6.28, d = 60 + rnd() * 200, x = spawn[0] + Math.cos(a) * d, z = spawn[1] + Math.sin(a) * d; if (Math.abs(x) < H - 20 && Math.abs(z) < H - 20 && used.every(([p, q]) => Math.hypot(p - x, q - z) > 35)) return [x, z]; }
    return [spawn[0] + 30, spawn[1]];
  };
  const mid = [(spawn[0] + lx) / 2, (spawn[1] + lz) / 2], allRoads = car.concat(walk);
  const target = {
    imigrasi: [spawn[0] + Math.sin(Math.atan2(lx - spawn[0], lz - spawn[1])) * 16, spawn[1] + Math.cos(Math.atan2(lx - spawn[0], lz - spawn[1])) * 16],
    warga: [spawn[0] + (lx - spawn[0]) * 0.6, spawn[1] + (lz - spawn[1]) * 0.6],
  };
  const poiFor = { kafe: ["cafe", "shop"], hotel: ["hotel", "office"], pasar: ["market", "shop", "cafe"], kantor: ["office", "hotel"] };
  const order = ["imigrasi", "warga", "kafe", "pasar", "hotel", "kantor"];
  const place = {};
  for (const id of order) {
    const want = target[id] || pick(poiFor[id], mid); used.push(want);
    const q = nearestRoad(want[0], want[1], allRoads) || { x: want[0], z: want[1], w: 6, yaw: 0, d: 0 };
    let nx = want[0] - q.x, nz = want[1] - q.z; const m = Math.hypot(nx, nz); if (m > 0.1) { nx /= m; nz /= m; } else { nx = Math.cos(q.yaw); nz = -Math.sin(q.yaw); }
    let px = q.x + nx * (q.w / 2 + 1.4), pz = q.z + nz * (q.w / 2 + 1.4);
    if (hits(px, pz, 0.6)) { px = q.x + nx * (q.w / 2 - 0.8); pz = q.z + nz * (q.w / 2 - 0.8); }
    place[id] = [px, pz, q];
  }
  D.NPCS.forEach((n) => {
    const [px, pz, q] = place[n.id];
    const g = person(n.shirt, n.hat, [0xf1c27d, 0xd9a066, 0x8d5524, 0xffdbac][Math.floor(rnd() * 4)]); g.scale.setScalar(0.72);
    g.position.set(px, 0, pz); city.add(g);
    const tag = label(n.role, 0.9, { bg: "#ffffff", fg: "#274045", font: 58 }); tag.position.y = 3.7; g.add(tag);
    const mark = label("!", 0.75, { w: 128, h: 128, bg: "#FFD315", fg: "#274045", font: 96, round: 64 }, true); mark.scale.set(1.1, 1.1, 1); mark.position.y = 5; g.add(mark);
    if (S2[n.id]) { // papan berdiri bertuliskan bahasa lokal
      const b = new THREE.Group(); b.position.set(px + Math.cos(q.yaw) * 1.6, 0, pz - Math.sin(q.yaw) * 1.6); b.rotation.y = q.yaw + Math.PI / 2; city.add(b);
      mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), R(0x333333), 0, 0.6, 0, b);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: textCanvas(S2[n.id]), side: THREE.DoubleSide })); pl.position.y = 1.5; b.add(pl);
    }
    round(px, pz, 0.45);
    const bub = bubbleSprite(); bub.position.y = 6.3; g.add(bub);
    NPCS.push({ ...n, g, mark, bub, phase: rnd() * 6, greeted: false });
  });
  refreshMarks();
  LMS = data.lm;
  MINI = miniMap(data, S);

  streetProps(k, H, rnd);
  spawnTraffic(k, rnd);
  PEDS = spawnPeds(k, walk, rnd, H, [(spawn[0] + lx) / 2, (spawn[1] + lz) / 2]);
  if (PEDS) { PEDS.bubble = bubbleSprite(); city.add(PEDS.bubble); }
  rider = elcyScooter(true); rider.scale.setScalar(0.72); city.add(rider);
  walker = elcyWalker(); walker.scale.setScalar(0.72); walker.visible = false; city.add(walker);
  player = rider; P.foot = false; $("#bRide").textContent = "🚶 Turun (F)";
  P.x = spawn[0]; P.z = spawn[1]; P.yaw = Math.atan2(lx - spawn[0], lz - spawn[1]); P.v = 0; CAM.yaw = 0; CAM.pitch = 0.42; CAM.snap = true;
}
function refreshMarks() {
  NPCS.forEach((n) => {
    const done = isDone(LANG, n);
    n.mark.material.map.dispose();
    n.mark.material.map = textCanvas(done ? "✓" : "!", { w: 128, h: 128, bg: done ? "#28E143" : "#FFD315", fg: "#274045", font: 90, round: 64 });
    n.mark.material.needsUpdate = true;
  });
  $("#hProg").textContent = `${doneCount(LANG)}/${D.NPCS.length} warga diajak ngobrol`;
}
function miniMap(data, S) {
  const W = 700, H = data.H, s = W / (H * 2), c = document.createElement("canvas"); c.width = c.height = W; const g = c.getContext("2d");
  const hex = (n) => "#" + n.toString(16).padStart(6, "0"), X = (x) => (x + H) * s, Z = (z) => (z + H) * s;
  g.fillStyle = hex(S.ground); g.fillRect(0, 0, W, W);
  const fillPolys = (list, color) => { g.fillStyle = color; for (const [ring, holes] of list) { g.beginPath(); [ring, ...(holes || [])].forEach((r) => { for (let i = 0; i < r.length; i += 2) i ? g.lineTo(X(r[i]), Z(r[i + 1])) : g.moveTo(X(r[i]), Z(r[i + 1])); g.closePath(); }); g.fill("evenodd"); } };
  fillPolys(data.s, hex(S.sand)); fillPolys(data.g, "#7fae63"); fillPolys(data.w, "#5b8fb0");
  g.lineCap = g.lineJoin = "round";
  for (const [w, wk, , p] of data.r.slice().sort((a, b) => b[1] - a[1])) { g.strokeStyle = wk ? "#e8e2d4" : "#ffffff"; g.lineWidth = Math.max(1.2, w * s); g.beginPath(); for (let i = 0; i < p.length; i += 2) i ? g.lineTo(X(p[i]), Z(p[i + 1])) : g.moveTo(X(p[i]), Z(p[i + 1])); g.stroke(); }
  g.fillStyle = "#b9b2a6"; g.strokeStyle = "#8f887c"; g.lineWidth = 0.6;
  for (const b of data.b) { const r = b[3]; g.beginPath(); for (let i = 0; i < r.length; i += 2) i ? g.lineTo(X(r[i]), Z(r[i + 1])) : g.moveTo(X(r[i]), Z(r[i + 1])); g.closePath(); g.fill(); g.stroke(); }
  c.H = H; return c;
}

// ---------- ELCY jalan kaki & skuter parkir ----------
function elcyWalker() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const BLUE = 0x2d6fd6;
  const limb = (w, h, d, c, x, y, z, parent) => { const pv = new THREE.Group(); pv.position.set(x, y, z); parent.add(pv); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(0, -h / 2, 0), M(c)); m.castShadow = true; outline(m, 1.08); pv.add(m); return pv; };
  const legs = [-0.2, 0.2].map((x) => { const l = limb(0.24, 0.8, 0.26, BLUE, x, 0.95, 0, body); const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.42), M(0xe2382f)); shoe.position.set(0, -0.82, 0.08); outline(shoe, 1.1); l.add(shoe); return l; });
  outline(box(0.64, 0.82, 0.46, BLUE, 0, 1.36, 0, body), 1.07);
  const arms = [-1, 1].map((s) => limb(0.17, 0.72, 0.2, BLUE, s * 0.42, 1.7, 0, body));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 20), new THREE.MeshToonMaterial({ map: globeTexture(), gradientMap: grad }));
  head.position.set(0, 2.42, 0); head.castShadow = true; outline(head, 1.06); body.add(head);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.8, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), M(0x4fb87a));
  helm.position.copy(head.position); helm.rotation.x = -0.55; helm.castShadow = true; outline(helm, 1.05); body.add(helm);
  root.userData = { body, legs, arms }; return root;
}
let rider = null, walker = null, parked = null;
function setRide(on) { // naik / turun skuter
  if (on) {
    if (!parked || Math.hypot(P.x - parked.position.x, P.z - parked.position.z) > 3.2) return toast("Dekati skutermu dulu untuk naik.");
    P.x = parked.position.x; P.z = parked.position.z; P.yaw = parked.rotation.y; city.remove(parked); parked = null;
    walker.visible = false; rider.visible = true; player = rider; P.foot = false;
  } else {
    if (Math.abs(P.v) > 3) return toast("Pelankan dulu sebelum turun.");
    parked = elcyScooter(false); parked.scale.setScalar(0.72); parked.position.set(P.x, 0, P.z); parked.rotation.y = P.yaw; city.add(parked);
    const sx = P.x + Math.cos(P.yaw) * 1.3, sz = P.z - Math.sin(P.yaw) * 1.3;
    P.x = hits(sx, sz, 0.4) ? P.x - Math.cos(P.yaw) * 1.3 : sx; P.z = hits(sx, sz, 0.4) ? P.z + Math.sin(P.yaw) * 1.3 : sz;
    rider.visible = false; walker.visible = true; player = walker; P.foot = true; P.v = 0;
  }
  $("#bRide").textContent = P.foot ? "🛵 Naik (F)" : "🚶 Turun (F)";
  near = null;
}
let toastT = 0;
function toast(t) { const e = $("#toast"); e.textContent = t; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => e.hidden = true, 2200); }

// ---------- indeks jalan (untuk lampu, trotoar, lalu lintas) ----------
let RGRID = new Map(), NODES = new Map(), ROADS_CAR = [], TRAFFIC = [], PEDS = null, ZEBRA = [];
function indexRoads(car) {
  RGRID = new Map(); NODES = new Map(); ROADS_CAR = car;
  car.forEach((r, ri) => {
    const p = r[3], w = r[0];
    for (let i = 2; i < p.length; i += 2) {
      const s = [p[i - 2], p[i - 1], p[i], p[i + 1], w];
      for (let a = Math.floor((Math.min(s[0], s[2]) - w) / CELL); a <= Math.floor((Math.max(s[0], s[2]) + w) / CELL); a++)
        for (let b = Math.floor((Math.min(s[1], s[3]) - w) / CELL); b <= Math.floor((Math.max(s[1], s[3]) + w) / CELL); b++) { const k = gkey(a, b); if (!RGRID.has(k)) RGRID.set(k, []); RGRID.get(k).push(s); }
    }
    for (let i = 0; i < p.length; i += 2) { const k = p[i] + "," + p[i + 1]; if (!NODES.has(k)) NODES.set(k, []); NODES.get(k).push([ri, i / 2]); }
  });
}
function onRoad(x, z, m = 0) { const c = RGRID.get(gkey(Math.floor(x / CELL), Math.floor(z / CELL))); if (c) for (const s of c) if (segDist(x, z, s[0], s[1], s[2], s[3]) < s[4] / 2 + m) return true; return false; }
function zebraGeo(car) { // zebra cross di persimpangan jalan raya
  const pos = [], y = 0.13;
  for (const [key, list] of NODES) {
    if (list.length < 2) continue;
    const [nx, nz] = key.split(",").map(Number), wMax = Math.max(...list.map(([ri]) => car[ri][0]));
    if (wMax < 7) continue;
    for (const [ri, idx] of list) {
      const r = car[ri], p = r[3], w = r[0]; if (w < 6.5) continue;
      for (const j of [idx - 1, idx + 1]) {
        if (j < 0 || j >= p.length / 2) continue;
        const dx = p[j * 2] - nx, dz = p[j * 2 + 1] - nz, L = Math.hypot(dx, dz); if (L < wMax / 2 + 6) continue;
        const ux = dx / L, uz = dz / L, px = -uz, pz = ux, c = wMax / 2 + 2.5;
        for (let s = -w / 2 + 0.4; s < w / 2 - 0.3; s += 1.1) {
          const cx = nx + ux * c + px * (s + 0.25), cz = nz + uz * c + pz * (s + 0.25), hx = ux * 1.6, hz = uz * 1.6, qx = px * 0.25, qz = pz * 0.25;
          pos.push(cx - hx + qx, y, cz - hz + qz, cx + hx + qx, y, cz + hz + qz, cx + hx - qx, y, cz + hz - qz, cx - hx + qx, y, cz - hz + qz, cx + hx - qx, y, cz + hz - qz, cx - hx - qx, y, cz - hz - qz);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}

// ---------- kendaraan ----------
function makeCar([c, w, h, l, bus]) {
  const g = new THREE.Group(), paint = R(c, 0.35, 0.3), glass = R(0x1c252c, 0.15, 0.4);
  if (bus) { mesh(new THREE.BoxGeometry(w, h - 0.5, l), paint, 0, h / 2 + 0.25, 0, g); [0.32, 0.72].forEach((f) => { if (h > 3.6 || f < 0.5) mesh(new THREE.BoxGeometry(w + 0.04, 0.9, l * 0.86), glass, 0, h * f + 0.3, 0.2, g, false); }); }
  else { mesh(new THREE.BoxGeometry(w, h * 0.5, l), paint, 0, h * 0.25 + 0.3, 0, g); mesh(new THREE.BoxGeometry(w * 0.86, h * 0.42, l * 0.5), glass, 0, h * 0.7 + 0.3, -l * 0.05, g); }
  mesh(new THREE.BoxGeometry(w * 0.8, 0.18, 0.05), R(0xfff4c8, 0.3, 0, { emissive: 0x665a30 }), 0, h * 0.3 + 0.3, l / 2 + 0.02, g, false);
  mesh(new THREE.BoxGeometry(w * 0.8, 0.16, 0.05), R(0xb3191c, 0.4, 0, { emissive: 0x400808 }), 0, h * 0.3 + 0.3, -l / 2 - 0.02, g, false);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const wh = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12), R(0x151515, 0.8), a * w / 2, 0.36, b * l * 0.33, g, false); wh.rotation.z = Math.PI / 2; });
  return g;
}
function spawnTraffic(k, rnd) {
  TRAFFIC = [];
  const cand = ROADS_CAR.map((r, i) => i).filter((i) => ROADS_CAR[i][0] >= 6 && ROADS_CAR[i][3].length >= 4);
  for (let n = 0; n < (touch ? 20 : 34) && cand.length; n++) {
    const ri = cand[Math.floor(rnd() * cand.length)], segs = ROADS_CAR[ri][3].length / 2 - 1, spec = VEH[k][Math.floor(rnd() * VEH[k].length)];
    const g = makeCar(spec); city.add(g);
    TRAFFIC.push({ g, ri, seg: Math.floor(rnd() * segs), t: rnd(), dir: rnd() < 0.5 ? 1 : -1, v: 0, vmax: spec[4] ? 7 : 8 + rnd() * 4, w: spec[1], l: spec[3], left: k === "en" || k === "ja", yaw: 0 });
  }
}
function segOf(c) {
  const p = ROADS_CAR[c.ri][3], i = c.seg * 2;
  let ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3];
  if (c.dir < 0) [ax, az, bx, bz] = [bx, bz, ax, az];
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 0.01;
  return { ax, az, bx, bz, ux: dx / L, uz: dz / L, L };
}
function advance(c) {
  const p = ROADS_CAR[c.ri][3], n = p.length / 2 - 1;
  c.t = 0; c.seg += c.dir;
  if (c.seg >= 0 && c.seg < n) return;
  const endIdx = c.dir > 0 ? n : 0, key = p[endIdx * 2] + "," + p[endIdx * 2 + 1];
  const opts = (NODES.get(key) || []).filter(([ri]) => ri !== c.ri && ROADS_CAR[ri][0] >= 4.5);
  if (!opts.length) { c.dir = -c.dir; c.seg = c.dir > 0 ? 0 : n - 1; return; }
  const [ri, idx] = opts[Math.floor(Math.random() * opts.length)], m = ROADS_CAR[ri][3].length / 2 - 1;
  c.ri = ri;
  if (idx >= m) { c.dir = -1; c.seg = m - 1; } else if (idx <= 0) { c.dir = 1; c.seg = 0; } else if (Math.random() < 0.5) { c.dir = 1; c.seg = idx; } else { c.dir = -1; c.seg = idx - 1; }
}
function updTraffic(dt) {
  for (const c of TRAFFIC) {
    let q = segOf(c);
    const side = (c.left ? -1 : 1) * Math.min(ROADS_CAR[c.ri][0] / 4, 2.4);
    const cx = q.ax + q.ux * q.L * c.t, cz = q.az + q.uz * q.L * c.t, x = cx - q.uz * side, z = cz + q.ux * side;
    let target = c.vmax;
    const ahead = (ox, oz, len, lat) => { const a = (ox - x) * q.ux + (oz - z) * q.uz, b = Math.abs(-(ox - x) * q.uz + (oz - z) * q.ux); return a > 0 && a < len && b < lat; };
    if (ahead(P.x, P.z, 9 + c.l / 2, 2.2)) target = 0; else if (ahead(P.x, P.z, 20, 2.2)) target = c.vmax * 0.3;
    for (const o of TRAFFIC) if (o !== c && ahead(o.g.position.x, o.g.position.z, 4 + (c.l + o.l) / 2, 1.6)) { target = 0; break; }
    if (PEDS) for (const pd of PEDS.list) if (pd.near && ahead(pd.x, pd.z, 7, 1.8)) { target = 0; break; }
    c.v += Math.sign(target - c.v) * Math.min(Math.abs(target - c.v), (target < c.v ? 16 : 3.5) * dt);
    c.t += c.v * dt / q.L;
    if (c.t >= 1) { advance(c); q = segOf(c); }
    c.g.position.set(x, 0, z);
    const yaw = Math.atan2(q.ux, q.uz); c.yaw += ((yaw - c.yaw + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 6); c.g.rotation.y = c.yaw;
  }
}
function carHit(x, z, r) {
  for (const c of TRAFFIC) { const dx = x - c.g.position.x, dz = z - c.g.position.z; if (dx * dx + dz * dz > 64) continue;
    const s = Math.sin(c.yaw), co = Math.cos(c.yaw), lz = dx * s + dz * co, lx = dx * co - dz * s; if (Math.abs(lx) < c.w / 2 + r && Math.abs(lz) < c.l / 2 + r) return true; }
  return false;
}

// ---------- pejalan kaki (instanced, bisa disapa) ----------
function spawnPeds(k, walk, rnd, H, focus) {
  const paths = [];
  for (const r of ROADS_CAR) {
    const p = r[3], w = r[0]; if (w < 6 || p.length < 4) continue;
    for (const s of [-1, 1]) { const q = []; for (let i = 0; i < p.length; i += 2) { const j = Math.min(i, p.length - 4), dx = p[j + 2] - p[j], dz = p[j + 3] - p[j + 1], L = Math.hypot(dx, dz) || 1; q.push(p[i] - dz / L * s * (w / 2 + 1.9), p[i + 1] + dx / L * s * (w / 2 + 1.9)); } paths.push(q); }
  }
  for (const r of walk) if (r[3].length >= 4) paths.push(r[3]);
  if (!paths.length) return null;
  const N = touch ? 45 : 90, list = [];
  const SKIN = [0xf1c27d, 0xd9a066, 0x8d5524, 0xffdbac, 0xc68642], SHIRT = [0x2f4e7a, 0xb03a2e, 0xf2f2f2, 0x3a7d44, 0x222222, 0xd9a441, 0x7d4e9c, 0x5b8fb0, 0xe07a5f], PANTS = [0x1f2a44, 0x2b2b2b, 0x5a4a3a, 0x6d7b8d, 0xc9b79c], HAIR = [0x1b1b1b, 0x3b2a20, 0x6b4a2b, 0xc9a35b, 0x8a8a8a];
  for (let tries = 0; list.length < N && tries < N * 30; tries++) {
    const path = paths[Math.floor(rnd() * paths.length)], seg = Math.floor(rnd() * (path.length / 2 - 1)), t = rnd();
    const x = path[seg * 2] + (path[seg * 2 + 2] - path[seg * 2]) * t, z = path[seg * 2 + 1] + (path[seg * 2 + 3] - path[seg * 2 + 1]) * t;
    if (Math.abs(x) > H - 10 || Math.abs(z) > H - 10 || hits(x, z, 0.4) || onRoad(x, z, 0.3)) continue;
    if (list.length < N * 0.5 && Math.hypot(x - focus[0], z - focus[1]) > 260) continue; // separuh berkumpul dekat landmark/titik mulai
    list.push({ path, seg, t, dir: rnd() < 0.5 ? 1 : -1, v: 1.1 + rnd() * 0.6, x, z, yaw: 0, ph: rnd() * 6, wait: 0, greet: Math.floor(rnd() * 10), talk: Math.floor(rnd() * 10),
      cols: [SHIRT[Math.floor(rnd() * SHIRT.length)], PANTS[Math.floor(rnd() * PANTS.length)], SKIN[Math.floor(rnd() * SKIN.length)], HAIR[Math.floor(rnd() * HAIR.length)]], h: 0.92 + rnd() * 0.16 });
  }
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const parts = {
    body: new THREE.BoxGeometry(0.46, 0.62, 0.28), head: new THREE.SphereGeometry(0.15, 12, 9), hair: new THREE.SphereGeometry(0.158, 12, 6, 0, 6.29, 0, 1.45),
    leg: new THREE.BoxGeometry(0.16, 0.82, 0.2).translate(0, -0.41, 0), arm: new THREE.BoxGeometry(0.12, 0.6, 0.14).translate(0, -0.3, 0),
  };
  const inst = { body: 0, head: 2, hair: 3, legL: 1, legR: 1, armL: 0, armR: 0 }, IM = {};
  for (const name of Object.keys(inst)) { const geo = parts[name.replace(/[LR]$/, "")]; IM[name] = new THREE.InstancedMesh(geo, mat, list.length); IM[name].castShadow = name === "body"; IM[name].frustumCulled = false; city.add(IM[name]); }
  const c = new THREE.Color();
  list.forEach((p, i) => { for (const [name, ci] of Object.entries(inst)) IM[name].setColorAt(i, c.setHex(p.cols[ci])); });
  const rig = new THREE.Object3D(), bones = {
    body: [0, 1.13, 0], head: [0, 1.62, 0], hair: [0, 1.65, -0.01], legL: [-0.11, 0.83, 0], legR: [0.11, 0.83, 0], armL: [-0.3, 1.42, 0], armR: [0.3, 1.42, 0],
  };
  for (const [n, pos] of Object.entries(bones)) { const o = new THREE.Object3D(); o.position.set(...pos); o.name = n; rig.add(o); }
  return { list, IM, rig };
}
function updPeds(dt) {
  if (!PEDS) return;
  const { list, IM, rig } = PEDS, t = performance.now() / 1000;
  list.forEach((p, i) => {
    const far = Math.abs(p.x - P.x) > 220 || Math.abs(p.z - P.z) > 220, dP = Math.hypot(P.x - p.x, P.z - p.z);
    p.near = dP < 6;
    let moving = false;
    if (dP < 2.6) { p.yaw = Math.atan2(P.x - p.x, P.z - p.z); }
    else if (!far) {
      if (p.wait > 0) p.wait -= dt;
      else {
        const s = p.path, n = s.length / 2 - 1, i0 = p.dir > 0 ? p.seg : p.seg + 1, i1 = p.dir > 0 ? p.seg + 1 : p.seg;
        const ax = s[i0 * 2], az = s[i0 * 2 + 1], dx = s[i1 * 2] - ax, dz = s[i1 * 2 + 1] - az, L = Math.hypot(dx, dz) || 0.01;
        p.t += p.v * dt / L;
        if (p.t >= 1) { p.t = 0; p.seg += p.dir; if (p.seg < 0 || p.seg >= n) { p.dir = -p.dir; p.seg = Math.max(0, Math.min(n - 1, p.seg)); p.wait = 1 + Math.random() * 3; } }
        const nx = ax + dx * p.t, nz = az + dz * p.t;
        if (hits(nx, nz, 0.3)) { p.dir = -p.dir; p.t = 1 - p.t; p.wait = 0.5; }
        else { p.x = nx; p.z = nz; p.yaw = Math.atan2(dx, dz); moving = true; }
      }
    }
    if (far && i % 4) return;
    const sw = moving ? Math.sin(t * 7 * p.v + p.ph) * 0.55 : 0;
    rig.position.set(p.x, 0, p.z); rig.rotation.y = p.yaw; rig.scale.setScalar(p.h);
    for (const o of rig.children) o.rotation.set(0, 0, 0);
    rig.getObjectByName("legL").rotation.x = sw; rig.getObjectByName("legR").rotation.x = -sw;
    rig.getObjectByName("armL").rotation.x = -sw * 0.8; rig.getObjectByName("armR").rotation.x = sw * 0.8;
    if (dP < 6 && p === PEDS.greeter) { const a = rig.getObjectByName("armR"); a.rotation.z = 2.6 + Math.sin(t * 9) * 0.35; }
    rig.updateMatrixWorld(true);
    for (const o of rig.children) IM[o.name].setMatrixAt(i, o.matrixWorld);
  });
  for (const m of Object.values(IM)) m.instanceMatrix.needsUpdate = true;
}
function pedHit(x, z, r) { if (PEDS) for (const p of PEDS.list) if ((x - p.x) ** 2 + (z - p.z) ** 2 < (r + 0.3) ** 2) return true; return false; }

// gelembung sapaan
function bubbleSprite() { const s = label(" ", 1, { bg: "#ffffff", fg: "#274045", font: 56 }); s.scale.set(3.6, 0.9, 1); s.visible = false; return s; }
function setBubble(s, text) { if (s.userData.text === text) return; s.userData.text = text; s.material.map.dispose(); s.material.map = textCanvas(text, { bg: "#ffffff", fg: "#274045", font: 54 }); s.material.needsUpdate = true; }

// ---------- perabot jalan khas kota ----------
function instAt(geo, mat, pts, shadow = true) {
  if (!pts.length) return; const m = new THREE.InstancedMesh(geo, mat, pts.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  pts.forEach(([x, z, a], i) => m.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.setFromAxisAngle(up, a || 0), one))); m.castShadow = shadow; m.receiveShadow = true; city.add(m); return m;
}
function streetProps(k, H, rnd) {
  const spots = []; // titik di trotoar
  for (const r of ROADS_CAR) { const p = r[3], w = r[0]; if (w < 6) continue; let acc = 20 + rnd() * 40;
    for (let i = 2; i < p.length; i += 2) { const ax = p[i - 2], az = p[i - 1], dx = p[i] - ax, dz = p[i + 1] - az, L = Math.hypot(dx, dz); if (!L) continue;
      for (; acc < L; acc += 45 + rnd() * 40) { const s = rnd() < 0.5 ? 1 : -1, x = ax + dx * acc / L - dz / L * s * (w / 2 + 1.1), z = az + dz * acc / L + dx / L * s * (w / 2 + 1.1);
        if (Math.abs(x) < H - 5 && Math.abs(z) < H - 5 && !hits(x, z, 0.8) && !onRoad(x, z, 0.4)) spots.push([x, z, Math.atan2(-dz * s, dx * s)]); }
      acc -= L; } }
  const pick = (n) => { const out = []; for (let i = 0; i < n && spots.length; i++) out.push(spots.splice(Math.floor(rnd() * spots.length), 1)[0]); out.forEach(([x, z]) => round(x, z, 0.5)); return out; };
  const bench = new THREE.BoxGeometry(1.8, 0.45, 0.5).translate(0, 0.45, 0);
  instAt(bench, R(0x5b4632, 0.8), pick(25));
  instAt(new THREE.CylinderGeometry(0.28, 0.25, 0.9, 10).translate(0, 0.45, 0), R(k === "en" ? 0x1f2a24 : 0x4a4f55, 0.6, 0.3), pick(30));
  if (k === "en") {
    const ph = pick(14); instAt(new THREE.BoxGeometry(1, 2.5, 1).translate(0, 1.25, 0), R(0xc8102e, 0.4), ph); instAt(new THREE.BoxGeometry(0.85, 1.9, 1.02).translate(0, 1.25, 0), R(0x2b3a44, 0.15, 0.4), ph, false);
    instAt(new THREE.CylinderGeometry(0.3, 0.32, 1.45, 14).translate(0, 0.72, 0), R(0xc8102e, 0.35), pick(16));
  }
  if (k === "fr") {
    const mc = pick(12); instAt(new THREE.CylinderGeometry(0.62, 0.62, 3.4, 16).translate(0, 1.7, 0), R(0x2f5a3b, 0.6), mc); instAt(new THREE.SphereGeometry(0.66, 14, 8, 0, 6.3, 0, 1.6).translate(0, 3.4, 0), R(0x2f5a3b, 0.5), mc);
    const cafe = pick(16); instAt(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 14).translate(0, 0.75, 0), R(0x2a2a2a, 0.4, 0.5), cafe); instAt(new THREE.ConeGeometry(1.6, 0.6, 10).translate(0, 2.5, 0), R(0xb3262b, 0.7), cafe);
    instAt(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6).translate(0, 1.15, 0), R(0x2a2a2a), cafe, false);
  }
  if (k === "ja") {
    const vm = pick(36); instAt(new THREE.BoxGeometry(1, 1.85, 0.75).translate(0, 0.93, 0), R(0xf2f2f2, 0.4), vm); instAt(new THREE.BoxGeometry(0.8, 0.9, 0.06).translate(0, 1.2, 0.38), R(0xe53935, 0.4, 0, { emissive: 0x401010 }), vm, false);
    // tiang listrik + kabel di jalan kecil (khas Tokyo)
    const poles = [], wires = [];
    for (const r of ROADS_CAR) { const p = r[3], w = r[0]; if (w > 8) continue; let acc = 10, prev = null;
      for (let i = 2; i < p.length; i += 2) { const ax = p[i - 2], az = p[i - 1], dx = p[i] - ax, dz = p[i + 1] - az, L = Math.hypot(dx, dz); if (!L) continue;
        for (; acc < L; acc += 30) { const x = ax + dx * acc / L - dz / L * (w / 2 + 0.6), z = az + dz * acc / L + dx / L * (w / 2 + 0.6); if (hits(x, z, 0.4)) { prev = null; continue; } poles.push([x, z, Math.atan2(dx, dz)]); if (prev) wires.push(prev, [x, z]); prev = [x, z]; round(x, z, 0.3); }
        acc -= L; }
      if (poles.length > 500) break; }
    instAt(new THREE.CylinderGeometry(0.14, 0.2, 9, 8).translate(0, 4.5, 0), R(0x9a9c98, 0.8), poles); instAt(new THREE.BoxGeometry(1.6, 0.12, 0.12).translate(0, 8.2, 0), R(0x6a6c68, 0.8), poles, false);
    const wp = []; for (let i = 0; i < wires.length; i += 2) for (const dy of [8.15, 7.6]) { const [a, b] = [wires[i], wires[i + 1]]; wp.push(a[0], dy, a[1], (a[0] + b[0]) / 2, dy - 0.5, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2, dy - 0.5, (a[1] + b[1]) / 2, b[0], dy, b[1]); }
    if (wp.length) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3)); city.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x222222 }))); }
  }
  if (k === "zh") {
    const ln = pick(40); instAt(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6).translate(0, 2.1, 0), R(0x5a5a5a, 0.5, 0.5), ln, false);
    instAt(new THREE.SphereGeometry(0.42, 12, 10).scale(1, 1.2, 1).translate(0.5, 3.6, 0), R(0xd8241c, 0.5, 0, { emissive: 0x3a0505 }), ln, false);
    const bk = pick(20); instAt(new THREE.BoxGeometry(0.1, 0.9, 1.7).translate(0, 0.5, 0), R(0xf2c230, 0.5), bk);
  }
  if (k === "ar") {
    const ct = pick(18); instAt(new THREE.BoxGeometry(1.8, 1, 1).translate(0, 0.5, 0), R(0x8a5a3a, 0.8), ct); instAt(new THREE.ConeGeometry(1.4, 0.5, 8).translate(0, 2.3, 0), R(0xd9a441, 0.7), ct);
    instAt(new THREE.CylinderGeometry(0.04, 0.04, 2, 6).translate(0, 1.2, 0), R(0x333333), ct, false);
  }
}

// ---------- peta besar + penunjuk arah ----------
let WAY = null, beacon = null;
function setWay(x, z, text) {
  WAY = { x, z, text };
  if (!beacon) { beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 120, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd315, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })); }
  beacon.position.set(x, 60, z); city.add(beacon); $("#way").hidden = false; closeBigMap(); toast(`Penunjuk arah: ${text}`);
}
function clearWay() { WAY = null; if (beacon) city.remove(beacon); $("#way").hidden = true; }
function bigMapMarks() {
  const m = NPCS.map((n) => ({ x: n.g.position.x, z: n.g.position.z, text: n.role, col: isDone(LANG, n) ? "#28E143" : "#FFD315" }));
  if (LMS[0]) m.push({ x: LMS[0][0], z: LMS[0][1], text: D.LANDMARK[LANG], col: "#E9212C", star: true });
  if (parked) m.push({ x: parked.position.x, z: parked.position.z, text: "Skuter ELCY", col: "#74cfaa" });
  return m;
}
function openBigMap() {
  if (!MINI || mode === "dlg") return;
  mode = "bigmap"; $("#bigMap").hidden = false; $("#bmCity").textContent = D.CITIES[LANG].name;
  const cv = $("#bmCv"), g = cv.getContext("2d"), W = cv.width, H = MINI.H, s = W / (H * 2), X = (x) => (x + H) * s, Z = (z) => (z + H) * s;
  g.drawImage(MINI, 0, 0, W, W);
  const marks = bigMapMarks();
  marks.forEach((m) => { g.fillStyle = m.col; g.strokeStyle = "#274045"; g.lineWidth = 3; g.beginPath(); if (m.star) { g.font = "700 34px sans-serif"; g.textAlign = "center"; g.fillText("★", X(m.x), Z(m.z) + 12); g.strokeText("★", X(m.x), Z(m.z) + 12); } else { g.arc(X(m.x), Z(m.z), 10, 0, 7); g.fill(); g.stroke(); }
    g.font = "700 16px Fredoka, sans-serif"; g.textAlign = "center"; g.lineWidth = 4; g.strokeStyle = "#fff"; g.strokeText(m.text, X(m.x), Z(m.z) - 16); g.fillStyle = "#274045"; g.fillText(m.text, X(m.x), Z(m.z) - 16); });
  g.save(); g.translate(X(P.x), Z(P.z)); g.rotate(-P.yaw); g.fillStyle = "#00A5FF"; g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 16); g.lineTo(11, -10); g.lineTo(-11, -10); g.closePath(); g.fill(); g.stroke(); g.restore();
  if (WAY) { g.strokeStyle = "#E9212C"; g.setLineDash([10, 8]); g.lineWidth = 3; g.beginPath(); g.moveTo(X(P.x), Z(P.z)); g.lineTo(X(WAY.x), Z(WAY.z)); g.stroke(); g.setLineDash([]); }
  cv.onclick = (e) => {
    const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width * W, mz = (e.clientY - r.top) / r.height * W;
    const hit = marks.find((m) => Math.hypot(X(m.x) - mx, Z(m.z) - mz) < 24);
    if (hit) setWay(hit.x, hit.z, hit.text); else setWay(mx / s - H, mz / s - H, "titik pilihanmu");
  };
  $("#bmList").innerHTML = marks.map((m, i) => `<button class="hbtn" data-i="${i}">${m.star ? "★" : "●"} ${esc(m.text)} · ${Math.round(Math.hypot(m.x - P.x, m.z - P.z))} m</button>`).join("") + (WAY ? `<button class="hbtn" id="bmClr">Hapus penunjuk</button>` : "");
  $("#bmList").querySelectorAll("[data-i]").forEach((b) => b.onclick = () => { const m = marks[+b.dataset.i]; setWay(m.x, m.z, m.text); });
  if ($("#bmClr")) $("#bmClr").onclick = () => { clearWay(); closeBigMap(); };
}
function closeBigMap() { $("#bigMap").hidden = true; if (mode === "bigmap") mode = "play"; }
function updWay() {
  if (!WAY) return;
  const dx = WAY.x - P.x, dz = WAY.z - P.z, d = Math.hypot(dx, dz);
  if (d < 6) { toast(`Sampai di ${WAY.text}!`); clearWay(); return; }
  const camYaw = P.yaw + CAM.yaw, rel = Math.atan2(dx, dz) - camYaw;
  $("#wayArr").style.transform = `rotate(${-rel}rad)`; $("#wayTxt").textContent = `${WAY.text} · ${Math.round(d)} m`;
  beacon.material.opacity = 0.25 + Math.sin(performance.now() / 300) * 0.1;
}

// ---------- kontrol ----------
const P = { x: 0, z: 52, yaw: Math.PI, v: 0, lean: 0, foot: false };
const CAM = { yaw: 0, pitch: 0.42, dist: 10, snap: true };
const KEYS = {};
let JOY = null, mode = "map", near = null;
addEventListener("keydown", (e) => {
  if (e.target.closest?.("input, textarea")) return;
  const k = e.key.toLowerCase(); KEYS[k] = true;
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k) && mode === "play") e.preventDefault();
  if (k === "e" && mode === "play") doAct();
  if (k === "f" && mode === "play" && player) setRide(P.foot);
  if (k === "m" && player) { if (mode === "bigmap") closeBigMap(); else if (mode === "play") openBigMap(); }
  if (k === "escape") { if (mode === "dlg") closeDlg(); else if (mode === "bigmap") closeBigMap(); }
});
addEventListener("keyup", (e) => { KEYS[e.key.toLowerCase()] = false; });
addEventListener("blur", () => { for (const k in KEYS) KEYS[k] = false; });
// seret untuk memutar kamera
let drag = null;
const cv = renderer.domElement;
cv.addEventListener("pointerdown", (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove", (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  CAM.yaw -= (e.clientX - drag.x) * 0.006; CAM.pitch = Math.min(1.1, Math.max(0.15, CAM.pitch + (e.clientY - drag.y) * 0.004));
  drag.x = e.clientX; drag.y = e.clientY;
});
cv.addEventListener("pointerup", () => drag = null); cv.addEventListener("pointercancel", () => drag = null);
cv.addEventListener("wheel", (e) => { CAM.dist = Math.min(40, Math.max(5, CAM.dist + e.deltaY * 0.015)); }, { passive: true });
// joystick layar sentuh
const joy = $("#joy"), knob = $("#joyKnob");
if (touch) {
  joy.hidden = false;
  const setJ = (e) => { const r = joy.getBoundingClientRect(); let x = (e.clientX - r.left - 60) / 50, y = (e.clientY - r.top - 60) / 50; const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } JOY = { x, y }; knob.style.transform = `translate(${x * 35}px, ${y * 35}px)`; };
  joy.addEventListener("pointerdown", (e) => { joy.setPointerCapture(e.pointerId); setJ(e); });
  joy.addEventListener("pointermove", (e) => { if (JOY) setJ(e); });
  const end = () => { JOY = null; knob.style.transform = ""; };
  joy.addEventListener("pointerup", end); joy.addEventListener("pointercancel", end);
}

// ---------- loop ----------
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(), look = new THREE.Vector3();
function step(dt) {
  if (!player) return;
  const t = performance.now() / 1000;
  let thr = 0, steer = 0, ix = 0, iy = 0;
  if (mode === "play") {
    if (KEYS.w || KEYS.arrowup) { thr += 1; iy += 1; }
    if (KEYS.s || KEYS.arrowdown) { thr -= 1; iy -= 1; }
    if (KEYS.a || KEYS.arrowleft) { steer += 1; ix -= 1; }
    if (KEYS.d || KEYS.arrowright) { steer -= 1; ix += 1; }
    if (JOY && Math.hypot(JOY.x, JOY.y) > 0.15) { steer = -JOY.x; thr = -JOY.y; ix = JOY.x; iy = -JOY.y; }
  }
  const R0 = P.foot ? 0.4 : 0.8, blocked = (x, z) => hits(x, z, R0) || carHit(x, z, R0) || pedHit(x, z, R0 * 0.8);
  let moveSpeed = 0;
  if (P.foot) { // jalan kaki: arah relatif kamera
    const m = Math.min(1, Math.hypot(ix, iy));
    if (m > 0.1) {
      const camF = P.yaw + CAM.yaw, want = camF + Math.atan2(-ix, iy);
      const dif = (want - P.yaw + Math.PI * 3) % (Math.PI * 2) - Math.PI, turn = Math.max(-dt * 9, Math.min(dt * 9, dif));
      P.yaw += turn; CAM.yaw -= turn; // kamera tetap, tokoh berbalik
      moveSpeed = (KEYS.shift ? 7.5 : 4.2) * m;
    }
    P.v += (moveSpeed - P.v) * Math.min(1, dt * 10);
  } else {
    const max = KEYS.shift ? 24 : 15;
    if (thr) P.v += thr * (thr * P.v < 0 ? 26 : 13) * dt; else P.v *= Math.pow(0.12, dt);
    P.v = Math.max(-5, Math.min(max, P.v));
    P.yaw += steer * dt * (1.2 + Math.min(Math.abs(P.v), 8) * 0.18) * (P.v < -0.3 ? -1 : 1) * (Math.abs(P.v) > 0.2 || JOY ? 1 : 0.6);
  }
  const nx = P.x + Math.sin(P.yaw) * P.v * dt, nz = P.z + Math.cos(P.yaw) * P.v * dt;
  if (!blocked(nx, nz)) { P.x = nx; P.z = nz; }
  else if (!blocked(nx, P.z)) { P.x = nx; P.v *= 0.9; }
  else if (!blocked(P.x, nz)) { P.z = nz; P.v *= 0.9; }
  else P.v *= P.foot ? 0 : -0.25;
  if (blocked(P.x, P.z)) { P.x -= Math.sin(P.yaw) * 0.05; P.z -= Math.cos(P.yaw) * 0.05; } // terdorong keluar bila tertabrak mobil
  player.position.set(P.x, 0, P.z); player.rotation.y = P.yaw;
  if (P.foot) {
    const { legs, arms, body } = walker.userData, sw = Math.sin(t * (P.v > 5 ? 13 : 9)) * Math.min(1, P.v / 4) * 0.7;
    legs[0].rotation.x = sw; legs[1].rotation.x = -sw; arms[0].rotation.x = -sw; arms[1].rotation.x = sw;
    body.position.y = Math.abs(Math.sin(t * 9)) * 0.06 * Math.min(1, P.v / 4);
  } else {
    P.lean += ((-steer * Math.min(Math.abs(P.v), 10) / 10) * 0.35 - P.lean) * Math.min(1, dt * 6);
    const { body, wheels } = rider.userData;
    body.rotation.z = P.lean; body.position.y = Math.abs(P.v) > 0.5 ? Math.sin(t * 14) * 0.025 : 0;
    wheels.forEach((w) => w.rotation.x += P.v * dt / 0.36);
  }

  // kamera mengikuti dari belakang; kembali pelan ke belakang saat bergerak
  if (Math.abs(P.v) > 1 && !drag) CAM.yaw *= Math.pow(P.foot ? 0.55 : 0.35, dt);
  const yaw = P.yaw + Math.PI + CAM.yaw; let dist = CAM.dist * (camera.aspect < 1 ? 1.35 : 1) * (P.foot ? 0.62 : 1);
  const baseY = P.foot ? 1.3 : 1.5;
  for (let s = 1.5; s < dist; s += 0.75) { // kamera tidak menembus gedung
    const cx = P.x + Math.sin(yaw) * s * Math.cos(CAM.pitch), cz = P.z + Math.cos(yaw) * s * Math.cos(CAM.pitch), cy = baseY + Math.sin(CAM.pitch) * s;
    if (roofAt(cx, cz) > cy - 0.5) { dist = Math.max(1.5, s - 0.8); break; }
  }
  camPos.set(P.x + Math.sin(yaw) * dist * Math.cos(CAM.pitch), baseY + Math.sin(CAM.pitch) * dist, P.z + Math.cos(yaw) * dist * Math.cos(CAM.pitch));
  if (mode === "dlg" && near?.g) { const n = near.g.position; camPos.set((P.x + n.x) / 2 + (n.z - P.z) * 0.9, 3.6, (P.z + n.z) / 2 - (n.x - P.x) * 0.9); }
  if (CAM.snap) { camera.position.copy(camPos); CAM.snap = false; } else camera.position.lerp(camPos, Math.min(1, dt * 5));
  if (mode === "dlg" && near?.g) look.set((P.x + near.g.position.x) / 2, 1.8, (P.z + near.g.position.z) / 2);
  else { const fy = P.yaw + CAM.yaw; look.set(P.x + Math.sin(fy) * 4, P.foot ? 1.9 : 2.6, P.z + Math.cos(fy) * 4); }
  camera.lookAt(look);
  sun.position.set(P.x + SUNDIR.x * 250, SUNDIR.y * 250, P.z + SUNDIR.z * 250); sun.target.position.set(P.x, 0, P.z);

  updTraffic(dt); updPeds(dt); updWay();

  // NPC utama: menoleh, melambai, menyapa dengan suara saat didekati
  let best = null, bd = 4.2;
  NPCS.forEach((n) => {
    const dx = P.x - n.g.position.x, dz = P.z - n.g.position.z, d = Math.hypot(dx, dz), done = isDone(LANG, n);
    if (d < 16) n.g.rotation.y += ((Math.atan2(dx, dz) - n.g.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 4);
    n.mark.position.y = 5 + Math.sin(t * 3 + n.phase) * 0.18;
    const arm = n.g.userData.arms[1];
    if (d < 16 && d > 3.5) { arm.rotation.z = 2.5 + Math.sin(t * 8 + n.phase) * 0.4; } else arm.rotation.z *= 0.9;
    if (d < 16 && mode === "play") {
      n.bub.visible = true; setBubble(n.bub, done ? D.THANKS[LANG] : D.GREET[LANG][Math.floor(n.phase * 10) % D.GREET[LANG].length]);
      if (!n.greeted) { n.greeted = true; say(n.bub.userData.text); }
    } else { n.bub.visible = false; if (d > 30) n.greeted = false; }
    if (d < bd) { bd = d; best = n; }
  });
  // pejalan kaki terdekat bisa disapa
  let ped = null;
  if (PEDS) {
    let pd = 3.6; for (const p of PEDS.list) { const d = Math.hypot(P.x - p.x, P.z - p.z); if (d < pd) { pd = d; ped = p; } }
    PEDS.greeter = ped;
    const b = PEDS.bubble;
    if (ped && !best && mode === "play") { b.visible = true; b.position.set(ped.x, 2.6 * ped.h + 0.6, ped.z); setBubble(b, D.GREET[LANG][ped.greet % D.GREET[LANG].length]); }
    else b.visible = false;
  }
  if (mode === "play") {
    const scoot = P.foot && parked && Math.hypot(P.x - parked.position.x, P.z - parked.position.z) < 3;
    const act = best ? { kind: "npc", n: best, text: `Bicara dengan ${best.role}` } : ped ? { kind: "ped", p: ped, text: "Sapa warga" } : scoot ? { kind: "ride", text: "Naik skuter" } : null;
    const key = act ? act.kind + (act.n?.id || "") + (act.p ? PEDS.list.indexOf(act.p) : "") : "";
    if (key !== ACT.key) {
      ACT.key = key; ACT.cur = act; const b = $("#talk"); b.hidden = !act;
      if (act) b.innerHTML = `${touch ? "" : `<kbd>${act.kind === "ride" ? "F" : "E"}</kbd>`}${esc(act.text)}`;
    }
  }
  drawMini();
}
const ACT = { key: "", cur: null };
function doAct() {
  const a = ACT.cur; if (!a) return;
  if (a.kind === "npc") talkTo(a.n);
  else if (a.kind === "ped") pedTalk(a.p);
  else if (a.kind === "ride") setRide(true);
  ACT.key = "";
}
function pedTalk(p) { // obrolan singkat 1 giliran dengan pejalan kaki
  const list = D.TALK[LANG], [npc, opts] = list[p.talk % list.length], [w, r, m] = npc.split("|");
  const fake = { id: "ped", role: "Warga", g: { position: new THREE.Vector3(p.x, 0, p.z) } };
  near = fake; mode = "dlg"; $("#talk").hidden = true; $("#mini").hidden = true; P.v = 0; dlg.hidden = false;
  const rtl = LANG === "ar" ? ' dir="rtl"' : "", o = shuffle(opts);
  dlg.innerHTML = `<div class="dlg3__head"><h2>Warga · ${esc(D.CITIES[LANG].name)}</h2><span class="pill">obrolan santai</span><button class="hbtn" id="dX" aria-label="Tutup">×</button></div>
    <p class="line" lang="${LANG}"${rtl}>${esc(w)} <button class="say3" id="dS" aria-label="Dengarkan">▶</button></p>${r ? `<p class="read">${esc(r)}</p>` : ""}<details><summary>Arti</summary>${esc(m)}</details>
    <div class="opts3">${o.map((x, j) => `<button class="opt3" data-j="${j}" lang="${LANG}"${rtl}>${esc(x[0])}${x[1] ? `<small dir="ltr">${esc(x[1])}</small>` : ""}</button>`).join("")}</div><p class="fb3" id="dF"></p>`;
  say(w); $("#dS").onclick = () => say(w); $("#dX").onclick = closeDlg;
  dlg.querySelectorAll("[data-j]").forEach((b) => b.onclick = () => {
    const x = o[+b.dataset.j]; dlg.querySelectorAll("[data-j]").forEach((y) => { y.disabled = true; if (o[+y.dataset.j][2] === 2) y.classList.add("ok"); });
    if (x[2] !== 2) b.classList.add(x[2] === 1 ? "mid" : "no");
    $("#dF").textContent = `${x[2] === 2 ? "😊 " : x[2] === 1 ? "🙂 " : "😅 "}${x[3]}`; say(x[2] === 2 ? x[0] : o.find((y) => y[2] === 2)[0]);
    p.talk++; setTimeout(() => { if (near === fake) closeDlg(); }, 2600);
  });
}
let FRAMES = 0;
function loop() { FRAMES++; const dt = Math.min(clock.getDelta(), 0.05); step(dt); if (player) renderer.render(scene, camera); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

// ---------- peta kecil (potongan peta asli di sekitar pemain) ----------
const mini = $("#miniCv").getContext("2d");
function drawMini() {
  if (!player || !MINI) return;
  const W = 160, span = 300, sc = MINI.width / (MINI.H * 2);
  mini.fillStyle = "#cfc9bc"; mini.fillRect(0, 0, W, W);
  mini.drawImage(MINI, (P.x - span / 2 + MINI.H) * sc, (P.z - span / 2 + MINI.H) * sc, span * sc, span * sc, 0, 0, W, W);
  const X = (x) => Math.max(5, Math.min(W - 5, (x - P.x + span / 2) / span * W)), Z = (z) => Math.max(5, Math.min(W - 5, (z - P.z + span / 2) / span * W));
  LMS.slice(0, 1).forEach(([x, z]) => { mini.fillStyle = "#E9212C"; mini.font = "700 16px sans-serif"; mini.textAlign = "center"; mini.fillText("★", X(x), Z(z) + 6); });
  NPCS.forEach((n) => { mini.fillStyle = isDone(LANG, n) ? "#28E143" : "#FFD315"; mini.strokeStyle = "#274045"; mini.lineWidth = 2; mini.beginPath(); mini.arc(X(n.g.position.x), Z(n.g.position.z), 5, 0, 7); mini.fill(); mini.stroke(); });
  mini.save(); mini.translate(W / 2, W / 2); mini.rotate(-P.yaw); mini.fillStyle = "#00A5FF"; mini.strokeStyle = "#fff"; mini.lineWidth = 2; mini.beginPath(); mini.moveTo(0, 9); mini.lineTo(6, -6); mini.lineTo(-6, -6); mini.closePath(); mini.fill(); mini.stroke(); mini.restore();
}

// ---------- dialog ----------
const dlg = $("#dlg");
function head(n, extra = "") {
  return `<div class="dlg3__head"><h2>${esc(n.role)} · ${esc(D.CITIES[LANG].name)}</h2>${extra}<button class="hbtn" id="dX" aria-label="Tutup dialog">×</button></div>`;
}
function openDlg() { mode = "dlg"; $("#talk").hidden = true; $("#mini").hidden = true; P.v = 0; dlg.hidden = false; }
function closeDlg() { dlg.hidden = true; $("#mini").hidden = false; mode = "play"; near = null; ACT.key = ""; if (window._tujAudio) window._tujAudio.pause(); refreshMarks(); }
function talkTo(n) {
  near = n; openDlg();
  const turns = turnsOf(LANG, n).map(([npc, opts]) => { const [w, r, m] = npc.split("|"); return { w, r, m, o: shuffle(opts) }; });
  const rtl = LANG === "ar" ? ' dir="rtl"' : "";
  let i = 0, pts = 0;
  const show = () => {
    const q = turns[i];
    dlg.innerHTML = `${head(n, `<span class="pill">${i + 1}/${turns.length}</span>`)}
      <p class="line" lang="${LANG}"${rtl}>${esc(q.w)} <button class="say3" id="dS" aria-label="Dengarkan">▶</button></p>
      ${q.r ? `<p class="read">${esc(q.r)}</p>` : ""}<details><summary>Arti</summary>${esc(q.m)}</details>
      <p><b>Jawabanmu?</b></p>
      <div class="opts3">${q.o.map((o, j) => `<button class="opt3" data-j="${j}" lang="${LANG}"${rtl}>${esc(o[0])}${o[1] ? `<small dir="ltr">${esc(o[1])}</small>` : ""}</button>`).join("")}</div>
      <p class="fb3" id="dF"></p><div class="row3" id="dN"></div>`;
    $("#dX").onclick = closeDlg; $("#dS").onclick = () => say(q.w); say(q.w);
    dlg.querySelectorAll("[data-j]").forEach((b) => b.onclick = () => {
      const o = q.o[+b.dataset.j]; pts += o[2];
      dlg.querySelectorAll("[data-j]").forEach((x) => { x.disabled = true; const s = q.o[+x.dataset.j][2]; if (s === 2) x.classList.add("ok"); });
      if (o[2] !== 2) b.classList.add(o[2] === 1 ? "mid" : "no");
      $("#dF").textContent = `${o[2] === 2 ? "Bagus! " : o[2] === 1 ? "Lumayan. " : "Kurang tepat. "}${o[3]}`;
      say(o[2] === 2 ? o[0] : q.o.find((x) => x[2] === 2)[0]);
      $("#dN").innerHTML = `<button class="btn btn--ink" id="dNext">${i + 1 < turns.length ? "Lanjut" : "Lihat hasil"}</button>`;
      $("#dNext").onclick = () => { i++; i < turns.length ? show() : finish(); }; $("#dNext").focus();
    });
  };
  const finish = () => {
    const max = turns.length * 2, pass = pts >= passOf(turns.length), was = isDone(LANG, n), before = doneCount(LANG);
    SAVE[LANG] ??= { best: {} }; SAVE[LANG].best[n.id] = Math.max(best(LANG, n.id), pts); persist();
    const stars = pts === max ? "★★★" : pass ? "★★☆" : pts > 0 ? "★☆☆" : "☆☆☆";
    const all = doneCount(LANG) === D.NPCS.length, stampNow = all && before < D.NPCS.length;
    dlg.innerHTML = `${head(n)}<p class="line">${stars} ${pts}/${max} poin</p>
      <p>${pass ? (was ? "Percakapan lancar lagi!" : `Berhasil! ${esc(n.role)} senang ngobrol denganmu.`) : "Belum lancar. Coba lagi, minimal " + passOf(turns.length) + " poin."}</p>
      ${stampNow ? `<p><b>🎉 Cap paspor ${esc(D.CITIES[LANG].name)} didapat!</b> Semua warga sudah kamu ajak ngobrol. Buka peta dunia untuk terbang ke kota lain.</p>` : ""}
      <div class="row3"><button class="btn" id="dAgain">Ulangi</button><button class="btn btn--ink" id="dAI">Ngobrol bebas (AI)</button><button class="btn" id="dClose">Tutup</button></div>`;
    $("#dX").onclick = $("#dClose").onclick = closeDlg; $("#dAgain").onclick = () => talkTo(n); $("#dAI").onclick = () => aiChat(n);
    if (all) postScore();
  };
  show();
}
async function postScore() {
  const score = D.NPCS.reduce((s, n) => s + best(LANG, n.id) * 100, 0) + 500;
  if (TUJ.me) try { await TUJ.api("/api/score", { game: "dunia", lang: LANG, score }); } catch {}
}
function aiChat(n) {
  const msgs = [], rtl = LANG === "ar" ? ' dir="rtl"' : "";
  const draw = (busy, err) => {
    dlg.innerHTML = `${head(n, '<span class="pill">AI</span>')}
      <div class="chat3" id="cL">${msgs.map((m) => m.role === "user" ? `<p class="me" lang="${LANG}"${rtl}>${esc(m.content)}</p>` : `<p lang="${LANG}"${rtl}>${esc(m.content)}${m.reading ? `<small dir="ltr">${esc(m.reading)}</small>` : ""}${m.tr ? `<small dir="ltr">${esc(m.tr)}</small>` : ""}</p>${m.fix ? `<p class="fix">Koreksi: ${esc(m.fix)}</p>` : ""}`).join("")}
      ${busy ? "<p>…</p>" : ""}${err ? `<p class="fix">${esc(err)}</p>` : ""}</div>
      <form class="in3" id="cF"><input id="cI" lang="${LANG}"${rtl} placeholder="Tulis dalam ${esc(LANGS[LANG].name)}…" autocomplete="off" ${busy ? "disabled" : ""}><button class="btn btn--ink" ${busy ? "disabled" : ""}>Kirim</button></form>
      <div class="row3"><button class="btn" id="dBack">Kembali</button></div>`;
    $("#dX").onclick = closeDlg; $("#dBack").onclick = () => talkTo(n);
    $("#cL").scrollTop = 1e6; $("#cF").onsubmit = (e) => { e.preventDefault(); const v = $("#cI").value.trim(); if (v) { msgs.push({ role: "user", content: v }); send(); } };
    if (!busy) $("#cI").focus();
  };
  const send = async () => {
    draw(true);
    try {
      const d = await TUJ.api("/api/chat", { lang: LANG, langName: LANG_EN[LANG], level: "A2", style: "baku",
        scenario: `You are ${ROLE_EN[n.id]} in ${D.CITIES[LANG].name}. The learner is a visitor riding a scooter around the city${n.id === "warga" ? `, looking for ${D.LANDMARK[LANG]}` : ""}.`,
        messages: msgs.slice(-16).map((m) => ({ role: m.role, content: m.content })) });
      msgs.push({ role: "assistant", content: d.reply, reading: d.reading, tr: d.translation_id, fix: d.correction_id });
      say(d.reply); draw(false);
    } catch (e) {
      if (msgs.at(-1)?.role === "user" && msgs.length > 1) {} // biarkan pesan pengguna tetap tampil
      draw(false, /AI belum aktif|503/.test(e.message) ? "Fitur AI belum aktif di server ini (API key belum dipasang). Latihan pilihan ganda tetap bisa dimainkan." : e.message);
    }
  };
  send();
}

// ---------- peta dunia ----------
function renderMap() {
  const last = SAVE.last;
  $("#cities").innerHTML = LK.map((k) => {
    const C = D.CITIES[k], dn = doneCount(k), all = dn === D.NPCS.length;
    return `<button class="city" data-k="${k}"><span class="flag" aria-hidden="true">${C.flag}</span><b>${C.name}</b><small>${esc(LANGS[k].name)} · ${esc(D.LANDMARK[k])}</small>
      <small>${esc(C.desc)}</small><span class="bar"><i style="width:${dn / D.NPCS.length * 100}%"></i></span><small>${dn}/${D.NPCS.length} warga${k === last ? " · terakhir dikunjungi" : ""}</small>${all ? '<span class="stamp">LUNAS</span>' : ""}</button>`;
  }).join("");
  $("#cities").querySelectorAll("[data-k]").forEach((b) => b.onclick = () => fly(b.dataset.k));
}
function showMap() { mode = "map"; $("#mapPanel").hidden = false; $("#talk").hidden = true; dlg.hidden = true; renderMap(); }
async function fly(k) {
  $("#flyTxt").textContent = LANG && LANG !== k ? `Terbang ke ${D.CITIES[k].name}…` : `Menuju ${D.CITIES[k].name}…`;
  $("#fly").hidden = false; $("#mapPanel").hidden = true; mode = "map";
  await new Promise((r) => setTimeout(r, 60));
  LANG = k;
  try { await buildCity(k); } catch (e) { $("#flyTxt").textContent = "Gagal memuat peta: " + e.message; setTimeout(showMap, 2500); return; }
  SAVE.last = k; persist();
  $("#hCity").textContent = `${D.CITIES[k].flag} ${D.CITIES[k].name}`; refreshMarks();
  ["#hud", "#mini", "#osm"].forEach((s) => $(s).hidden = false); $("#hint").hidden = touch;
  history.replaceState(null, "", "#" + k);
  setTimeout(() => { $("#fly").hidden = true; mode = "play"; near = null; }, 400);
}
$("#bMap").onclick = showMap;
$("#bHelp").onclick = () => {
  mode = "dlg"; near = null; dlg.hidden = false;
  dlg.innerHTML = `<div class="dlg3__head"><h2>Cara main</h2><button class="hbtn" id="dX" aria-label="Tutup">×</button></div>
    <ul><li><b>Laptop:</b> W/↑ gas, S/↓ rem/mundur, A D / ← → belok, Shift ngebut. Seret layar untuk memutar kamera, scroll untuk zoom.</li><li><b>F</b> turun/naik skuter (jalan kaki: WASD, Shift lari). <b>M</b> atau klik peta kecil untuk peta besar &amp; penunjuk arah.</li><li>Pejalan kaki bisa disapa (<b>E</b>) untuk obrolan singkat.</li>
    <li><b>HP:</b> geser joystick kiri bawah ke arah tujuan. Seret layar untuk memutar kamera.</li>
    <li>Datangi warga bertanda <b>!</b> lalu tekan <b>E</b> atau tombol <b>Bicara</b>. Pilih jawaban paling tepat; dengarkan suaranya dengan ▶.</li>
    <li>Minimal 2/3 poin supaya warga bertanda ✓. Enam warga ✓ = cap paspor kota itu.</li>
    <li>Peta kecil di kanan bawah: titik kuning = belum, hijau = sudah.</li></ul>
    <div class="row3"><button class="btn btn--ink" id="dOk">Siap!</button></div>`;
  $("#dX").onclick = $("#dOk").onclick = () => { dlg.hidden = true; mode = "play"; };
};
$("#talk").onclick = doAct;
$("#bRide").onclick = () => player && mode === "play" && setRide(P.foot);
$("#mini").onclick = openBigMap; $("#bCityMap").onclick = openBigMap; $("#bmX").onclick = closeBigMap;

TUJ.requireMember("dunia.html").then((ok) => {
  if (!ok) return;
  const h = location.hash.slice(1);
  if (LK.includes(h)) fly(h); else showMap();
});
window.__step = (n = 60) => { for (let i = 0; i < n; i++) step(1 / 60); renderer.render(scene, camera); return window.__dunia(); };
window.__cam = CAM; window.__P = P; window.__peds = () => PEDS; window.__traffic = () => TRAFFIC;
window.__talk = (id) => talkTo(NPCS.find((n) => n.id === id));
window.__dunia = () => ({ mode, P: { ...P }, near: near?.id, lang: LANG, FRAMES, keys: { ...KEYS } });
