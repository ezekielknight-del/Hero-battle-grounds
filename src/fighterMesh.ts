import * as THREE from 'three';
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

const plastics = new Map<number, THREE.MeshStandardMaterial>();

function plastic(color: number, emissive = 0): THREE.MeshStandardMaterial {
  const key = color + emissive * 17;
  let m = plastics.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.42,
      metalness: 0.02,
      emissive,
      emissiveIntensity: emissive ? 0.7 : 0,
    });
    plastics.set(key, m);
  }
  return m;
}

function mesh(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, plastic(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (r: number, h: number) => new THREE.CylinderGeometry(r, r, h, 16);

/** Classic blocky avatar: cylinder limbs, box torso, cube head. */
function rig(body: THREE.Group, colors: { head: number; torso: number; arm: number; leg: number }) {
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-0.28, 1.02, 0);
  legR.position.set(0.28, 1.02, 0);
  legL.add(mesh(cyl(0.2, 1.02), colors.leg, 0, -0.51, 0));
  legR.add(mesh(cyl(0.2, 1.02), colors.leg, 0, -0.51, 0));

  const torso = mesh(box(1.12, 1.12, 0.58), colors.torso, 0, 1.58, 0);
  body.add(torso);
  const stud = plastic(colors.torso);
  for (const x of [-0.28, 0.28]) {
    for (const z of [-0.12, 0.12]) {
      const s = new THREE.Mesh(cyl(0.07, 0.05), stud);
      s.position.set(x, 2.16, z);
      body.add(s);
    }
  }

  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-0.78, 2.08, 0);
  armR.position.set(0.78, 2.08, 0);
  armL.add(mesh(cyl(0.18, 1.02), colors.arm, 0, -0.51, 0));
  armR.add(mesh(cyl(0.18, 1.02), colors.arm, 0, -0.51, 0));

  const head = new THREE.Group();
  head.position.set(0, 2.55, 0);
  head.add(mesh(box(0.86, 0.86, 0.86), colors.head));
  body.add(head);
  return { legL, legR, armL, armR, head };
}

const BLACK = 0x1b1b1b;

function smile(head: THREE.Group) {
  for (const x of [-0.18, 0.18]) {
    const eye = mesh(new THREE.SphereGeometry(0.075, 12, 8), BLACK, x, 0.08, 0.44);
    eye.scale.set(1, 1.2, 0.35);
    head.add(eye);
  }
  const mouth = mesh(new THREE.TorusGeometry(0.16, 0.028, 6, 16, Math.PI * 0.8), BLACK, 0, -0.16, 0.44);
  mouth.rotation.z = Math.PI * 1.1;
  head.add(mouth);
}

function decorate(id: string, body: THREE.Group, head: THREE.Group, armR: THREE.Object3D) {
  switch (id) {
    case 'frost': {
      head.add(mesh(box(1.02, 0.18, 1.02), 0x2f74ff, 0, 0.5, 0));
      head.add(mesh(box(0.74, 0.36, 0.74), 0x3b82f6, 0, 0.74, 0));
      head.add(mesh(box(0.18, 0.18, 0.18), 0x9ad7ff, 0, 0.98, 0));
      body.add(mesh(box(0.22, 0.1, 0.08), 0xe23b4a, -0.1, 1.85, 0.32));
      body.add(mesh(box(0.22, 0.1, 0.08), 0xe23b4a, 0.1, 1.85, 0.32));
      body.add(mesh(box(0.1, 0.1, 0.08), 0xb91c1c, 0, 1.85, 0.34));
      smile(head);
      break;
    }
    case 'blaze': {
      const lBrow = mesh(box(0.22, 0.06, 0.06), BLACK, -0.18, 0.24, 0.44);
      lBrow.rotation.z = 0.4;
      const rBrow = mesh(box(0.22, 0.06, 0.06), BLACK, 0.18, 0.24, 0.44);
      rBrow.rotation.z = -0.4;
      head.add(lBrow, rBrow);
      for (const x of [-0.16, 0.16]) head.add(mesh(box(0.1, 0.1, 0.06), BLACK, x, 0.06, 0.44));
      head.add(mesh(box(0.28, 0.06, 0.06), BLACK, 0, -0.16, 0.44));
      head.add(mesh(box(0.5, 0.28, 0.4), 0xf97316, 0, 0.64, 0));
      head.add(mesh(box(0.28, 0.32, 0.28), 0xfacc15, 0, 0.9, 0));
      break;
    }
    case 'verdant': {
      smile(head);
      head.add(mesh(box(0.26, 0.26, 0.26), 0xef4444, 0, 0.72, 0));
      for (const [x, z] of [[0.24, 0], [-0.24, 0], [0, 0.24], [0, -0.24]] as const) {
        head.add(mesh(box(0.2, 0.12, 0.2), 0xf472b6, x, 0.62, z));
      }
      break;
    }
    case 'tide': {
      const eye = mesh(new THREE.SphereGeometry(0.16, 14, 10), 0xf5d90a, 0, 0.08, 0.4);
      eye.scale.z = 0.45;
      head.add(eye);
      head.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), BLACK, 0, 0.08, 0.5));
      head.add(mesh(box(0.46, 0.12, 0.12), 0xe07020, 0, -0.16, 0.4));
      head.add(mesh(box(0.22, 0.08, 0.06), BLACK, 0, -0.28, 0.44));
      const hat = mesh(cyl(0.4, 0.22), 0xf0b429, 0, 0.52, 0);
      head.add(hat);
      head.add(mesh(cyl(0.28, 0.28), 0xf0b429, 0, 0.72, 0));
      const bottle = new THREE.Group();
      bottle.position.set(0.05, -1.15, 0.15);
      bottle.add(mesh(cyl(0.1, 0.42), 0xf08a2a, 0, 0.2, 0));
      bottle.add(mesh(cyl(0.11, 0.08), 0xfff3e4, 0, 0.02, 0));
      bottle.add(mesh(cyl(0.05, 0.12), 0xf0b429, 0, 0.46, 0));
      armR.add(bottle);
      break;
    }
    case 'turbo': {
      const screen = plastic(0x10244d);
      const panel = new THREE.Mesh(box(0.62, 0.36, 0.04), screen);
      panel.position.set(0, 0.05, 0.44);
      head.add(panel);
      for (const x of [-0.14, 0.14]) {
        const glow = new THREE.Mesh(box(0.16, 0.12, 0.04), plastic(0x7af0ff, 0x7af0ff));
        glow.position.set(x, 0.06, 0.47);
        head.add(glow);
      }
      body.add(mesh(box(0.14, 0.14, 0.06), 0xe23b4a, -0.18, 1.35, 0.3));
      body.add(mesh(box(0.14, 0.14, 0.06), 0xe23b4a, 0.18, 1.35, 0.3));
      const barrel = mesh(cyl(0.1, 0.55), 0x3b82f6, 0.02, -0.85, 0.2);
      barrel.rotation.x = Math.PI / 2.3;
      armR.add(barrel);
      break;
    }
    case 'gale': {
      head.add(mesh(box(0.92, 0.28, 0.92), 0x1a1a2e, 0, 0.4, -0.02));
      const bang = mesh(box(0.4, 0.55, 0.12), 0x1a1a2e, -0.22, 0.12, 0.42);
      head.add(bang);
      const eye = mesh(new THREE.SphereGeometry(0.075, 12, 8), BLACK, 0.18, 0.06, 0.46);
      eye.scale.set(1, 1.2, 0.35);
      head.add(eye);
      const smirk = mesh(box(0.22, 0.05, 0.04), BLACK, 0.06, -0.18, 0.45);
      smirk.rotation.z = -0.3;
      head.add(smirk);
      for (let i = 0; i < 4; i++) {
        body.add(mesh(box(0.7, 0.1, 0.64), i % 2 ? 0x38bdf8 : 0xf8fafc, 0, 2.02 - i * 0.1, 0.02));
      }
      const tail = mesh(box(0.18, 0.7, 0.1), 0x38bdf8, 0.55, 1.45, -0.15);
      tail.rotation.z = 0.7;
      body.add(tail);
      break;
    }
    default:
      smile(head);
  }
}

const COLORS: Record<string, { head: number; torso: number; arm: number; leg: number }> = {
  frost: { head: 0xf4fbff, torso: 0x3b82f6, arm: 0xe0f2fe, leg: 0x1d4ed8 },
  blaze: { head: 0xf6d7a8, torso: 0xef4444, arm: 0xf97316, leg: 0x7f1d1d },
  verdant: { head: 0x86efac, torso: 0x16a34a, arm: 0x4ade80, leg: 0x166534 },
  tide: { head: 0xf6d7c3, torso: 0x2563eb, arm: 0x60a5fa, leg: 0x1e3a8a },
  turbo: { head: 0xf5d76e, torso: 0xf0c43a, arm: 0xeab308, leg: 0x3f3f46 },
  gale: { head: 0xf6d7c3, torso: 0xf8fafc, arm: 0x7dd3fc, leg: 0xe2e8f0 },
};

export function buildFighterMesh(def: CharacterDef): FighterVisual {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const aura = new THREE.Group();
  body.add(aura);

  const colors = COLORS[def.id] ?? COLORS.blaze;
  const parts = rig(body, colors);
  decorate(def.id, body, parts.head, parts.armR);
  body.add(parts.legL, parts.legR, parts.armL, parts.armR);

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 24, 16),
    new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  shield.position.y = 1.5;
  shield.visible = false;
  root.add(shield);

  const ice = new THREE.Mesh(
    box(1.6, 3.1, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xbfefff, transparent: true, opacity: 0.45, roughness: 0.15 }),
  );
  ice.position.y = 1.55;
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
  label.position.y = 3.75;
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
