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

interface Look {
  skin: number;
  shirt: number;
  pants: number;
  boots: number;
  hair: number;
}

const LOOKS: Record<string, Look> = {
  frost: { skin: 0xf6d9c6, shirt: 0x6fd3ff, pants: 0x2b5c9e, boots: 0xe8f7ff, hair: 0xdff6ff },
  blaze: { skin: 0xeab48a, shirt: 0xff5a2a, pants: 0x3a2a48, boots: 0x5b3420, hair: 0xff3b2f },
  verdant: { skin: 0xc98d62, shirt: 0x34d873, pants: 0x1f4d3a, boots: 0x2c2c3c, hair: 0x2fe07a },
  tide: { skin: 0xb97d55, shirt: 0x2f86ff, pants: 0x173a73, boots: 0xffd25a, hair: 0x1f5fd6 },
  turbo: { skin: 0xf0c29c, shirt: 0xff2d55, pants: 0x262a3a, boots: 0x111111, hair: 0xff2d55 },
  gale: { skin: 0xf4d0b2, shirt: 0xf6a623, pants: 0x9c3b1f, boots: 0x6b2b16, hair: 0xf4d0b2 },
};

const rbox = (w: number, h: number, d: number, r = 0.08) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.2, h / 2.2, d / 2.2));

function part(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function buildFighterMesh(def: CharacterDef): FighterVisual {
  const look = LOOKS[def.id] ?? LOOKS.blaze;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skin = toon(look.skin);
  const shirt = toon(look.shirt);
  const pants = toon(look.pants);
  const boots = toon(look.boots);
  const hair = toon(look.hair);
  const white = toon(0xffffff);
  const black = toon(0x1a1426);

  // Legs with chunky boots, pivoting at the hips.
  const makeLeg = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.78, 0);
    pivot.add(part(rbox(0.34, 0.5, 0.36), pants, 0, -0.25, 0));
    pivot.add(part(rbox(0.42, 0.3, 0.58, 0.1), boots, 0, -0.62, 0.06));
    return pivot;
  };
  const legL = makeLeg(-0.24);
  const legR = makeLeg(0.24);

  body.add(part(rbox(1.0, 0.86, 0.66, 0.16), shirt, 0, 1.18, 0));
  body.add(part(rbox(1.04, 0.16, 0.7, 0.06), toon(0x2a2236), 0, 0.82, 0));
  body.add(part(rbox(0.22, 0.12, 0.06, 0.03), toon(0xffd23f), 0, 0.82, 0.36));

  const makeArm = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.5, 0);
    pivot.add(part(rbox(0.28, 0.5, 0.3), shirt, 0, -0.22, 0));
    pivot.add(part(new THREE.SphereGeometry(0.22, 14, 10), skin, 0, -0.58, 0));
    return pivot;
  };
  const armL = makeArm(-0.66);
  const armR = makeArm(0.66);
  body.add(legL, legR, armL, armR);

  // Oversized head with an attitude.
  const head = new THREE.Group();
  head.position.y = 2.15;
  body.add(head);
  head.add(part(rbox(1.15, 1.05, 1.0, 0.3), skin));
  for (const s of [-1, 1]) {
    head.add(part(rbox(0.26, 0.3, 0.06, 0.08), white, 0.23 * s, 0.05, 0.5));
    head.add(part(rbox(0.12, 0.17, 0.04, 0.04), black, 0.21 * s, 0.03, 0.535));
    const brow = part(rbox(0.34, 0.09, 0.08, 0.03), toon(0x2a1a14), 0.24 * s, 0.28, 0.51);
    brow.rotation.z = -0.32 * s;
    head.add(brow);
    head.add(part(new THREE.SphereGeometry(0.13, 10, 8), skin, 0.6 * s, 0, 0));
  }
  const mouth = part(rbox(0.28, 0.06, 0.04, 0.02), toon(0x5a1f1a), 0.06, -0.26, 0.505);
  mouth.rotation.z = 0.18;
  head.add(mouth);

  const aura = new THREE.Group();
  body.add(aura);

  switch (def.id) {
    case 'frost': {
      for (let i = 0; i < 6; i++) {
        const spike = part(new THREE.ConeGeometry(0.2, 0.75, 5), hair, -0.45 + i * 0.18, 0.65, -0.05 - (i % 2) * 0.15);
        spike.rotation.z = (i - 2.5) * -0.22;
        head.add(spike);
      }
      head.add(part(rbox(1.2, 0.28, 1.05, 0.12), hair, 0, 0.45, -0.02));
      const scarf = part(rbox(1.05, 0.2, 0.72, 0.08), toon(0xffffff), 0, 1.58, 0);
      body.add(scarf);
      const crown = part(new THREE.OctahedronGeometry(0.22), toon(def.color, def.color, 0.6), 0, 3.15, 0);
      aura.add(crown);
      break;
    }
    case 'blaze': {
      head.add(part(rbox(1.2, 0.3, 1.05, 0.12), hair, 0, 0.45, -0.03));
      const pomp = part(rbox(0.9, 0.5, 0.8, 0.22), hair, 0, 0.78, 0.12);
      pomp.rotation.x = -0.35;
      head.add(pomp);
      const flame = part(new THREE.ConeGeometry(0.32, 0.9, 6), toon(0xffc62e, 0xff7a1a, 0.6), 0, 3.35, 0.1);
      aura.add(flame);
      body.add(part(rbox(0.2, 0.6, 0.05, 0.03), toon(0xffd23f), -0.25, 1.2, 0.34));
      break;
    }
    case 'verdant': {
      for (let i = 0; i < 4; i++) {
        head.add(part(rbox(0.22, 0.45 - Math.abs(i - 1.5) * 0.08, 0.26, 0.08), hair, 0, 0.66, 0.3 - i * 0.24));
      }
      const halo = part(new THREE.TorusGeometry(0.62, 0.07, 6, 28), toon(def.color, def.color, 0.7), 0, 3.25, 0);
      halo.rotation.x = Math.PI / 2;
      aura.add(halo);
      body.add(part(new THREE.OctahedronGeometry(0.16), toon(def.color, def.color, 0.8), 0, 1.25, 0.36));
      break;
    }
    case 'tide': {
      head.add(part(rbox(1.2, 0.3, 1.05, 0.12), hair, 0, 0.45, -0.03));
      const wave = part(new THREE.TorusGeometry(0.42, 0.18, 8, 16, Math.PI), hair, 0, 0.62, -0.1);
      wave.rotation.y = Math.PI / 2;
      head.add(wave);
      head.add(part(rbox(1.18, 0.12, 1.03, 0.05), toon(0xffd25a), 0, 0.26, 0));
      for (const s of [-1, 1]) {
        aura.add(part(new THREE.SphereGeometry(0.2, 14, 10), toon(def.accent, def.color, 0.4), 0.95 * s, 1.7 + s * 0.3, 0));
      }
      break;
    }
    case 'turbo': {
      const helmet = part(rbox(1.25, 0.6, 1.1, 0.28), hair, 0, 0.38, -0.02);
      head.add(helmet);
      head.add(part(rbox(1.27, 0.1, 1.12, 0.04), white, 0, 0.36, -0.02));
      head.add(part(rbox(0.16, 0.62, 1.12, 0.06), white, 0, 0.42, -0.02));
      for (const s of [-1, 1]) {
        const wheel = part(new THREE.CylinderGeometry(0.36, 0.36, 0.2, 16), toon(0x1a1a1a), 0.42 * s, 1.25, -0.44);
        wheel.rotation.x = Math.PI / 2;
        body.add(wheel);
        const hub = part(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 10), toon(0xd8dee8), 0.42 * s, 1.25, -0.45);
        hub.rotation.x = Math.PI / 2;
        body.add(hub);
        body.add(part(rbox(0.2, 0.14, 0.06, 0.04), toon(0xfff6c0, 0xfff2a0, 0.8), 0.25 * s, 1.42, 0.34));
      }
      body.add(part(rbox(1.2, 0.08, 0.32, 0.03), toon(0x262a3a), 0, 1.75, -0.6));
      body.add(part(rbox(0.16, 0.84, 0.05, 0.03), white, 0, 1.18, 0.335));
      break;
    }
    case 'gale': {
      const arrow = part(rbox(0.2, 0.06, 0.75, 0.03), toon(0x3aa0ff), 0, 0.53, 0.05);
      head.add(arrow);
      const tip = part(new THREE.ConeGeometry(0.2, 0.3, 3), toon(0x3aa0ff), 0, 0.4, 0.5);
      tip.rotation.x = Math.PI / 2;
      head.add(tip);
      body.add(part(rbox(0.5, 0.9, 0.05, 0.03), toon(0xffd23f), 0.18, 1.18, 0.33));
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.85 + i * 0.12, 0.04, 4, 28),
          new THREE.MeshBasicMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.7 }),
        );
        ring.userData.noOutline = true;
        ring.rotation.x = Math.PI / 2 + (i - 1) * 0.3;
        ring.position.y = 0.5 + i * 0.55;
        aura.add(ring);
      }
      break;
    }
  }

  addOutlines(body, 0.045);

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1.75, 24, 16),
    new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  shield.position.y = 1.5;
  shield.visible = false;
  root.add(shield);

  const ice = new THREE.Mesh(
    rbox(1.7, 3.3, 1.7, 0.2),
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
  label.position.y = 3.95;
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

  return { root, body, legL, legR, armL, armR, aura, shield, ice, label, setLabel, dispose };
}
