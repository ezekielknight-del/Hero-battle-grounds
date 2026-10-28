export type AbilityKind =
  | 'projectile'
  | 'beam'
  | 'cone'
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
  /** multiply this hit's damage when the target is already slowed */
  vsSlow?: number;
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
  /** projectile returns, and can hit again on the way back */
  boomerang?: boolean;
  /** splash radius when the projectile ends */
  explode?: number;
  /** extra enemies a beam jumps to */
  chain?: number;
  /** fraction of damage dealt restored to the caster */
  steal?: number;
  /** projectile reels the target toward you */
  hook?: boolean;
  /** projectile jumps to another enemy after a hit */
  bounce?: number;
  /** fire the shot behind you */
  backward?: boolean;
  /** dash teleports instead of sliding */
  blink?: boolean;
  /** dash leaves a patch on the ground */
  trail?: boolean;
  /** leap crashes down. Defaults to yes. */
  slam?: boolean;
  /** zone sticks to the caster */
  follow?: boolean;
  /** zone waits, then bursts once */
  mine?: boolean;
  /** zone restores this much health to its owner per tick */
  healOwner?: number;
  /** shield also chills or shoves whoever hits you */
  thorns?: Effect;
  /** health per second while the shield holds */
  regen?: number;
  /** shield also grants this movement multiplier */
  boost?: number;
  /** haste burns anyone you touch */
  aura?: Effect;
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
    tagline: 'Blocky fighter in an ice-blue jacket and cap. Freezes the field, then shatters it.',
    color: 0x7fdcff,
    accent: 0xe8fbff,
    css: '#7fdcff',
    hp: 110,
    speed: 9,
    abilities: [
      { name: 'Ice Shard', kind: 'projectile', cd: 0.45, damage: 9, speed: 48, size: 0.35, range: 55, effect: slow(0.6, 1.4), desc: 'Fast shard. Chilled enemies take extra damage from Frost.' },
      { name: 'Frost Volley', kind: 'projectile', cd: 3, damage: 8, speed: 44, size: 0.35, count: 3, spread: 0.35, range: 50, effect: slow(0.55, 1.6), desc: 'Three shards. Spreads the chill.' },
      { name: 'Glacier Lance', kind: 'beam', cd: 6, damage: 16, range: 45, size: 0.5, effect: { ...slow(0.45, 2.2), vsSlow: 1.8 }, desc: 'Ice beam. Hits almost twice as hard if the target is already chilled.' },
      { name: 'Frozen Armor', kind: 'shield', cd: 12, duration: 4, mult: 0.4, thorns: slow(0.45, 1.5), desc: 'Take 60% less damage. Anyone who hits you is chilled.' },
      { name: 'Ice Slide', kind: 'dash', cd: 5, range: 14, speed: 55, damage: 6, trail: true, effect: slow(0.5, 1.6), desc: 'Skate forward and leave a freezing trail.' },
      { name: 'Blizzard', kind: 'zone', cd: 12, range: 16, radius: 7.5, damage: 6, duration: 5, effect: slow(0.4, 0.8), desc: 'A snowstorm. Enemies inside can barely move.' },
      { name: 'Flash Freeze', kind: 'nova', cd: 11, radius: 7.5, damage: 8, effect: { stun: 1.4, slow: 0.5, slowDur: 2 }, desc: 'Freeze everyone near you solid for a moment.' },
      { name: 'Icicle Rain', kind: 'strike', cd: 9, range: 20, radius: 6, delay: 0.9, damage: 22, effect: { ...slow(0.45, 2), vsSlow: 2 }, desc: 'Icicles crash down. Double damage on a chilled target.' },
      { name: 'Absolute Zero', kind: 'nova', cd: 40, radius: 18, damage: 26, effect: { stun: 2.4, slow: 0.35, slowDur: 3 }, desc: 'ULTIMATE: Freeze the whole area, then leave it crawling.' },
    ],
  },
  {
    id: 'blaze',
    name: 'Blaze',
    element: 'Fire',
    tagline: 'Blocky fighter in red and orange, with a flame on his head. Sets everything on fire.',
    color: 0xff6a2b,
    accent: 0xffd23f,
    css: '#ff6a2b',
    hp: 95,
    speed: 9.5,
    abilities: [
      { name: 'Fireball', kind: 'projectile', cd: 0.7, damage: 12, speed: 36, size: 0.55, range: 48, explode: 3.6, effect: burn(5, 2.5), desc: 'Explodes on impact and sets everyone nearby on fire.' },
      { name: 'Flame Fan', kind: 'cone', cd: 3.2, damage: 11, range: 9, spread: 1.15, effect: burn(4, 2), desc: 'A wide blast of flame right in front of you.' },
      { name: 'Fire Lance', kind: 'beam', cd: 6, damage: 18, range: 38, size: 0.55, effect: burn(7, 2.5), desc: 'A beam that leaves a heavy burn.' },
      { name: 'Ember Cloak', kind: 'haste', cd: 11, duration: 4, mult: 1.65, aura: burn(6, 0.6), desc: 'Sprint, and anyone you brush against catches fire.' },
      { name: 'Blast Off', kind: 'leap', cd: 8, lift: 20, speed: 12, radius: 6.5, damage: 20, effect: { knock: 14, burn: 5, burnDur: 2 }, desc: 'Rocket up and slam down in a burning crater.' },
      { name: 'Inferno Ring', kind: 'zone', cd: 12, range: 0, radius: 7, damage: 10, duration: 4.5, follow: true, effect: burn(4, 1), desc: 'A ring of fire that follows you around.' },
      { name: 'Heat Wave', kind: 'nova', cd: 9, radius: 9, damage: 10, effect: { knock: 26, burn: 3, burnDur: 2 }, desc: 'Shove everyone back and singe them.' },
      { name: 'Meteor', kind: 'strike', cd: 13, range: 24, radius: 7.5, delay: 1.15, damage: 36, effect: burn(6, 3), desc: 'A meteor. The biggest single hit in the arena.' },
      { name: 'Supernova', kind: 'nova', cd: 45, radius: 18, damage: 34, effect: { knock: 36, lift: 14, burn: 7, burnDur: 3.5 }, desc: 'ULTIMATE: Explode like a star. Burn, launch, and throw.' },
    ],
  },
  {
    id: 'verdant',
    name: 'Verdant',
    element: 'Green Energy',
    tagline: 'Blocky fighter in green, with a flower. Orbs, healing and a huge beam.',
    color: 0x3dff8b,
    accent: 0xb8ffcf,
    css: '#3dff8b',
    hp: 100,
    speed: 9,
    abilities: [
      { name: 'Energy Bolt', kind: 'projectile', cd: 0.32, damage: 8, speed: 64, size: 0.28, range: 62, steal: 0.5, desc: 'Rapid bolt. You heal for half the damage it deals.' },
      { name: 'Seeker Orbs', kind: 'projectile', cd: 5.5, damage: 10, speed: 24, size: 0.42, count: 3, spread: 0.9, range: 75, homing: true, steal: 0.4, desc: 'Three orbs that chase enemies down and feed you.' },
      { name: 'Emerald Ray', kind: 'beam', cd: 6, damage: 14, range: 48, size: 0.4, chain: 2, steal: 0.6, desc: 'A ray that jumps to two more enemies. Each hit heals you.' },
      { name: 'Energy Barrier', kind: 'shield', cd: 14, duration: 4, mult: 0.3, regen: 8, desc: 'Take 70% less damage and regenerate 8 health a second.' },
      { name: 'Phase Step', kind: 'dash', cd: 4.5, range: 16, blink: true, desc: 'Teleport a short distance. You skip everything in between.' },
      { name: 'Regrowth', kind: 'heal', cd: 14, amount: 40, desc: 'Instantly restore 40 health. The only burst heal.' },
      { name: 'Pulse Burst', kind: 'nova', cd: 8, radius: 8, damage: 13, steal: 1, effect: { knock: 12 }, desc: 'Shockwave. You heal for the full damage it deals.' },
      { name: 'Gravity Well', kind: 'zone', cd: 14, range: 18, radius: 8, damage: 5, duration: 4, effect: { pull: true }, desc: 'A crushing field that drags enemies into the center.' },
      { name: 'Overcharge', kind: 'beam', cd: 42, damage: 42, range: 72, size: 1.7, chain: 3, steal: 0.35, effect: { knock: 22 }, desc: 'ULTIMATE: A cannon that chains across the arena and heals you.' },
    ],
  },
  {
    id: 'tide',
    name: 'Tide',
    element: 'Water',
    tagline: 'Blocky fighter in blue, with a yellow cap and a bottle. Waves, whirlpools and a tsunami.',
    color: 0x2f8bff,
    accent: 0x9fe3ff,
    css: '#2f8bff',
    hp: 105,
    speed: 9,
    abilities: [
      { name: 'Water Jet', kind: 'projectile', cd: 0.45, damage: 7, speed: 54, size: 0.34, range: 50, effect: { knock: 10 }, desc: 'A jet that pushes the target back.' },
      { name: 'Bubble Trap', kind: 'projectile', cd: 8, damage: 4, speed: 20, size: 0.85, range: 46, hook: true, effect: { stun: 1.6 }, desc: 'A bubble that traps the target and reels them to you.' },
      { name: 'Hydro Cannon', kind: 'beam', cd: 6.5, damage: 12, range: 36, size: 0.85, effect: { knock: 32 }, desc: 'A blast of water that shoves everyone in the line.' },
      { name: 'Spring', kind: 'zone', cd: 13, range: 14, radius: 5.5, damage: 0, duration: 5, healOwner: 8, effect: slow(0.7, 0.6), desc: 'A pool. You heal while you stand in it. Enemies are bogged down.' },
      { name: 'Riptide Rush', kind: 'dash', cd: 6, range: 15, speed: 58, damage: 8, effect: { knock: 22 }, desc: 'Surf through enemies and send them flying.' },
      { name: 'Whirlpool', kind: 'zone', cd: 13, range: 16, radius: 7, damage: 5, duration: 4, effect: { pull: true, slow: 0.65, slowDur: 0.6 }, desc: 'A vortex that drags enemies in and slows them.' },
      { name: 'Tidal Wave', kind: 'projectile', cd: 9, damage: 8, speed: 28, size: 0.8, count: 7, spread: 1, range: 32, pierce: true, effect: { knock: 18 }, desc: 'A wall of water that pushes through everyone it touches.' },
      { name: 'Geyser', kind: 'strike', cd: 8, range: 16, radius: 5, delay: 0.65, damage: 14, effect: { lift: 26 }, desc: 'Erupts under enemies and launches them straight up.' },
      { name: 'Tsunami', kind: 'projectile', cd: 40, damage: 16, speed: 26, size: 1.5, count: 13, spread: 1.8, range: 58, pierce: true, effect: { knock: 34, lift: 8 }, desc: 'ULTIMATE: A crashing wave that sweeps the arena.' },
    ],
  },
  {
    id: 'turbo',
    name: 'Turbo',
    element: 'Car Powers',
    tagline: 'Blocky fighter in a red racing suit. Nitro, ramps and burnouts.',
    color: 0xff2d55,
    accent: 0xc9d1d9,
    css: '#ff2d55',
    hp: 115,
    speed: 10,
    abilities: [
      { name: 'Hubcap Toss', kind: 'projectile', cd: 0.75, damage: 11, speed: 42, size: 0.5, range: 36, bounce: 2, desc: 'A hubcap that bounces to two more enemies.' },
      { name: 'Headlight Flash', kind: 'cone', cd: 9, damage: 3, range: 11, spread: 0.95, effect: { stun: 1.1 }, desc: 'High beams. Stuns everyone in a cone in front of you.' },
      { name: 'Exhaust Backfire', kind: 'projectile', cd: 4, damage: 7, speed: 40, size: 0.4, count: 5, spread: 0.7, range: 16, backward: true, effect: burn(4, 2), desc: 'Exhaust pops behind you and sets that ground on fire.' },
      { name: 'Roll Cage', kind: 'shield', cd: 13, duration: 5, mult: 0.35, boost: 1.35, desc: 'Take 65% less damage and drive 35% faster.' },
      { name: 'Nitro Boost', kind: 'dash', cd: 5, range: 24, speed: 85, damage: 16, effect: { knock: 24 }, desc: 'A long nitro ram. The farthest charge besides the ultimate.' },
      { name: 'Burnout', kind: 'zone', cd: 10, range: 0, radius: 6, damage: 12, duration: 3, effect: burn(4, 1.2), desc: 'Spin out a patch of burning rubber and drive away from it.' },
      { name: 'Jump Ramp', kind: 'leap', cd: 8, lift: 18, speed: 22, radius: 6, damage: 22, effect: { knock: 20 }, desc: 'Launch a long way and crater whoever you land on.' },
      { name: 'Oil Slick', kind: 'zone', cd: 12, range: 14, radius: 6, damage: 12, duration: 8, mine: true, effect: slow(0.3, 2.4), desc: 'A hidden slick. The first enemy to step on it slips hard.' },
      { name: 'Full Throttle', kind: 'dash', cd: 36, range: 48, speed: 100, damage: 38, effect: { knock: 36, lift: 10, stun: 0.6 }, desc: 'ULTIMATE: Redline across the arena and stun whoever you hit.' },
    ],
  },
  {
    id: 'gale',
    name: 'Gale',
    element: 'Air',
    tagline: 'Blocky fighter in white and sky blue, with a scarf. The fastest fighter, and an airbender.',
    color: 0xe6f0ff,
    accent: 0xa98bff,
    css: '#cfd9ff',
    hp: 90,
    speed: 10.5,
    abilities: [
      { name: 'Air Slice', kind: 'projectile', cd: 0.4, damage: 8, speed: 52, size: 0.38, range: 32, boomerang: true, desc: 'A blade of wind that flies out and cuts again on the way back.' },
      { name: 'Gust', kind: 'projectile', cd: 4, damage: 3, speed: 38, size: 1.3, range: 28, pierce: true, effect: { knock: 34 }, desc: 'A huge push. Barely hurts, but sends people flying.' },
      { name: 'Updraft', kind: 'leap', cd: 5.5, lift: 28, speed: 2, slam: false, desc: 'Ride the wind straight up. You do not crash down.' },
      { name: 'Wind Barrier', kind: 'shield', cd: 10, duration: 3, mult: 0.45, thorns: { knock: 22 }, desc: 'Take 55% less damage. Hitting you throws the attacker back.' },
      { name: 'Air Step', kind: 'dash', cd: 2.6, range: 16, speed: 90, desc: 'The shortest dash cooldown in the arena. No damage, just speed.' },
      { name: 'Tornado', kind: 'zone', cd: 12, range: 15, radius: 6, damage: 7, duration: 4, effect: { pull: true, lift: 8 }, desc: 'Sucks enemies in and holds them in the air.' },
      { name: 'Vacuum', kind: 'nova', cd: 10, radius: 13, damage: 6, effect: { knock: 28, pull: true }, desc: 'Yank everyone nearby toward you.' },
      { name: 'Cyclone Burst', kind: 'projectile', cd: 8, damage: 8, speed: 46, size: 0.4, count: 12, spread: 6.3, range: 22, desc: 'Wind blades in every direction at once.' },
      { name: 'Hurricane', kind: 'nova', cd: 40, radius: 22, damage: 22, effect: { knock: 52, lift: 18 }, desc: 'ULTIMATE: Throw everyone across the arena.' },
    ],
  },
];

export function getChar(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[1];
}
