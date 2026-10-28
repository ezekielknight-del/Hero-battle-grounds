import * as THREE from 'three';

let gradient: THREE.DataTexture | null = null;

function gradientMap(): THREE.DataTexture {
  if (gradient) return gradient;
  const tones = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(tones, 3, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

const cache = new Map<string, THREE.MeshToonMaterial>();

export function toon(color: number, emissive = 0, emissiveIntensity = 0.6, map?: THREE.Texture): THREE.MeshToonMaterial {
  const key = `${color}|${emissive}|${emissiveIntensity}|${map?.uuid ?? ''}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({
      color,
      gradientMap: gradientMap(),
      emissive,
      emissiveIntensity: emissive ? emissiveIntensity : 0,
      map: map ?? null,
    });
    cache.set(key, m);
  }
  return m;
}

export const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x1a1426, side: THREE.BackSide });

/** Inverted-hull outline: adds a slightly larger back-face copy of every mesh under `root`. */
export function addOutlines(root: THREE.Object3D, thickness = 0.06) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !m.userData.noOutline && !m.userData.isOutline) meshes.push(m);
  });
  for (const m of meshes) {
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const r = Math.max(0.05, g.boundingSphere!.radius);
    const o = new THREE.Mesh(g, OUTLINE_MAT);
    o.userData.isOutline = true;
    o.scale.setScalar(1 + thickness / r);
    o.position.copy(g.boundingSphere!.center).multiplyScalar(-thickness / r);
    m.add(o);
  }
}
