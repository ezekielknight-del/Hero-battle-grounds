export type AbilityKind =
  | 'projectile'
  | 'beam'
  | 'nova'
  | 'dash'
  | 'leap'
  | 'shield'
  | 'heal'
  | 'haste'
  | 'zone'
  | 'strike';

export interface Effect {
  /** movement multiplier while slowed, e.g. 0.5 */
  slow?: number;
  slowDur?: number;
  stun?: number;
  burn?: number;
  burnDur?: number;
  knock?: number;
  lift?: number;
  pull?: boolean;
}

export interface Ability {
  name: string;
  kind: AbilityKind;
  cd: number;
  desc: string;
  damage?: number;
  speed?: number;
  size?: number;
  count?: number;
  /** radians; >= 6 means fire evenly in a full circle */
  spread?: number;
  range?: number;
  radius?: number;
  duration?: number;
  delay?: number;
  pierce?: boolean;
  homing?: boolean;
  amount?: number;
  mult?: number;
  lift?: number;
  effect?: Effect;
  color?: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  element: string;
  tagline: string;
  color: number;
  accent: number;
  css: string;
  hp: number;
  speed: number;
  abilities: Ability[];
}

const slow = (s: number, d: number): Effect => ({ slow: s, slowDur: d });
const burn = (dps: number, d: number): Effect => ({ burn: dps, burnDur: d });

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'frost',
    name: 'Frost',
    element: 'Ice',
    tagline: 'Freezes the battlefield and shatters whoever is stuck in it.',
    color: 0x7fdcff,
    accent: 0xe8fbff,
    css: '#7fdcff',
    hp: 110,
    speed: 9,
    abilities: [
      { name: 'Ice Shard', kind: 'projectile', cd: 0.45, damage: 9, speed: 48, size: 0.35, range: 55, effect: slow(0.7, 1), desc: 'Fast shard that chills the target.' },
      { name: 'Frost Volley', kind: 'projectile', cd: 3, damage: 8, speed: 44, size: 0.35, count: 3, spread: 0.3, range: 50, effect: slow(0.65, 1.5), desc: 'Three shards in a fan.' },
      { name: 'Glacier Lance', kind: 'beam', cd: 6, damage: 18, range: 45, size: 0.5, effect: slow(0.5, 2), desc: 'Piercing ice beam that slows heavily.' },
      { name: 'Frozen Armor', kind: 'shield', cd: 12, duration: 4, mult: 0.35, desc: 'Take 65% less damage for 4s.' },
      { name: 'Ice Slide', kind: 'dash', cd: 5, range: 14, speed: 55, damage: 6, effect: slow(0.6, 1.5), desc: 'Skate forward, chilling anyone you hit.' },
      { name: 'Blizzard', kind: 'zone', cd: 12, range: 16, radius: 7, damage: 7, duration: 5, effect: slow(0.45, 0.8), desc: 'Snowstorm that damages and slows.' },
      { name: 'Flash Freeze', kind: 'nova', cd: 11, radius: 7, damage: 10, effect: { stun: 1.2 }, desc: 'Freeze everyone near you solid.' },
      { name: 'Icicle Rain', kind: 'strike', cd: 9, range: 20, radius: 6, delay: 0.9, damage: 26, effect: slow(0.5, 2), desc: 'Giant icicles crash down on a spot.' },
      { name: 'Absolute Zero', kind: 'nova', cd: 40, radius: 16, damage: 30, effect: { stun: 2 }, desc: 'ULTIMATE: Freeze the whole area for 2s.' },
    ],
  },
  {
    id: 'blaze',
    name: 'Blaze',
    element: 'Fire',
    tagline: 'All offense. Sets everything on fire and keeps it burning.',
    color: 0xff6a2b,
    accent: 0xffd23f,
    css: '#ff6a2b',
    hp: 95,
    speed: 9.5,
    abilities: [
      { name: 'Fireball', kind: 'projectile', cd: 0.6, damage: 11, speed: 40, size: 0.5, range: 50, effect: burn(4, 2), desc: 'Classic fireball that ignites.' },
      { name: 'Flame Fan', kind: 'projectile', cd: 3.5, damage: 6, speed: 40, size: 0.45, count: 5, spread: 0.6, range: 22, effect: burn(3, 2), desc: 'Short-range spray of flames.' },
      { name: 'Fire Lance', kind: 'beam', cd: 6, damage: 20, range: 40, size: 0.5, effect: burn(5, 2), desc: 'Searing beam of fire.' },
      { name: 'Ember Cloak', kind: 'haste', cd: 10, duration: 4, mult: 1.6, desc: 'Move 60% faster for 4s.' },
      { name: 'Blast Off', kind: 'leap', cd: 8, lift: 20, speed: 14, radius: 6, damage: 18, effect: { knock: 16 }, desc: 'Rocket into the air and slam down.' },
      { name: 'Inferno Ring', kind: 'zone', cd: 12, range: 0, radius: 8, damage: 9, duration: 4, effect: burn(3, 1), desc: 'Ring of fire around you.' },
      { name: 'Heat Wave', kind: 'nova', cd: 9, radius: 9, damage: 12, effect: { knock: 22 }, desc: 'Blast enemies away from you.' },
      { name: 'Meteor', kind: 'strike', cd: 12, range: 22, radius: 7, delay: 1.2, damage: 34, effect: burn(5, 3), desc: 'Call a meteor down on a spot.' },
      { name: 'Supernova', kind: 'nova', cd: 45, radius: 18, damage: 38, effect: { knock: 35, lift: 12, burn: 5, burnDur: 3 }, desc: 'ULTIMATE: Explode like a star.' },
    ],
  },
  {
    id: 'verdant',
    name: 'Verdant',
    element: 'Green Energy',
    tagline: 'Channels raw green energy. Sustain, homing orbs and a huge beam.',
    color: 0x3dff8b,
    accent: 0xb8ffcf,
    css: '#3dff8b',
    hp: 100,
    speed: 9,
    abilities: [
      { name: 'Energy Bolt', kind: 'projectile', cd: 0.35, damage: 8, speed: 62, size: 0.3, range: 60, desc: 'Rapid-fire energy bolt.' },
      { name: 'Seeker Orbs', kind: 'projectile', cd: 5, damage: 9, speed: 26, size: 0.45, count: 3, spread: 0.8, range: 70, homing: true, desc: 'Three orbs that chase enemies.' },
      { name: 'Emerald Ray', kind: 'beam', cd: 5, damage: 16, range: 50, size: 0.45, desc: 'Long-range energy ray.' },
      { name: 'Energy Barrier', kind: 'shield', cd: 13, duration: 4, mult: 0.25, desc: 'Take 75% less damage for 4s.' },
      { name: 'Phase Step', kind: 'dash', cd: 4, range: 16, speed: 75, damage: 0, desc: 'Teleport-dash a short distance.' },
      { name: 'Regrowth', kind: 'heal', cd: 15, amount: 35, desc: 'Restore 35 health.' },
      { name: 'Pulse Burst', kind: 'nova', cd: 8, radius: 8, damage: 14, effect: { knock: 15 }, desc: 'Energy shockwave around you.' },
      { name: 'Gravity Well', kind: 'zone', cd: 14, range: 18, radius: 8, damage: 5, duration: 4, effect: { pull: true }, desc: 'Sucks enemies into a crushing field.' },
      { name: 'Overcharge', kind: 'beam', cd: 40, damage: 45, range: 70, size: 1.6, effect: { knock: 25 }, desc: 'ULTIMATE: Massive green energy cannon.' },
    ],
  },
  {
    id: 'tide',
    name: 'Tide',
    element: 'Water',
    tagline: 'Controls space with waves, bubbles and whirlpools.',
    color: 0x2f8bff,
    accent: 0x9fe3ff,
    css: '#2f8bff',
    hp: 105,
    speed: 9,
    abilities: [
      { name: 'Water Jet', kind: 'projectile', cd: 0.45, damage: 8, speed: 52, size: 0.35, range: 50, effect: { knock: 6 }, desc: 'Pressurized water shot.' },
      { name: 'Bubble Trap', kind: 'projectile', cd: 8, damage: 6, speed: 22, size: 0.8, range: 45, effect: { stun: 1.5 }, desc: 'Slow bubble that traps the target.' },
      { name: 'Hydro Cannon', kind: 'beam', cd: 6, damage: 15, range: 40, size: 0.7, effect: { knock: 25 }, desc: 'Blast that shoves enemies back.' },
      { name: 'Healing Rain', kind: 'heal', cd: 14, amount: 30, desc: 'Restore 30 health.' },
      { name: 'Riptide Rush', kind: 'dash', cd: 6, range: 15, speed: 55, damage: 10, effect: { knock: 14 }, desc: 'Surf forward and bowl enemies over.' },
      { name: 'Whirlpool', kind: 'zone', cd: 13, range: 16, radius: 7, damage: 6, duration: 4, effect: { pull: true }, desc: 'Swirling vortex that pulls enemies in.' },
      { name: 'Tidal Wave', kind: 'projectile', cd: 9, damage: 7, speed: 30, size: 0.75, count: 7, spread: 0.9, range: 30, pierce: true, effect: { knock: 16 }, desc: 'A wall of water that pushes through.' },
      { name: 'Geyser', kind: 'strike', cd: 8, range: 16, radius: 5, delay: 0.7, damage: 20, effect: { lift: 22 }, desc: 'Erupts under enemies, launching them.' },
      { name: 'Tsunami', kind: 'projectile', cd: 40, damage: 20, speed: 28, size: 1.4, count: 11, spread: 1.6, range: 55, pierce: true, effect: { knock: 30 }, desc: 'ULTIMATE: A giant crashing wave.' },
    ],
  },
  {
    id: 'turbo',
    name: 'Turbo',
    element: 'Car Powers',
    tagline: 'A human with engine-grade powers: nitro, horsepower and burnouts.',
    color: 0xff2d55,
    accent: 0xc9d1d9,
    css: '#ff2d55',
    hp: 115,
    speed: 10,
    abilities: [
      { name: 'Hubcap Toss', kind: 'projectile', cd: 0.7, damage: 10, speed: 44, size: 0.5, range: 40, pierce: true, desc: 'Spinning hubcap that cuts through.' },
      { name: 'Headlight Flash', kind: 'nova', cd: 9, radius: 7, damage: 4, effect: { stun: 1 }, desc: 'High beams blind nearby enemies.' },
      { name: 'Exhaust Backfire', kind: 'projectile', cd: 4, damage: 6, speed: 46, size: 0.4, count: 4, spread: 0.35, range: 28, effect: burn(3, 2), desc: 'Fiery exhaust pops.' },
      { name: 'Roll Cage', kind: 'shield', cd: 13, duration: 5, mult: 0.3, desc: 'Steel frame: 70% less damage for 5s.' },
      { name: 'Nitro Boost', kind: 'dash', cd: 5, range: 22, speed: 80, damage: 14, effect: { knock: 20 }, desc: 'Nitro charge that rams enemies.' },
      { name: 'Burnout', kind: 'zone', cd: 10, range: 0, radius: 6, damage: 10, duration: 3, effect: burn(3, 1), desc: 'Spin out a ring of burning rubber.' },
      { name: 'Jump Ramp', kind: 'leap', cd: 8, lift: 22, speed: 18, radius: 6, damage: 20, effect: { knock: 14 }, desc: 'Launch off a ramp and crash down.' },
      { name: 'Oil Slick', kind: 'zone', cd: 12, range: 14, radius: 7, damage: 2, duration: 6, effect: slow(0.35, 0.8), desc: 'Slippery oil that slows enemies.' },
      { name: 'Full Throttle', kind: 'dash', cd: 35, range: 45, speed: 95, damage: 40, effect: { knock: 35, lift: 10 }, desc: 'ULTIMATE: Redline charge across the arena.' },
    ],
  },
  {
    id: 'gale',
    name: 'Gale',
    element: 'Air',
    tagline: 'An airbender. Fastest fighter, flings enemies around the arena.',
    color: 0xe6f0ff,
    accent: 0xa98bff,
    css: '#cfd9ff',
    hp: 90,
    speed: 10.5,
    abilities: [
      { name: 'Air Slice', kind: 'projectile', cd: 0.35, damage: 8, speed: 66, size: 0.4, range: 55, desc: 'Razor-fast blade of wind.' },
      { name: 'Gust', kind: 'projectile', cd: 4, damage: 4, speed: 42, size: 1.2, range: 30, pierce: true, effect: { knock: 28 }, desc: 'Huge push of air.' },
      { name: 'Updraft', kind: 'leap', cd: 6, lift: 26, speed: 4, radius: 5, damage: 10, effect: { knock: 10 }, desc: 'Ride the wind straight up.' },
      { name: 'Wind Barrier', kind: 'shield', cd: 10, duration: 3, mult: 0.4, desc: 'Swirling air: 60% less damage for 3s.' },
      { name: 'Air Step', kind: 'dash', cd: 3, range: 18, speed: 85, damage: 0, desc: 'Quick wind-dash.' },
      { name: 'Tornado', kind: 'zone', cd: 12, range: 15, radius: 6, damage: 8, duration: 4, effect: { pull: true, lift: 6 }, desc: 'Tornado that sucks enemies up.' },
      { name: 'Vacuum', kind: 'nova', cd: 10, radius: 12, damage: 8, effect: { knock: 20, pull: true }, desc: 'Yank everyone nearby toward you.' },
      { name: 'Cyclone Burst', kind: 'projectile', cd: 8, damage: 9, speed: 44, size: 0.45, count: 10, spread: 6.3, range: 25, desc: 'Wind blades in every direction.' },
      { name: 'Hurricane', kind: 'nova', cd: 40, radius: 20, damage: 30, effect: { knock: 45, lift: 15 }, desc: 'ULTIMATE: Throw everyone across the arena.' },
    ],
  },
];

export function getChar(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[1];
}
