'use strict';
// Swipe City: endless rooftop runner. Three.js r147 (vendor/three.min.js), no build step.
// The runner stays at z = 0 and the world scrolls toward +z (toward the camera).

const LANE = 2.2, ROOF_W = 8.4;
const rand = (a, b) => a + Math.random() * (b - a);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

// Later sections plug in here.
const populators = [], updates = [], resets = [], overHooks = [];

// ---------- renderer, scene, light ----------

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf0b089, 55, 230);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

scene.background = canvasTex(4, 512, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1f3a6b');
  g.addColorStop(0.3, '#7d6a9c');
  g.addColorStop(0.48, '#f29b6b');
  g.addColorStop(0.6, '#ffd29a');
  g.addColorStop(1, '#f0b089');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
});

scene.add(new THREE.HemisphereLight(0xffe3c4, 0x3a3a55, 0.8));
const sun = new THREE.DirectionalLight(0xffc48a, 1.3);
sun.position.set(-14, 18, 8);
sun.target.position.set(0, 0, -10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 30, bottom: -30, near: 1, far: 80 });
scene.add(sun, sun.target);

// ---------- textures and materials (procedural placeholders) ----------

const roofTex = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#77716c';
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) {
    c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
    c.fillRect(rand(0, w), rand(0, h), 2, 2);
  }
  c.strokeStyle = 'rgba(0,0,0,0.3)';
  c.lineWidth = 2;
  c.strokeRect(1, 1, w - 2, h - 2);
});
roofTex.repeat.set(3, 10);

const wallTex = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#4a424a';
  c.fillRect(0, 0, w, h);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) {
    const r = Math.random();
    c.fillStyle = r < 0.25 ? '#ffd68a' : r < 0.6 ? '#6c7f9e' : '#232a3a';
    c.fillRect(x * 32 + 7, y * 16 + 4, 18, 9);
  }
});
wallTex.repeat.set(2, 8);
const cityTex = wallTex.clone();
cityTex.repeat.set(3, 10);
cityTex.needsUpdate = true;

const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85 }, o));
const roofMat = std({ map: roofTex, roughness: 0.95 });
const wallMat = std({ map: wallTex });
const trimMat = std({ color: 0x8d8780 });
const roofMats = [wallMat, wallMat, roofMat, wallMat, wallMat, wallMat];
const cityMats = [0xffffff, 0xdccbc0, 0xaeb8cc].map((color) => std({ map: cityTex, color }));

const unitBox = new THREE.BoxGeometry(1, 1, 1);
function box(mat, w, h, d, x, y, z) {
  const m = new THREE.Mesh(unitBox, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// ---------- rooftops (the track) and backdrop city ----------

const world = new THREE.Group();
scene.add(world);
const roofs = [];

// A roof is a group whose local z = 0 is its near edge; it extends to z = -len.
function spawnRoof(first) {
  const last = roofs[roofs.length - 1];
  const len = first ? 62 : rand(26, 48);
  const g = new THREE.Group();
  g.position.z = last ? last.position.z - last.userData.len - rand(3, 4.8) : 12;
  g.userData = { len, obstacles: [], items: [] };
  const body = box(roofMats, ROOF_W, 60, len, 0, -30, -len / 2);
  body.castShadow = false;
  g.add(body);
  for (const s of [-1, 1]) g.add(box(trimMat, 0.3, 0.45, len, s * (ROOF_W / 2 - 0.15), 0.225, -len / 2));
  for (const p of populators) p(g, first);
  world.add(g);
  roofs.push(g);
}

const city = [];
for (let i = 0; i < 70; i++) {
  const w = rand(8, 18), h = rand(30, 100), top = rand(-22, 24);
  const b = new THREE.Mesh(unitBox, cityMats[i % 3]);
  b.scale.set(w, h, rand(8, 22));
  b.position.set((i % 2 ? 1 : -1) * (ROOF_W / 2 + 6 + w / 2 + rand(0, 42)), top - h / 2, 40 - rand(0, 320));
  scene.add(b);
  city.push(b);
}
const street = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), std({ color: 0x2a2630 }));
street.rotation.x = -Math.PI / 2;
street.position.y = -55;
scene.add(street);

// ---------- game state and loop ----------

// state: title | playing | falling | crash | over | paused
let state = 'title', speed = 12, dist = 0, last = 0;

function reset() {
  roofs.splice(0).forEach((r) => world.remove(r));
  dist = 0;
  speed = 12;
  spawnRoof(true);
  while (roofs.length < 7) spawnRoof();
  for (const f of resets) f();
}
function start() { reset(); state = 'playing'; }
function gameOver() { state = 'over'; for (const f of overHooks) f(); }

function frame(t) {
  requestAnimationFrame(frame);
  const dt = state === 'paused' ? 0 : Math.min(0.05, (t - last) / 1000 || 0);
  last = t;
  if (state === 'playing') {
    speed = Math.min(30, 12 + dist * 0.012);
    const d = speed * dt;
    dist += d;
    for (const r of roofs) r.position.z += d;
    for (const b of city) { b.position.z += d; if (b.position.z > 40) b.position.z -= 320; }
    if (roofs[0].position.z - roofs[0].userData.len > 14) world.remove(roofs.shift());
    while (roofs.length < 7) spawnRoof();
  }
  for (const u of updates) u(dt, t / 1000);
  renderer.render(scene, camera);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Widen the vertical FOV in portrait so all three lanes stay in view.
  camera.fov = Math.max(60, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(26)) / camera.aspect)));
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

camera.position.set(0, 4.4, 7.5);
camera.lookAt(0, 1.2, -8);

// Boot after every section below has registered its hooks.
addEventListener('load', () => { resize(); reset(); requestAnimationFrame(frame); });
