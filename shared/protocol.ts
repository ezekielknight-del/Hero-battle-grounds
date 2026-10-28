export type Vec3Tuple = [number, number, number];

export interface LobbyPlayer {
  id: string;
  name: string;
  char: string;
}

export interface BotInfo {
  id: string;
  name: string;
  char: string;
}

export interface FighterState {
  id: string;
  p: Vec3Tuple;
  v: Vec3Tuple;
  y: number;
  hp: number;
  a: boolean;
  c: string;
  /** status flags bitmask: 1 shield, 2 stun, 4 burn, 8 slow, 16 haste */
  f: number;
}

export type ClientMessage =
  | { t: 'create'; name: string; char: string; size: number; bots: boolean }
  | { t: 'join'; code: string; name: string; char: string }
  | { t: 'char'; char: string }
  | { t: 'bots'; bots: boolean }
  | { t: 'start' }
  | { t: 'leave' }
  | { t: 'state'; s: FighterState[] }
  | { t: 'cast'; id: string; i: number; o: Vec3Tuple; d: Vec3Tuple; dist: number; slam?: boolean }
  | { t: 'died'; id: string; by: string | null };

export type ServerMessage =
  | { t: 'joined'; id: string; code: string; hostId: string; size: number; bots: boolean; players: LobbyPlayer[] }
  | { t: 'lobby'; hostId: string; size: number; bots: boolean; players: LobbyPlayer[]; started: boolean }
  | { t: 'error'; message: string }
  | { t: 'start'; players: LobbyPlayer[]; bots: BotInfo[]; hostId: string }
  | { t: 'left'; id: string }
  | { t: 'host'; id: string }
  | { t: 'state'; s: FighterState[] }
  | { t: 'cast'; id: string; i: number; o: Vec3Tuple; d: Vec3Tuple; dist: number; slam?: boolean }
  | { t: 'died'; id: string; by: string | null };

export const ROOM_SIZES = [2, 4, 5] as const;
