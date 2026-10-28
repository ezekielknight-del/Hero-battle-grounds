import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { CharacterDef } from './characters';

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

const HEAD = 0xcbb56a;

const mats = new Map<number, THREE.MeshLambertMaterial>();

function mat(color: number): THREE.MeshLambertMaterial {
  let m = mats.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    mats.set(color, m);
  }
  return m;
}

function rbox(w: number, h: number, d: number, radius: number) {
  const r = Math.min(radius, w / 2.2, h / 2.2, d / 2.2);
  return new RoundedBoxGeometry(w, h, d, 3, r);
}

function block(w: number, h: number, d: number, color: number, radius = 0.06, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(rbox(w, h, d, radius), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

interface Outfit {
  torso: number;
  arm: number;
  leg: number;
  head?: number;
}

const OUTFITS: Record<string, Outfit> = {
  frost: { torso: 0x8fd4f2, arm: 0xe7f6ff, leg: 0x3d7eb8, head: 0xe7f3fb },
  blaze: { torso: 0xe23b2b, arm: 0xf08a3a, leg: 0x6b241c, head: 0xe8c27a },
  verdant: { torso: 0x2f7a28, arm: 0xd4c07a, leg: 0x1f5c34 },
  tide: { torso: 0x1d4ed8, arm: 0x3b82f6, leg: 0x1e3a8a },
  turbo: { torso: 0xd61f2b, arm: 0x2a2a2a, leg: 0x1a1a1a, head: 0xe6c34a },
  gale: { torso: 0xf4f7fb, arm: 0x7dd3fc, leg: 0xd7e6f5 },
};

function classicFace(head: THREE.Group) {
  for (const x of [-0.18, 0.18]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), mat(0x1a1a1a));
    eye.scale.set(0.58, 1.65, 0.28);
    eye.position.set(x, 0.1, 0.42);
    head.add(eye);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 22, Math.PI * 0.78), mat(0x1a1a1a));
  smile.position.set(0, -0.16, 0.42);
  smile.rotation.z = Math.PI * 1.11;
  head.add(smile);
}

function buildAvatar(body: THREE.Group, id: string) {
  const outfit = OUTFITS[id] ?? OUTFITS.blaze;
  const headColor = outfit.head ?? HEAD;

  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-0.3, 0.96, 0);
  legR.position.set(0.3, 0.96, 0);
  legL.add(block(0.5, 0.96, 0.5, outfit.leg, 0.07, 0, -0.48, 0));
  legR.add(block(0.5, 0.96, 0.5, outfit.leg, 0.07, 0, -0.48, 0));

  const torso = block(1.28, 1.08, 0.58, outfit.torso, 0.07, 0, 1.5, 0);
  body.add(torso);

  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-0.92, 2.04, 0);
  armR.position.set(0.92, 2.04, 0);
  armL.add(block(0.5, 1.08, 0.46, outfit.arm, 0.07, 0, -0.54, 0));
  armR.add(block(0.5, 1.08, 0.46, outfit.arm, 0.07, 0, -0.54, 0));

  const head = new THREE.Group();
  head.position.set(0, 2.46, 0);
  head.add(block(0.96, 0.86, 0.82, headColor, 0.2));
  classicFace(head);
  body.add(head);

  dress(id, body, head, armR);
  return { legL, legR, armL, armR };
}

function dress(id: string, body: THREE.Group, head: THREE.Group, armR: THREE.Object3D) {
  switch (id) {
    case 'frost':
      head.add(block(1.08, 0.16, 0.92, 0x2f74ff, 0.06, 0, 0.48, 0));
      head.add(block(0.72, 0.28, 0.7, 0x3b82f6, 0.08, 0, 0.66, 0));
      head.add(block(0.16, 0.16, 0.16, 0xbfefff, 0.04, 0, 0.86, 0));
      body.add(block(0.7, 0.14, 0.08, 0xe8f7ff, 0.04, 0, 1.72, 0.3));
      break;
    case 'blaze':
      head.add(block(0.34, 0.22, 0.28, 0xf97316, 0.06, 0, 0.58, 0));
      head.add(block(0.2, 0.24, 0.18, 0xfacc15, 0.05, 0, 0.78, 0));
      body.add(block(1.1, 0.14, 0.08, 0xfacc15, 0.04, 0, 1.15, 0.3));
      break;
    case 'verdant':
      head.add(block(0.22, 0.22, 0.22, 0xef4444, 0.06, 0, 0.62, 0));
      head.add(block(0.18, 0.1, 0.16, 0xf472b6, 0.04, 0.2, 0.52, 0));
      head.add(block(0.18, 0.1, 0.16, 0xf472b6, 0.04, -0.2, 0.52, 0));
      head.add(block(0.16, 0.1, 0.18, 0xf472b6, 0.04, 0, 0.52, 0.18));
      body.add(block(0.16, 0.5, 0.06, 0xb7f5c8, 0.03, 0, 1.5, 0.3));
      break;
    case 'tide':
      head.add(block(0.84, 0.14, 0.84, 0xf0b429, 0.05, 0, 0.48, 0));
      head.add(block(0.62, 0.22, 0.62, 0xf0b429, 0.06, 0, 0.64, 0));
      body.add(block(1.1, 0.16, 0.08, 0xf8fafc, 0.04, 0, 1.55, 0.3));
      {
        const bottle = new THREE.Group();
        bottle.position.set(0.02, -1.2, 0.22);
        bottle.add(block(0.16, 0.4, 0.16, 0xf08a2a, 0.05, 0, 0.2, 0));
        bottle.add(block(0.18, 0.08, 0.18, 0xfff7e8, 0.03, 0, 0.02, 0));
        bottle.add(block(0.08, 0.12, 0.08, 0xf0b429, 0.03, 0, 0.44, 0));
        armR.add(bottle);
      }
      break;
    case 'turbo':
      body.add(block(0.16, 0.96, 0.08, 0xf8fafc, 0.03, 0, 1.5, 0.3));
      body.add(block(1.05, 0.12, 0.08, 0xf8fafc, 0.03, 0, 1.85, 0.3));
      head.add(block(0.72, 0.08, 0.06, 0x1a1a1a, 0.02, 0, 0.28, 0.4));
      break;
    case 'gale':
      for (let i = 0; i < 3; i++) {
        body.add(block(0.9, 0.1, 0.64, i % 2 ? 0x38bdf8 : 0xf8fafc, 0.03, 0, 1.95 - i * 0.1, 0.02));
      }
      {
        const tail = block(0.18, 0.7, 0.1, 0x38bdf8, 0.04, 0.48, 1.45, -0.12);
        tail.rotation.z = 0.6;
        body.add(tail);
      }
      break;
    default:
      break;
  }
}

export function buildFighterMesh(def: CharacterDef): FighterVisual {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const aura = new THREE.Group();
  body.add(aura);

  const parts = buildAvatar(body, def.id);
  body.add(parts.legL, parts.legR, parts.armL, parts.armR);

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 20, 14),
    new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  shield.position.y = 1.45;
  shield.visible = false;
  root.add(shield);

  const ice = new THREE.Mesh(
    rbox(1.7, 3.05, 1.5, 0.08),
    new THREE.MeshLambertMaterial({ color: 0xbfefff, transparent: true, opacity: 0.45 }),
  );
  ice.position.y = 1.5;
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
  label.position.y = 4.15;
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
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    tex.dispose();
  };

  return {
    root,
    body,
    legL: parts.legL,
    legR: parts.legR,
    armL: parts.armL,
    armR: parts.armR,
    aura,
    shield,
    ice,
    label,
    setLabel,
    dispose,
  };
}
