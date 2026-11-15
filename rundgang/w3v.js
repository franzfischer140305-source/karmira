/* KARMIRA 3D-Produktansicht: Möbel als scharfes 3D-Modell drehen und zoomen */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let R, S, cam, ctl, box, cv, group, raf = 0, open = false, sun;
const gl = new GLTFLoader(), cache = {};

function setup() {
  box = document.createElement('div'); box.className = 'w3v'; box.hidden = true;
  box.innerHTML = `<div class="w3vbg"></div><div class="w3vwin"><canvas></canvas><div class="w3vload"><i></i></div>
    <div class="w3vtop"><small></small><b></b></div><button class="w3vx" type="button" aria-label="Schließen">×</button>
    <div class="w3vhint">Ziehen zum Drehen · Scrollen bzw. zwei Finger zum Zoomen</div><div class="w3vbtn"></div></div>`;
  document.body.appendChild(box);
  cv = box.querySelector('canvas');
  R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  S = new THREE.Scene();
  S.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), 0.04).texture;
  S.environmentIntensity = 0.9;
  sun = new THREE.DirectionalLight(0xfff1dc, 2.2); sun.position.set(2.5, 4, 2); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 6; sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 12 });
  S.add(sun);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.ShadowMaterial({ opacity: 0.28 }));
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; S.add(fl);
  cam = new THREE.PerspectiveCamera(35, 1, 0.02, 60);
  ctl = new OrbitControls(cam, cv);
  Object.assign(ctl, { enableDamping: true, dampingFactor: 0.08, enablePan: false, autoRotate: true, autoRotateSpeed: 0.8, maxPolarAngle: Math.PI * 0.49, minPolarAngle: 0.15 });
  ctl.addEventListener('start', () => { ctl.autoRotate = false; box.classList.add('used'); });
  box.querySelector('.w3vx').onclick = close; box.querySelector('.w3vbg').onclick = close;
  addEventListener('keydown', e => { if (open && e.key === 'Escape') close(); });
  addEventListener('resize', () => open && size());
}
function size() { const w = cv.clientWidth, h = cv.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
function loop() { raf = requestAnimationFrame(loop); ctl.update(); R.render(S, cam); }
async function part(p) {
  cache[p.u] = cache[p.u] || gl.loadAsync(p.u);
  const m = (await cache[p.u]).scene.clone(true);
  m.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.material && o.material.map) o.material.map.anisotropy = 8; } });
  const b = new THREE.Box3().setFromObject(m), s = b.getSize(new THREE.Vector3()), k = p.w / Math.max(s.x, s.z);
  m.scale.setScalar(k); const b2 = new THREE.Box3().setFromObject(m), c = b2.getCenter(new THREE.Vector3());
  const g = new THREE.Group(); m.position.set(-c.x, -b2.min.y, -c.z); g.add(m);
  g.position.set(...(p.p || [0, 0, 0])); g.rotation.y = p.r || 0; return g;
}
export async function show3D(parts, info) {
  if (!R) setup();
  box.hidden = false; open = true; document.documentElement.classList.add('w3vopen');
  box.classList.remove('used'); box.classList.add('loading');
  box.querySelector('.w3vtop small').textContent = info.sub || ''; box.querySelector('.w3vtop b').textContent = info.name || '';
  box.querySelector('.w3vbtn').innerHTML = info.href ? `<a class="btn btn-primary" href="${info.href}">Ansehen &amp; anfragen</a>` : '';
  size(); cancelAnimationFrame(raf); loop();
  if (group) { S.remove(group); group = null; }
  try {
    const g = new THREE.Group(); (await Promise.all(parts.map(part))).forEach(x => g.add(x));
    group = g; S.add(g);
    const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const d = Math.max(s.x, s.z, s.y * 1.6) * 1.9;
    ctl.target.set(c.x, s.y * 0.42, c.z); cam.position.set(c.x + d * 0.62, s.y * 0.42 + d * 0.42, c.z + d * 0.78);
    ctl.minDistance = d * 0.28; ctl.maxDistance = d * 2.2; ctl.autoRotate = true; ctl.update();
    sun.shadow.camera.left = sun.shadow.camera.bottom = -Math.max(s.x, s.z); sun.shadow.camera.right = sun.shadow.camera.top = Math.max(s.x, s.z); sun.shadow.camera.updateProjectionMatrix();
  } catch (e) { box.querySelector('.w3vtop small').textContent = '3D-Modell konnte nicht geladen werden'; }
  box.classList.remove('loading');
}
export function close() { if (!box) return; box.hidden = true; open = false; cancelAnimationFrame(raf); document.documentElement.classList.remove('w3vopen'); }
