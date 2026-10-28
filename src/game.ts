import * as THREE from 'three';
import { getChar, type Ability, type CharacterDef, type Effect } from './characters';
import { buildArena, groundAt, type Arena } from './arena';
import { buildFighterMesh, type FighterVisual } from './fighterMesh';
import { Particles } from './particles';
import { OUTLINE_MAT } from './toon';
import type { FighterState, Vec3Tuple } from '../shared/protocol';

export type SlotKind = 'local' | 'remote' | 'bot';

export interface Slot {
  id: string;
  name: string;
  charId: string;
  kind: SlotKind;
}

export interface NetHooks {
  sendState(s: FighterState[]): void;
  sendCast(id: string, i: number, o: Vec3Tuple, d: Vec3Tuple, dist: number, slam?: boolean): void;
  sendDied(id: string, by: string | null): void;
}

export interface ScoreRow {
  id: string;
  name: string;
  charId: string;
  kills: number;
  deaths: number;
  isYou: boolean;
  alive: boolean;
}

export interface KillEvent {
  killer: ScoreRow | null;
  victim: ScoreRow;
}

export const MATCH_SECONDS = 180;
export const KO_TARGET = 10;
const GRAVITY = 32;
const JUMP_VEL = 12.5;
const RESPAWN_SECONDS = 3;
const BODY_RADIUS = 0.6;
const UP = new THREE.Vector3(0, 1, 0);

interface BotBrain {
  targetId: string | null;
  retargetAt: number;
  nextCastAt: number;
  nextJumpAt: number;
  strafe: number;
  flipAt: number;
  prefDist: number;
  aimJitter: number;
}

interface Fighter {
  id: string;
  name: string;
  charId: string;
  def: CharacterDef;
  kind: SlotKind;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  kb: THREE.Vector3;
  yaw: number;
  hp: number;
  alive: boolean;
  respawnAt: number;
  onGround: boolean;
  cds: number[];
  slowUntil: number;
  slowMult: number;
  stunUntil: number;
  shieldUntil: number;
  shieldMult: number;
  hasteUntil: number;
  hasteMult: number;
  burnUntil: number;
  burnDps: number;
  burnBy: string | null;
  protectUntil: number;
  dashUntil: number;
  dashDir: THREE.Vector3;
  dashSpeed: number;
  dashAbility: Ability | null;
  dashHit: Set<string>;
  slamIdx: number;
  slamArmedAt: number;
  kills: number;
  deaths: number;
  lastHitAt: number;
  castAnim: number;
  walkPhase: number;
  vis: FighterVisual;
  netPos: THREE.Vector3;
  netVel: THREE.Vector3;
  netAt: number;
  netFlags: number;
  hasNet: boolean;
  ai: BotBrain | null;
}

interface Projectile {
  owner: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
  damage: number;
  left: number;
  pierce: boolean;
  homing: boolean;
  effect?: Effect;
  color: number;
  mesh: THREE.Mesh;
  hit: Set<string>;
}

interface Zone {
  owner: string;
  pos: THREE.Vector3;
  radius: number;
  dps: number;
  until: number;
  nextTick: number;
  effect?: Effect;
  color: number;
  obj: THREE.Group;
}

interface Strike {
  owner: string;
  pos: THREE.Vector3;
  radius: number;
  damage: number;
  at: number;
  start: number;
  effect?: Effect;
  color: number;
  obj: THREE.Group;
  faller: THREE.Mesh | null;
}

interface Fx {
  obj: THREE.Object3D;
  t: number;
  life: number;
  update: (k: number) => void;
}

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

function segPointDist(a: THREE.Vector3, b: THREE.Vector3, p: THREE.Vector3): number {
  const ab = tmp.copy(b).sub(a);
  const t = Math.max(0, Math.min(1, tmp2.copy(p).sub(a).dot(ab) / Math.max(1e-6, ab.lengthSq())));
  return tmp2.copy(a).addScaledVector(ab, t).distanceTo(p);
}

function center(f: Fighter, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(f.pos.x, f.pos.y + 1.4, f.pos.z);
}

const tup = (v: THREE.Vector3): Vec3Tuple => [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(65, 1, 0.1, 1500);
  readonly arena: Arena;
  readonly particles = new Particles(6000);

  fighters = new Map<string, Fighter>();
  private projectiles: Projectile[] = [];
  private zones: Zone[] = [];
  private strikes: Strike[] = [];
  private fx: Fx[] = [];
  private matCache = new Map<number, THREE.MeshBasicMaterial>();
  private sphereGeo = new THREE.SphereGeometry(1, 14, 10);

  localId: string | null = null;
  ownsBots = true;
  net: NetHooks | null = null;
  running = false;
  demo = false;
  matchStart = 0;
  now = performance.now() / 1000;
  private lastStateSent = 0;
  private menuAngle = 0;

  camYaw = 0;
  camPitch = 0.55;
  private keys = new Set<string>();
  private jumpBufferedUntil = 0;
  pointerLocked = false;

  onKill: ((e: KillEvent) => void) | null = null;
  onHit: (() => void) | null = null;
  onEnd: ((rows: ScoreRow[]) => void) | null = null;
  onLocalDamaged: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.id = 'game-canvas';
    this.arena = buildArena(this.scene);
    this.scene.add(this.particles.points);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindInput();
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.particles.setScale(h * this.renderer.getPixelRatio());
  }

  // ---------- input ----------

  private bindInput() {
    const canvas = this.renderer.domElement;
    const typing = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    };
    window.addEventListener('keydown', (e) => {
      if (typing(e)) return;
      this.keys.add(e.code);
      if (!this.running || !this.localId) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.jumpBufferedUntil = this.now + 0.15;
      }
      const m = /^(Digit|Numpad)([1-9])$/.exec(e.code);
      if (m && !e.repeat) {
        e.preventDefault();
        this.pressAbility(Number(m[2]) - 1);
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', (e) => {
      if (!this.running || !this.localId) return;
      if (!this.pointerLocked) {
        canvas.requestPointerLock?.();
        return;
      }
      if (e.button === 0) this.pressAbility(0);
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.camYaw -= e.movementX * 0.0026;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + e.movementY * 0.002, -0.15, 1.1);
    });
  }

  releasePointer() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  pressAbility(idx: number) {
    const f = this.localId ? this.fighters.get(this.localId) : undefined;
    if (f) this.tryCast(f, idx);
  }

  // ---------- match lifecycle ----------

  startMatch(slots: Slot[], opts: { ownsBots: boolean; net: NetHooks | null; demo?: boolean }) {
    this.clearMatch();
    this.ownsBots = opts.ownsBots;
    this.net = opts.net;
    this.demo = !!opts.demo;
    this.localId = slots.find((s) => s.kind === 'local')?.id ?? null;
    const n = slots.length;
    slots.forEach((s, i) => {
      const spawn = this.arena.spawns[Math.floor((i * this.arena.spawns.length) / n) % this.arena.spawns.length];
      const f = this.addFighter(s, spawn);
      if (s.kind === 'local') this.camYaw = Math.atan2(-spawn.x, -spawn.z);
      f.yaw = Math.atan2(-spawn.x, -spawn.z);
    });
    this.matchStart = this.now;
    this.running = true;
  }

  startDemo() {
    const ids = ['blaze', 'frost', 'tide', 'gale', 'verdant', 'turbo'];
    const slots: Slot[] = ids.slice(0, 4 + Math.floor(Math.random() * 3)).map((c, i) => ({
      id: `demo-${i}`,
      name: getChar(c).name,
      charId: c,
      kind: 'bot',
    }));
    this.startMatch(slots, { ownsBots: true, net: null, demo: true });
  }

  stopMatch() {
    this.running = false;
    this.releasePointer();
  }

  private clearMatch() {
    for (const f of this.fighters.values()) {
      this.scene.remove(f.vis.root);
      f.vis.dispose();
    }
    this.fighters.clear();
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    for (const z of this.zones) this.disposeObj(z.obj);
    for (const s of this.strikes) this.disposeObj(s.obj);
    for (const x of this.fx) this.disposeObj(x.obj);
    this.projectiles = [];
    this.zones = [];
    this.strikes = [];
    this.fx = [];
    this.particles.clear();
  }

  private addFighter(s: Slot, spawn: THREE.Vector3): Fighter {
    const def = getChar(s.charId);
    const vis = buildFighterMesh(def);
    this.scene.add(vis.root);
    const f: Fighter = {
      id: s.id,
      name: s.name,
      charId: def.id,
      def,
      kind: s.kind,
      pos: spawn.clone(),
      vel: new THREE.Vector3(),
      kb: new THREE.Vector3(),
      yaw: 0,
      hp: def.hp,
      alive: true,
      respawnAt: 0,
      onGround: true,
      cds: def.abilities.map(() => 0),
      slowUntil: 0,
      slowMult: 1,
      stunUntil: 0,
      shieldUntil: 0,
      shieldMult: 1,
      hasteUntil: 0,
      hasteMult: 1,
      burnUntil: 0,
      burnDps: 0,
      burnBy: null,
      protectUntil: this.now + 2,
      dashUntil: 0,
      dashDir: new THREE.Vector3(),
      dashSpeed: 0,
      dashAbility: null,
      dashHit: new Set(),
      slamIdx: -1,
      slamArmedAt: 0,
      kills: 0,
      deaths: 0,
      lastHitAt: -10,
      castAnim: 0,
      walkPhase: Math.random() * 10,
      vis,
      netPos: spawn.clone(),
      netVel: new THREE.Vector3(),
      netAt: 0,
      netFlags: 0,
      hasNet: false,
      ai:
        s.kind === 'bot'
          ? {
              targetId: null,
              retargetAt: 0,
              nextCastAt: this.now + 1 + Math.random(),
              nextJumpAt: this.now + 2,
              strafe: Math.random() < 0.5 ? -1 : 1,
              flipAt: 0,
              prefDist: 9 + Math.random() * 9,
              aimJitter: 0.04 + Math.random() * 0.06,
            }
          : null,
    };
    this.fighters.set(f.id, f);
    return f;
  }

  removeFighter(id: string) {
    const f = this.fighters.get(id);
    if (!f) return;
    this.scene.remove(f.vis.root);
    f.vis.dispose();
    this.fighters.delete(id);
  }

  setOwnsBots(v: boolean) {
    this.ownsBots = v;
  }

  changeChar(id: string, charId: string) {
    const f = this.fighters.get(id);
    if (!f || f.charId === charId) return;
    const def = getChar(charId);
    const frac = f.hp / f.def.hp;
    this.scene.remove(f.vis.root);
    f.vis.dispose();
    f.vis = buildFighterMesh(def);
    this.scene.add(f.vis.root);
    f.def = def;
    f.charId = def.id;
    f.hp = Math.max(1, frac * def.hp);
    f.cds = def.abilities.map(() => this.now + 1);
    f.dashUntil = 0;
    f.slamIdx = -1;
    if (f.alive) this.particles.emit(center(f), { count: 50, color: def.color, speed: 8, life: 0.8, size: 0.7 });
  }

  private isAuth(f: Fighter): boolean {
    return f.kind === 'local' || (f.kind === 'bot' && this.ownsBots);
  }

  timeLeft(): number {
    return Math.max(0, MATCH_SECONDS - (this.now - this.matchStart));
  }

  scoreboard(): ScoreRow[] {
    return [...this.fighters.values()]
      .map((f) => this.row(f))
      .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
  }

  private row(f: Fighter): ScoreRow {
    return { id: f.id, name: f.name, charId: f.charId, kills: f.kills, deaths: f.deaths, isYou: f.id === this.localId, alive: f.alive };
  }

  localStatus() {
    const f = this.localId ? this.fighters.get(this.localId) : undefined;
    if (!f) return null;
    const now = this.now;
    return {
      def: f.def,
      hp: f.hp,
      alive: f.alive,
      respawnIn: Math.max(0, f.respawnAt - now),
      cds: f.cds.map((c, i) => ({ left: Math.max(0, c - now), total: f.def.abilities[i].cd })),
      stunned: f.stunUntil > now,
      slowed: f.slowUntil > now,
      shielded: f.shieldUntil > now,
      hasted: f.hasteUntil > now,
      burning: f.burnUntil > now,
      protected: f.protectUntil > now,
    };
  }

  // ---------- networking ----------

  applyRemoteState(states: FighterState[]) {
    for (const s of states) {
      const f = this.fighters.get(s.id);
      if (!f || this.isAuth(f)) continue;
      if (s.c !== f.charId) this.changeChar(f.id, s.c);
      f.netPos.set(s.p[0], s.p[1], s.p[2]);
      f.netVel.set(s.v[0], s.v[1], s.v[2]);
      f.netAt = this.now;
      f.yaw = s.y;
      f.hp = s.hp;
      f.netFlags = s.f;
      if (s.a && !f.alive) {
        f.alive = true;
        f.pos.copy(f.netPos);
      } else if (!s.a && f.alive) {
        f.alive = false;
      }
      if (!f.hasNet) f.pos.copy(f.netPos);
      f.hasNet = true;
    }
  }

  applyRemoteCast(id: string, i: number, o: Vec3Tuple, d: Vec3Tuple, dist: number, slam?: boolean) {
    const f = this.fighters.get(id);
    if (!f || this.isAuth(f)) return;
    const origin = new THREE.Vector3(...o);
    if (slam) {
      this.doSlam(f, i, origin);
      return;
    }
    this.executeCast(f, i, origin, new THREE.Vector3(...d).normalize(), dist);
  }

  applyRemoteDied(id: string, by: string | null) {
    const f = this.fighters.get(id);
    if (!f || this.isAuth(f)) return;
    this.registerKill(f, by);
  }

  private sendStates() {
    if (!this.net) return;
    const out: FighterState[] = [];
    const now = this.now;
    for (const f of this.fighters.values()) {
      if (!this.isAuth(f)) continue;
      const flags =
        (f.shieldUntil > now ? 1 : 0) |
        (f.stunUntil > now ? 2 : 0) |
        (f.burnUntil > now ? 4 : 0) |
        (f.slowUntil > now ? 8 : 0) |
        (f.hasteUntil > now ? 16 : 0);
      out.push({ id: f.id, p: tup(f.pos), v: tup(f.vel.clone().add(f.kb)), y: +f.yaw.toFixed(3), hp: +f.hp.toFixed(1), a: f.alive, c: f.charId, f: flags });
    }
    if (out.length) this.net.sendState(out);
  }

  // ---------- casting ----------

  private tryCast(f: Fighter, idx: number) {
    const now = this.now;
    const ab = f.def.abilities[idx];
    if (!ab || !f.alive || f.stunUntil > now || now < f.cds[idx]) return;
    if (f.dashUntil > now) return;
    f.cds[idx] = now + ab.cd;
    const { o, d, dist } = this.computeAim(f, ab);
    this.executeCast(f, idx, o, d, dist);
    this.net?.sendCast(f.id, idx, tup(o), tup(d), +dist.toFixed(2));
  }

  private enemies(f: Fighter): Fighter[] {
    return [...this.fighters.values()].filter((t) => t !== f && t.alive);
  }

  private moveInput(): THREE.Vector3 {
    const fwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    const right = new THREE.Vector3(-Math.cos(this.camYaw), 0, Math.sin(this.camYaw));
    const m = new THREE.Vector3();
    if (this.keys.has('KeyW')) m.add(fwd);
    if (this.keys.has('KeyS')) m.sub(fwd);
    if (this.keys.has('KeyD')) m.add(right);
    if (this.keys.has('KeyA')) m.sub(right);
    if (m.lengthSq() > 0) m.normalize();
    return m;
  }

  private computeAim(f: Fighter, ab: Ability): { o: THREE.Vector3; d: THREE.Vector3; dist: number } {
    const o = new THREE.Vector3(f.pos.x, f.pos.y + 1.5, f.pos.z);
    const range = ab.range ?? 30;
    let base: THREE.Vector3;
    let target: Fighter | null = null;
    if (f.kind === 'local') {
      base = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
      let bestAng = 0.38;
      for (const t of this.enemies(f)) {
        const to = center(t).sub(o);
        const hd = Math.hypot(to.x, to.z);
        if (hd > range + 6) continue;
        const ang = Math.acos(THREE.MathUtils.clamp((to.x * base.x + to.z * base.z) / Math.max(1e-4, hd), -1, 1));
        if (ang < bestAng) {
          bestAng = ang;
          target = t;
        }
      }
      if ((ab.kind === 'dash' || ab.kind === 'leap') && !target) {
        const m = this.moveInput();
        if (m.lengthSq() > 0) base = m;
      }
    } else {
      const t = f.ai?.targetId ? this.fighters.get(f.ai.targetId) : undefined;
      if (t && t.alive) target = t;
      base = new THREE.Vector3(Math.sin(f.yaw), 0, Math.cos(f.yaw));
    }
    let d = base.clone();
    let dist = range;
    if (target) {
      const c = center(target);
      d = c.clone().sub(o).normalize();
      dist = Math.hypot(c.x - o.x, c.z - o.z);
      if (f.ai) {
        d.x += (Math.random() - 0.5) * f.ai.aimJitter * 2;
        d.z += (Math.random() - 0.5) * f.ai.aimJitter * 2;
        d.normalize();
      }
    }
    return { o, d, dist };
  }

  private mat(color: number): THREE.MeshBasicMaterial {
    let m = this.matCache.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color });
      this.matCache.set(color, m);
    }
    return m;
  }

  private executeCast(f: Fighter, idx: number, o: THREE.Vector3, d: THREE.Vector3, dist: number) {
    const ab = f.def.abilities[idx];
    if (!ab) return;
    const color = ab.color ?? f.def.color;
    const auth = this.isAuth(f);
    if (Math.hypot(d.x, d.z) > 0.01) f.yaw = Math.atan2(d.x, d.z);
    f.castAnim = 1;
    const now = this.now;
    const flat = new THREE.Vector3(d.x, 0, d.z);
    if (flat.lengthSq() < 1e-4) flat.set(Math.sin(f.yaw), 0, Math.cos(f.yaw));
    flat.normalize();

    switch (ab.kind) {
      case 'projectile': {
        const n = ab.count ?? 1;
        const spread = ab.spread ?? 0;
        for (let i = 0; i < n; i++) {
          let ang = 0;
          if (spread >= 6) ang = (i / n) * Math.PI * 2;
          else if (n > 1) ang = -spread / 2 + (spread * i) / (n - 1);
          const dir = (spread >= 6 ? flat.clone() : d.clone()).applyAxisAngle(UP, ang).normalize();
          this.spawnProjectile(f, ab, o.clone().addScaledVector(dir, 0.8), dir, color);
        }
        this.particles.emit(o, { count: 10, color, speed: 5, life: 0.3, size: 0.5 });
        break;
      }
      case 'beam': {
        const range = ab.range ?? 40;
        const end = o.clone().addScaledVector(d, range);
        const width = ab.size ?? 0.5;
        this.beamFx(o, end, width, color);
        for (const t of this.enemies(f)) {
          if (segPointDist(o, end, center(t)) < width + 0.9) this.hit(t, f.id, ab.damage ?? 0, ab.effect, o, color);
        }
        break;
      }
      case 'nova': {
        const r = ab.radius ?? 6;
        const at = f.pos.clone().add(new THREE.Vector3(0, 0.3, 0));
        this.novaFx(at, r, color);
        for (const t of this.enemies(f)) {
          if (t.pos.distanceTo(f.pos) < r) this.hit(t, f.id, ab.damage ?? 0, ab.effect, f.pos, color);
        }
        break;
      }
      case 'dash': {
        f.dashDir.copy(flat);
        f.dashSpeed = ab.speed ?? 60;
        f.dashUntil = now + (ab.range ?? 15) / f.dashSpeed;
        f.dashAbility = ab;
        f.dashHit.clear();
        this.particles.emit(f.pos.clone().setY(f.pos.y + 1), { count: 25, color, speed: 6, life: 0.5, size: 0.7 });
        break;
      }
      case 'leap': {
        if (auth) {
          f.vel.y = ab.lift ?? 18;
          f.onGround = false;
          f.kb.addScaledVector(flat, (ab.speed ?? 10) * 1.6);
          f.slamIdx = idx;
          f.slamArmedAt = now + 0.2;
        }
        this.particles.emit(f.pos.clone(), { count: 40, color, speed: 9, life: 0.6, size: 0.8, up: 0.6 });
        break;
      }
      case 'shield':
        f.shieldUntil = now + (ab.duration ?? 3);
        f.shieldMult = ab.mult ?? 0.5;
        this.particles.emit(center(f), { count: 30, color, speed: 6, life: 0.6, size: 0.6 });
        break;
      case 'heal':
        if (auth) f.hp = Math.min(f.def.hp, f.hp + (ab.amount ?? 25));
        this.particles.emit(f.pos.clone(), { count: 50, color: 0x6dff9d, speed: 3, life: 1.1, size: 0.6, up: 1.4, spread: 0.5 });
        break;
      case 'haste':
        f.hasteUntil = now + (ab.duration ?? 3);
        f.hasteMult = ab.mult ?? 1.5;
        this.particles.emit(f.pos.clone(), { count: 30, color, speed: 7, life: 0.5, size: 0.6 });
        break;
      case 'zone': {
        const p = this.placePoint(f, flat, dist, ab.range ?? 0);
        this.spawnZone(f, ab, p, color);
        break;
      }
      case 'strike': {
        const p = this.placePoint(f, flat, dist, ab.range ?? 15);
        this.spawnStrike(f, ab, p, color);
        break;
      }
    }
  }

  private placePoint(f: Fighter, flat: THREE.Vector3, dist: number, range: number): THREE.Vector3 {
    const p = f.pos.clone();
    if (range > 0) p.addScaledVector(flat, Math.min(dist, range));
    const r = Math.hypot(p.x, p.z);
    const max = this.arena.radius - 2;
    if (r > max) p.multiplyScalar(max / r);
    p.y = groundAt(this.arena, p.x, p.z);
    return p;
  }

  private doSlam(f: Fighter, idx: number, at: THREE.Vector3) {
    const ab = f.def.abilities[idx];
    if (!ab) return;
    const color = ab.color ?? f.def.color;
    const r = ab.radius ?? 5;
    this.novaFx(at.clone().setY(at.y + 0.2), r, color);
    this.particles.emit(at, { count: 60, color: 0xd8d0c0, speed: 10, life: 0.7, size: 0.9, up: 0.5 });
    for (const t of this.enemies(f)) {
      if (t.pos.distanceTo(at) < r) this.hit(t, f.id, ab.damage ?? 0, ab.effect, at, color);
    }
  }

  private hit(t: Fighter, ownerId: string, dmg: number, e: Effect | undefined, src: THREE.Vector3, color: number) {
    if (!t.alive || t.id === ownerId) return;
    this.particles.emit(center(t), { count: 14, color, speed: 7, life: 0.45, size: 0.55 });
    if (ownerId === this.localId) this.onHit?.();
    if (!this.isAuth(t)) return;
    const now = this.now;
    if (t.protectUntil > now) return;
    if (e) {
      if (e.slow) {
        t.slowMult = t.slowUntil > now ? Math.min(t.slowMult, e.slow) : e.slow;
        t.slowUntil = Math.max(t.slowUntil, now + (e.slowDur ?? 1));
      }
      if (e.stun) t.stunUntil = Math.max(t.stunUntil, now + e.stun * (t.shieldUntil > now ? 0.5 : 1));
      if (e.burn) {
        t.burnDps = t.burnUntil > now ? Math.max(e.burn, t.burnDps) : e.burn;
        t.burnUntil = Math.max(t.burnUntil, now + (e.burnDur ?? 2));
        t.burnBy = ownerId;
      }
      if (e.knock) {
        const dir = t.pos.clone().sub(src);
        dir.y = 0;
        if (dir.lengthSq() < 1e-4) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        dir.normalize();
        if (e.pull) dir.negate();
        t.kb.addScaledVector(dir, e.knock);
        if (!e.pull) t.vel.y = Math.max(t.vel.y, e.knock * 0.2);
        t.dashUntil = 0;
      }
      if (e.lift) {
        t.vel.y = Math.max(t.vel.y, e.lift);
        t.onGround = false;
      }
    }
    this.applyDamage(t, dmg, ownerId);
  }

  private applyDamage(t: Fighter, dmg: number, by: string | null) {
    if (!t.alive || dmg <= 0) return;
    const now = this.now;
    if (t.protectUntil > now) return;
    if (t.shieldUntil > now) dmg *= t.shieldMult;
    t.hp -= dmg;
    t.lastHitAt = now;
    if (t.id === this.localId) this.onLocalDamaged?.();
    if (t.hp <= 0) {
      t.hp = 0;
      t.respawnAt = now + RESPAWN_SECONDS;
      this.registerKill(t, by);
      this.net?.sendDied(t.id, by);
    }
  }

  private registerKill(victim: Fighter, by: string | null) {
    victim.alive = false;
    victim.hp = 0;
    victim.deaths++;
    victim.dashUntil = 0;
    victim.slamIdx = -1;
    this.particles.emit(center(victim), { count: 120, color: victim.def.color, speed: 14, life: 1.1, size: 0.9, gravity: 12 });
    this.novaFx(victim.pos.clone().setY(victim.pos.y + 1), 4, victim.def.color);
    const killer = by && by !== victim.id ? this.fighters.get(by) : undefined;
    if (killer) killer.kills++;
    if (!this.demo) this.onKill?.({ killer: killer ? this.row(killer) : null, victim: this.row(victim) });
    if (!this.demo && killer && killer.kills >= KO_TARGET) this.endMatch();
  }

  private endMatch() {
    if (!this.running) return;
    this.running = false;
    this.releasePointer();
    this.onEnd?.(this.scoreboard());
  }

  // ---------- spawners & fx ----------

  private spawnProjectile(f: Fighter, ab: Ability, pos: THREE.Vector3, dir: THREE.Vector3, color: number) {
    const size = ab.size ?? 0.4;
    const mesh = new THREE.Mesh(this.sphereGeo, this.mat(color));
    mesh.scale.setScalar(size);
    const outline = new THREE.Mesh(this.sphereGeo, OUTLINE_MAT);
    outline.scale.setScalar(1.22);
    mesh.add(outline);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.projectiles.push({
      owner: f.id,
      pos,
      vel: dir.multiplyScalar(ab.speed ?? 40),
      size,
      damage: ab.damage ?? 0,
      left: ab.range ?? 40,
      pierce: !!ab.pierce,
      homing: !!ab.homing,
      effect: ab.effect,
      color,
      mesh,
      hit: new Set(),
    });
  }

  private spawnZone(f: Fighter, ab: Ability, p: THREE.Vector3, color: number) {
    const r = ab.radius ?? 6;
    const g = new THREE.Group();
    g.position.copy(p).setY(p.y + 0.05);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(r, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    );
    disc.rotation.x = -Math.PI / 2;
    g.add(disc);
    const edge = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.25, r, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }),
    );
    edge.rotation.x = -Math.PI / 2;
    g.add(edge);
    const swirl = new THREE.Mesh(
      new THREE.RingGeometry(r * 0.3, r * 0.75, 6, 1, 0, Math.PI * 1.2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
    );
    swirl.rotation.x = -Math.PI / 2;
    swirl.name = 'swirl';
    g.add(swirl);
    this.scene.add(g);
    this.zones.push({
      owner: f.id,
      pos: p,
      radius: r,
      dps: ab.damage ?? 0,
      until: this.now + (ab.duration ?? 4),
      nextTick: this.now + 0.25,
      effect: ab.effect,
      color,
      obj: g,
    });
  }

  private spawnStrike(f: Fighter, ab: Ability, p: THREE.Vector3, color: number) {
    const r = ab.radius ?? 5;
    const g = new THREE.Group();
    g.position.copy(p).setY(p.y + 0.06);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.3, r, 64),
      new THREE.MeshBasicMaterial({ color: 0xff3355, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    g.add(ring);
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(r, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }),
    );
    fill.rotation.x = -Math.PI / 2;
    fill.name = 'fill';
    g.add(fill);
    this.scene.add(g);
    let faller: THREE.Mesh | null = null;
    if (!ab.effect?.lift) {
      faller = new THREE.Mesh(
        f.def.id === 'frost' ? new THREE.ConeGeometry(r * 0.35, r * 1.2, 6) : new THREE.SphereGeometry(r * 0.3, 16, 12),
        new THREE.MeshBasicMaterial({ color }),
      );
      const outline = new THREE.Mesh(faller.geometry, OUTLINE_MAT);
      outline.scale.setScalar(1.12);
      faller.add(outline);
      if (f.def.id === 'frost') faller.rotation.x = Math.PI;
      this.scene.add(faller);
    }
    const delay = ab.delay ?? 1;
    this.strikes.push({ owner: f.id, pos: p, radius: r, damage: ab.damage ?? 0, at: this.now + delay, start: this.now, effect: ab.effect, color, obj: g, faller });
  }

  private addFx(obj: THREE.Object3D, life: number, update: (k: number) => void) {
    this.scene.add(obj);
    this.fx.push({ obj, t: 0, life, update });
  }

  private novaFx(at: THREE.Vector3, r: number, color: number) {
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 64), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(at);
    this.addFx(ring, 0.45, (k) => {
      ring.scale.setScalar(0.5 + r * Math.sqrt(k));
      ringMat.opacity = 0.9 * (1 - k);
    });
    const sMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), sMat);
    sphere.position.copy(at);
    this.addFx(sphere, 0.35, (k) => {
      sphere.scale.setScalar(0.3 + r * k);
      sMat.opacity = 0.35 * (1 - k);
    });
    this.particles.emit(at, { count: Math.min(160, 20 + r * 8), color, speed: r * 1.8, life: 0.6, size: 0.7, spread: 1 });
  }

  private beamFx(o: THREE.Vector3, end: THREE.Vector3, width: number, color: number) {
    const dir = end.clone().sub(o);
    const len = dir.length();
    dir.normalize();
    const mid = o.clone().addScaledVector(dir, len / 2);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    const outerMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false });
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(width, width, len, 12, 1, true), outerMat);
    outer.position.copy(mid);
    outer.quaternion.copy(q);
    this.addFx(outer, 0.4, (k) => {
      outer.scale.set(1 - k * 0.8, 1, 1 - k * 0.8);
      outerMat.opacity = 0.7 * (1 - k);
    });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.35, width * 0.35, len, 8, 1, true), coreMat);
    core.position.copy(mid);
    core.quaternion.copy(q);
    this.addFx(core, 0.25, (k) => {
      coreMat.opacity = 0.9 * (1 - k);
    });
    for (let i = 0; i < 12; i++) {
      const p = o.clone().addScaledVector(dir, (i / 12) * len);
      this.particles.emit(p, { count: 3, color, speed: 3, life: 0.5, size: width + 0.3 });
    }
  }

  private disposeObj(obj: THREE.Object3D) {
    this.scene.remove(obj);
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.userData.isOutline || m.material === OUTLINE_MAT) return;
      if (m.geometry && m.geometry !== this.sphereGeo) m.geometry.dispose();
      const mat = m.material as THREE.Material | undefined;
      if (mat && ![...this.matCache.values()].includes(mat as THREE.MeshBasicMaterial)) mat.dispose();
    });
  }

  // ---------- simulation ----------

  private frame(dt: number) {
    this.now = performance.now() / 1000;
    const now = this.now;

    for (const f of this.fighters.values()) {
      if (this.isAuth(f)) {
        if (!f.alive) {
          if (now >= f.respawnAt && (this.running || this.demo)) this.respawn(f);
          continue;
        }
        let move = new THREE.Vector3();
        let jump = false;
        if (f.kind === 'local') {
          if (this.running) {
            move = this.moveInput();
            jump = this.jumpBufferedUntil > now || this.keys.has('Space');
            if (this.keys.has('ArrowLeft')) this.camYaw += 2.4 * dt;
            if (this.keys.has('ArrowRight')) this.camYaw -= 2.4 * dt;
          }
          f.yaw = this.lerpAngle(f.yaw, this.camYaw, 1 - Math.exp(-14 * dt));
        } else if (f.ai && this.running) {
          const r = this.botThink(f);
          move = r.move;
          jump = r.jump;
        }
        if (this.simulate(f, move, jump, dt) && f.kind === 'local') this.jumpBufferedUntil = 0;
        if (f.burnUntil > now) this.applyDamage(f, f.burnDps * dt, f.burnBy);
      } else if (f.hasNet) {
        const lead = Math.min(0.15, now - f.netAt);
        tmp.copy(f.netPos).addScaledVector(f.netVel, lead);
        if (f.pos.distanceTo(tmp) > 12) f.pos.copy(tmp);
        else f.pos.lerp(tmp, 1 - Math.exp(-14 * dt));
        f.vel.copy(f.netVel);
      }
    }

    this.updateDashes();
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.updateStrikes();
    this.updateFx(dt);
    this.particles.update(dt);
    this.animateFighters(dt);
    for (const c of this.arena.crystals) c.rotation.y += dt * 0.8;
    this.arena.clouds.rotation.y += dt * 0.004;

    if (this.net && this.running && now - this.lastStateSent > 0.05) {
      this.lastStateSent = now;
      this.sendStates();
    }
    if (this.running && !this.demo && this.timeLeft() <= 0) this.endMatch();

    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private lerpAngle(a: number, b: number, k: number): number {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * k;
  }

  private respawn(f: Fighter) {
    const others = this.enemies(f);
    let best = this.arena.spawns[0];
    let bestScore = -Infinity;
    for (const s of this.arena.spawns) {
      const near = others.reduce((m, o) => Math.min(m, o.pos.distanceTo(s)), Infinity);
      const score = near + Math.random() * 15;
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    f.pos.copy(best);
    f.vel.set(0, 0, 0);
    f.kb.set(0, 0, 0);
    f.hp = f.def.hp;
    f.alive = true;
    f.slowUntil = f.stunUntil = f.burnUntil = f.hasteUntil = f.shieldUntil = f.dashUntil = 0;
    f.slamIdx = -1;
    f.protectUntil = this.now + 1.5;
    if (f.kind === 'local') this.camYaw = Math.atan2(-best.x, -best.z);
    this.particles.emit(center(f), { count: 60, color: f.def.color, speed: 8, life: 0.8, size: 0.7, up: 0.5 });
  }

  /** Returns true if a jump happened. */
  private simulate(f: Fighter, move: THREE.Vector3, jump: boolean, dt: number): boolean {
    const now = this.now;
    const stunned = f.stunUntil > now;
    let speed = f.def.speed;
    if (f.slowUntil > now) speed *= f.slowMult;
    if (f.hasteUntil > now) speed *= f.hasteMult;
    if (stunned) {
      move.set(0, 0, 0);
      jump = false;
    }
    const dashing = f.dashUntil > now && !stunned;
    let jumped = false;
    if (dashing) {
      f.vel.x = f.dashDir.x * f.dashSpeed;
      f.vel.z = f.dashDir.z * f.dashSpeed;
      f.vel.y = 0;
    } else {
      const k = 1 - Math.exp(-(f.onGround ? 14 : 4) * dt);
      f.vel.x += (move.x * speed - f.vel.x) * k;
      f.vel.z += (move.z * speed - f.vel.z) * k;
      if (jump && f.onGround) {
        f.vel.y = JUMP_VEL;
        f.onGround = false;
        jumped = true;
      }
      f.vel.y -= GRAVITY * dt;
    }
    const prevY = f.pos.y;
    f.pos.x += (f.vel.x + f.kb.x) * dt;
    f.pos.z += (f.vel.z + f.kb.z) * dt;
    f.pos.y += f.vel.y * dt;
    f.kb.multiplyScalar(Math.exp(-3.5 * dt));
    this.collide(f, prevY);
    return jumped;
  }

  private collide(f: Fighter, prevY: number) {
    const r = BODY_RADIUS;
    for (const p of this.arena.pillars) {
      if (f.pos.y >= p.h) continue;
      const dx = f.pos.x - p.x;
      const dz = f.pos.z - p.z;
      const d = Math.hypot(dx, dz);
      const min = p.r + r;
      if (d < min && d > 1e-4) {
        f.pos.x = p.x + (dx / d) * min;
        f.pos.z = p.z + (dz / d) * min;
      }
    }
    for (const pl of this.arena.platforms) {
      if (f.pos.y >= pl.top - 0.3 || prevY >= pl.top - 0.35) continue;
      const dx = f.pos.x - pl.x;
      const dz = f.pos.z - pl.z;
      const ox = pl.hw + r - Math.abs(dx);
      const oz = pl.hd + r - Math.abs(dz);
      if (ox > 0 && oz > 0) {
        if (ox < oz) {
          f.pos.x += Math.sign(dx || 1) * ox;
          f.kb.x *= -0.3;
        } else {
          f.pos.z += Math.sign(dz || 1) * oz;
          f.kb.z *= -0.3;
        }
      }
    }
    const g = groundAt(this.arena, f.pos.x, f.pos.z, prevY, 0.2);
    if (f.pos.y <= g) {
      f.pos.y = g;
      if (f.vel.y < 0) f.vel.y = 0;
      if (!f.onGround) this.landed(f);
      f.onGround = true;
    } else if (f.pos.y > g + 0.05) {
      f.onGround = false;
    }
    const R = this.arena.radius - r;
    const d = Math.hypot(f.pos.x, f.pos.z);
    if (d > R) {
      f.pos.x *= R / d;
      f.pos.z *= R / d;
      const nx = f.pos.x / R;
      const nz = f.pos.z / R;
      const dot = f.kb.x * nx + f.kb.z * nz;
      if (dot > 0) {
        f.kb.x -= 1.5 * dot * nx;
        f.kb.z -= 1.5 * dot * nz;
      }
    }
  }

  private landed(f: Fighter) {
    if (f.slamIdx >= 0 && this.now > f.slamArmedAt && this.isAuth(f)) {
      const idx = f.slamIdx;
      f.slamIdx = -1;
      const at = f.pos.clone();
      this.doSlam(f, idx, at);
      this.net?.sendCast(f.id, idx, tup(at), [0, 1, 0], 0, true);
    }
  }

  private updateDashes() {
    const now = this.now;
    for (const f of this.fighters.values()) {
      if (f.dashUntil <= now || !f.alive || !f.dashAbility) continue;
      const ab = f.dashAbility;
      this.particles.emit(center(f), { count: 3, color: f.def.color, speed: 2, life: 0.4, size: 0.8 });
      if (!ab.damage && !ab.effect) continue;
      for (const t of this.enemies(f)) {
        if (f.dashHit.has(t.id)) continue;
        if (t.pos.distanceTo(f.pos) < 1.9) {
          f.dashHit.add(t.id);
          this.hit(t, f.id, ab.damage ?? 0, ab.effect, f.pos, f.def.color);
        }
      }
    }
  }

  private updateProjectiles(dt: number) {
    const keep: Projectile[] = [];
    for (const p of this.projectiles) {
      let dead = false;
      if (p.homing) {
        let best: Fighter | null = null;
        let bd = 35;
        for (const t of this.fighters.values()) {
          if (!t.alive || t.id === p.owner) continue;
          const d = center(t, tmp2).distanceTo(p.pos);
          if (d < bd) {
            bd = d;
            best = t;
          }
        }
        if (best) {
          const speed = p.vel.length();
          const want = center(best).sub(p.pos).normalize().multiplyScalar(speed);
          p.vel.lerp(want, 1 - Math.exp(-3 * dt)).setLength(speed);
        }
      }
      const step = p.vel.length() * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.left -= step;
      if (p.left <= 0 || p.pos.y < 0.05) dead = true;
      if (!dead && Math.hypot(p.pos.x, p.pos.z) > this.arena.radius) dead = true;
      if (!dead) {
        for (const pl of this.arena.pillars) {
          if (p.pos.y < pl.h && Math.hypot(p.pos.x - pl.x, p.pos.z - pl.z) < pl.r + p.size * 0.5) dead = true;
        }
        for (const pl of this.arena.platforms) {
          if (p.pos.y < pl.top && Math.abs(p.pos.x - pl.x) < pl.hw && Math.abs(p.pos.z - pl.z) < pl.hd) dead = true;
        }
      }
      if (!dead) {
        for (const t of this.fighters.values()) {
          if (!t.alive || t.id === p.owner || p.hit.has(t.id)) continue;
          const a = new THREE.Vector3(t.pos.x, t.pos.y + 0.3, t.pos.z);
          const b = new THREE.Vector3(t.pos.x, t.pos.y + 2.4, t.pos.z);
          if (segPointDist(a, b, p.pos) < p.size + BODY_RADIUS) {
            p.hit.add(t.id);
            this.hit(t, p.owner, p.damage, p.effect, p.pos.clone().sub(p.vel.clone().setLength(1)), p.color);
            if (!p.pierce) {
              dead = true;
              break;
            }
          }
        }
      }
      if (dead) {
        this.particles.emit(p.pos, { count: 8, color: p.color, speed: 4, life: 0.35, size: p.size + 0.2 });
        this.scene.remove(p.mesh);
      } else {
        p.mesh.position.copy(p.pos);
        if (Math.random() < 0.7) this.particles.emit(p.pos, { count: 1, color: p.color, speed: 0.6, life: 0.3, size: p.size * 1.6 });
        keep.push(p);
      }
    }
    this.projectiles = keep;
  }

  private updateZones(dt: number) {
    const now = this.now;
    const keep: Zone[] = [];
    for (const z of this.zones) {
      if (now >= z.until) {
        this.disposeObj(z.obj);
        continue;
      }
      const swirl = z.obj.getObjectByName('swirl');
      if (swirl) swirl.rotation.z += dt * (z.effect?.pull ? -4 : 2);
      const life = z.until - now;
      z.obj.scale.setScalar(life < 0.3 ? life / 0.3 : 1);
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * z.radius;
      this.particles.emit(new THREE.Vector3(z.pos.x + Math.cos(a) * rr, z.pos.y + 0.3, z.pos.z + Math.sin(a) * rr), {
        count: 2,
        color: z.color,
        speed: 2,
        life: 0.8,
        size: 0.6,
        up: z.effect?.lift ? 3 : 1,
        spread: 0.3,
      });
      const tick = now >= z.nextTick;
      if (tick) z.nextTick = now + 0.5;
      for (const t of this.fighters.values()) {
        if (!t.alive || t.id === z.owner) continue;
        const dx = z.pos.x - t.pos.x;
        const dz = z.pos.z - t.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > z.radius || Math.abs(t.pos.y - z.pos.y) > 5) continue;
        if (this.isAuth(t) && t.protectUntil <= now) {
          if (z.effect?.pull && d > 0.5) {
            t.kb.x += (dx / d) * 34 * dt;
            t.kb.z += (dz / d) * 34 * dt;
          }
          if (z.effect?.lift && t.vel.y < z.effect.lift) t.vel.y += 40 * dt;
        }
        if (tick) {
          const e = z.effect ? { slow: z.effect.slow, slowDur: z.effect.slowDur, stun: z.effect.stun, burn: z.effect.burn, burnDur: z.effect.burnDur } : undefined;
          this.hit(t, z.owner, z.dps * 0.5, e, z.pos, z.color);
        }
      }
      keep.push(z);
    }
    this.zones = keep;
  }

  private updateStrikes() {
    const now = this.now;
    const keep: Strike[] = [];
    for (const s of this.strikes) {
      const k = Math.min(1, (now - s.start) / Math.max(0.01, s.at - s.start));
      const fill = s.obj.getObjectByName('fill');
      if (fill) fill.scale.setScalar(Math.max(0.01, k));
      if (s.faller) s.faller.position.set(s.pos.x, s.pos.y + 30 * (1 - k) + 1, s.pos.z);
      if (now < s.at) {
        keep.push(s);
        continue;
      }
      this.disposeObj(s.obj);
      if (s.faller) this.disposeObj(s.faller);
      this.novaFx(s.pos.clone().setY(s.pos.y + 0.3), s.radius, s.color);
      if (s.effect?.lift) {
        this.particles.emit(s.pos, { count: 120, color: s.color, speed: 14, life: 1, size: 0.9, up: 2.5, spread: 0.35, gravity: 18 });
      }
      for (const t of this.fighters.values()) {
        if (!t.alive || t.id === s.owner) continue;
        if (Math.hypot(t.pos.x - s.pos.x, t.pos.z - s.pos.z) < s.radius && Math.abs(t.pos.y - s.pos.y) < s.radius) {
          this.hit(t, s.owner, s.damage, s.effect, s.pos, s.color);
        }
      }
    }
    this.strikes = keep;
  }

  private updateFx(dt: number) {
    const keep: Fx[] = [];
    for (const x of this.fx) {
      x.t += dt;
      const k = Math.min(1, x.t / x.life);
      x.update(k);
      if (k >= 1) this.disposeObj(x.obj);
      else keep.push(x);
    }
    this.fx = keep;
  }

  private animateFighters(dt: number) {
    const now = this.now;
    for (const f of this.fighters.values()) {
      const v = f.vis;
      v.root.visible = f.alive;
      if (!f.alive) continue;
      const auth = this.isAuth(f);
      const flags = auth ? 0 : f.netFlags;
      const shielded = f.shieldUntil > now || (flags & 1) !== 0;
      const stunned = f.stunUntil > now || (flags & 2) !== 0;
      const burning = f.burnUntil > now || (flags & 4) !== 0;
      const slowed = f.slowUntil > now || (flags & 8) !== 0;
      const hasted = f.hasteUntil > now || (flags & 16) !== 0;
      v.root.position.copy(f.pos);
      v.root.rotation.y = f.yaw;
      const hs = Math.hypot(f.vel.x, f.vel.z);
      const grounded = f.pos.y - groundAt(this.arena, f.pos.x, f.pos.z, f.pos.y + 0.1, 0.2) < 0.15;
      if (!stunned) f.walkPhase += dt * Math.min(hs, 14) * 1.3;
      const amp = grounded ? Math.min(1, hs / 7) * 0.8 : 0;
      v.legL.rotation.x = grounded ? Math.sin(f.walkPhase) * amp : -0.6;
      v.legR.rotation.x = grounded ? -Math.sin(f.walkPhase) * amp : 0.3;
      v.armL.rotation.x = -Math.sin(f.walkPhase) * amp * 0.8;
      f.castAnim = Math.max(0, f.castAnim - dt * 4);
      v.armR.rotation.x = f.castAnim > 0 ? -1.6 * f.castAnim : Math.sin(f.walkPhase) * amp * 0.8;
      v.body.rotation.x = f.dashUntil > now ? 0.4 : 0;
      v.aura.rotation.y += dt * 2;
      v.shield.visible = shielded;
      if (shielded) v.shield.rotation.y += dt;
      v.ice.visible = stunned;
      const protect = f.protectUntil > now;
      v.body.visible = !protect || Math.floor(now * 12) % 2 === 0;
      v.setLabel(f.name, f.hp, f.def.hp, f.id === this.localId);
      if (burning && Math.random() < 0.5) this.particles.emit(center(f), { count: 1, color: 0xff7a1a, speed: 1.5, life: 0.5, size: 0.6, up: 1.5, spread: 0.4 });
      if (slowed && Math.random() < 0.3) this.particles.emit(f.pos.clone().setY(f.pos.y + 0.3), { count: 1, color: 0x9fe8ff, speed: 1, life: 0.5, size: 0.4 });
      if (hasted && Math.random() < 0.5) this.particles.emit(f.pos.clone().setY(f.pos.y + 0.5), { count: 1, color: f.def.color, speed: 0.5, life: 0.4, size: 0.6 });
    }
  }

  // ---------- bots ----------

  private botThink(f: Fighter): { move: THREE.Vector3; jump: boolean } {
    const b = f.ai!;
    const now = this.now;
    let t = b.targetId ? this.fighters.get(b.targetId) : undefined;
    if (!t || !t.alive || now > b.retargetAt) {
      const list = this.enemies(f).sort((x, y) => x.pos.distanceTo(f.pos) - y.pos.distanceTo(f.pos));
      t = list.length ? (Math.random() < 0.7 ? list[0] : list[Math.floor(Math.random() * list.length)]) : undefined;
      b.targetId = t?.id ?? null;
      b.retargetAt = now + 3 + Math.random() * 3;
    }
    const move = new THREE.Vector3();
    let jump = false;
    if (t) {
      const to = t.pos.clone().sub(f.pos);
      to.y = 0;
      const d = to.length();
      const dir = d > 0.01 ? to.divideScalar(d) : new THREE.Vector3(0, 0, 1);
      if (d > b.prefDist + 4) move.add(dir);
      else if (d < b.prefDist - 4) move.sub(dir);
      if (now > b.flipAt) {
        b.strafe = Math.random() < 0.5 ? -1 : 1;
        b.flipAt = now + 0.8 + Math.random() * 2;
      }
      move.add(new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(b.strafe * 0.8));
      f.yaw = this.lerpAngle(f.yaw, Math.atan2(dir.x, dir.z), 0.25);
      if (now > b.nextCastAt && f.stunUntil <= now) {
        b.nextCastAt = now + 0.3 + Math.random() * 0.7;
        const options: number[] = [];
        f.def.abilities.forEach((ab, i) => {
          if (now >= f.cds[i] && this.botSuits(f, ab, d)) options.push(i);
        });
        if (options.length) {
          const pick = Math.random() < 0.4 ? options[options.length - 1] : options[Math.floor(Math.random() * options.length)];
          this.tryCast(f, pick);
        }
      }
    } else if (f.pos.length() > 20) {
      move.copy(f.pos).negate().setY(0).normalize().multiplyScalar(0.6);
    }
    if (Math.hypot(f.pos.x, f.pos.z) > this.arena.radius - 8) move.add(f.pos.clone().negate().setY(0).normalize());
    if (move.lengthSq() > 1) move.normalize();
    if (f.onGround && move.lengthSq() > 0.2 && Math.hypot(f.vel.x, f.vel.z) < 1.5) jump = true;
    if (now > b.nextJumpAt) {
      b.nextJumpAt = now + 1 + Math.random() * 3;
      jump = Math.random() < 0.5;
    }
    return { move, jump };
  }

  private botSuits(f: Fighter, ab: Ability, d: number): boolean {
    const now = this.now;
    switch (ab.kind) {
      case 'projectile':
        return d < (ab.range ?? 40) * 0.85;
      case 'beam':
        return d < (ab.range ?? 40) * 0.9;
      case 'nova':
        return d < (ab.radius ?? 6) * 0.85;
      case 'dash':
        return ab.damage ? d < (ab.range ?? 15) + 2 && d > 3 : now - f.lastHitAt < 1 && Math.random() < 0.4;
      case 'leap':
        return ab.damage ? d < (ab.radius ?? 5) + 5 : false;
      case 'shield':
        return now - f.lastHitAt < 1.2;
      case 'heal':
        return f.hp < f.def.hp * 0.6;
      case 'haste':
        return d > 22 || f.hp < f.def.hp * 0.35;
      case 'zone':
        return (ab.range ?? 0) === 0 ? d < (ab.radius ?? 6) * 0.8 : d < (ab.range ?? 0) + (ab.radius ?? 6) * 0.5;
      case 'strike':
        return d < (ab.range ?? 15) + (ab.radius ?? 5) * 0.5;
    }
  }

  // ---------- camera ----------

  private updateCamera(dt: number) {
    const f = this.localId ? this.fighters.get(this.localId) : undefined;
    if (!f || this.demo) {
      this.menuAngle += dt * 0.06;
      const r = 42;
      this.camera.position.set(Math.cos(this.menuAngle) * r, 40, Math.sin(this.menuAngle) * r);
      this.camera.lookAt(0, 2, 0);
      return;
    }
    const fwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    const right = new THREE.Vector3(-Math.cos(this.camYaw), 0, Math.sin(this.camYaw));
    const target = new THREE.Vector3(f.pos.x, f.pos.y + 2.2, f.pos.z);
    const dist = 12.5;
    const want = target
      .clone()
      .addScaledVector(right, 1.3)
      .addScaledVector(fwd, -Math.cos(this.camPitch) * dist)
      .add(new THREE.Vector3(0, Math.sin(this.camPitch) * dist, 0));
    const R = this.arena.radius - 1;
    const hr = Math.hypot(want.x, want.z);
    if (hr > R) {
      want.x *= R / hr;
      want.z *= R / hr;
    }
    want.y = Math.max(0.6, want.y);
    this.camera.position.lerp(want, 1 - Math.exp(-18 * dt));
    const look = target.clone().addScaledVector(right, 0.6).addScaledVector(fwd, 10);
    look.y += 0.8 - this.camPitch * 5;
    this.camera.lookAt(look);
  }
}
