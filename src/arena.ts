import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CHARACTERS } from './characters';
import { addOutlines, toon } from './toon';

export interface Platform {
  x: number;
  z: number;
  hw: number;
  hd: number;
  top: number;
}

export interface Pillar {
  x: number;
  z: number;
  r: number;
  h: number;
}

export interface Arena {
  group: THREE.Group;
  radius: number;
  platforms: Platform[];
  pillars: Pillar[];
  spawns: THREE.Vector3[];
  crystals: THREE.Mesh[];
  clouds: THREE.Group;
}

export const ARENA_RADIUS = 70;

function tileTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const tones = ['#f6cf8c', '#efc27b'];
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      g.fillStyle = tones[(x + y) % 2];
      g.fillRect(x * 128, y * 128, 128, 128);
    }
  }
  g.strokeStyle = 'rgba(160, 98, 40, 0.35)';
  g.lineWidth = 4;
  for (let i = 0; i <= 2; i++) {
    g.beginPath();
    g.moveTo(i * 128, 0);
    g.lineTo(i * 128, 256);
    g.moveTo(0, i * 128);
    g.lineTo(256, i * 128);
    g.stroke();
  }
  g.fillStyle = 'rgba(255, 240, 200, 0.45)';
  for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function crateTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c9803f';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#b06a2e';
  for (let i = 0; i < 4; i++) g.fillRect(0, i * 32 + 28, 128, 4);
  g.strokeStyle = '#7a4318';
  g.lineWidth = 10;
  g.strokeRect(5, 5, 118, 118);
  g.beginPath();
  g.moveTo(10, 10);
  g.lineTo(118, 118);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function skyDome(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(700, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP;
      void main(){
        float h = normalize(vP).y;
        vec3 top = vec3(0.20, 0.55, 0.98);
        vec3 hor = vec3(0.78, 0.92, 1.0);
        vec3 col = mix(hor, top, smoothstep(0.0, 0.55, h));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

function cloud(scale: number): THREE.Group {
  const g = new THREE.Group();
  const mat = toon(0xffffff, 0xdfefff, 0.35);
  const puffs = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < puffs; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat);
    const r = 0.7 + Math.random() * 0.6;
    s.scale.set(r * 1.3, r, r);
    s.position.set((i - puffs / 2) * 1.1, Math.random() * 0.5 - (Math.abs(i - puffs / 2) * 0.15), Math.random() * 0.8);
    g.add(s);
  }
  g.scale.setScalar(scale);
  return g;
}

function bush(): THREE.Group {
  const g = new THREE.Group();
  const greens = [0x5cc93a, 0x4bb32f, 0x6fd94a];
  const n = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + Math.random() * 0.5, 1), toon(greens[i % greens.length]));
    const a = (i / n) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.9, 0.7 + Math.random() * 0.4, Math.sin(a) * 0.9);
    s.castShadow = true;
    g.add(s);
  }
  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), toon(0x7be055));
  top.position.y = 1.4;
  top.castShadow = true;
  g.add(top);
  addOutlines(g, 0.07);
  return g;
}

function cactus(): THREE.Group {
  const g = new THREE.Group();
  const mat = toon(0x3fae4a);
  const h = 3.5 + Math.random() * 2;
  const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, h, 4, 10), mat);
  trunk.position.y = h / 2 + 0.5;
  trunk.castShadow = true;
  g.add(trunk);
  for (const s of [-1, 1]) {
    if (Math.random() < 0.25) continue;
    const armH = 1.2 + Math.random();
    const elbow = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.8, 4, 8), mat);
    elbow.rotation.z = Math.PI / 2;
    elbow.position.set(s * 0.9, h * 0.5, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, armH, 4, 8), mat);
    arm.position.set(s * 1.35, h * 0.5 + armH / 2, 0);
    arm.castShadow = true;
    g.add(elbow, arm);
  }
  const flower = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), toon(0xff6fa8));
  flower.position.y = h + 1.05;
  g.add(flower);
  addOutlines(g, 0.06);
  return g;
}

function mesa(h: number, r: number): THREE.Group {
  const g = new THREE.Group();
  const bands = [0xe0874a, 0xc96a38, 0xeea060, 0xb85a30];
  let y = 0;
  const layers = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < layers; i++) {
    const lh = h / layers;
    const rr = r * (1 - i * 0.08);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.97, rr, lh, 7), toon(bands[i % bands.length]));
    seg.position.y = y + lh / 2;
    seg.rotation.y = Math.random();
    g.add(seg);
    y += lh;
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.75, 1.2, 7), toon(0x8acb4a));
  cap.position.y = y + 0.4;
  g.add(cap);
  addOutlines(g, 0.5);
  return g;
}

export function buildArena(scene: THREE.Scene): Arena {
  const group = new THREE.Group();
  const R = ARENA_RADIUS;
  scene.background = new THREE.Color(0x8fd0ff);
  scene.fog = new THREE.Fog(0xc4e6ff, 180, 520);
  group.add(skyDome());

  scene.add(new THREE.HemisphereLight(0xcfeaff, 0xf3c48a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
  sun.position.set(45, 90, 35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -82;
  sc.right = 82;
  sc.top = 82;
  sc.bottom = -82;
  sc.near = 10;
  sc.far = 240;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  const desert = new THREE.Mesh(new THREE.CircleGeometry(600, 64), toon(0xe9ad62));
  desert.rotation.x = -Math.PI / 2;
  desert.position.y = -0.05;
  group.add(desert);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 3, 128), toon(0xffffff, 0, 0, tileTexture()));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Grass patches like the lanes of a brawl map.
  const grassMat = toon(0x79d14b);
  const grassEdge = toon(0x5bb236);
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 12 + Math.random() * 50;
    const s = 4 + Math.random() * 6;
    const edge = new THREE.Mesh(new THREE.CircleGeometry(s + 0.5, 24), grassEdge);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r);
    edge.scale.set(1.4, 1, 1);
    edge.receiveShadow = true;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(s, 24), grassMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(edge.position.x, 0.04, edge.position.z);
    patch.scale.set(1.4, 1, 1);
    patch.receiveShadow = true;
    group.add(edge, patch);
  }

  // Arena edge: a ring of chunky boulders.
  const rockColors = [0xd98a4e, 0xc77a42, 0xe39a5c];
  const rocks = 54;
  for (let i = 0; i < rocks; i++) {
    const a = (i / rocks) * Math.PI * 2;
    const s = 2.6 + Math.random() * 1.6;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), toon(rockColors[i % 3]));
    rock.position.set(Math.cos(a) * (R + 2.5), s * 0.55, Math.sin(a) * (R + 2.5));
    rock.rotation.set(Math.random(), Math.random() * 3, Math.random());
    rock.scale.y = 0.9 + Math.random() * 0.5;
    rock.castShadow = rock.receiveShadow = true;
    addOutlines(rock, 0.12);
    group.add(rock);
  }

  // Canyon mesas in the distance.
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + Math.random() * 0.2;
    const r = 120 + Math.random() * 120;
    const m = mesa(25 + Math.random() * 45, 14 + Math.random() * 18);
    m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    group.add(m);
  }

  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const c = cactus();
    const r = R + 8 + Math.random() * 30;
    c.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    c.rotation.y = Math.random() * 3;
    group.add(c);
  }

  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + Math.random() * 0.15;
    const r = i % 2 ? 58 + Math.random() * 6 : 26 + Math.random() * 12;
    const b = bush();
    b.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    b.scale.setScalar(0.9 + Math.random() * 0.5);
    group.add(b);
  }

  const clouds = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const c = cloud(6 + Math.random() * 8);
    const a = Math.random() * Math.PI * 2;
    const r = 150 + Math.random() * 250;
    c.position.set(Math.cos(a) * r, 70 + Math.random() * 90, Math.sin(a) * r);
    c.lookAt(0, c.position.y, 0);
    clouds.add(c);
  }
  group.add(clouds);

  const crateTex = crateTexture();
  const platforms: Platform[] = [];
  const addPlatform = (x: number, z: number, w: number, d: number, top: number, kind: 'stone' | 'crate', trim: number) => {
    if (kind === 'crate') {
      const cell = 2.25;
      const nx = Math.max(1, Math.round(w / cell));
      const nz = Math.max(1, Math.round(d / cell));
      const geo = new RoundedBoxGeometry(w / nx - 0.05, top, d / nz - 0.05, 2, 0.12);
      for (let ix = 0; ix < nx; ix++) {
        for (let iz = 0; iz < nz; iz++) {
          const box = new THREE.Mesh(geo, toon(0xffffff, 0, 0, crateTex));
          box.position.set(x - w / 2 + (ix + 0.5) * (w / nx), top / 2, z - d / 2 + (iz + 0.5) * (d / nz));
          box.castShadow = box.receiveShadow = true;
          addOutlines(box, 0.07);
          group.add(box);
        }
      }
    } else {
      const box = new THREE.Mesh(new RoundedBoxGeometry(w, top, d, 3, 0.35), toon(0xf0b46a));
      box.position.set(x, top / 2, z);
      box.castShadow = box.receiveShadow = true;
      addOutlines(box, 0.1);
      group.add(box);
      const cap = new THREE.Mesh(new RoundedBoxGeometry(w - 0.6, 0.2, d - 0.6, 2, 0.08), toon(trim));
      cap.position.set(x, top + 0.02, z);
      cap.receiveShadow = true;
      group.add(cap);
    }
    platforms.push({ x, z, hw: w / 2, hd: d / 2, top });
  };
  addPlatform(0, 0, 12, 12, 2.0, 'stone', 0xffe08a);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    addPlatform(Math.cos(a) * 34, Math.sin(a) * 34, 9, 9, 2.2, 'stone', CHARACTERS[i].color);
    const b = (i * Math.PI) / 2;
    addPlatform(Math.cos(b) * 20, Math.sin(b) * 20, i % 2 ? 2.25 : 9, i % 2 ? 9 : 2.25, 1.1, 'crate', 0);
  }

  // Sandstone totems topped with a glowing elemental gem, one per fighter.
  const pillars: Pillar[] = [];
  const crystals: THREE.Mesh[] = [];
  CHARACTERS.forEach((c, i) => {
    const a = (i / CHARACTERS.length) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(a) * 52;
    const z = Math.sin(a) * 52;
    const h = 8;
    const p = new THREE.Group();
    p.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 1.4, 8), toon(0xc98450));
    base.position.y = 0.7;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2, h - 2.4, 8), toon(0xf2b672));
    col.position.y = 1.4 + (h - 2.4) / 2;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.1, 1, 8), toon(0xc98450));
    top.position.y = h - 0.5;
    for (const m of [base, col, top]) {
      m.castShadow = m.receiveShadow = true;
      p.add(m);
    }
    addOutlines(p, 0.12);
    group.add(p);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), toon(c.color, c.color, 0.55));
    crystal.position.set(x, h + 2, z);
    crystal.scale.y = 1.5;
    addOutlines(crystal, 0.1);
    group.add(crystal);
    crystals.push(crystal);
    pillars.push({ x, z, r: 2.1, h });
  });

  const spawns: THREE.Vector3[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    spawns.push(new THREE.Vector3(Math.cos(a) * 42, 0, Math.sin(a) * 42));
  }

  scene.add(group);
  return { group, radius: R, platforms, pillars, spawns, crystals, clouds };
}

/** Highest standable surface under (x, z) that is at or below `fromY`. */
export function groundAt(arena: Arena, x: number, z: number, fromY = Infinity, pad = 0): number {
  let g = 0;
  for (const p of arena.platforms) {
    if (Math.abs(x - p.x) <= p.hw + pad && Math.abs(z - p.z) <= p.hd + pad && fromY >= p.top - 0.35) {
      g = Math.max(g, p.top);
    }
  }
  return g;
}
