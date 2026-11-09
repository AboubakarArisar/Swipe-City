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

// ---------- runner: built from primitives so every part can be recolored ----------

const look = Object.assign(
  { skin: '#c68642', hair: '#2b1b12', top: '#e8b923', pants: '#27364a', face: null },
  store.get('swipecity.look', {}));

const skinMat = std({ roughness: 0.7 }), hairMat = std({}), topMat = std({}), pantsMat = std({});
const shoeMat = std({ color: 0xf2f2f2 });

// The face is a canvas texture: a drawn default, or a photo blended into the skin tone.
const faceCanvas = document.createElement('canvas');
faceCanvas.width = faceCanvas.height = 256;
const faceTex = new THREE.CanvasTexture(faceCanvas);
faceTex.encoding = THREE.sRGBEncoding;
const faceMat = std({ map: faceTex, roughness: 0.7 });
let faceImg = null; // custom photo, or a default face image from assets/

function paintFace() {
  const c = faceCanvas.getContext('2d'), s = 256;
  c.fillStyle = look.skin;
  c.fillRect(0, 0, s, s);
  if (faceImg) {
    const tmp = document.createElement('canvas');
    tmp.width = tmp.height = s;
    const t = tmp.getContext('2d');
    const side = Math.min(faceImg.width, faceImg.height); // center-crop to a square
    t.drawImage(faceImg, (faceImg.width - side) / 2, (faceImg.height - side) / 2, side, side, 0, 0, s, s);
    const fade = t.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s * 0.5);
    fade.addColorStop(0, '#000');
    fade.addColorStop(1, 'transparent');
    t.globalCompositeOperation = 'destination-in';
    t.fillStyle = fade;
    t.fillRect(0, 0, s, s);
    c.drawImage(tmp, 0, 0);
  } else {
    c.fillStyle = '#1d1a1a';
    for (const x of [92, 164]) { c.beginPath(); c.ellipse(x, 108, 9, 12, 0, 0, 7); c.fill(); }
    c.fillStyle = '#fff';
    for (const x of [95, 167]) { c.beginPath(); c.arc(x, 104, 3, 0, 7); c.fill(); }
    c.strokeStyle = '#1d1a1a';
    c.lineWidth = 5;
    c.lineCap = 'round';
    c.beginPath(); c.arc(128, 150, 26, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke();
    c.beginPath(); c.moveTo(78, 84); c.lineTo(104, 80); c.moveTo(152, 80); c.lineTo(178, 84); c.stroke();
  }
  faceTex.needsUpdate = true;
}

function applyLook() {
  skinMat.color.set(look.skin);
  hairMat.color.set(look.hair);
  topMat.color.set(look.top);
  pantsMat.color.set(look.pants);
  paintFace();
}

// keep = true stores the photo as this player's face (cropped to 256px, in this browser only).
function setFaceImage(src, keep) {
  if (!src) { faceImg = null; look.face = null; store.set('swipecity.look', look); return paintFace(); }
  const im = new Image();
  im.onload = () => {
    faceImg = im;
    paintFace();
    if (keep) {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const side = Math.min(im.width, im.height);
      c.getContext('2d').drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, 0, 0, 256, 256);
      look.face = c.toDataURL('image/jpeg', 0.85);
      store.set('swipecity.look', look);
    }
  };
  im.src = src;
}

const runner = new THREE.Group();
scene.add(runner);
const body = new THREE.Group(); // pivot at the feet; the model faces +z
runner.add(body);

function part(geo, mat, parent, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function pivot(parent, x, y, z) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  parent.add(p);
  return p;
}
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 4, 12);

part(new THREE.SphereGeometry(0.2, 16, 12), pantsMat, body, 0, 0.92, 0).scale.set(1.2, 0.7, 0.9);
const torso = pivot(body, 0, 0.92, 0);
part(capsule(0.2, 0.36), topMat, torso, 0, 0.36, 0).scale.set(1.25, 1, 0.85);
part(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 12), skinMat, torso, 0, 0.72, 0);
part(new THREE.SphereGeometry(0.2, 24, 16), skinMat, torso, 0, 0.93, 0);
// Curved patch on the front of the head that carries the face texture.
part(new THREE.SphereGeometry(0.203, 24, 16, Math.PI / 2 - 1, 2, 0.45, 1.9), faceMat, torso, 0, 0.93, 0);
part(new THREE.SphereGeometry(0.213, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat, torso, 0, 0.93, 0).rotation.x = -0.85;

function makeLeg(side) {
  const hip = pivot(body, side * 0.11, 0.9, 0);
  part(capsule(0.085, 0.3), pantsMat, hip, 0, -0.22, 0);
  const knee = pivot(hip, 0, -0.44, 0);
  part(capsule(0.07, 0.3), pantsMat, knee, 0, -0.2, 0);
  const shoe = part(unitBox, shoeMat, knee, 0, -0.415, 0.05);
  shoe.scale.set(0.13, 0.09, 0.28);
  return { hip, knee };
}
function makeArm(side) {
  const shoulder = pivot(torso, side * 0.31, 0.5, 0);
  part(capsule(0.065, 0.24), topMat, shoulder, 0, -0.17, 0);
  const elbow = pivot(shoulder, 0, -0.34, 0);
  part(capsule(0.055, 0.22), skinMat, elbow, 0, -0.15, 0);
  return { shoulder, elbow };
}
const legL = makeLeg(-1), legR = makeLeg(1), armL = makeArm(-1), armR = makeArm(1);

applyLook();
if (look.face) setFaceImage(look.face);

// ---------- player movement ----------

const pl = { lane: 0, x: 0, y: 0, vy: 0, slide: 0 };
resets.push(() => Object.assign(pl, { lane: 0, x: 0, y: 0, vy: 0, slide: 0 }));

function act(a) {
  if (state !== 'playing') return;
  if (a === 'left') pl.lane = Math.max(-1, pl.lane - 1);
  if (a === 'right') pl.lane = Math.min(1, pl.lane + 1);
  if (a === 'jump' && pl.y === 0) { pl.vy = 10; pl.slide = 0; }
  if (a === 'slide') { if (pl.y > 0) pl.vy = -16; pl.slide = 0.7; }
}

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'slide', KeyS: 'slide',
};
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if ((e.code === 'Space' || e.code === 'Enter') && (state === 'title' || state === 'over')) {
    e.preventDefault();
    return start();
  }
  if (KEYS[e.code]) { e.preventDefault(); if (!e.repeat) act(KEYS[e.code]); }
});

// Pose = [legL, kneeL, legR, kneeR, armL, armR, elbow, torso lean, body tilt, body height].
// Positive hip/shoulder angles swing backward; body tilt < 0 leans back.
const pose = new Array(10).fill(0);
let phase = 0;
const camLook = new THREE.Vector3(0, 1.2, -8), v3 = new THREE.Vector3();

updates.push((dt, t) => {
  if (state === 'playing' || state === 'falling') {
    pl.x += (pl.lane * LANE - pl.x) * Math.min(1, dt * 14);
    pl.vy -= 30 * dt;
    pl.y += pl.vy * dt;
    pl.slide = Math.max(0, pl.slide - dt);
    const onRoof = roofs.some((r) => r.position.z + 0.35 >= 0 && r.position.z - r.userData.len - 0.35 <= 0);
    if (state === 'playing' && pl.y <= 0) {
      if (onRoof) { pl.y = 0; pl.vy = 0; } else state = 'falling';
    }
    if (state === 'falling' && pl.y < -16) gameOver();
  }

  phase += dt * speed * 0.85;
  const s = Math.sin(phase), c = Math.cos(phase);
  let p;
  if (state === 'title') p = [0, 0, 0, 0, 0.06, 0.06, -0.15, Math.sin(t * 1.6) * 0.02, 0, 0];
  else if (state === 'crash' || state === 'over') p = [-0.4, 0.6, 0.2, 0.9, -1.2, -0.9, -0.6, 0, -1.45, 0.18];
  else if (state === 'falling') p = [-0.5, 1, 0.4, 0.6, -2.6, -2.8, -0.3, 0.3, 0.3, 0];
  else if (pl.slide > 0) p = [-1.25, 0.15, -0.9, 1.1, 0.5, 0.3, -0.5, 0.25, -1.15, 0.1];
  else if (pl.y > 0) p = [-1.1, 1.5, 0.25, 1, -2.2, 0.7, -1, 0.15, 0, 0];
  else p = [s * 0.95, 0.25 + Math.max(0, -c) * 1.3, -s * 0.95, 0.25 + Math.max(0, c) * 1.3,
    -s * 0.8, s * 0.8, -1.4, 0.2, 0, Math.abs(c) * 0.05];
  const k = Math.min(1, dt * 18);
  for (let i = 0; i < 10; i++) pose[i] += (p[i] - pose[i]) * k;
  legL.hip.rotation.x = pose[0]; legL.knee.rotation.x = pose[1];
  legR.hip.rotation.x = pose[2]; legR.knee.rotation.x = pose[3];
  armL.shoulder.rotation.x = pose[4]; armR.shoulder.rotation.x = pose[5];
  armL.elbow.rotation.x = armR.elbow.rotation.x = pose[6];
  torso.rotation.x = pose[7];
  body.rotation.x = pose[8];
  body.position.y = pose[9];

  // On the title screen the runner faces the camera up close; in play we follow from behind.
  const title = state === 'title', ck = Math.min(1, dt * 5);
  runner.position.set(pl.x, pl.y, 0);
  runner.rotation.y += ((title ? 0 : Math.PI) - runner.rotation.y) * Math.min(1, dt * 8);
  camera.position.lerp(title ? v3.set(0, 1.7, 3.4) : v3.set(pl.x * 0.5, 4.4, 7.5), ck);
  camLook.lerp(title ? v3.set(0, 1.15, 0) : v3.set(pl.x * 0.3, 1.2, -8), ck);
  camera.lookAt(camLook);
});
