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

function std(color: number, emissive = 0, intensity = 0.8) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emissive ? intensity : 0,
    roughness: 0.55,
    metalness: 0.1,
    flatShading: true,
  });
}

function limb(mat: THREE.Material, len: number, thick: number): THREE.Group {
  const pivot = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(thick, len, thick), mat);
  m.position.y = -len / 2;
  m.castShadow = true;
  pivot.add(m);
  return pivot;
}

export function buildFighterMesh(def: CharacterDef): FighterVisual {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const main = std(def.color, def.color, 0.25);
  const dark = std(0x23263a);
  const skin = std(0xf1c7a5);
  const accent = std(def.accent, def.accent, 0.6);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.55), main);
  torso.position.y = 1.45;
  torso.castShadow = true;
  body.add(torso);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.6), dark);
  belt.position.y = 0.98;
  body.add(belt);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), skin);
  head.position.y = 2.28;
  head.castShadow = true;
  body.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.05), accent);
  visor.position.set(0, 2.32, 0.32);
  body.add(visor);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.18, 0.66), main);
  hair.position.y = 2.62;
  body.add(hair);

  const legL = limb(dark, 0.9, 0.32);
  legL.position.set(-0.22, 0.92, 0);
  const legR = limb(dark, 0.9, 0.32);
  legR.position.set(0.22, 0.92, 0);
  const armL = limb(main, 0.85, 0.26);
  armL.position.set(-0.6, 1.88, 0);
  const armR = limb(main, 0.85, 0.26);
  armR.position.set(0.6, 1.88, 0);
  body.add(legL, legR, armL, armR);

  const aura = new THREE.Group();
  body.add(aura);
  switch (def.id) {
    case 'frost': {
      for (const s of [-1, 1]) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 5), accent);
        spike.position.set(0.42 * s, 2.1, -0.05);
        spike.rotation.z = -0.5 * s;
        body.add(spike);
      }
      const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), std(def.color, def.color, 1.2));
      crown.position.y = 2.95;
      aura.add(crown);
      break;
    }
    case 'blaze': {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 6), std(0xffb02e, 0xff5a1f, 1.6));
      flame.position.y = 3.0;
      aura.add(flame);
      break;
    }
    case 'verdant': {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 24), std(def.color, def.color, 1.8));
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 2.95;
      aura.add(halo);
      break;
    }
    case 'tide': {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), std(def.accent, def.color, 1.4));
      orb.position.set(0.9, 2.1, 0);
      aura.add(orb);
      const orb2 = orb.clone();
      orb2.position.set(-0.9, 1.6, 0);
      aura.add(orb2);
      break;
    }
    case 'turbo': {
      const wheelMat = std(0x111111);
      for (const s of [-1, 1]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 14), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0.5 * s, 1.55, -0.38);
        body.add(wheel);
        const rim2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 10), std(0xd0d6e0));
        rim2.rotation.z = Math.PI / 2;
        rim2.position.copy(wheel.position);
        body.add(rim2);
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.05), std(0xfff6c0, 0xfff6c0, 2));
        light.position.set(0.25 * s, 1.7, 0.29);
        body.add(light);
      }
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.3), dark);
      spoiler.position.set(0, 2.05, -0.5);
      body.add(spoiler);
      break;
    }
    case 'gale': {
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.75 + i * 0.12, 0.03, 4, 28),
          new THREE.MeshBasicMaterial({ color: def.accent, transparent: true, opacity: 0.6 }),
        );
        ring.rotation.x = Math.PI / 2 + (i - 1) * 0.3;
        ring.position.y = 0.6 + i * 0.5;
        aura.add(ring);
      }
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), std(0x8ad1ff, 0x8ad1ff, 1));
      arrow.position.set(0, 2.62, 0.34);
      arrow.rotation.x = Math.PI / 2;
      body.add(arrow);
      break;
    }
  }

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 24, 16),
    new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shield.position.y = 1.4;
  shield.visible = false;
  root.add(shield);

  const ice = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 3.1, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xbfefff, transparent: true, opacity: 0.45, roughness: 0.1 }),
  );
  ice.position.y = 1.5;
  ice.visible = false;
  root.add(ice);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  label.scale.set(2.8, 0.8, 1);
  label.position.y = 3.6;
  label.renderOrder = 10;
  root.add(label);

  let lastKey = '';
  const setLabel = (name: string, hp: number, maxHp: number, isYou: boolean) => {
    const key = `${name}|${Math.ceil(hp)}|${maxHp}|${isYou}`;
    if (key === lastKey) return;
    lastKey = key;
    ctx.clearRect(0, 0, 256, 72);
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.fillStyle = isYou ? '#ffe066' : '#ffffff';
    ctx.strokeText(name, 128, 28);
    ctx.fillText(name, 128, 28);
    const w = 200;
    const frac = Math.max(0, Math.min(1, hp / maxHp));
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(28, 40, w, 18);
    ctx.fillStyle = frac > 0.5 ? '#4ade80' : frac > 0.25 ? '#facc15' : '#ef4444';
    ctx.fillRect(30, 42, (w - 4) * frac, 14);
    tex.needsUpdate = true;
  };

  const dispose = () => {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    tex.dispose();
  };

  return { root, body, legL, legR, armL, armR, aura, shield, ice, label, setLabel, dispose };
}
