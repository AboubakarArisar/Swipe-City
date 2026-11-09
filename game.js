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
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd9bda5, 55, 265);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// Same image, different tiling: lets every building tile its texture to its own size.
function tiled(tex, rx, ry) {
  const t = tex.clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

scene.background = canvasTex(4, 512, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#486982');
  g.addColorStop(0.38, '#93a6ae');
  g.addColorStop(0.65, '#e9c6a1');
  g.addColorStop(1, '#d9bda5');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
});

scene.add(new THREE.HemisphereLight(0xb9d7ee, 0x645548, 1.05));
const sun = new THREE.DirectionalLight(0xffd5a3, 2.1);
sun.position.set(-18, 24, -24);
sun.target.position.set(0, 0, -10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 30, bottom: -30, near: 1, far: 80 });
scene.add(sun, sun.target);

// ---------- textures and materials (procedural placeholders) ----------

// Shared procedural art: no downloads, external services or extra loading time.
const roofTex = canvasTex(512, 512, (c) => {
  c.fillStyle = '#777a78'; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 24000; i++) {
    c.fillStyle = Math.random() < 0.5 ? 'rgba(27,35,36,.12)' : 'rgba(240,229,208,.16)';
    c.fillRect(rand(0, 512), rand(0, 512), rand(1, 3), rand(1, 3));
  }
  c.strokeStyle = '#565e5d'; c.lineWidth = 2;
  for (let i = 0; i <= 512; i += 128) {
    c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 512); c.stroke();
    c.beginPath(); c.moveTo(0, i); c.lineTo(512, i); c.stroke();
  }
  c.strokeStyle = 'rgba(226,217,196,.22)'; c.lineWidth = 1;
  for (let i = 3; i < 512; i += 128) c.strokeRect(i, i, 122, 122);
});

function sidingTex(color) {
  return canvasTex(256, 256, (c) => {
    c.fillStyle = color; c.fillRect(0, 0, 256, 256);
    c.fillStyle = 'rgba(0,0,0,.16)';
    for (let y = 0; y < 256; y += 16) {
      c.fillRect(0, y, 256, 1);
      for (let x = (y % 32 ? 16 : 0); x < 256; x += 32) c.fillRect(x, y, 1, 16);
    }
    for (const x of [30, 94, 158, 222]) for (const y of [35, 119, 203]) {
      c.fillStyle = '#3c4142'; c.fillRect(x - 20, y - 27, 40, 57);
      c.fillStyle = '#b4b0a4'; c.fillRect(x - 18, y - 25, 36, 52);
      c.fillStyle = Math.random() < .22 ? '#b59b72' : '#324c5a';
      c.fillRect(x - 15, y - 22, 30, 46);
      c.fillStyle = 'rgba(164,193,207,.3)'; c.fillRect(x - 14, y - 21, 12, 43);
      c.fillStyle = '#777f80'; c.fillRect(x - 1, y - 22, 2, 46);
      c.fillRect(x - 15, y, 30, 2);
      c.fillStyle = '#c0baab'; c.fillRect(x - 21, y + 26, 42, 4);
      if (Math.random() < .3) { c.fillStyle = '#818b89'; c.fillRect(x + 8, y + 12, 20, 15); }
    }
  });
}
const sidingTexs = ['#877566', '#a7977f', '#785b50', '#abb0a9', '#697c7d'].map(sidingTex);

const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85 }, o));
const roofMat = std({ map: roofTex, roughness: 0.95 });
const sidingMats = []; // every material that carries a siding texture (for facade.png swaps)
function sidingMat(i, rx, ry) {
  const m = std({ map: tiled(sidingTexs[i % sidingTexs.length], rx, ry) });
  sidingMats.push(m);
  return m;
}
const trackWallMats = sidingTexs.map((_, i) => sidingMat(i, 2, 10));
const trimMat = std({ color: 0xb9b5a8 });
const slateMat = std({ color: 0x3f4a5a, flatShading: true });
const chimneyMat = std({ color: 0x9a4b3c });
const planterMat = std({ color: 0x7a5233 });
const trunkMat = std({ color: 0x5b4030 });
const leafMats = [0x4f9a4a, 0x3f7f45, 0x6aa84f].map((color) => std({ color, flatShading: true }));
const flowerMats = [0xe86a8a, 0xf2c94c, 0xffffff].map((color) => std({ color }));

const unitBox = new THREE.BoxGeometry(1, 1, 1);
// Triangular prism: 1 wide, 1 tall, 1 long, base at y = 0, ridge along z.
const prismGeo = new THREE.CylinderGeometry(1, 1, 1, 3).rotateX(-Math.PI / 2).translate(0, 0.5, 0).scale(1 / 1.732, 1 / 1.5, 1);
const blobGeo = new THREE.IcosahedronGeometry(1, 1);
const trunkGeo = new THREE.CylinderGeometry(0.09, 0.12, 1, 8);

function shaped(geo, mat, w, h, d, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
const box = (mat, w, h, d, x, y, z) => shaped(unitBox, mat, w, h, d, x, y, z);
const prism = (mat, w, h, d, x, y, z) => shaped(prismGeo, mat, w, h, d, x, y, z);
const blob = (mat, r, x, y, z) => shaped(blobGeo, mat, r, r, r, x, y, z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ---------- rooftops (the track) and backdrop city ----------

const world = new THREE.Group();
scene.add(world);
const roofs = [];

// Detail stays beyond the playable lanes; it never changes collision bounds.
const equipmentMat = std({ color: 0x8b9999, metalness: .55, roughness: .55 });
const grilleMat = std({ color: 0x303e43, metalness: .35 });
const safetyMat = std({ color: 0xe4b85e, roughness: .85 });
const ductGeo = new THREE.CylinderGeometry(.16, .16, 1, 10);
function decorate(g, len) {
  for (const side of [-1, 1]) {
    for (let z = 4; z < len - 3; z += rand(7, 11)) {
      const x = side * 3.65;
      if (Math.random() < .65) {
        g.add(box(equipmentMat, .65, .65, 1.25, x, .34, -z));
        for (let i = 0; i < 5; i++) g.add(box(grilleMat, .52, .035, .05, x, .68, -z - .4 + i * .2));
        g.add(box(grilleMat, .04, .4, 1.05, x - side * .33, .35, -z));
      } else {
        g.add(shaped(ductGeo, equipmentMat, 1, .9, 1, x, .45, -z));
        g.add(box(equipmentMat, .48, .09, .48, x, .94, -z));
      }
    }
    // Edge stripes and drainage channel emphasize the roof silhouette.
    g.add(box(grilleMat, .08, .025, len - 1, side * 3.35, .015, -len / 2));
    for (let z = 1; z < len - 1; z += 3) g.add(box(safetyMat, .12, .012, 1, side * 3.18, .015, -z));
  }
  for (const z of [-.22, -len + .22]) {
    for (let x = -3; x <= 3; x += .5) {
      const stripe = box(safetyMat, .22, .016, .3, x, .018, z);
      stripe.rotation.y = -.35; g.add(stripe);
    }
  }
}

// A roof is a group whose local z = 0 is its near edge; it extends to z = -len.
function spawnRoof(first) {
  const last = roofs[roofs.length - 1];
  const len = first ? 62 : rand(26, 48) + speed * 1.5;
  const g = new THREE.Group();
  g.position.z = last ? last.position.z - last.userData.len - rand(3, 4.8) : 12;
  const top = roofMat.clone();
  top.map = tiled(roofMat.map, 4, len / 2);
  const wall = pick(trackWallMats);
  g.userData = { len, top, obstacles: [], items: [] };
  const body = box([wall, wall, top, wall, wall, wall], ROOF_W, 60, len, 0, -30, -len / 2);
  body.castShadow = false;
  g.add(body);
  for (const s of [-1, 1]) g.add(box(trimMat, 0.3, 0.45, len, s * (ROOF_W / 2 - 0.15), 0.225, -len / 2));
  g.add(box(trimMat, ROOF_W + 0.3, 0.5, len + 0.3, 0, -0.5, -len / 2));
  decorate(g, len);
  for (const p of populators) p(g, first);
  world.add(g);
  roofs.push(g);
}
function dropRoof(r) {
  world.remove(r);
  r.userData.top.map.dispose();
  r.userData.top.dispose();
}

// Three depth bands of city blocks, with pooled meshes recycled by the loop.
const city = [];
for (let i = 0; i < 84; i++) {
  const band = Math.floor(i / 28), w = rand(7, 14), d = rand(9, 18);
  const top = band === 0 ? rand(-10, 9) : rand(8, 44), h = top + 48;
  const b = new THREE.Group();
  const facade = sidingMat(i, Math.max(1, Math.round(w / 6)), Math.round(h / 9));
  b.add(box(facade, w, h, d, 0, top - h / 2, 0),
    box(trimMat, w + .5, .45, d + .5, 0, top + .2, 0),
    box(roofMat, w - .4, .08, d - .4, 0, top + .47, 0));
  for (const side of [-1, 1]) b.add(box(trimMat, .22, .65, d, side * w / 2, top + .6, 0));
  // Mechanical penthouse and vent bank, with occasional aerial.
  b.add(box(equipmentMat, w * .35, 1.6, d * .3, 0, top + 1.2, 0));
  for (let j = 0; j < 3; j++) b.add(box(grilleMat, .8, .35, 1.5, -w * .3 + j, top + .7, d * .3));
  if (i % 4 === 0) {
    b.add(box(grilleMat, .09, 6, .09, w * .3, top + 3.4, 0));
    b.add(box(equipmentMat, 2.5, .06, .07, w * .3, top + 5, 0));
  }
  // Floor cornices break up otherwise flat walls.
  for (let y = top - 7; y > -40; y -= 9) b.add(box(trimMat, w + .12, .12, d + .12, 0, y, 0));
  b.traverse((m) => { m.castShadow = m.receiveShadow = false; });
  b.position.set((i % 2 ? 1 : -1) * (13 + band * 27 + rand(0, 12)), 0, 40 - (i % 28) * 12);
  scene.add(b); city.push(b);
}
const water = new THREE.Mesh(new THREE.PlaneGeometry(750, 750), std({ color: 0x414d50, roughness: 1 }));
water.rotation.x = -Math.PI / 2; water.position.y = -43; scene.add(water);

// ---------- game state and loop ----------

// state: title | playing | falling | crash | over | paused
let state = 'title', speed = 12, dist = 0, last = 0;

function reset() {
  roofs.splice(0).forEach(dropRoof);
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
    if (roofs[0].position.z - roofs[0].userData.len > 14) dropRoof(roofs.shift());
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
let faceImg = null;     // what is painted now: custom photo, default face, or nothing
let defaultFace = null; // assets/characters/face.png, when present

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
  if (!src) { faceImg = defaultFace; look.face = null; store.set('swipecity.look', look); return paintFace(); }
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
// Tailored silhouette: hood, backpack, straps, cuffs and layered trainers.
const fabricMat = std({ color: 0x34464c, roughness: .98 });
const seamMat = std({ color: 0xd3ccae, roughness: .85 });
part(capsule(.15, .18), fabricMat, torso, 0, .36, -.17).scale.set(1.15, 1, .65);
part(new THREE.TorusGeometry(.13, .045, 8, 20), topMat, torso, 0, .65, -.015).rotation.x = Math.PI / 2;
for (const side of [-1, 1]) {
  const strap = part(unitBox, fabricMat, torso, side * .14, .39, .16);
  strap.scale.set(.045, .42, .035);
  part(new THREE.SphereGeometry(.046, 12, 8), skinMat, torso, side * .2, .93, 0);
}
const zip = part(unitBox, seamMat, torso, 0, .36, -.28); zip.scale.set(.012, .25, .012);
for (const leg of [legL, legR]) {
  const sole = part(unitBox, fabricMat, leg.knee, 0, -.46, .05); sole.scale.set(.145, .035, .29);
  for (let i = 0; i < 3; i++) {
    const lace = part(unitBox, seamMat, leg.knee, 0, -.365, .06 + i * .045);
    lace.scale.set(.09, .012, .014);
  }
}


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
  body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, state === 'playing' ? -(pl.lane * LANE - pl.x) * .09 : 0, k);
  body.position.y = pose[9];

  // On the title screen the runner faces the camera up close; in play we follow from behind.
  const title = state === 'title', ck = Math.min(1, dt * 5);
  runner.position.set(pl.x, pl.y, 0);
  runner.rotation.y += ((title ? 0 : Math.PI) - runner.rotation.y) * Math.min(1, dt * 8);
  camera.position.lerp(title ? v3.set(0, 1.6, 2.7) : v3.set(pl.x * 0.5, 4.1 + (state === 'playing' && pl.y === 0 && !pl.slide ? Math.sin(phase * 2) * .018 : 0), 7.5), ck);
  camLook.lerp(title ? v3.set(0, 1.15, 0) : v3.set(pl.x * 0.3, 1.2, -8), ck);
  camera.lookAt(camLook);
});

// Soft contact shadow anchors the feet even on devices with coarse shadow maps.
const contactTex = canvasTex(64, 64, (c) => {
  const gradient = c.createRadialGradient(32, 32, 2, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(12,22,28,.45)');
  gradient.addColorStop(1, 'rgba(12,22,28,0)');
  c.fillStyle = gradient; c.fillRect(0, 0, 64, 64);
});
const contactMat = new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), contactMat);
contact.rotation.x = -Math.PI / 2; scene.add(contact);
updates.push(() => {
  contact.position.set(pl.x, .025, 0);
  contact.visible = state !== 'falling' && state !== 'over';
  contactMat.opacity = Math.max(.08, 1 - pl.y * .25);
  contact.scale.setScalar(1 + Math.max(0, pl.y) * .15);
});

// ---------- obstacles, coins, power-ups ----------

const metalMat = std({ color: 0xb9bec4, roughness: 0.5, metalness: 0.4 });
const darkMat = std({ color: 0x2c2f36 });
const tankMat = std({ color: 0x7a4f36 });
const hutMat = std({ color: 0xe6dcc8 });
const doorMat = std({ color: 0xb5483a });
const billTex = canvasTex(128, 128, (c, w, h) => {
  c.fillStyle = '#1f7a8c'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#ffd166'; c.beginPath(); c.arc(40, 78, 30, 0, 7); c.fill();
  c.fillStyle = '#ef476f'; c.fillRect(74, 24, 38, 82);
});
const billMat = std({ map: billTex });
const pipeGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.9, 16).rotateZ(Math.PI / 2);
const fanGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.06, 20);
const tankGeo = new THREE.CylinderGeometry(0.85, 0.85, 2, 20);
const coneGeo = new THREE.ConeGeometry(0.95, 0.5, 20);

function group(...meshes) {
  const g = new THREE.Group();
  for (const m of meshes) { m.castShadow = true; g.add(m); }
  return g;
}
function at(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

// Two looks per type. low = jump over, high = slide under, block = change lane.
const OBSTACLES = {
  low: [
    () => group(box(metalMat, 1.7, 0.75, 1, 0, 0.375, 0), at(fanGeo, darkMat, 0, 0.77, 0)),
    () => group(box(chimneyMat, 1.8, 0.68, 0.45, 0, 0.34, 0), box(metalMat, 1.9, 0.08, 0.55, 0, 0.72, 0)),
  ],
  high: [
    () => group(box(darkMat, 0.12, 2.6, 0.12, -0.88, 1.3, 0), box(darkMat, 0.12, 2.6, 0.12, 0.88, 1.3, 0),
      box(billMat, 1.9, 1.3, 0.12, 0, 1.87, 0)),
    () => group(box(darkMat, 0.12, 2.2, 0.12, -0.88, 1.1, 0), box(darkMat, 0.12, 2.2, 0.12, 0.88, 1.1, 0),
      at(pipeGeo, metalMat, 0, 1.52, 0), at(pipeGeo, metalMat, 0, 2.15, 0)),
  ],
  block: [
    () => group(box(darkMat, 1.5, 0.5, 1.5, 0, 0.25, 0), at(tankGeo, tankMat, 0, 1.5, 0), at(coneGeo, darkMat, 0, 2.75, 0)),
    () => group(box(hutMat, 1.8, 2.6, 1.6, 0, 1.3, 0), box(doorMat, 0.7, 1.6, 0.06, 0, 0.8, 0.81),
      box(trimMat, 1.95, 0.12, 1.75, 0, 2.2, 0), prism(slateMat, 2.1, 0.75, 1.9, 0, 2.6, 0)),
  ],
};
// Vertical span [y0, y1] the player's body must not overlap.
const SPAN = { low: [0, 0.78], high: [1.15, 3.2], block: [0, 3.2] };

const coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.07, 20).rotateX(Math.PI / 2);
const coinMat = std({ color: 0xffc933, roughness: 0.35, metalness: 0.5, emissive: 0x6b4500 });
const magnetGeo = new THREE.TorusGeometry(0.3, 0.11, 10, 20, Math.PI);
const magnetMat = std({ color: 0xe53935, emissive: 0x5a0e0c });
const shieldGeo = new THREE.IcosahedronGeometry(0.36, 1);
const shieldMat = std({ color: 0x4fc3f7, emissive: 0x0b3a55, flatShading: true });
const ITEMS = {
  coin: () => at(coinGeo, coinMat, 0, 0, 0),
  magnet: () => at(magnetGeo, magnetMat, 0, 0, 0),
  shield: () => at(shieldGeo, shieldMat, 0, 0, 0),
};

// A fixed particle pool keeps repeated collections allocation-free.
const sparkGeo = new THREE.SphereGeometry(.035, 5, 4);
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd784 });
const sparks = Array.from({ length: 36 }, () => {
  const m = new THREE.Mesh(sparkGeo, sparkMat); m.visible = false; scene.add(m);
  return { m, life: 0, vx: 0, vy: 0, vz: 0 };
});
let nextSpark = 0;
function collectBurst(x, y, z) {
  for (let i = 0; i < 6; i++) {
    const p = sparks[nextSpark++ % sparks.length];
    p.m.position.set(x, y, z); p.life = .35; p.m.visible = true;
    p.vx = rand(-1.5, 1.5); p.vy = rand(1, 3); p.vz = rand(-1, 1);
  }
}
resets.push(() => sparks.forEach(p => { p.life = 0; p.m.visible = false; }));
updates.push((dt) => {
  for (const p of sparks) {
    if (p.life <= 0) continue;
    p.life -= dt; p.m.visible = p.life > 0;
    p.vy -= dt * 8;
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    p.m.scale.setScalar(Math.max(0, p.life / .35));
  }
});

function addObstacle(g, type, lane, z) {
  const m = OBSTACLES[type][Math.random() < 0.5 ? 0 : 1]();
  m.position.set(lane * LANE, 0, z);
  g.add(m);
  g.userData.obstacles.push({ type, x: lane * LANE, z, m });
}
function addItem(g, type, lane, z, y) {
  const m = ITEMS[type]();
  m.castShadow = true;
  m.position.set(lane * LANE, y, z);
  g.add(m);
  g.userData.items.push({ type, x: lane * LANE, z, y, m });
}

// Rows of obstacles along each roof. Every row is passable: either one lane is left
// empty, or the whole row is the same low/high obstacle (jump or slide through).
populators.push((g, first) => {
  // A jump covers about 0.67 * speed, so keep rows that far from both roof edges:
  // otherwise a gap jump lands on a row, or a jump over a row lands in the gap.
  const sp = speed + 3, edge = sp * 0.75;
  for (let z = first ? 32 : 6 + edge; z < g.userData.len - 4 - edge; z += 11 + sp * 0.5 + rand(0, 5)) {
    const safe = Math.floor(rand(-1, 2));
    const wall = Math.random() < 0.22 ? (Math.random() < 0.5 ? 'low' : 'high') : null;
    for (let l = -1; l <= 1; l++) {
      if (wall) addObstacle(g, wall, l, -z);
      else if (l !== safe && Math.random() < 0.75) addObstacle(g, ['low', 'high', 'block'][Math.floor(rand(0, 3))], l, -z);
    }
    if (Math.random() < 0.1) addItem(g, Math.random() < 0.5 ? 'magnet' : 'shield', safe, -(z - 4), 1);
    else for (let i = 0; i < 5; i++) {
      const y = wall === 'low' ? [1, 1, 1.5, 2, 1.5][i] : wall === 'high' ? 0.45 : 1;
      addItem(g, 'coin', safe, -(z - 5 + i * 1.5), y);
    }
  }
});

let coins = 0, shield = false, magnet = 0, crashT = 0, best = store.get('swipecity.best', 0), newBest = false;
const score = () => Math.floor(dist) + coins * 10;
resets.push(() => { coins = 0; shield = false; magnet = 0; newBest = false; });
overHooks.push(() => {
  newBest = score() > best;
  if (newBest) { best = score(); store.set('swipecity.best', best); }
});

const bubble = at(new THREE.SphereGeometry(1.05, 20, 14),
  new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.25, depthWrite: false }), 0, 0.95, 0);
runner.add(bubble);

updates.push((dt, t) => {
  bubble.visible = shield;
  magnet = Math.max(0, magnet - dt);
  if (state === 'crash' && (crashT -= dt) <= 0) gameOver();
  const height = pl.slide > 0 ? 0.8 : 1.7;
  for (const r of roofs) {
    for (const it of r.userData.items) {
      if (it.gone) continue;
      it.m.rotation.y = t * 4;
      if (state !== 'playing') continue;
      const dz = Math.abs(r.position.z + it.z), dx = Math.abs(it.x - pl.x);
      const pulled = magnet > 0 && it.type === 'coin' && dz < 3.5 && dx < 5;
      if (pulled || (dz < 0.7 && dx < 0.8 && it.y > pl.y - 0.3 && it.y < pl.y + height + 0.3)) {
        it.gone = true;
        it.m.visible = false;
        if (it.type === 'coin') { coins++; collectBurst(it.x, it.y, r.position.z + it.z); }
        else if (it.type === 'magnet') magnet = 8;
        else shield = true;
      }
    }
    if (state !== 'playing') continue;
    for (const o of r.userData.obstacles) {
      if (o.gone || Math.abs(r.position.z + o.z) > 0.55 || Math.abs(o.x - pl.x) > 1) continue;
      if (pl.y >= SPAN[o.type][1] || pl.y + height <= SPAN[o.type][0]) continue;
      if (shield) { shield = false; o.gone = true; o.m.visible = false; }
      else { state = 'crash'; crashT = 0.9; }
    }
  }
});

// ---------- screens, HUD, pause, touch, share ----------

const $ = (id) => document.getElementById(id);
let shown = null;

updates.push(() => {
  if (shown !== state) {
    shown = state;
    $('title').hidden = state !== 'title';
    $('over').hidden = state !== 'over';
    $('paused').hidden = state !== 'paused';
    $('hud').hidden = state === 'title' || state === 'over';
    if (state === 'over') {
      $('final').textContent = `${Math.floor(dist).toLocaleString()}m · ${coins} coins · score ${score().toLocaleString()}`;
      $('bestLine').textContent = newBest ? 'New best!' : `Best ${best.toLocaleString()}`;
      $('share').textContent = 'Share score';
    }
    if (document.activeElement) document.activeElement.blur(); // keep Space/Enter off hidden buttons
  }
  $('dist').textContent = Math.floor(dist).toLocaleString() + 'm';
  $('coins').textContent = coins;
  $('power').textContent = [shield && 'Shield', magnet > 0 && `Magnet ${Math.ceil(magnet)}s`].filter(Boolean).join(' · ');
});

function pause() { if (state === 'playing') state = 'paused'; }
function resume() { if (state === 'paused') state = 'playing'; }
$('play').onclick = $('again').onclick = start;
$('home').onclick = () => { reset(); state = 'title'; };
$('pauseBtn').onclick = pause;
$('resume').onclick = resume;
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') (state === 'paused' ? resume : pause)();
});

$('share').onclick = () => {
  const text = `I ran ${Math.floor(dist).toLocaleString()}m in Swipe City 🏙️ — can you beat me?`;
  const url = location.href;
  if (navigator.share) return navigator.share({ text, url }).catch(() => {});
  const say = (msg) => { $('share').textContent = msg; };
  if (!navigator.clipboard) return say('Sharing not supported');
  navigator.clipboard.writeText(`${text} ${url}`).then(() => say('Copied!'), () => say('Copy failed'));
};

// One action per swipe, fired as soon as the finger has moved far enough.
let touch = null;
addEventListener('touchstart', (e) => { touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
addEventListener('touchmove', (e) => {
  if (state === 'playing') e.preventDefault();
  if (!touch) return;
  const dx = e.touches[0].clientX - touch.x, dy = e.touches[0].clientY - touch.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
  act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'slide' : 'jump'));
  touch = null;
}, { passive: false });

// Customize panel
for (const k of ['skin', 'hair', 'top', 'pants']) {
  const el = $('c-' + k);
  el.value = look[k];
  el.oninput = () => { look[k] = el.value; applyLook(); store.set('swipecity.look', look); };
}
$('facePhoto').onchange = (e) => {
  const f = e.target.files[0];
  if (f && f.type.startsWith('image/')) setFaceImage(URL.createObjectURL(f), true);
};
$('faceClear').onclick = () => { $('facePhoto').value = ''; setFaceImage(null); };

// ---------- optional art: files dropped into assets/ replace the placeholders ----------
// File names must match ASSETS.md. Missing files are ignored and the placeholder stays.
// ponytail: textures only load over http(s) (browsers block WebGL textures from file://),
// so opening index.html directly always shows placeholders. GLB models are not wired yet;
// add GLTFLoader when a real model exists.

function useTexture(path, apply) {
  if (location.protocol === 'file:') return;
  new THREE.TextureLoader().load(path, (t) => {
    t.encoding = THREE.sRGBEncoding;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    apply(t);
  }, undefined, () => {});
}
const setMap = (mat, t) => { mat.map = t; mat.needsUpdate = true; };

useTexture('assets/world/roof.png', (t) => {
  const previous = roofMat.map;
  setMap(roofMat, t);
  for (const r of roofs) {
    r.userData.top.map.dispose();
    setMap(r.userData.top, tiled(t, 4, r.userData.len / 2));
  }
  previous.dispose();
});
useTexture('assets/world/facade.png', (t) => {
  for (const m of sidingMats) setMap(m, tiled(t, m.map.repeat.x, m.map.repeat.y));
});
useTexture('assets/world/sky.png', (t) => { scene.background = t; });
useTexture('assets/world/billboard.png', (t) => setMap(billMat, t));

const logoIm = new Image();
logoIm.onload = () => { $('logo').src = logoIm.src; $('logo').hidden = false; $('logoText').hidden = true; };
logoIm.src = 'assets/ui/logo.png';

if (location.protocol !== 'file:') {
  const f = new Image();
  f.onload = () => { defaultFace = f; if (!look.face) { faceImg = f; paintFace(); } };
  f.src = 'assets/characters/face.png';
}
