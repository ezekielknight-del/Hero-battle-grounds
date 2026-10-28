import * as THREE from 'three';
import { CHARACTERS } from './characters';

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
}

export const ARENA_RADIUS = 70;

function floorTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2a2f45';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) {
    const v = 36 + Math.random() * 18;
    g.fillStyle = `rgba(${v},${v + 4},${v + 22},0.5)`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }
  g.strokeStyle = 'rgba(140,160,255,0.18)';
  g.lineWidth = 4;
  g.strokeRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(140,160,255,0.08)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(256, 0);
  g.lineTo(256, 512);
  g.moveTo(0, 256);
  g.lineTo(512, 256);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function skyDome(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(600, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      void main(){
        float h = normalize(vP).y;
        vec3 top = vec3(0.05,0.04,0.16);
        vec3 mid = vec3(0.32,0.16,0.42);
        vec3 bot = vec3(0.95,0.45,0.35);
        vec3 col = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.6, h)) : mix(bot, mid, smoothstep(-0.05, 0.08, h));
        vec3 q = floor(normalize(vP) * 300.0);
        float s = step(0.997, hash(q)) * smoothstep(0.15, 0.5, h);
        gl_FragColor = vec4(col + s, 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

export function buildArena(scene: THREE.Scene): Arena {
  const group = new THREE.Group();
  const R = ARENA_RADIUS;
  scene.background = new THREE.Color(0x140f2a);
  scene.fog = new THREE.Fog(0x2a1a44, 120, 420);
  group.add(skyDome());

  scene.add(new THREE.HemisphereLight(0xa8c4ff, 0x3a2848, 1.1));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sun.position.set(40, 80, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -80;
  sc.right = 80;
  sc.top = 80;
  sc.bottom = -80;
  sc.near = 10;
  sc.far = 220;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(R + 2, 128),
    new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.85, metalness: 0.1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0x8aa0ff, transparent: true, opacity: 0.35 });
  for (const r of [14, 30, 48]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.15, r + 0.15, 128), lineMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    group.add(ring);
  }

  // Outer wall with a glowing rim.
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.6, R + 0.6, 5, 128, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1b1d33, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide }),
  );
  wall.position.y = 2.5;
  wall.receiveShadow = true;
  group.add(wall);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(R + 0.6, 0.25, 8, 160),
    new THREE.MeshBasicMaterial({ color: 0x9d7bff }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 5;
  group.add(rim);

  // Stadium tiers with an instanced crowd for scale.
  const tierMat = new THREE.MeshStandardMaterial({ color: 0x252842, roughness: 0.9 });
  const tiers = 7;
  for (let i = 0; i < tiers; i++) {
    const inner = R + 2 + i * 4;
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(inner + 4, inner + 4, 5 + i * 3, 96, 1, true), tierMat);
    tier.position.y = (5 + i * 3) / 2;
    group.add(tier);
    const cap = new THREE.Mesh(new THREE.RingGeometry(inner, inner + 4, 96), tierMat);
    cap.rotation.x = -Math.PI / 2;
    cap.position.y = 5 + i * 3;
    group.add(cap);
  }
  const crowdCount = 2400;
  const crowd = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.9, 1.4, 0.9),
    new THREE.MeshStandardMaterial({ roughness: 0.8 }),
    crowdCount,
  );
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  const palette = [0xff6a2b, 0x7fdcff, 0x3dff8b, 0x2f8bff, 0xff2d55, 0xe6f0ff, 0xffd23f, 0x9d7bff];
  for (let i = 0; i < crowdCount; i++) {
    const tier = Math.floor(Math.random() * tiers);
    const a = Math.random() * Math.PI * 2;
    const r = R + 4 + tier * 4 + Math.random() * 1.5;
    m.makeTranslation(Math.cos(a) * r, 5 + tier * 3 + 0.7, Math.sin(a) * r);
    crowd.setMatrixAt(i, m);
    crowd.setColorAt(i, col.setHex(palette[i % palette.length]).multiplyScalar(0.5 + Math.random() * 0.5));
  }
  group.add(crowd);

  // Floodlight towers.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const r = R + 34;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2, 50, 2), new THREE.MeshStandardMaterial({ color: 0x30344f }));
    tower.position.set(Math.cos(a) * r, 25, Math.sin(a) * r);
    group.add(tower);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 1), new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
    lamp.position.set(Math.cos(a) * r, 51, Math.sin(a) * r);
    lamp.lookAt(0, 0, 0);
    group.add(lamp);
  }

  const stone = new THREE.MeshStandardMaterial({ color: 0x3b3f5c, roughness: 0.7, metalness: 0.15 });
  const platforms: Platform[] = [];
  const addPlatform = (x: number, z: number, w: number, d: number, top: number, glow: number) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, top, d), stone);
    box.position.set(x, top / 2, z);
    box.castShadow = box.receiveShadow = true;
    group.add(box);
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.1, 0.12, d + 0.1),
      new THREE.MeshBasicMaterial({ color: glow }),
    );
    edge.position.set(x, top, z);
    group.add(edge);
    platforms.push({ x, z, hw: w / 2, hd: d / 2, top });
  };
  addPlatform(0, 0, 12, 12, 2.0, 0xffffff);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    addPlatform(Math.cos(a) * 34, Math.sin(a) * 34, 9, 9, 2.2, CHARACTERS[i].color);
    const b = (i * Math.PI) / 2;
    addPlatform(Math.cos(b) * 20, Math.sin(b) * 20, i % 2 ? 3.5 : 9, i % 2 ? 9 : 3.5, 1.1, 0x8aa0ff);
  }

  // Elemental pillars, one per fighter.
  const pillars: Pillar[] = [];
  const crystals: THREE.Mesh[] = [];
  CHARACTERS.forEach((c, i) => {
    const a = (i / CHARACTERS.length) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(a) * 52;
    const z = Math.sin(a) * 52;
    const h = 10;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, h, 12), stone);
    p.position.set(x, h / 2, z);
    p.castShadow = p.receiveShadow = true;
    group.add(p);
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.6, 0),
      new THREE.MeshStandardMaterial({ color: c.color, emissive: c.color, emissiveIntensity: 1.4, roughness: 0.2 }),
    );
    crystal.position.set(x, h + 2.4, z);
    crystal.scale.y = 1.6;
    group.add(crystal);
    crystals.push(crystal);
    const glow = new THREE.PointLight(c.color, 30, 22, 2);
    glow.position.set(x, h + 2.4, z);
    group.add(glow);
    pillars.push({ x, z, r: 2, h });
  });

  const spawns: THREE.Vector3[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    spawns.push(new THREE.Vector3(Math.cos(a) * 42, 0, Math.sin(a) * 42));
  }

  scene.add(group);
  return { group, radius: R, platforms, pillars, spawns, crystals };
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
