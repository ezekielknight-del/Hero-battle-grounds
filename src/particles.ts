import * as THREE from 'three';

export interface EmitOptions {
  count?: number;
  color?: number;
  speed?: number;
  life?: number;
  size?: number;
  gravity?: number;
  up?: number;
  spread?: number;
  dir?: THREE.Vector3;
}

const VERT = /* glsl */ `
  attribute float size;
  attribute vec4 pcolor;
  uniform float uScale;
  varying vec4 vColor;
  void main() {
    vColor = pcolor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uScale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec4 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.32, d);
    vec3 rgb = mix(vColor.rgb, vColor.rgb * 0.55, smoothstep(0.25, 0.5, d));
    gl_FragColor = vec4(rgb, vColor.a * a);
  }
`;

export class Particles {
  readonly points: THREE.Points;
  private readonly cap: number;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly baseSize: Float32Array;
  private readonly grav: Float32Array;
  private next = 0;
  private readonly tmpColor = new THREE.Color();
  private readonly material: THREE.ShaderMaterial;

  constructor(cap = 5000) {
    this.cap = cap;
    this.pos = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 4);
    this.size = new Float32Array(cap);
    this.vel = new Float32Array(cap * 3);
    this.life = new Float32Array(cap);
    this.maxLife = new Float32Array(cap);
    this.baseSize = new Float32Array(cap);
    this.grav = new Float32Array(cap);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uScale: { value: 400 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
  }

  setScale(viewportHeight: number) {
    this.material.uniforms.uScale.value = viewportHeight * 0.55;
  }

  emit(at: THREE.Vector3, o: EmitOptions = {}) {
    const count = o.count ?? 12;
    const speed = o.speed ?? 6;
    const life = o.life ?? 0.6;
    const size = o.size ?? 0.5;
    const spread = o.spread ?? 1;
    this.tmpColor.setHex(o.color ?? 0xffffff);
    for (let n = 0; n < count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % this.cap;
      this.pos[i * 3] = at.x;
      this.pos[i * 3 + 1] = at.y;
      this.pos[i * 3 + 2] = at.z;
      let vx = (Math.random() * 2 - 1) * spread;
      let vy = (Math.random() * 2 - 1) * spread + (o.up ?? 0);
      let vz = (Math.random() * 2 - 1) * spread;
      if (o.dir) {
        vx += o.dir.x;
        vy += o.dir.y;
        vz += o.dir.z;
      }
      const s = speed * (0.4 + Math.random() * 0.6);
      this.vel[i * 3] = vx * s;
      this.vel[i * 3 + 1] = vy * s;
      this.vel[i * 3 + 2] = vz * s;
      const l = life * (0.6 + Math.random() * 0.6);
      this.life[i] = l;
      this.maxLife[i] = l;
      this.baseSize[i] = size * (0.6 + Math.random() * 0.8);
      this.grav[i] = o.gravity ?? 0;
      const v = 0.85 + Math.random() * 0.3;
      this.col[i * 4] = this.tmpColor.r * v;
      this.col[i * 4 + 1] = this.tmpColor.g * v;
      this.col[i * 4 + 2] = this.tmpColor.b * v;
      this.col[i * 4 + 3] = 1;
    }
  }

  update(dt: number) {
    const drag = Math.exp(-2 * dt);
    for (let i = 0; i < this.cap; i++) {
      if (this.life[i] <= 0) {
        this.size[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const t = Math.max(0, this.life[i] / this.maxLife[i]);
      this.vel[i * 3] *= drag;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * drag - this.grav[i] * dt;
      this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.col[i * 4 + 3] = t;
      this.size[i] = this.baseSize[i] * (0.4 + 0.6 * t);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.pcolor.needsUpdate = true;
    g.attributes.size.needsUpdate = true;
  }

  clear() {
    this.life.fill(0);
  }
}
