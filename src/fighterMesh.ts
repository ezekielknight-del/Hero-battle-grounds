import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { CharacterDef } from './characters';
import { addOutlines, toon } from './toon';

export interface FighterVisual {
  root: THREE.Group;
  body: THREE.Group;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  aura: THREE.Object3D;
  shield: THREE.Mesh;
  ice: THREE.Mesh;
  label: THREE.Sprite;
  setLabel(name: string, hp: number, maxHp: number, isYou: boolean): void;
  dispose(): void;
}

const rbox = (w: number, h: number, d: number, r = 0.08) =>
  new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.2, h / 2.2, d / 2.2));

const sphere = (r: number) => new THREE.SphereGeometry(r, 22, 16);

function part(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function add(parent: THREE.Object3D, mesh: THREE.Object3D) {
  parent.add(mesh);
  return mesh;
}

/** Big cartoon eye: white oval, dark pupil, small shine. */
function eye(parent: THREE.Object3D, x: number, y: number, z: number, s = 1, look = 0) {
  const white = add(parent, part(sphere(0.16 * s), toon(0xfffdf8), x, y, z));
  white.scale.set(1, 1.25, 0.55);
  add(parent, part(sphere(0.075 * s), toon(0x1a1426), x + look, y - 0.01 * s, z + 0.07 * s));
  add(parent, part(sphere(0.035 * s), toon(0xffffff), x + look + 0.04 * s, y + 0.04 * s, z + 0.1 * s));
}

function leg(x: number, hip: number, thigh: number, bootH: number, thighMat: THREE.Material, bootMat: THREE.Material) {
  const pivot = new THREE.Group();
  pivot.position.set(x, hip, 0);
  pivot.add(part(rbox(0.34, thigh, 0.36, 0.1), thighMat, 0, -thigh / 2, 0));
  pivot.add(part(rbox(0.46, bootH, 0.62, 0.12), bootMat, 0, -thigh - bootH / 2 + 0.02, 0.06));
  return pivot;
}

function arm(x: number, shoulder: number, len: number, thick: number, mat: THREE.Material, hand: THREE.Material) {
  const pivot = new THREE.Group();
  pivot.position.set(x, shoulder, 0);
  pivot.add(part(rbox(thick, len, thick * 0.9, thick * 0.35), mat, 0, -len / 2, 0));
  pivot.add(part(sphere(thick * 0.62), hand, 0, -len - thick * 0.15, 0));
  return pivot;
}

interface Built {
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  labelY: number;
}

function buildFrost(body: THREE.Group): Built {
  const snow = toon(0xf7fbff);
  const cap = toon(0x2f74ff);
  const capDark = toon(0x1d4ed8);
  const red = toon(0xe23b4a);
  const yellow = toon(0xffd23a);
  const boot = toon(0x173a8a);
  const legL = leg(-0.26, 0.7, 0.34, 0.28, cap, boot);
  const legR = leg(0.26, 0.7, 0.34, 0.28, cap, boot);
  body.add(part(sphere(0.9), snow, 0, 1.45, 0));
  body.add(part(rbox(0.7, 0.55, 0.16, 0.08), cap, 0, 1.12, 0.82));
  body.add(part(rbox(0.36, 0.2, 0.08, 0.04), capDark, 0, 1.0, 0.9));
  body.add(part(sphere(0.08), yellow, -0.16, 1.22, 0.92));
  body.add(part(sphere(0.08), yellow, 0.16, 1.22, 0.92));
  for (const s of [-1, 1]) {
    const wing = part(sphere(0.15), red, 0.2 * s, 1.42, 0.86);
    wing.scale.set(1.4, 0.75, 0.5);
    body.add(wing);
  }
  body.add(part(sphere(0.09), red, 0, 1.42, 0.96));
  eye(body, -0.26, 1.72, 0.78, 1.25);
  eye(body, 0.26, 1.72, 0.78, 1.25);
  const mouth = part(sphere(0.12), toon(0x1a1426), 0, 1.48, 0.84);
  mouth.scale.set(0.9, 0.7, 0.4);
  body.add(mouth);
  body.add(part(new THREE.CylinderGeometry(0.78, 0.78, 0.12, 24), cap, 0, 2.18, 0));
  const dome = part(sphere(0.66), cap, 0, 2.38, 0);
  dome.scale.y = 0.7;
  body.add(dome);
  body.add(part(sphere(0.16), toon(0x9ad7ff, 0x9ad7ff, 0.4), 0, 2.68, 0.08));
  const armL = arm(-0.98, 1.5, 0.42, 0.3, snow, toon(0xdbeafe));
  const armR = arm(0.98, 1.5, 0.42, 0.3, snow, toon(0xdbeafe));
  armR.add(part(sphere(0.2), snow, 0.05, -0.78, 0.15));
  return { legL, legR, armL, armR, labelY: 3.35 };
}

function buildBlaze(body: THREE.Group): Built {
  const skin = toon(0xe8924a);
  const mask = toon(0x2a6bff);
  const red = toon(0xdc2626);
  const boot = toon(0x1e3a8a);
  const gold = toon(0xf5c542);
  const legL = leg(-0.28, 0.95, 0.48, 0.34, skin, boot);
  const legR = leg(0.28, 0.95, 0.48, 0.34, skin, boot);
  body.add(part(rbox(1.3, 1.0, 0.78, 0.22), skin, 0, 1.5, 0));
  for (const s of [-1, 1]) body.add(part(sphere(0.28), skin, 0.28 * s, 1.72, 0.28));
  body.add(part(rbox(1.15, 0.22, 0.82, 0.08), red, 0, 1.05, 0));
  body.add(part(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16), gold, 0, 1.05, 0.42));
  const head = part(sphere(0.58), mask, 0, 2.28, 0);
  head.scale.set(1.05, 0.95, 1);
  body.add(head);
  for (const s of [-1, 1]) {
    const ring = part(new THREE.TorusGeometry(0.16, 0.045, 8, 18), red, 0.24 * s, 2.34, 0.46);
    body.add(ring);
    eye(body, 0.24 * s, 2.34, 0.5, 0.85);
  }
  const grin = part(rbox(0.55, 0.16, 0.08, 0.05), toon(0xfffdf8), 0, 2.02, 0.5);
  body.add(grin);
  for (let i = 0; i < 4; i++) body.add(part(rbox(0.02, 0.16, 0.02, 0.01), toon(0x1a1426), -0.18 + i * 0.12, 2.02, 0.55));
  const armL = arm(-0.95, 1.9, 0.7, 0.38, skin, boot);
  const armR = arm(0.95, 1.9, 0.7, 0.38, skin, boot);
  return { legL, legR, armL, armR, labelY: 3.55 };
}

function buildVerdant(body: THREE.Group): Built {
  const green = toon(0x3dce4a);
  const dark = toon(0x249636);
  const orange = toon(0xf08a2a);
  const red = toon(0xef4444);
  const pink = toon(0xff7aa2);
  const legL = leg(-0.22, 0.48, 0.22, 0.2, dark, toon(0x166534));
  const legR = leg(0.22, 0.48, 0.22, 0.2, dark, toon(0x166534));
  const cactus = part(sphere(0.78), green, 0, 1.45, 0);
  cactus.scale.set(1.15, 1.45, 1);
  body.add(cactus);
  body.add(part(new THREE.CylinderGeometry(0.72, 0.78, 0.38, 20), orange, 0, 0.78, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const spike = part(new THREE.ConeGeometry(0.06, 0.28, 5), dark, Math.cos(a) * 0.9, 1.15 + (i % 3) * 0.35, Math.sin(a) * 0.78);
    spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a), 0.15, Math.sin(a)).normalize());
    body.add(spike);
  }
  body.add(part(sphere(0.22), red, 0, 2.62, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const petal = part(sphere(0.2), pink, Math.cos(a) * 0.28, 2.66, Math.sin(a) * 0.28);
    petal.scale.set(1.4, 0.65, 0.85);
    body.add(petal);
  }
  eye(body, -0.28, 1.7, 0.72, 1.5);
  eye(body, 0.28, 1.7, 0.72, 1.5);
  const mouth = part(sphere(0.16), toon(0x14532d), 0, 1.38, 0.74);
  mouth.scale.set(1.3, 1, 0.4);
  body.add(mouth);
  const armL = arm(-0.95, 1.55, 0.36, 0.22, green, green);
  const armR = arm(0.95, 1.55, 0.36, 0.22, green, green);
  return { legL, legR, armL, armR, labelY: 3.4 };
}

function buildTide(body: THREE.Group): Built {
  const shirt = toon(0xfff3e4);
  const vest = toon(0xe23b4a);
  const pants = toon(0x4a372c);
  const boot = toon(0x6b4423);
  const hat = toon(0xf0b429);
  const housing = toon(0x6d5bd0);
  const orange = toon(0xe07020);
  const legL = leg(-0.24, 0.9, 0.46, 0.32, pants, boot);
  const legR = leg(0.24, 0.9, 0.46, 0.32, pants, boot);
  body.add(part(rbox(1.05, 0.9, 0.7, 0.16), vest, 0, 1.4, 0));
  body.add(part(rbox(0.42, 0.72, 0.1, 0.04), shirt, 0, 1.42, 0.32));
  body.add(part(sphere(0.1), toon(0xf5c542), 0, 1.12, 0.4));
  body.add(part(new THREE.CylinderGeometry(0.55, 0.58, 0.62, 20), housing, 0, 2.12, 0));
  body.add(part(sphere(0.28), toon(0xf5d90a), 0, 2.16, 0.4));
  body.add(part(sphere(0.12), toon(0x1a1426), 0, 2.14, 0.6));
  body.add(part(sphere(0.18), orange, 0, 1.88, 0.48));
  for (const s of [-1, 1]) {
    const m = part(sphere(0.26), orange, 0.28 * s, 1.78, 0.36);
    m.scale.set(1.5, 0.65, 0.75);
    m.rotation.z = -0.5 * s;
    body.add(m);
  }
  const bun = part(sphere(0.5), hat, 0, 2.55, 0);
  bun.scale.set(1.15, 0.62, 1.15);
  body.add(bun);
  const armL = arm(-0.78, 1.7, 0.55, 0.28, shirt, toon(0xf0c29c));
  const armR = arm(0.78, 1.7, 0.55, 0.28, shirt, toon(0xf0c29c));
  const bottle = new THREE.Group();
  bottle.position.set(0.12, -0.95, 0.12);
  bottle.rotation.z = 0.15;
  bottle.add(part(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 12), toon(0xf08a2a), 0, 0.2, 0));
  bottle.add(part(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12), toon(0xfff3e4), 0, 0.05, 0));
  bottle.add(part(new THREE.CylinderGeometry(0.07, 0.09, 0.18, 10), toon(0xf0b429), 0, 0.62, 0));
  armR.add(bottle);
  return { legL, legR, armL, armR, labelY: 3.6 };
}

function buildTurbo(body: THREE.Group): Built {
  const gold = toon(0xf0c43a);
  const dark = toon(0xb8860b);
  const screen = toon(0x10244d);
  const glow = toon(0x7af0ff, 0x7af0ff, 0.9);
  const red = toon(0xe23b4a);
  const legL = leg(-0.28, 0.62, 0.28, 0.26, dark, toon(0x3f3f46));
  const legR = leg(0.28, 0.62, 0.28, 0.26, dark, toon(0x3f3f46));
  body.add(part(rbox(1.35, 1.35, 1.05, 0.2), gold, 0, 1.5, 0));
  body.add(part(rbox(0.18, 1.15, 0.08, 0.04), dark, 0, 1.5, 0.52));
  body.add(part(rbox(0.95, 0.55, 0.08, 0.06), screen, 0, 1.7, 0.56));
  for (const s of [-1, 1]) {
    const brow = part(rbox(0.32, 0.09, 0.06, 0.03), glow, 0.24 * s, 1.88, 0.62);
    brow.rotation.z = -0.35 * s;
    body.add(brow);
    body.add(part(sphere(0.12), glow, 0.22 * s, 1.68, 0.62));
  }
  body.add(part(sphere(0.11), red, -0.2, 1.22, 0.56));
  body.add(part(sphere(0.11), red, 0.2, 1.22, 0.56));
  body.add(part(rbox(0.12, 0.22, 0.06, 0.03), toon(0x1a1426), 0.46, 1.32, 0.54));
  const armL = arm(-0.95, 1.7, 0.55, 0.32, gold, gold);
  const armR = new THREE.Group();
  armR.position.set(0.95, 1.7, 0);
  armR.add(part(rbox(0.3, 0.4, 0.3, 0.1), gold, 0, -0.2, 0));
  const barrel = part(new THREE.CylinderGeometry(0.14, 0.18, 0.7, 12), toon(0x3b82f6), 0, -0.55, 0.15);
  barrel.rotation.x = Math.PI / 2.4;
  armR.add(barrel);
  armR.add(part(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 10), glow, 0, -0.7, 0.38));
  return { legL, legR, armL, armR, labelY: 2.95 };
}

function buildGale(body: THREE.Group): Built {
  const skin = toon(0xf6d7c3);
  const hair = toon(0x1a1a2e);
  const jacket = toon(0x5b6472);
  const pants = toon(0x2c3140);
  const boot = toon(0xf8fafc);
  const stripe = toon(0x38bdf8);
  const legL = leg(-0.2, 0.85, 0.42, 0.28, pants, boot);
  const legR = leg(0.2, 0.85, 0.42, 0.28, pants, boot);
  body.add(part(rbox(0.78, 0.72, 0.5, 0.14), jacket, 0, 1.28, 0));
  body.add(part(rbox(0.7, 0.12, 0.52, 0.04), toon(0x1f2937), 0, 0.95, 0));
  const head = part(rbox(0.9, 0.82, 0.78, 0.28), skin, 0, 2.05, 0);
  body.add(head);
  const swoop = part(rbox(1.05, 0.7, 0.9, 0.22), hair, -0.05, 2.48, -0.02);
  swoop.rotation.z = 0.2;
  body.add(swoop);
  const bang = part(rbox(0.5, 0.7, 0.28, 0.1), hair, -0.28, 2.12, 0.34);
  bang.rotation.z = 0.15;
  body.add(bang);
  eye(body, 0.22, 2.05, 0.42, 1.15, 0.02);
  const smirk = part(rbox(0.24, 0.06, 0.05, 0.02), toon(0x7c4a3a), 0.12, 1.78, 0.42);
  smirk.rotation.z = -0.35;
  body.add(smirk);
  for (let i = 0; i < 4; i++) {
    const mat = i % 2 ? stripe : boot;
    const band = part(rbox(1.05, 0.16, 0.78, 0.06), mat, 0, 1.78 - i * 0.08, 0.04);
    band.rotation.x = 0.55;
    body.add(band);
  }
  const tail = part(rbox(0.34, 1.05, 0.14, 0.06), stripe, 0.62, 1.05, -0.3);
  tail.rotation.z = 0.9;
  tail.rotation.x = 0.5;
  body.add(tail);
  const tail2 = part(rbox(0.3, 0.7, 0.12, 0.05), boot, 0.95, 0.7, -0.4);
  tail2.rotation.z = 1.1;
  body.add(tail2);
  const armL = arm(-0.58, 1.55, 0.5, 0.22, jacket, stripe);
  const armR = arm(0.58, 1.55, 0.5, 0.22, jacket, stripe);
  return { legL, legR, armL, armR, labelY: 3.25 };
}

const BUILDERS: Record<string, (body: THREE.Group) => Built> = {
  frost: buildFrost,
  blaze: buildBlaze,
  verdant: buildVerdant,
  tide: buildTide,
  turbo: buildTurbo,
  gale: buildGale,
};

export function buildFighterMesh(def: CharacterDef): FighterVisual {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const aura = new THREE.Group();
  body.add(aura);

  const built = (BUILDERS[def.id] ?? buildBlaze)(body);
  body.add(built.legL, built.legR, built.armL, built.armR);
  addOutlines(body, 0.05);

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1.75, 24, 16),
    new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  shield.position.y = 1.5;
  shield.visible = false;
  root.add(shield);

  const ice = new THREE.Mesh(
    rbox(1.9, 3.3, 1.9, 0.2),
    new THREE.MeshToonMaterial({ color: 0xbfefff, transparent: true, opacity: 0.55 }),
  );
  ice.position.y = 1.6;
  ice.visible = false;
  root.add(ice);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 88;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  label.scale.set(2.9, 1.0, 1);
  label.position.y = built.labelY;
  label.renderOrder = 10;
  root.add(label);

  let lastKey = '';
  const setLabel = (name: string, hp: number, maxHp: number, isYou: boolean) => {
    const key = `${name}|${Math.ceil(hp)}|${maxHp}|${isYou}|${document.fonts.status}`;
    if (key === lastKey) return;
    lastKey = key;
    ctx.clearRect(0, 0, 256, 88);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = '30px "Lilita One", system-ui, sans-serif';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#1a1426';
    ctx.fillStyle = isYou ? '#7dff6a' : '#ffffff';
    ctx.strokeText(name, 128, 22);
    ctx.fillText(name, 128, 22);
    const frac = Math.max(0, Math.min(1, hp / maxHp));
    const x = 26;
    const y = 46;
    const w = 204;
    const h = 30;
    ctx.fillStyle = '#1a1426';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 9);
    ctx.fill();
    ctx.fillStyle = '#3b2f4a';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, w - 8, h - 8, 6);
    ctx.fill();
    if (frac > 0) {
      ctx.fillStyle = isYou ? '#5fdc3c' : '#ff3b4e';
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, Math.max(8, (w - 8) * frac), h - 8, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x + 8, y + 6, Math.max(0, (w - 16) * frac), 5);
    }
    ctx.font = '22px "Lilita One", system-ui, sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeText(String(Math.ceil(hp)), 128, y + h / 2 + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(Math.ceil(hp)), 128, y + h / 2 + 1);
    tex.needsUpdate = true;
  };

  const dispose = () => {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry && !mesh.userData.isOutline) mesh.geometry.dispose();
    });
    tex.dispose();
  };

  return { root, body, legL: built.legL, legR: built.legR, armL: built.armL, armR: built.armR, aura, shield, ice, label, setLabel, dispose };
}
